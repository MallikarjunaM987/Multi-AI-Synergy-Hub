import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowUp } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
}

export default function MessageInput({ onSendMessage, isGenerating }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isGenerating) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Automatically adjust height based on text content length
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-slate-900 shrink-0 font-sans">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500/70 transition-all">
          
          {/* Autogrow Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to the shared AI workspace..."
            disabled={isGenerating}
            className="flex-1 max-h-[180px] bg-transparent text-slate-100 text-sm py-2 px-3 resize-none focus:outline-none placeholder-slate-500 leading-relaxed disabled:opacity-50"
          />

          {/* Styled Submit Button */}
          <button
            type="submit"
            disabled={!text.trim() || isGenerating}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              text.trim() && !isGenerating
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-[0.96]'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Send query"
          >
            <ArrowUp className="w-5 h-5 font-black" />
          </button>
        </div>

        {/* Informative Help Guide footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono px-2">
          <span>Press <strong className="text-slate-500">Enter</strong> to send, <strong className="text-slate-500">Shift + Enter</strong> for a new line.</span>
          <span>Shared Context Engine Active • Postgres Schema DB Ready</span>
        </div>
      </div>
    </form>
  );
}
