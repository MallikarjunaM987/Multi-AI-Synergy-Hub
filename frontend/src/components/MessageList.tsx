import React, { useState } from 'react';
import { Message, ModelID, MODELS_REGISTRY } from '../types.js';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Sparkles, Terminal, Info } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  activeModelId: ModelID;
}

export default function MessageList({ messages, isGenerating, activeModelId }: MessageListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThoughts = (id: string) => {
    setExpandedThoughts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper: Format message text (rudimentary markdown parsing for headers, list items, and code blocks)
  const renderFormattedContent = (content: string, id: string) => {
    if (!content) return null;

    // Split by triple backticks to extract code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Code Block
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim() || 'code';
        const codeText = lines.slice(1, -1).join('\n');
        const blockId = `${id}-code-${index}`;

        return (
          <div key={blockId} className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-850 text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                {language}
              </div>
              <button
                onClick={() => handleCopy(blockId, codeText)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedId === blockId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed font-mono">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      // Inline formatting / paragraphs
      return (
        <div key={`part-${index}`} className="space-y-2.5 leading-relaxed">
          {part.split('\n').map((line, lIdx) => {
            let processedLine = line;
            
            // Bold mapping **text** -> <strong>text</strong>
            const boldRegex = /\*\*(.*?)\*\*/g;
            const hasBold = boldRegex.test(processedLine);

            // Bullet points
            if (processedLine.trim().startsWith('- ')) {
              const contentOnly = processedLine.trim().substring(2);
              return (
                <ul key={lIdx} className="list-disc pl-5 text-slate-300">
                  <li dangerouslySetInnerHTML={{ __html: contentOnly.replace(boldRegex, '<strong>$1</strong>') }} />
                </ul>
              );
            }

            // Headers
            if (processedLine.trim().startsWith('### ')) {
              return (
                <h4 key={lIdx} className="text-sm font-bold text-slate-100 mt-4 mb-2 tracking-tight"
                    dangerouslySetInnerHTML={{ __html: processedLine.trim().substring(4).replace(boldRegex, '<strong>$1</strong>') }} />
              );
            }
            if (processedLine.trim().startsWith('## ')) {
              return (
                <h3 key={lIdx} className="text-base font-extrabold text-slate-100 mt-5 mb-2 tracking-tight"
                    dangerouslySetInnerHTML={{ __html: processedLine.trim().substring(3).replace(boldRegex, '<strong>$1</strong>') }} />
              );
            }

            // Standard line
            if (processedLine.trim() === '') return <div key={lIdx} className="h-2" />;
            
            return (
              <p
                key={lIdx}
                className="text-slate-300"
                dangerouslySetInnerHTML={{ __html: processedLine.replace(boldRegex, '<strong>$1</strong>') }}
              />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-900 font-sans">
      <AnimatePresence initial={false}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-slate-100 tracking-tight">Multi-AI Connected Sandbox</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Send a message to kickstart a conversation. Switch models mid-chat or adjust balances in the Simulation Panel to explore state preservation and auto-recovery in real-time.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const modelConfig = msg.modelId ? MODELS_REGISTRY[msg.modelId] : null;
            const isThoughtExpanded = expandedThoughts[msg.id] ?? true;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Fallback Banner Notice */}
                {msg.wasFallback && msg.fallbackFrom && (
                  <div className="w-full max-w-3xl mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-xs text-rose-300 self-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400 animate-bounce" />
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300 mr-2">
                        Auto Free Model Fallback
                      </span>
                      <span>
                        Meta {MODELS_REGISTRY[msg.fallbackFrom]?.name || msg.fallbackFrom} ran out of API key credits or was offline. 
                        Synergy Hub smoothly rerouted context to <strong>{modelConfig?.name}</strong>.
                      </span>
                    </div>
                  </div>
                )}

                <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar bubble */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                    isUser ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : modelConfig?.avatar || 'bg-slate-700 text-slate-200'
                  }`}>
                    {isUser ? 'ME' : modelConfig?.name.substring(0, 2)}
                  </div>

                  {/* Message main card */}
                  <div className="space-y-1.5">
                    {/* Username/Model stamp */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span className="font-bold text-slate-400">
                        {isUser ? 'You' : modelConfig?.name}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {/* Chat Bubble Body */}
                    <div className={`p-4 rounded-2xl border ${
                      isUser
                        ? 'bg-slate-950 border-slate-800 text-slate-100 rounded-tr-none shadow-sm'
                        : 'bg-slate-950/40 border-slate-900 text-slate-200 rounded-tl-none'
                    }`}>
                      
                      {/* DeepSeek Reasoning Collapse block */}
                      {!isUser && msg.reasoning && (
                        <div className="mb-3 border border-slate-800 bg-slate-900/40 rounded-xl overflow-hidden text-xs">
                          <button
                            onClick={() => toggleThoughts(msg.id)}
                            className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-800/30 text-slate-400 font-mono text-[10px] transition-colors"
                          >
                            <span className="flex items-center gap-1.5 font-bold">
                              <Brain className="w-3.5 h-3.5 text-indigo-400" />
                              THINKING PROCESS ({msg.thinkingTime || 2.4}s)
                            </span>
                            {isThoughtExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          
                          {isThoughtExpanded && (
                            <div className="px-4 py-3 border-t border-slate-850 text-slate-400 leading-relaxed italic border-l-2 border-indigo-500/40 font-mono text-[11px] whitespace-pre-wrap">
                              {msg.reasoning}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Message Content */}
                      <div className="text-sm">
                        {renderFormattedContent(msg.content, msg.id)}
                      </div>
                    </div>

                    {/* Telemetry metadata block for AI Responses */}
                    {!isUser && (msg.thinkingTime || modelConfig) && (
                      <div className="flex items-center gap-3.5 text-[10px] text-slate-500 font-mono pl-1">
                        {msg.thinkingTime && (
                          <span className="flex items-center gap-1">
                            Latency: <strong className="text-slate-400">{msg.thinkingTime}s</strong>
                          </span>
                        )}
                        {modelConfig && (
                          <span className="flex items-center gap-1">
                            Cost: <strong className="text-slate-400">${modelConfig.creditCost.toFixed(2)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* Live typing loading indicator */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 max-w-3xl self-start"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-indigo-600/20 text-indigo-400 animate-pulse`}>
              AI
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-500 font-mono">
                {MODELS_REGISTRY[activeModelId]?.name} is generating...
              </div>
              <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
