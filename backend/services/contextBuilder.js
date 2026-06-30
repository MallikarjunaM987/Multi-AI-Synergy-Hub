const pool = require('../db');

/**
 * Fetches last 30 messages from the database ordered by created_at ascending.
 * @param {string} conversationId - UUID of the conversation.
 * @returns {Promise<Array<Object>>} List of messages mapped to camelCase.
 */
async function getHistory(conversationId) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT id, conversation_id, role, content, model_name, model_id, was_fallback, fallback_from, thinking_time, reasoning, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT 30
     ) sub
     ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows.map(row => ({
    id: row.id,
    role: row.role,
    content: row.content,
    modelName: row.model_name,
    modelId: row.model_id,
    timestamp: new Date(row.created_at).getTime(),
    wasFallback: row.was_fallback,
    fallbackFrom: row.fallback_from,
    thinkingTime: row.thinking_time ? parseFloat(row.thinking_time) : undefined,
    reasoning: row.reasoning || undefined
  }));
}

/**
 * Saves a message to the messages table and touches the conversations updated_at timestamp.
 */
async function saveMessage({ conversationId, role, content, modelName, modelId, wasFallback, fallbackFrom, thinkingTime, reasoning }) {
  const result = await pool.query(
    `INSERT INTO messages (conversation_id, role, content, model_name, model_id, was_fallback, fallback_from, thinking_time, reasoning)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      conversationId,
      role,
      content,
      modelName || null,
      modelId || null,
      wasFallback || false,
      fallbackFrom || null,
      thinkingTime || null,
      reasoning || null
    ]
  );

  // Touch the updated_at timestamp on the conversation
  await pool.query(
    `UPDATE conversations
     SET updated_at = NOW()
     WHERE id = $1`,
     [conversationId]
  );

  return result.rows[0];
}

/**
 * Creates a new conversation and returns its UUID.
 */
async function createConversation(title, activeModelId) {
  const result = await pool.query(
    `INSERT INTO conversations (title, active_model_id)
     VALUES ($1, $2)
     RETURNING id`,
    [title || 'New Shared Conversation', activeModelId || 'gemini-3.5-flash']
  );
  return result.rows[0].id;
}

/**
 * Returns all conversations mapped as ChatSummary.
 */
async function getAllConversations() {
  const result = await pool.query(
    `SELECT c.id, c.title, c.active_model_id, c.created_at, c.updated_at,
            (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
     FROM conversations c
     ORDER BY c.updated_at DESC`
  );
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    activeModelId: row.active_model_id,
    createdAt: new Date(row.created_at).getTime(),
    lastMessage: row.last_message || 'Empty conversation'
  }));
}

/**
 * Roughly estimates tokens.
 */
function estimateTokens(input) {
  if (typeof input === 'string') {
    return Math.ceil(input.length / 4);
  }
  if (Array.isArray(input)) {
    const totalLength = input.reduce((acc, msg) => acc + (msg.content ? msg.content.length : 0), 0);
    return Math.ceil(totalLength / 4);
  }
  return 0;
}

module.exports = {
  getHistory,
  saveMessage,
  createConversation,
  getAllConversations,
  estimateTokens
};
