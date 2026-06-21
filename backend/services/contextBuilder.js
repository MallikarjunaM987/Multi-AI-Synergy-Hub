const pool = require('../db');

/**
 * Fetches last 30 messages from the database ordered by created_at ascending.
 * @param {string} conversationId - UUID of the conversation.
 * @returns {Promise<Array<Object>>} List of messages.
 */
async function getHistory(conversationId) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT id, conversation_id, role, content, model_name, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT 30
     ) sub
     ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows;
}

/**
 * Saves a single message to the messages table and touches the conversations updated_at timestamp.
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.role - 'user' or 'assistant'
 * @param {string} params.content
 * @param {string} params.modelName - name or ID of the model (null for user messages or if not specified)
 * @returns {Promise<Object>} The saved message row.
 */
async function saveMessage({ conversationId, role, content, modelName }) {
  const result = await pool.query(
    `INSERT INTO messages (conversation_id, role, content, model_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [conversationId, role, content, modelName || null]
  );

  // Update conversation updated_at to bring it to the top
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
 * @param {string} title - The title of the conversation.
 * @returns {Promise<string>} The new conversation ID.
 */
async function createConversation(title) {
  const result = await pool.query(
    `INSERT INTO conversations (title)
     VALUES ($1)
     RETURNING id`,
    [title || 'New Shared Conversation']
  );
  return result.rows[0].id;
}

/**
 * Returns all conversations ordered by updated_at descending.
 * @returns {Promise<Array<Object>>} List of conversations.
 */
async function getAllConversations() {
  const result = await pool.query(
    `SELECT id, title, created_at, updated_at
     FROM conversations
     ORDER BY updated_at DESC`
  );
  return result.rows;
}

/**
 * Roughly estimates tokens (total characters divided by 4).
 * Supports both message array and direct string input.
 * @param {Array|string} input
 * @returns {number} Estimated token count.
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
