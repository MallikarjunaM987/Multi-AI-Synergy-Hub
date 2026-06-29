export type ModelID = 'llama-3.3' | 'deepseek-r1' | 'gemini-3.5-flash' | 'qwen-coder';

export interface ModelConfig {
  id: ModelID;
  name: string;
  provider: string;
  description: string;
  avatar: string; // Tailwind bg color class or icon name
  strength: string;
  openRouterId: string;
  creditCost: number; // For demo credit-management UI
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: ModelID;
  timestamp: number;
  wasFallback?: boolean;
  fallbackFrom?: ModelID;
  thinkingTime?: number; // Simulated or actual response thinking time (seconds)
  reasoning?: string; // DeepSeek R1 reasoning/thought process
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  activeModelId: ModelID;
}

export interface FallbackEvent {
  id: string;
  timestamp: number;
  chatId: string;
  chatTitle: string;
  failedModelId: ModelID;
  fallbackModelId: ModelID;
  reason: string;
}

export const MODELS_REGISTRY: Record<ModelID, ModelConfig> = {
  'llama-3.3': {
    id: 'llama-3.3',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    description: 'High-performance general reasoning, conversational mastery, and multilingual instruction-following.',
    avatar: 'bg-emerald-600',
    strength: 'General Reasoning & Conversation',
    openRouterId: 'meta-llama/llama-3.3-70b-instruct:free',
    creditCost: 0.15,
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'Advanced logical reasoning, step-by-step thinking processes, math, and scientific proofing.',
    avatar: 'bg-indigo-600',
    strength: 'Deep Logical Thinking & Proofs',
    openRouterId: 'deepseek/deepseek-r1:free',
    creditCost: 0.35,
  },
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'Google',
    description: 'Extremely fast, multimodal comprehension, responsive dialogues, and low-latency processing.',
    avatar: 'bg-blue-600',
    strength: 'Lightning Speed & Image Comprehension',
    openRouterId: 'google/gemini-2.5-flash:free',
    creditCost: 0.05,
  },
  'qwen-coder': {
    id: 'qwen-coder',
    name: 'Qwen 2.5 Coder',
    provider: 'Alibaba',
    description: 'Specialized programming instructions, debugging, algorithm synthesis, and structured code formulation.',
    avatar: 'bg-amber-600',
    strength: 'Code Generation & Optimization',
    openRouterId: 'qwen/qwen-2.5-coder-32b-instruct:free',
    creditCost: 0.10,
  }
};
