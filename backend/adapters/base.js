class BaseAdapter {
  /**
   * Sends a user message to the model with the given history context.
   * @param {string} userMessage - The new user message content.
   * @param {Array<Object>} history - The existing chat history (raw format from DB).
   * @returns {Promise<string>} The response text from the model.
   */
  async chat(userMessage, history) {
    throw new Error("Method 'chat(userMessage, history)' must be implemented.");
  }

  /**
   * Formats the raw messages from the database into the model's expected format.
   * @param {Array<Object>} messages - Raw messages from database.
   * @returns {any} The formatted history.
   */
  formatHistory(messages) {
    throw new Error("Method 'formatHistory(messages)' must be implemented.");
  }
}

module.exports = BaseAdapter;
