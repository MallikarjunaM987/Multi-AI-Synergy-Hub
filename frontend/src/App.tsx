import React, { useState, useEffect } from 'react';
import { ModelID, MODELS_REGISTRY, Chat, Message, FallbackEvent } from './types.js';
import Sidebar from './components/Sidebar.js';
import ConsoleHeader from './components/ConsoleHeader.js';
import MessageList from './components/MessageList.js';
import MessageInput from './components/MessageInput.js';
import SystemControlPanel from './components/SystemControlPanel.js';
import { AlertCircle, X, ShieldAlert, CheckCircle, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatSummary {
  id: string;
  title: string;
  createdAt: number;
  activeModelId: ModelID;
  lastMessage: string;
}

// Client-side Local Storage Keys
const LOCAL_CHATS_KEY = 'synergy_hub_chats_v1';
const LOCAL_SETTINGS_KEY = 'synergy_hub_settings_v1';
const LOCAL_FALLBACKS_KEY = 'synergy_hub_fallbacks_v1';

// Initial default state for simulation sandbox
const DEFAULT_CHATS: Chat[] = [
  {
    id: 'sample-chat-1',
    title: 'Project Architecture Discussion',
    createdAt: Date.now() - 3600000,
    activeModelId: 'llama-3.3',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'We need a robust database system for our logistics dashboard. What are the key differences between Postgres and DynamoDB for write-heavy workloads?',
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'msg-2',
        role: 'assistant',
        modelId: 'llama-3.3',
        content: `**PostgreSQL vs. AWS DynamoDB: Write-Heavy Logistics workload**

1. **Write Scalability & Performance**:
   - **DynamoDB**: Natively handles massive horizontal scale. It spreads partition writes across multiple solid-state drives automatically. Excellent for high-throughput sensor telemetry or live tracking.
   - **Postgres**: Historically scaled vertically. However, with modern partitioning, write-tuning (tuning WAL, checkpointing), or Citus extension, it can handle thousands of writes/sec comfortably.

2. **Data Consistency & Query Flexibility**:
   - **Postgres**: Full ACID compliance, robust relational joins, secondary indexes, and rich JSONB queries. Perfect for complex logistics routing where you need to join shipments, carriers, and schedules.
   - **DynamoDB**: Eventual consistency options. Queries are limited to primary keys or global secondary indexes (GSIs). No multi-table joins; you must denormalize your schema.

**Meta recommendation**: If you have highly relational logistics models, choose **PostgreSQL**. If it is pure streaming GPS coordinates or high-throughput events, **DynamoDB** is more cost-effective.`,
        timestamp: Date.now() - 3550000,
      },
    ],
  }
];

const DEFAULT_SETTINGS = {
  credits: {
    'llama-3.3': 0.85,
    'deepseek-r1': 0.12,
    'gemini-3.5-flash': 15.00,
    'qwen-coder': 2.50,
  } as Record<ModelID, number>,
  modelStatus: {
    'llama-3.3': 'active',
    'deepseek-r1': 'active',
    'gemini-3.5-flash': 'active',
    'qwen-coder': 'active',
  } as Record<ModelID, 'active' | 'failed'>,
  autoFallbackEnabled: true,
  hasOpenRouterKey: false,
};

export default function App() {
  // Mode detection: true = backend offline, use local simulation; false = use Express server
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  // Navigation & Workspace State
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(true);

  // Simulation settings
  const [credits, setCredits] = useState<Record<ModelID, number>>(DEFAULT_SETTINGS.credits);
  const [modelStatus, setModelStatus] = useState<Record<ModelID, 'active' | 'failed'>>(DEFAULT_SETTINGS.modelStatus);
  const [autoFallbackEnabled, setAutoFallbackEnabled] = useState(true);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [fallbackEvents, setFallbackEvents] = useState<FallbackEvent[]>([]);

  // UI Fallback Warning Toast
  const [activeFallbackToast, setActiveFallbackToast] = useState<{
    from: ModelID;
    to: ModelID;
    reason: string;
  } | null>(null);

  // Initial detection and loading
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Try to check if backend server API is operational
        const res = await fetch('/api/settings');
        if (res.ok) {
          console.log('[Synergy Hub] Backend detected! Operating in full Express / Postgres mode.');
          setUseLocalStorage(false);
          fetchChats();
          fetchSettings();
          fetchFallbackEvents();
        } else {
          throw new Error('Non-ok response from server');
        }
      } catch (err) {
        console.warn('[Synergy Hub] Backend not detected or returned error. Initializing Local Browser Sandbox Mode.');
        setUseLocalStorage(true);
        loadLocalStorageData();
      }
    };

    initializeApp();
  }, []);

  // Fetch full details whenever activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      if (useLocalStorage) {
        const storedChats = localStorage.getItem(LOCAL_CHATS_KEY);
        const chatsList: Chat[] = storedChats ? JSON.parse(storedChats) : DEFAULT_CHATS;
        const found = chatsList.find(c => c.id === activeChatId);
        setActiveChat(found || null);
      } else {
        fetchChatDetails(activeChatId);
      }
    } else {
      setActiveChat(null);
    }
  }, [activeChatId, useLocalStorage]);

  // Load from localStorage for local mode
  const loadLocalStorageData = () => {
    // 1. Chats
    let chatsList: Chat[] = DEFAULT_CHATS;
    const storedChats = localStorage.getItem(LOCAL_CHATS_KEY);
    if (storedChats) {
      try {
        chatsList = JSON.parse(storedChats);
      } catch (e) {
        console.error('Error parsing stored chats, resetting', e);
      }
    } else {
      localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(DEFAULT_CHATS));
    }
    
    const summary = chatsList.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      activeModelId: c.activeModelId,
      lastMessage: c.messages[c.messages.length - 1]?.content || 'Empty conversation'
    }));
    setChats(summary);

    if (summary.length > 0 && !activeChatId) {
      setActiveChatId(summary[0].id);
    }

    // 2. Settings
    let currentSettings = DEFAULT_SETTINGS;
    const storedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (storedSettings) {
      try {
        currentSettings = JSON.parse(storedSettings);
      } catch (e) {}
    } else {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
    setCredits(currentSettings.credits);
    setModelStatus(currentSettings.modelStatus);
    setAutoFallbackEnabled(currentSettings.autoFallbackEnabled);
    setHasOpenRouterKey(currentSettings.hasOpenRouterKey);

    // 3. Fallbacks
    let events: FallbackEvent[] = [];
    const storedEvents = localStorage.getItem(LOCAL_FALLBACKS_KEY);
    if (storedEvents) {
      try {
        events = JSON.parse(storedEvents);
      } catch (e) {}
    } else {
      localStorage.setItem(LOCAL_FALLBACKS_KEY, JSON.stringify([]));
    }
    setFallbackEvents(events);
  };

  // API Callbacks for Server-Connected Mode
  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (data.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load chats from API:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        setModelStatus(data.modelStatus);
        setAutoFallbackEnabled(data.autoFallbackEnabled);
        setHasOpenRouterKey(data.hasOpenRouterKey);
      }
    } catch (err) {
      console.error('Failed to load settings from API:', err);
    }
  };

  const fetchFallbackEvents = async () => {
    try {
      const res = await fetch('/api/fallbacks');
      if (res.ok) {
        const data = await res.json();
        setFallbackEvents(data);
      }
    } catch (err) {
      console.error('Failed to load fallbacks from API:', err);
    }
  };

  const fetchChatDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveChat(data);
      }
    } catch (err) {
      console.error('Failed to load chat details:', err);
    }
  };

  // Create new session
  const handleCreateChat = async () => {
    if (useLocalStorage) {
      const storedChats = localStorage.getItem(LOCAL_CHATS_KEY);
      const chatsList: Chat[] = storedChats ? JSON.parse(storedChats) : [];
      
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: 'New Conversation',
        createdAt: Date.now(),
        activeModelId: activeChat?.activeModelId || 'gemini-3.5-flash',
        messages: []
      };

      const updated = [newChat, ...chatsList];
      localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(updated));
      loadLocalStorageData();
      setActiveChatId(newChat.id);
    } else {
      try {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Conversation',
            activeModelId: activeChat?.activeModelId || 'gemini-3.5-flash',
          }),
        });

        if (res.ok) {
          const newChat = await res.json();
          setActiveChatId(newChat.id);
          fetchChats();
        }
      } catch (err) {
        console.error('Failed to create chat:', err);
      }
    }
  };

  // Delete chat session
  const handleDeleteChat = async (id: string) => {
    if (useLocalStorage) {
      const storedChats = localStorage.getItem(LOCAL_CHATS_KEY);
      const chatsList: Chat[] = storedChats ? JSON.parse(storedChats) : [];
      const filtered = chatsList.filter(c => c.id !== id);
      localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(filtered));
      
      if (activeChatId === id) {
        setActiveChatId(null);
        setActiveChat(null);
      }
      loadLocalStorageData();
    } else {
      try {
        const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchChats();
          if (activeChatId === id) {
            setActiveChatId(null);
            setActiveChat(null);
          }
        }
      } catch (err) {
        console.error('Failed to delete chat:', err);
      }
    }
  };

  // Update chosen active model for the thread
  const handleSelectModel = async (modelId: ModelID) => {
    if (!activeChatId || !activeChat) return;

    if (useLocalStorage) {
      const storedChats = localStorage.getItem(LOCAL_CHATS_KEY);
      const chatsList: Chat[] = storedChats ? JSON.parse(storedChats) : [];
      const updated = chatsList.map(c => {
        if (c.id === activeChatId) {
          return { ...c, activeModelId: modelId };
        }
        return c;
      });
      localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(updated));
      setActiveChat(prev => prev ? { ...prev, activeModelId: modelId } : null);
      loadLocalStorageData();
    } else {
      try {
        setActiveChat(prev => prev ? { ...prev, activeModelId: modelId } : null);
        
        const res = await fetch(`/api/chats/${activeChatId}/model`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeModelId: modelId }),
        });

        if (res.ok) {
          fetchChats();
        }
      } catch (err) {
        console.error('Failed to update active model:', err);
      }
    }
  };

  // High-fidelity local simulation output helper
  const generateSimulatedResponse = (modelId: ModelID, userInput: string): { text: string; thinkingTime: number; reasoning?: string } => {
    const wordCount = userInput.trim().split(' ').length;
    const isCodeQuery = /code|function|class|program|html|css|javascript|typescript|python|c\+\+/gi.test(userInput);
    const isMathQuery = /math|equation|calculate|sum|integral|proof/gi.test(userInput);
    
    let text = "";
    let reasoning = undefined;
    let thinkingTime = 1.2;

    if (modelId === 'llama-3.3') {
      thinkingTime = 1.8;
      text = `### Meta Llama 3.3 Response Outline

Thank you for your inquiry. To help address your thoughts regarding "${userInput.substring(0, 30)}...", let's organize our perspective into clear structural milestones:

1. **Syntactical Context**:
   - Understanding that you have requested support with a query containing ${wordCount} words.
   - Identifying the underlying patterns and resolving secondary variables.

2. **Core Recommendations**:
   - Keep systems highly modular to reduce compilation dependency locks.
   - Use declarative interfaces to scale across shared micro-frontends.

Would you like me to elaborate further on any of these points?`;
    } 
    else if (modelId === 'deepseek-r1') {
      thinkingTime = 3.5;
      reasoning = `User query contains "${userInput}".
Analyzing user requirements...
The request mentions code or concepts related to logic.
Let's construct a formal logical layout first.
Let's simulate a deep mathematical derivation to prove consistency.
Wait, let's verify if there are any edge cases in our reasoning.
Okay, the deduction steps are fully consistent. Let's output the result.`;
      
      text = `Superposition and logical state correctness can be validated with rigorous guarantees:

### 1. Step-by-Step Logic
- We have analyzed the core context of your prompt.
- We have validated the edge boundaries and solved for structural optimizations.

### 2. Math Representation
$$ \\mathcal{O}(N \\log N) + \\Phi_{recovery} = \\text{Perfect Synergy} $$

Our proof is complete. Let me know if you need any parameter fine-tuning.`;
    } 
    else if (modelId === 'qwen-coder') {
      thinkingTime = 1.5;
      
      if (isCodeQuery) {
        text = `Here is a clean, fully typed implementation resolving your request:

\`\`\`typescript
// Production-ready module
export interface SynergyConfig {
  retries: number;
  backoffMs: number;
}

export class SharedContextEngine {
  private config: SynergyConfig;

  constructor(config: SynergyConfig) {
    this.config = config;
  }

  public async broadcast(message: string): Promise<boolean> {
    console.log("[SharedContextEngine] Syncing: " + message);
    return true;
  }
}
\`\`\`

**Optimization Details**:
- **Time Complexity**: $\\mathcal{O}(1)$ local write.
- **Space Complexity**: $\\mathcal{O}(N)$ memory storage where $N$ represents historical chat frames.`;
      } else {
        text = `### Qwen Coder 2.5 Implementation Suggestions

Even for non-technical commands, my primary focus is to outline highly practical, logical, and structured instructions:

\`\`\`json
{
  "status": "success",
  "data": {
    "querySnippet": "${userInput.substring(0, 40)}",
    "wordMetric": ${wordCount},
    "recommendation": "Integrate a central repository design pattern to keep concerns separated."
  }
}
\`\`\`

Let me know if you want me to convert this process into an actual TypeScript script!`;
      }
    } 
    else {
      // Gemini Flash
      thinkingTime = 0.6;
      text = `Hi! I'm **Gemini 3.5 Flash**, Google's low-latency performance model. 

I can process your queries extremely quickly. In regards to your request: "${userInput}", I suggest building a robust, fluid frontend layout using Tailwind CSS. 

If you want to simulate a database outage, click the **Simulation Controls** at the top right, turn off one of the other models or drain their virtual credits, and watch the system instantly fall back to me while keeping this entire chat thread active!`;
    }

    return { text, thinkingTime, reasoning };
  };

  // Dispatch message query
  const handleSendMessage = async (text: string) => {
    if (!activeChatId || isGenerating) return;

    setIsGenerating(true);
    setActiveFallbackToast(null);

    // Optimistically add user message in state
    const tempUserMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    
    if (activeChat) {
      setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : null);
    }

    if (useLocalStorage) {
      // -------------------------------------------------------------
      // LOCAL SIMULATION PIPELINE (LocalStorage Sandbox Mode)
      // -------------------------------------------------------------
      setTimeout(() => {
        const storedChats = localStorage.getItem(LOCAL_CHATS_KEY);
        const chatsList: Chat[] = storedChats ? JSON.parse(storedChats) : [];
        const chatIndex = chatsList.findIndex(c => c.id === activeChatId);

        if (chatIndex === -1) {
          setIsGenerating(false);
          return;
        }

        const chat = chatsList[chatIndex];
        // Add user message to historical DB
        chat.messages.push(tempUserMsg);

        // Update auto title
        if (chat.messages.filter(m => m.role === 'user').length === 1) {
          chat.title = text.trim().split(' ').slice(0, 5).join(' ') + '...';
        }

        // Check fallback conditions
        let targetModelId = chat.activeModelId;
        let originalModelId = targetModelId;
        let wasFallbackTriggered = false;
        let failureReason = "";

        const creditBalance = credits[targetModelId] || 0;
        const isOutageActive = modelStatus[targetModelId] === 'failed';

        if (creditBalance <= 0.01) {
          failureReason = "Credits completely exhausted (balance: $0.00)";
        } else if (isOutageActive) {
          failureReason = "Simulated API Network Outage (533 Service Error)";
        }

        if (failureReason !== "") {
          if (autoFallbackEnabled) {
            // Find next online model
            const priorityList: ModelID[] = ['gemini-3.5-flash', 'qwen-coder', 'llama-3.3', 'deepseek-r1'];
            const currentIndex = priorityList.indexOf(targetModelId);
            let fallbackModel: ModelID = 'gemini-3.5-flash';

            for (let i = 1; i <= priorityList.length; i++) {
              const nextIdx = (currentIndex + i) % priorityList.length;
              const testId = priorityList[nextIdx];
              if ((credits[testId] || 0) > 0.01 && modelStatus[testId] === 'active') {
                fallbackModel = testId;
                break;
              }
            }

            // Create Fallback Record
            const fallbackEvent: FallbackEvent = {
              id: `fallback-${Date.now()}`,
              timestamp: Date.now(),
              chatId: chat.id,
              chatTitle: chat.title,
              failedModelId: targetModelId,
              fallbackModelId: fallbackModel,
              reason: failureReason
            };

            const storedEvents = localStorage.getItem(LOCAL_FALLBACKS_KEY);
            const eventsList: FallbackEvent[] = storedEvents ? JSON.parse(storedEvents) : [];
            eventsList.unshift(fallbackEvent);
            localStorage.setItem(LOCAL_FALLBACKS_KEY, JSON.stringify(eventsList));

            // Log the switch
            chat.activeModelId = fallbackModel;
            targetModelId = fallbackModel;
            wasFallbackTriggered = true;
          } else {
            setIsGenerating(false);
            alert(`Model ${targetModelId} is currently offline: ${failureReason}. Turn on "Shared-History Fallback" to auto-recover!`);
            return;
          }
        }

        // Deduct credits
        const modelConfig = MODELS_REGISTRY[targetModelId];
        const cost = modelConfig.creditCost;
        const newCredits = {
          ...credits,
          [targetModelId]: Math.max(0, (credits[targetModelId] || 0) - cost)
        };
        setCredits(newCredits);

        // Update settings in LocalStorage
        const settingsPayload = {
          credits: newCredits,
          modelStatus,
          autoFallbackEnabled,
          hasOpenRouterKey
        };
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settingsPayload));

        // Generate response
        const aiResponse = generateSimulatedResponse(targetModelId, text);

        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.text,
          modelId: targetModelId,
          timestamp: Date.now(),
          wasFallback: wasFallbackTriggered,
          fallbackFrom: wasFallbackTriggered ? originalModelId : undefined,
          thinkingTime: aiResponse.thinkingTime,
          reasoning: aiResponse.reasoning
        };

        chat.messages.push(assistantMsg);
        chat.activeModelId = targetModelId;

        localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(chatsList));
        loadLocalStorageData();

        if (wasFallbackTriggered) {
          setActiveFallbackToast({
            from: originalModelId,
            to: targetModelId,
            reason: failureReason,
          });
        }
        setIsGenerating(false);
      }, 1200);

    } else {
      // -------------------------------------------------------------
      // BACKEND API PIPELINE
      // -------------------------------------------------------------
      try {
        const res = await fetch(`/api/chats/${activeChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });

        if (res.ok) {
          const data = await res.json();
          setActiveChat(data.chat);
          
          if (data.fallbackOccurred && data.fallbackDetails) {
            setActiveFallbackToast({
              from: data.fallbackDetails.from,
              to: data.fallbackDetails.to,
              reason: data.fallbackDetails.reason,
            });
            fetchFallbackEvents();
            fetchSettings();
          } else {
            fetchSettings();
          }
          fetchChats();
        } else {
          const errData = await res.json();
          alert(errData.message || 'Pipeline Error.');
        }
      } catch (err: any) {
        console.error('API Error:', err);
        alert('API Connection Failed. Swapping back to local mock mode...');
        setUseLocalStorage(true);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  // Sync settings
  const handleUpdateSettings = async (updatedSettings: {
    credits?: Record<ModelID, number>;
    modelStatus?: Record<ModelID, 'active' | 'failed'>;
    autoFallbackEnabled?: boolean;
  }) => {
    if (updatedSettings.credits) setCredits(updatedSettings.credits);
    if (updatedSettings.modelStatus) setModelStatus(updatedSettings.modelStatus);
    if (typeof updatedSettings.autoFallbackEnabled === 'boolean') {
      setAutoFallbackEnabled(updatedSettings.autoFallbackEnabled);
    }

    if (useLocalStorage) {
      const settingsPayload = {
        credits: updatedSettings.credits || credits,
        modelStatus: updatedSettings.modelStatus || modelStatus,
        autoFallbackEnabled: typeof updatedSettings.autoFallbackEnabled === 'boolean' 
          ? updatedSettings.autoFallbackEnabled 
          : autoFallbackEnabled,
        hasOpenRouterKey
      };
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settingsPayload));
      
      // If reset was triggered
      const isReset = updatedSettings.credits && updatedSettings.credits['llama-3.3'] === 0.85;
      if (isReset) {
        localStorage.setItem(LOCAL_FALLBACKS_KEY, JSON.stringify([]));
        localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(DEFAULT_CHATS));
      }
      loadLocalStorageData();
    } else {
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings),
        });

        if (res.ok) {
          fetchSettings();
        }
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
  };

  return (
    <div className="flex w-screen h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* Navigation Sidebar */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        hasOpenRouterKey={hasOpenRouterKey}
        onSelectChat={setActiveChatId}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main workspace */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden bg-slate-900">
        
        {/* Connection Mode Indicator */}
        <div className="bg-slate-950 border-b border-slate-900/60 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono tracking-wide">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${useLocalStorage ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-slate-400">
              {useLocalStorage 
                ? 'Sandbox Mode: Offline Simulated State Active' 
                : 'Full-Stack Connected: PostgreSQL & Express'}
            </span>
          </div>
          <span className="text-slate-600 text-[10px]">
            {useLocalStorage ? 'Local Storage Engine' : 'Express Dev Client'}
          </span>
        </div>

        {/* Animated Slide-Down Auto-Fallback Warning banner */}
        <AnimatePresence>
          {activeFallbackToast && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-rose-600/90 text-white flex items-center justify-between px-6 py-3 border-b border-rose-500/30 text-xs shrink-0 shadow-lg shadow-rose-600/10"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-100 animate-pulse" />
                <span>
                  <strong>CRITICAL AUTO-RECOVERY TRIGGERED:</strong>{' '}
                  {MODELS_REGISTRY[activeFallbackToast.from]?.name || activeFallbackToast.from} is unavailable ({activeFallbackToast.reason}). 
                  Hub seamlessly routed thread to <strong>{MODELS_REGISTRY[activeFallbackToast.to]?.name || activeFallbackToast.to}</strong>. 
                  Zero re-explaining required.
                </span>
              </div>
              <button
                onClick={() => setActiveFallbackToast(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeChat ? (
          <>
            {/* Header selection toolbar */}
            <ConsoleHeader
              activeModelId={activeChat.activeModelId}
              credits={credits}
              modelStatus={modelStatus}
              onSelectModel={handleSelectModel}
              onToggleControlCenter={() => setIsControlCenterOpen(!isControlCenterOpen)}
              isControlCenterOpen={isControlCenterOpen}
            />

            {/* Conversation text lists */}
            <MessageList
              messages={activeChat.messages}
              isGenerating={isGenerating}
              activeModelId={activeChat.activeModelId}
            />

            {/* Submissions footbar */}
            <MessageInput
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
              <Database className="w-8 h-8 opacity-40" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-100">Select or Create a Chat Session</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Connect a new conversation log to the shared backend database using the "+ New Chat Session" button on the sidebar.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Diagnostics slide-out control center */}
      <AnimatePresence>
        {isControlCenterOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full shrink-0 relative overflow-hidden"
          >
            <SystemControlPanel
              credits={credits}
              modelStatus={modelStatus}
              autoFallbackEnabled={autoFallbackEnabled}
              fallbackEvents={fallbackEvents}
              onUpdateSettings={handleUpdateSettings}
              onRefreshSettings={loadLocalStorageData}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
