const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { getModel, getAllModels, MODEL_REGISTRY } = require('../models/registry');
const {
  getHistory,
  saveMessage,
  createConversation,
  getAllConversations,
  estimateTokens
} = require('../services/contextBuilder');

const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');

// Helper to read settings from settings.json
function readSettings() {
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    settings.hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
    return settings;
  } catch (err) {
    return {
      credits: {
        'llama-3.3': 0.85,
        'deepseek-r1': 0.12,
        'gemini-3.5-flash': 15.00,
        'qwen-coder': 2.50
      },
      modelStatus: {
        'llama-3.3': 'active',
        'deepseek-r1': 'active',
        'gemini-3.5-flash': 'active',
        'qwen-coder': 'active'
      },
      autoFallbackEnabled: true,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY
    };
  }
}

// Helper to save settings to settings.json
function writeSettings(settings) {
  const { hasOpenRouterKey, ...toSave } = settings;
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toSave, null, 2), 'utf8');
}

// GET /settings
router.get('/settings', (req, res) => {
  try {
    res.json(readSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /settings
router.post('/settings', (req, res) => {
  try {
    const current = readSettings();
    const updated = {
      credits: req.body.credits || current.credits,
      modelStatus: req.body.modelStatus || current.modelStatus,
      autoFallbackEnabled: typeof req.body.autoFallbackEnabled === 'boolean' 
        ? req.body.autoFallbackEnabled 
        : current.autoFallbackEnabled
    };
    writeSettings(updated);
    res.json(readSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /chats
router.get('/chats', async (req, res) => {
  try {
    const chats = await getAllConversations();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /chats
router.post('/chats', async (req, res) => {
  try {
    const { title, activeModelId } = req.body;
    const conversationId = await createConversation(title, activeModelId);
    
    const chatResult = await pool.query(
      `SELECT id, title, active_model_id, created_at FROM conversations WHERE id = $1`,
      [conversationId]
    );
    const row = chatResult.rows[0];
    res.status(201).json({
      id: row.id,
      title: row.title,
      activeModelId: row.active_model_id,
      createdAt: new Date(row.created_at).getTime(),
      messages: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /chats/:id
router.get('/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatResult = await pool.query(
      `SELECT id, title, active_model_id, created_at FROM conversations WHERE id = $1`,
      [id]
    );
    if (chatResult.rowCount === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const row = chatResult.rows[0];
    const messages = await getHistory(id);
    res.json({
      id: row.id,
      title: row.title,
      activeModelId: row.active_model_id,
      createdAt: new Date(row.created_at).getTime(),
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /chats/:id
router.delete('/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM conversations WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /chats/:id/model
router.patch('/chats/:id/model', async (req, res) => {
  try {
    const { id } = req.params;
    const { activeModelId } = req.body;
    await pool.query(
      `UPDATE conversations SET active_model_id = $1, updated_at = NOW() WHERE id = $2`,
      [activeModelId, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /chats/:id/messages
router.post('/chats/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: "Message content cannot be empty" });
  }

  try {
    // 1. Fetch conversation
    const chatResult = await pool.query(
      `SELECT id, title, active_model_id, created_at FROM conversations WHERE id = $1`,
      [id]
    );
    if (chatResult.rowCount === 0) {
      return res.status(404).json({ error: "Chat session not found" });
    }
    const chatRow = chatResult.rows[0];
    let modelId = chatRow.active_model_id || 'gemini-3.5-flash';

    // 2. Load conversation history
    const history = await getHistory(id);

    // 3. Save user's prompt to database
    await saveMessage({
      conversationId: id,
      role: 'user',
      content: content
    });

    // 4. Load current system settings
    const settings = readSettings();

    // 5. Pre-chat fallback if model status is flagged 'failed' in control panel
    let fallbackOccurred = false;
    let fallbackDetails = null;
    let originalModelId = modelId;

    let model = getModel(modelId);
    let isFailed = settings.modelStatus[modelId] === 'failed';

    if (isFailed && settings.autoFallbackEnabled) {
      const modelKeys = Object.keys(MODEL_REGISTRY);
      const currentIndex = modelKeys.indexOf(modelId);
      const nextIndex = (currentIndex + 1) % modelKeys.length;
      const fallbackModelId = modelKeys[nextIndex];
      
      console.log(`Model '${modelId}' status is 'failed'. Auto-fallback: switching to '${fallbackModelId}'`);
      fallbackOccurred = true;
      fallbackDetails = {
        from: modelId,
        to: fallbackModelId,
        reason: `Model '${modelId}' status is flagged as failed in Control Panel.`
      };
      
      modelId = fallbackModelId;
      await pool.query(
        `UPDATE conversations SET active_model_id = $1 WHERE id = $2`,
        [modelId, id]
      );
      model = getModel(modelId);
      
      await pool.query(
        `INSERT INTO fallback_events (conversation_id, failed_model_id, fallback_model_id, reason)
         VALUES ($1, $2, $3, $4)`,
        [id, originalModelId, fallbackModelId, fallbackDetails.reason]
      );
    }

    // 6. Invoke model adapter
    let responseText;
    let thinkingTime = 0.5;
    let reasoningText = undefined;
    const startTime = Date.now();

    try {
      responseText = await model.adapter.chat(content, history);
      thinkingTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
      if (modelId === 'deepseek-r1') {
        reasoningText = "Analyzing user query...\nRetrieving historical context from PostgreSQL...\nProcessing fallback matrix...\nFormulating optimal response strategy.";
      }
    } catch (error) {
      console.error(`Error calling ${modelId} adapter:`, error.message);
      
      // Dynamic inline fallback on API error/429
      if (settings.autoFallbackEnabled && !fallbackOccurred) {
        const modelKeys = Object.keys(MODEL_REGISTRY);
        const currentIndex = modelKeys.indexOf(modelId);
        const nextIndex = (currentIndex + 1) % modelKeys.length;
        const fallbackModelId = modelKeys[nextIndex];
        
        console.log(`API call error. Dynamic fallback: switching from '${modelId}' to '${fallbackModelId}'`);
        fallbackOccurred = true;
        fallbackDetails = {
          from: modelId,
          to: fallbackModelId,
          reason: error.message
        };
        
        modelId = fallbackModelId;
        await pool.query(
          `UPDATE conversations SET active_model_id = $1 WHERE id = $2`,
          [modelId, id]
        );
        model = getModel(modelId);
        
        await pool.query(
          `INSERT INTO fallback_events (conversation_id, failed_model_id, fallback_model_id, reason)
           VALUES ($1, $2, $3, $4)`,
          [id, originalModelId, fallbackModelId, error.message]
        );

        const fallbackStartTime = Date.now();
        try {
          responseText = await model.adapter.chat(content, history);
          thinkingTime = parseFloat(((Date.now() - fallbackStartTime) / 1000).toFixed(2));
          if (modelId === 'deepseek-r1') {
            reasoningText = "Analyzing user query...\nEvaluating fallback path...\nGenerating final output...";
          }
        } catch (fallbackError) {
          console.error(`Fallback model ${modelId} failed too:`, fallbackError.message);
          return res.status(503).json({
            error: "model_unavailable",
            model: modelId,
            reason: fallbackError.message
          });
        }
      } else {
        return res.status(503).json({
          error: "model_unavailable",
          model: modelId,
          reason: error.message
        });
      }
    }

    // 7. Deduct credits
    const costMap = {
      'llama-3.3': 0.15,
      'deepseek-r1': 0.35,
      'gemini-3.5-flash': 0.05,
      'qwen-coder': 0.10
    };
    const cost = costMap[modelId] || 0.05;
    settings.credits[modelId] = Math.max(0, parseFloat((settings.credits[modelId] - cost).toFixed(4)));
    writeSettings(settings);

    // 8. Save assistant's response
    await saveMessage({
      conversationId: id,
      role: 'assistant',
      content: responseText,
      modelName: model.name,
      modelId: model.id,
      wasFallback: fallbackOccurred,
      fallbackFrom: fallbackOccurred ? originalModelId : null,
      thinkingTime: thinkingTime,
      reasoning: reasoningText
    });

    // 9. Return updated conversation details
    const updatedMessages = await getHistory(id);
    const updatedChat = {
      id: chatRow.id,
      title: chatRow.title,
      activeModelId: modelId,
      createdAt: new Date(chatRow.created_at).getTime(),
      messages: updatedMessages
    };

    res.json({
      chat: updatedChat,
      fallbackOccurred,
      fallbackDetails
    });

  } catch (error) {
    console.error("Chat endpoint error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /fallbacks
router.get('/fallbacks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fe.id, fe.failed_model_id, fe.fallback_model_id, fe.reason, fe.created_at,
              c.title as chat_title, c.id as chat_id
       FROM fallback_events fe
       JOIN conversations c ON fe.conversation_id = c.id
       ORDER BY fe.created_at DESC`
    );
    const mapped = result.rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.created_at).getTime(),
      chatId: row.chat_id,
      chatTitle: row.chat_title,
      failedModelId: row.failed_model_id,
      fallbackModelId: row.fallback_model_id,
      reason: row.reason
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
