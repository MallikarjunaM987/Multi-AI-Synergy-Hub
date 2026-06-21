const express = require('express');
const router = express.Router();
const { getModel, getAllModels } = require('../models/registry');
const {
  getHistory,
  saveMessage,
  createConversation,
  getAllConversations,
  estimateTokens
} = require('../services/contextBuilder');

// GET /models — returns details of all registered models without adapter instances
router.get('/models', (req, res) => {
  try {
    const models = getAllModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /conversations — returns all conversations ordered by updated_at descending
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await getAllConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /conversations — creates a new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const conversationId = await createConversation(title);
    res.status(201).json({ id: conversationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /conversations/:id/messages — returns the last 30 messages in ascending order
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await getHistory(id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /chat — handles shared chat messages and transitions across models
router.post('/chat', async (req, res) => {
  const { conversationId, modelId, message } = req.body;

  if (!conversationId || !modelId || !message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: "Missing or invalid required body fields: conversationId, modelId, message" });
  }

  try {
    // 1. Resolve model adapter details
    const model = getModel(modelId);

    // 2. Load conversation history
    const history = await getHistory(conversationId);

    // 3. Save user's prompt to database
    await saveMessage({
      conversationId,
      role: 'user',
      content: message,
      modelName: null
    });

    // 4. Invoke the model adapter inside try/catch for 503 fallback
    let responseText;
    try {
      responseText = await model.adapter.chat(message, history);
    } catch (error) {
      console.error(`Error calling ${modelId} adapter:`, error.message);
      return res.status(503).json({
        error: "model_unavailable",
        model: modelId,
        reason: error.message
      });
    }

    // 5. Save assistant response to database
    await saveMessage({
      conversationId,
      role: 'assistant',
      content: responseText,
      modelName: model.name
    });

    // 6. Estimate token count of the updated context
    const updatedHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: responseText }];
    const tokenEstimate = estimateTokens(updatedHistory);

    // 7. Return payload to client
    res.json({
      response: responseText,
      model: {
        id: model.id,
        name: model.name
      },
      tokenEstimate
    });

  } catch (error) {
    console.error("Chat endpoint general error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
