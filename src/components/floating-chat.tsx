'use client';

import { useState } from "react";

type ChatEntry = {
  time: string;
  event: string;
  detail: string;
  actor: string;
};

export function FloatingChat({ thread }: { thread: ChatEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className="fixed bottom-8 right-8 z-30 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white text-slate-900 shadow-[0_20px_45px_rgba(8,10,20,0.55)]" 
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#020617" strokeWidth="1.8">
          <path d="M21 12a8.5 8.5 0 01-8.5 8.5H9l-4 3v-3.5A8.5 8.5 0 015 3.5h7.5A8.5 8.5 0 0121 12z" />
        </svg>
      </button>

      <div
        className={`fixed bottom-0 right-0 z-40 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#050b1f]/95 backdrop-blur-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Chat</p>
            <h4 className="mt-1 text-lg font-semibold text-white">Agent Relay</h4>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-white/20 p-2 text-white/70 hover:text-white"
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {thread.map((entry) => (
            <div key={`${entry.event}-${entry.time}`} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>{entry.actor}</span>
                <span>{entry.time}</span>
              </div>
              <p className="mt-1 text-base text-white">{entry.event}</p>
              <p className="text-xs text-white/60">{entry.detail}</p>
            </div>
          ))}
          {!thread.length && (
            <p className="text-xs text-white/40">Noch keine Log-Einträge</p>
          )}
        </div>
        <div className="border-t border-white/10 px-6 py-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/40">
            Chat-Eingabe folgt – Button & Panel stehen bereit.
          </div>
        </div>
      </div>
    </>
  );
}
