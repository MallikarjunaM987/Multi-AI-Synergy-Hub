import React from 'react';
import { ModelID, MODELS_REGISTRY } from '../types.js';
import { MessageSquare, Plus, Trash2, ShieldCheck, HelpCircle, Activity } from 'lucide-react';

interface ChatSummary {
  id: string;
  title: string;
  createdAt: number;
  activeModelId: ModelID;
  lastMessage: string;
}

interface SidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  hasOpenRouterKey: boolean;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  userEmail?: string;
}

export default function Sidebar({
  chats,
  activeChatId,
  hasOpenRouterKey,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  userEmail = 'manubmudhol@gmail.com',
}: SidebarProps) {
  return (
    <div className="w-80 h-full bg-slate-950 flex flex-col border-r border-slate-900 text-slate-200 font-sans">
      
      {/* App Branding Header */}
      <div className="p-5 border-b border-slate-900 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20 font-display text-sm tracking-widest">
            Ω
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-slate-100 to-indigo-400">
              Synergy Hub
            </h1>
            <span className="text-[10px] text-indigo-400/80 tracking-widest font-mono uppercase">Multi-AI Console</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <button
          onClick={onCreateChat}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat Session</span>
        </button>
      </div>

      {/* Conversations Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
          Active Conversations ({chats.length})
        </div>

        {chats.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-600 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No chat history. Start a new session above!
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const modelConfig = MODELS_REGISTRY[chat.activeModelId];
            
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-slate-900/90 border border-slate-800/80 shadow-md'
                    : 'hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                {/* Model Indicator Dot */}
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${modelConfig?.avatar || 'bg-slate-600'}`} 
                     title={`Active: ${modelConfig?.name}`} />
                
                {/* Conversation Details */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className={`text-xs font-semibold truncate ${isActive ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {chat.title}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate mt-0.5">
                    {chat.lastMessage || 'No messages yet'}
                  </div>
                </div>

                {/* Trash Deletion Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Connected Credentials Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/80 space-y-3">
        {/* Core Gateway Badge */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">Gemini 3.5 Core</span>
          </div>
          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase rounded tracking-wider animate-pulse">
            Ready
          </span>
        </div>

        {/* Optional OpenRouter Badge */}
        <div className="flex items-center justify-between text-[10px] px-1 text-slate-500">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-slate-500" />
            OpenRouter API Gateway
          </span>
          <span className={`font-semibold ${hasOpenRouterKey ? 'text-indigo-400' : 'text-amber-500'}`}>
            {hasOpenRouterKey ? 'Configured' : 'Local Sandbox'}
          </span>
        </div>

        {/* Profile Card */}
        <div className="pt-2 border-t border-slate-900/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-300 uppercase text-xs">
            {userEmail.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-300 truncate leading-none">
              Developer Profile
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              {userEmail}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
