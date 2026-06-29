const BaseAdapter = require('./base');
const OpenAI = require('openai');

const MOCK_API_FAILURE = true;

class OpenRouterAdapter extends BaseAdapter {
  constructor(modelId, modelName) {
    super();
    this.modelId = modelId;
    this.modelName = modelName;
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY",
    });
  }

  formatHistory(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  async chat(userMessage, history) {
    if (MOCK_API_FAILURE && this.modelId === 'meta-llama/llama-3.3-70b-instruct:free') {
      throw new Error('429 Rate Limit Exceeded');
    }

    const formattedHistory = this.formatHistory(history);
    const messages = [...formattedHistory, { role: 'user', content: userMessage }];

    const completion = await this.openai.chat.completions.create({
      model: this.modelId,
      messages: messages
    });

    return completion.choices[0].message.content;
  }
}

module.exports = OpenRouterAdapter;

