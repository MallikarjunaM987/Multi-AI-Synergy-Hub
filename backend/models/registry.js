const OpenRouterAdapter = require('../adapters/openrouter');

const MODEL_REGISTRY = {
  'llama-3.3': {
    id: 'llama-3.3',
    name: 'Llama 3.3',
    provider: 'OpenRouter',
    color: '#0455B1',
    free: true,
    adapter: new OpenRouterAdapter('meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3')
  },
  'openrouter-free': {
    id: 'openrouter-free',
    name: 'Auto Free Model',
    provider: 'OpenRouter',
    color: '#0055ff',
    free: true,
    adapter: new OpenRouterAdapter('openrouter/free', 'Auto Free Model')
  },
  'gemma-4': {
    id: 'gemma-4',
    name: 'Gemma 4 31B',
    provider: 'OpenRouter',
    color: '#1a73e8',
    free: true,
    adapter: new OpenRouterAdapter('google/gemma-4-31b-it:free', 'Gemma 4 31B')
  },
  'qwen-3-coder': {
    id: 'qwen-3-coder',
    name: 'Qwen 3 Coder',
    provider: 'OpenRouter',
    color: '#6c5ce7',
    free: true,
    adapter: new OpenRouterAdapter('qwen/qwen3-coder:free', 'Qwen 3 Coder')
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
