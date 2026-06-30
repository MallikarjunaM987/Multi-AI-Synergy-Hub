const OpenRouterAdapter = require('../adapters/openrouter');

const MODEL_REGISTRY = {
  'llama-3.3': {
    id: 'llama-3.3',
    name: 'Llama 3.3 70B',
    provider: 'OpenRouter',
    color: '#0455B1',
    free: true,
    adapter: new OpenRouterAdapter('meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B')
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'OpenRouter',
    color: '#6c5ce7',
    free: true,
    adapter: new OpenRouterAdapter('openrouter/free', 'DeepSeek R1')
  },
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'OpenRouter',
    color: '#1a73e8',
    free: true,
    adapter: new OpenRouterAdapter('google/gemma-4-31b-it:free', 'Gemini 3.5 Flash')
  },
  'qwen-coder': {
    id: 'qwen-coder',
    name: 'Qwen 2.5 Coder',
    provider: 'OpenRouter',
    color: '#0055ff',
    free: true,
    adapter: new OpenRouterAdapter('qwen/qwen3-coder:free', 'Qwen 2.5 Coder')
  }
};

/**
 * Retrieves the model metadata and adapter by its ID.
 * @param {string} modelId - The model identifier.
 * @returns {Object} The model entry containing the adapter.
 */
function getModel(modelId) {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    throw new Error(`Model '${modelId}' is not registered.`);
  }
  return model;
}

/**
 * Returns all registered models stripped of their adapters.
 * @returns {Array<Object>} List of models with display metadata.
 */
function getAllModels() {
  return Object.values(MODEL_REGISTRY).map(model => {
    const { adapter, ...rest } = model;
    return rest;
  });
}

module.exports = {
  MODEL_REGISTRY,
  getModel,
  getAllModels
};
