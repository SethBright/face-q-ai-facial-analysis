import React, { useState, useRef, useEffect } from 'react';
import { getCoachResponse } from '../services/geminiService';
import { isPro } from '../services/purchasesService';
import { getCoachUsage, incrementCoachUsage, canUseCoachMessage, MAX_COACH_MESSAGES_PER_WEEK } from '../services/coachUsageStorage';
import { getCoachMessages, saveCoachMessages } from '../services/coachChatStorage';
import { setStoredRoutine } from '../services/dailyRoutineStorage';
import LimitReachedModal from './LimitReachedModal';
import type { ScanRecord } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const INITIAL_GREETING: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hey! I'm your Looks IQ Coach. I can help you improve your overall look, gain more muscle, lose body fat, get clearer skin, and sharpen your jawline. What do you want to work on first?",
};

interface CoachViewProps {
  onGetPro: () => void;
  latestScan?: ScanRecord | null;
}

const CoachView: React.FC<CoachViewProps> = ({ onGetPro, latestScan }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = getCoachMessages();
    return stored.length > 0 ? stored : [INITIAL_GREETING];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proStatus, setProStatus] = useState<boolean | null>(null);
  const [coachUsage, setCoachUsage] = useState(() => getCoachUsage());
  const [showLimitModal, setShowLimitModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    isPro().then(setProStatus);
  }, []);

  useEffect(() => {
    saveCoachMessages(messages);
  }, [messages]);

  useEffect(() => {
    const onFocus = () => isPro().then(setProStatus);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const refreshCoachUsage = () => setCoachUsage(getCoachUsage());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const wantsRoutineChange = /change.*routine|new routine|update.*routine/i.test(trimmed.toLowerCase());

    if (proStatus === false) {
      onGetPro();
      return;
    }
    if (proStatus === true && !canUseCoachMessage()) {
      setShowLimitModal(true);
      refreshCoachUsage();
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));
      const reply = await getCoachResponse(history, trimmed);
      incrementCoachUsage();
      refreshCoachUsage();
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: reply ?? "I couldn't generate a response. Try again.",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (wantsRoutineChange && latestScan) {
        // When the user asks to change their routine, regenerate today's
        // checklist based on their latest scan so Daily updates immediately.
        const { result, date } = latestScan;
        const generated = (() => {
          const tasks: { emoji: string; label: string }[] = [];
          const daysSinceScan = Math.floor(
            (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
          );
          if (result.skinQuality < 60) {
            tasks.push({ emoji: '🧴', label: 'Wash your face morning and night' });
          }
          if (result.skinQuality < 70) {
            tasks.push({ emoji: '🌞', label: 'Use a daily moisturizer and sunscreen' });
          }
          if (result.overall < 70) {
            tasks.push({ emoji: '🥤', label: 'Drink at least 2L of water today' });
          }
          if (result.jawline < 70 || result.cheekbones < 70 || result.masculinity < 70) {
            tasks.push({ emoji: '💇‍♂️', label: 'Style your hair with a more intentional look' });
          }
          if (result.masculinity < 65) {
            tasks.push({ emoji: '🧵', label: 'Tidy and shape your eyebrows' });
          }
          if (daysSinceScan >= 3) {
            tasks.push({ emoji: '📸', label: 'Take a new progress pic today' });
          }
          const seen = new Set<string>();
          const unique: { emoji: string; label: string }[] = [];
          for (const t of tasks) {
            if (seen.has(t.label)) continue;
            unique.push(t);
            seen.add(t.label);
            if (unique.length === 4) break;
          }
          return unique;
        })();
        if (generated.length > 0) {
          setStoredRoutine(latestScan.id, generated);
        }
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: "Something went wrong. Check your connection and try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="h-full min-h-0 w-full flex flex-col bg-zinc-900 text-white relative overflow-hidden"
      style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))' }}
    >
      {/* Header */}
      <header className="shrink-0 border-b border-white/5 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-white">Coach</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Improve your look, skin, and confidence</p>
          </div>
          {proStatus === true && (
            <span className="text-xs text-zinc-500 shrink-0">
              {coachUsage.count}/{MAX_COACH_MESSAGES_PER_WEEK} this week
            </span>
          )}
        </div>
      </header>

      {/* Content area: messages scroll, input always fixed at bottom */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Messages - scrollable; input stays visible below */}
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-2 space-y-6 min-h-0 ${proStatus === false ? 'blur-sm select-none' : ''}`}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300">
                  Q
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-violet-600/90 text-white rounded-br-md'
                    : 'bg-zinc-800/80 text-zinc-100 rounded-bl-md'
                }`}
              >
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300">
                Q
              </div>
              <div className="bg-zinc-800/80 text-zinc-400 rounded-2xl rounded-bl-md px-4 py-2.5">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input bar - always visible at bottom (flex shrink-0), above tab bar */}
        <div
          className={`shrink-0 border-t border-white/5 bg-zinc-900 px-4 py-3 ${proStatus === false ? 'blur-sm select-none pointer-events-none' : ''}`}
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask the coach..."
              rows={1}
              disabled={isLoading}
              className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl bg-zinc-800 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors"
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </form>
        </div>

      </div>

      {/* Full-screen lock overlay when not Pro - centered in middle of viewport */}
      {proStatus === false && (
        <div
          className="fixed inset-0 z-10 flex flex-col items-center justify-center px-6 bg-zinc-900/70 backdrop-blur-md"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-hidden="false"
        >
          <div className="flex flex-col items-center justify-center text-center max-w-xs">
            <div className="w-14 h-14 rounded-full bg-zinc-700/90 flex items-center justify-center mb-4 shrink-0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg mb-1">Coach is for Pro</p>
            <p className="text-zinc-400 text-sm mb-6">Unlock to chat about your goals and get personalized advice.</p>
            <button
              type="button"
              onClick={onGetPro}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] active:scale-[0.98] transition-transform"
            >
              Unlock Looks IQ Pro
            </button>
          </div>
        </div>
      )}

      {showLimitModal && (
        <LimitReachedModal
          variant="coach"
          resetDate={coachUsage.resetDate}
          onClose={() => setShowLimitModal(false)}
        />
      )}
    </div>
  );
};

export default CoachView;
