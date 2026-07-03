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
    let finalModel = getModel(modelId);

    // Load available models and setup sequence looping
    const modelKeys = Object.keys(MODEL_REGISTRY);
    let attemptIndex = modelKeys.indexOf(modelId);
    if (attemptIndex === -1) attemptIndex = 0;
    
    let attemptsCount = 0;
    let responseText;
    let thinkingTime = 0.5;
    let reasoningText = undefined;

    while (attemptsCount < modelKeys.length) {
      const currentAttemptModelId = modelKeys[attemptIndex];
      const attemptModel = getModel(currentAttemptModelId);
      
      // Check if this model is flagged as 'failed' in settings and fallback is enabled
      const isFailedInSettings = settings.modelStatus[currentAttemptModelId] === 'failed';
      if (isFailedInSettings && settings.autoFallbackEnabled && attemptsCount < modelKeys.length - 1) {
        console.log(`Model '${currentAttemptModelId}' is flagged as failed. Auto-fallback: skipping...`);
        if (!fallbackOccurred) {
          fallbackOccurred = true;
          const nextModelId = modelKeys[(attemptIndex + 1) % modelKeys.length];
          fallbackDetails = {
            from: originalModelId,
            to: nextModelId,
            reason: `Model '${currentAttemptModelId}' status is flagged as failed in Control Panel.`
          };
        }
        attemptIndex = (attemptIndex + 1) % modelKeys.length;
        attemptsCount++;
        continue;
      }

      console.log(`Attempting to generate response using model: ${currentAttemptModelId}`);
      try {
        const startTime = Date.now();
        responseText = await attemptModel.adapter.chat(content, history);
        thinkingTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
        
        if (currentAttemptModelId === 'deepseek-r1') {
          reasoningText = "Analyzing user query...\nRetrieving context from PostgreSQL...\nProcessing fallback matrix...\nFormulating optimal response strategy.";
        }
        
        finalModel = attemptModel;
        modelId = currentAttemptModelId;
        break; // Success! Exit loop.
      } catch (error) {
        console.error(`Error calling '${currentAttemptModelId}' adapter:`, error.message);
        
        if (settings.autoFallbackEnabled && attemptsCount < modelKeys.length - 1) {
          fallbackOccurred = true;
          const nextModelId = modelKeys[(attemptIndex + 1) % modelKeys.length];
          fallbackDetails = {
            from: currentAttemptModelId,
            to: nextModelId,
            reason: error.message
          };
          
          // Save fallback event to DB
          await pool.query(
            `INSERT INTO fallback_events (conversation_id, failed_model_id, fallback_model_id, reason)
             VALUES ($1, $2, $3, $4)`,
            [id, currentAttemptModelId, nextModelId, error.message]
          );

          attemptIndex = (attemptIndex + 1) % modelKeys.length;
          attemptsCount++;
        } else {
          // If fallback is disabled or we exhausted all models, fail the request
          return res.status(503).json({
            error: "model_unavailable",
            model: currentAttemptModelId,
            reason: error.message
          });
        }
      }
    }

    // Update active model ID for the conversation in DB to match the successful model
    if (modelId !== originalModelId) {
      await pool.query(
        `UPDATE conversations SET active_model_id = $1 WHERE id = $2`,
        [modelId, id]
      );
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
      modelName: finalModel.name,
      modelId: finalModel.id,
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
