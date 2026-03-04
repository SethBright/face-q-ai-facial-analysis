import React, { useState } from 'react';
import type { ScanRecord } from '../types';
import { recordTaskCompletion } from '../services/streakStorage';
import { getCompletedIndices, toggleTaskCompleted } from '../services/taskCompletionStorage';
import { getStoredRoutine } from '../services/dailyRoutineStorage';

interface DailyViewProps {
  scans: ScanRecord[];
  /** Consecutive days (including today) with at least one scan or task completed. */
  streak: number;
  onScanPress: () => void;
  onViewProgress?: () => void;
  onSummaryPress?: (scan: ScanRecord) => void;
  onSettingsPress?: () => void;
  /** Call when user completes a task so parent can refresh streak. */
  onStreakChange?: () => void;
}

const FALLBACK_TASKS: { emoji: string; label: string }[] = [
  { emoji: '💇‍♂️', label: 'Find a haircut that suits your face' },
  { emoji: '🧵', label: 'Tidy and shape your eyebrows' },
  { emoji: '🧴', label: 'Wash your face morning and night' },
  { emoji: '🌞', label: 'Use a daily moisturizer and sunscreen' },
  { emoji: '🥤', label: 'Drink at least 2L of water today' },
];

/** Routine tasks driven by latest scores (and how recent your progress pics are). */
function getRoutineTasks(scan: ScanRecord): { emoji: string; label: string }[] {
  const { result, date } = scan;
  const tasks: { emoji: string; label: string }[] = [];

  const daysSinceScan = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );

  // Skin-focused tasks
  if (result.skinQuality < 60) {
    tasks.push({ emoji: '🧴', label: 'Wash your face morning and night' });
  }
  if (result.skinQuality < 70) {
    tasks.push({ emoji: '🌞', label: 'Use a daily moisturizer and sunscreen' });
  }

  // Hydration / overall health
  if (result.overall < 70) {
    tasks.push({ emoji: '🥤', label: 'Drink at least 2L of water today' });
  }

  // Structure / grooming
  if (result.jawline < 70 || result.cheekbones < 70 || result.masculinity < 70) {
    tasks.push({ emoji: '💇‍♂️', label: 'Style your hair with a more intentional look' });
  }
  if (result.masculinity < 65) {
    tasks.push({ emoji: '🧵', label: 'Tidy and shape your eyebrows' });
  }

  // Progress pics: if the last scan is a few days old, nudge a new one.
  if (daysSinceScan >= 3) {
    tasks.push({ emoji: '📸', label: 'Take a new progress pic today' });
  }

  // De-duplicate by label and cap at 4.
  const unique: { emoji: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const t of tasks) {
    if (seen.has(t.label)) continue;
    unique.push(t);
    seen.add(t.label);
    if (unique.length === 4) break;
  }

  if (unique.length < 4) {
    for (const t of FALLBACK_TASKS) {
      if (seen.has(t.label)) continue;
      unique.push(t);
      seen.add(t.label);
      if (unique.length === 4) break;
    }
  }

  return unique.slice(0, 4);
}

const DailyView: React.FC<DailyViewProps> = ({ scans, streak, onScanPress, onViewProgress, onSummaryPress, onSettingsPress, onStreakChange }) => {
  const [completionVersion, setCompletionVersion] = useState(0);
  const hasScan = scans.length > 0;
  const latestScan = hasScan ? scans[0] : null;
  const streakLabel = streak <= 0 ? '0 🔥 day streak' : `${streak} 🔥 day streak`;
  const routineTasks =
    latestScan && getStoredRoutine(latestScan.id)
      ? (getStoredRoutine(latestScan.id) as { emoji: string; label: string }[])
      : latestScan
      ? getRoutineTasks(latestScan)
      : [];
  const completedSet = latestScan ? new Set(getCompletedIndices(latestScan.id)) : new Set<number>();

  const handleTaskToggle = (taskIndex: number) => {
    if (!latestScan) return;
    const nowCompleted = toggleTaskCompleted(latestScan.id, taskIndex);
    if (nowCompleted) {
      recordTaskCompletion();
      onStreakChange?.();
    }
    setCompletionVersion((v) => v + 1);
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))' }}
    >
      {/* Header: streak (left) + settings (right) for empty; "Glow up routine" + settings for filled */}
      <header className="flex items-center justify-between px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-white">
          {hasScan ? 'Glow up routine' : streakLabel}
        </h1>
        <button
          type="button"
          onClick={onSettingsPress}
          className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Settings"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </header>

      <div className="flex-1 px-6 pb-8 min-h-0">
        {!hasScan ? (
          <>
            {/* Your progress - purple card with View + smiley */}
            <div
              className="rounded-2xl p-6 mb-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a78bfa 100%)',
                boxShadow: '0 0 40px rgba(124, 58, 237, 0.3)',
              }}
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <span className="absolute top-4 right-4 text-4xl">⭐</span>
                <span className="absolute top-12 right-12 text-2xl">✨</span>
                <span className="absolute bottom-8 left-8 text-2xl">☁️</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-4 relative">Your progress</h2>
              <div className="flex items-center justify-between gap-4 relative">
                <button
                  type="button"
                  onClick={onViewProgress ?? onScanPress}
                  className="shrink-0 py-3 px-8 rounded-xl bg-white text-purple-600 font-bold text-base"
                >
                  View
                </button>
                <span className="text-6xl" aria-hidden>😎</span>
              </div>
            </div>

            {/* Your routine - scan CTA */}
            <h2 className="text-white font-bold text-lg mb-3">Your routine</h2>
            <button
              type="button"
              onClick={onScanPress}
              className="w-full rounded-2xl border border-white/10 bg-zinc-800/60 hover:bg-zinc-800 py-12 px-6 text-white font-medium transition-colors"
            >
              Scan to get your daily glow up routine
            </button>
          </>
        ) : (
          <>
            {/* Latest scan summary card */}
            <button
              type="button"
              onClick={() => onSummaryPress?.(latestScan!)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-800/60 p-4 mb-6 flex items-center gap-4 text-left hover:bg-zinc-800 transition-colors"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-white/10">
                <img src={latestScan!.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1">
                  <div>
                    <span className="text-zinc-400 text-xs block">Overall</span>
                    <span className="text-white text-xl font-bold">{latestScan!.result.overall}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-xs block">Potential</span>
                    <span className="text-white text-xl font-bold">{latestScan!.result.potential}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${latestScan!.result.overall}%` }}
                  />
                </div>
              </div>
              <span className="text-zinc-500 shrink-0">&gt;</span>
            </button>

            <p className="text-white font-medium mb-4">{streakLabel}</p>

            {/* Routine tasks from analysis – tap to mark complete (counts toward streak) */}
            <div className="space-y-3 mb-6">
              {routineTasks.map((task, i) => {
                const completed = completedSet.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTaskToggle(i)}
                    className={`w-full rounded-xl py-3.5 px-4 flex items-center gap-3 border text-left transition-colors active:scale-[0.99] ${
                      completed ? 'border-green-500/30 bg-green-500/10' : 'border-white/5 bg-purple-500/20'
                    }`}
                  >
                    <span className="text-xl">{task.emoji}</span>
                    <span className="text-white font-medium flex-1">{task.label}</span>
                    {completed ? (
                      <span className="text-green-400" aria-hidden>✓</span>
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-white/30" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Progress picture */}
            <h2 className="text-white font-bold text-lg mb-3">Progress picture</h2>
            <button
              type="button"
              onClick={onViewProgress}
              className="w-full rounded-xl border border-white/10 bg-zinc-800/60 hover:bg-zinc-800 py-4 px-4 flex items-center gap-3 text-white font-medium transition-colors"
            >
              <span>📸</span>
              <span>View your progress pics</span>
              <span className="ml-auto text-zinc-500">&gt;</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyView;
