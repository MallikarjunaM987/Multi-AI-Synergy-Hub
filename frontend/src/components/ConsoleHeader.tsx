import React from 'react';
import { ModelID, MODELS_REGISTRY } from '../types.js';
import { Database, Settings, HelpCircle, Activity, LayoutGrid, ToggleLeft } from 'lucide-react';

interface ConsoleHeaderProps {
  activeModelId: ModelID;
  credits: Record<ModelID, number>;
  modelStatus: Record<ModelID, 'active' | 'failed'>;
  onSelectModel: (id: ModelID) => void;
  onToggleControlCenter: () => void;
  isControlCenterOpen: boolean;
}

export default function ConsoleHeader({
  activeModelId,
  credits,
  modelStatus,
  onSelectModel,
  onToggleControlCenter,
  isControlCenterOpen,
}: ConsoleHeaderProps) {
  return (
    <div className="bg-slate-950 border-b border-slate-900 p-4 shrink-0 flex flex-col gap-3 font-sans">
      
      {/* Top row: Chat Context & Meta Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Shared Database Connection: ACTIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sync Engine: Persistent PostgreSQL Structure</span>
          </div>
        </div>

        {/* Action button to slide in diagnostics control panel */}
        <button
          onClick={onToggleControlCenter}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isControlCenterOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Simulation Controls</span>
        </button>
      </div>

      {/* Bottom row: Premium model tabs switching */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {(Object.keys(MODELS_REGISTRY) as ModelID[]).map((id) => {
          const config = MODELS_REGISTRY[id];
          const isActive = id === activeModelId;
          const balance = credits[id] !== undefined ? credits[id] : 0;
          const isFailed = modelStatus[id] === 'failed' || balance <= 0.01;

          return (
            <button
              key={id}
              onClick={() => onSelectModel(id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/5'
                  : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/40 hover:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.avatar}`} />
                  <span className={`text-xs font-bold leading-none ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                    {config.name}
                  </span>
                </div>
                {/* Outage status warning badge */}
                {isFailed && (
                  <span className="bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide font-black">
                    Error
                  </span>
                )}
              </div>

              {/* Display descriptive info and virtual credits */}
              <div className="mt-2 flex items-end justify-between">
                <span className="text-[10px] text-slate-500 font-mono tracking-wide">
                  {config.provider}
                </span>
                <span className={`text-[10px] font-mono ${
                  balance <= 0.01 ? 'text-rose-400 font-bold' : balance <= 0.20 ? 'text-amber-400 font-medium' : 'text-slate-400'
                }`}>
                  ${balance.toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
