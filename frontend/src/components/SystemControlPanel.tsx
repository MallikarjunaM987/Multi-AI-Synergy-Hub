import React from 'react';
import { ModelID, MODELS_REGISTRY, FallbackEvent } from '../types.js';
import { ShieldAlert, Zap, RefreshCw, Radio, Play, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';

interface SystemControlPanelProps {
  credits: Record<ModelID, number>;
  modelStatus: Record<ModelID, 'active' | 'failed'>;
  autoFallbackEnabled: boolean;
  fallbackEvents: FallbackEvent[];
  onUpdateSettings: (settings: {
    credits?: Record<ModelID, number>;
    modelStatus?: Record<ModelID, 'active' | 'failed'>;
    autoFallbackEnabled?: boolean;
  }) => void;
  onRefreshSettings: () => void;
}

export default function SystemControlPanel({
  credits,
  modelStatus,
  autoFallbackEnabled,
  fallbackEvents,
  onUpdateSettings,
  onRefreshSettings,
}: SystemControlPanelProps) {
  
  const handleRefillCredits = (modelId: ModelID) => {
    const updatedCredits = { ...credits, [modelId]: 5.00 };
    onUpdateSettings({ credits: updatedCredits });
  };

  const handleDrainCredits = (modelId: ModelID) => {
    const updatedCredits = { ...credits, [modelId]: 0.00 };
    onUpdateSettings({ credits: updatedCredits });
  };

  const toggleModelStatus = (modelId: ModelID) => {
    const updatedStatus = {
      ...modelStatus,
      [modelId]: modelStatus[modelId] === 'active' ? 'failed' : 'active'
    };
    onUpdateSettings({ modelStatus: updatedStatus });
  };

  const toggleAutoFallback = () => {
    onUpdateSettings({ autoFallbackEnabled: !autoFallbackEnabled });
  };

  const resetAll = () => {
    onUpdateSettings({
      credits: {
        "llama-3.3": 0.85,
        "deepseek-r1": 0.12,
        "gemini-3.5-flash": 15.00,
        "qwen-coder": 2.50,
      },
      modelStatus: {
        "llama-3.3": "active",
        "deepseek-r1": "active",
        "gemini-3.5-flash": "active",
        "qwen-coder": "active",
      },
      autoFallbackEnabled: true,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 font-sans text-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h2 className="font-display font-bold text-base tracking-tight">AI Control Center</h2>
        </div>
        <button 
          onClick={resetAll}
          title="Reset Simulation State"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Master Fallback Switch */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Shared-History Fallback
            </span>
            <button
              onClick={toggleAutoFallback}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoFallbackEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoFallbackEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            When enabled, if your active model runs out of credits or suffers an API outage, the conversation seamlessly resumes on the next active model.
          </p>
        </div>

        {/* Model Simulation Block */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Model Diagnostics</h3>
          <div className="space-y-3">
            {(Object.keys(MODELS_REGISTRY) as ModelID[]).map((id) => {
              const config = MODELS_REGISTRY[id];
              const balance = credits[id] !== undefined ? credits[id] : 0;
              const status = modelStatus[id] || 'active';
              const isLow = balance <= 0.20;
              const isExhausted = balance <= 0.01;

              return (
                <div key={id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${config.avatar}`} />
                      <div>
                        <div className="font-medium text-slate-200 text-xs">{config.name}</div>
                        <div className="text-[10px] text-slate-500">{config.provider}</div>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <button
                      onClick={() => toggleModelStatus(id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                        status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      {status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Online
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" />
                          Outage
                        </>
                      )}
                    </button>
                  </div>

                  {/* Credits Simulator */}
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Virtual Credits</div>
                      <div className={`font-mono text-xs font-semibold ${
                        isExhausted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                        ${balance.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {isExhausted ? (
                        <button
                          onClick={() => handleRefillCredits(id)}
                          className="px-2 py-1 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 rounded text-[10px] font-medium transition-colors"
                        >
                          Refill ($5)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDrainCredits(id)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded text-[10px] font-medium transition-colors"
                        >
                          Drain Key
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fallback Event Logs */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Redirection Logs</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {fallbackEvents.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/40 p-4 rounded-xl text-center text-xs text-slate-500">
                No automatic recovery events registered in this session.
              </div>
            ) : (
              fallbackEvents.map((evt) => (
                <div key={evt.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[120px]">{evt.chatTitle}</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-slate-300">
                    <span className="font-semibold text-rose-400 truncate">{MODELS_REGISTRY[evt.failedModelId]?.name || evt.failedModelId}</span>
                    <span>➔</span>
                    <span className="font-semibold text-emerald-400 truncate">{MODELS_REGISTRY[evt.fallbackModelId]?.name || evt.fallbackModelId}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded truncate">
                    Reason: {evt.reason}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
