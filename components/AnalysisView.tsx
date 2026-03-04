import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisViewProps {
  result: AnalysisResult | null;
  isLoading?: boolean;
  image: string;
  isPro?: boolean;
  onClose: () => void;
  onGetPro: () => void;
  onRetryAnalysis?: () => void;
}

/** Score 1-100 → color for number and bar: red (low) → orange → yellow → green (good). */
function getScoreColor(score: number): string {
  if (score <= 30) return '#ef4444';   // red – very low
  if (score <= 50) return '#f97316';   // orange – bad
  if (score <= 70) return '#eab308';   // yellow – middle
  return '#22c55e';                    // green – good
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, isLoading, image, isPro, onClose, onGetPro, onRetryAnalysis }) => {
  const isLocked = result === null;
  const showPaywall = isLocked && !isPro;

  /** Placeholder digits when locked so the number slot is visible but blurred (per-metric so layout is consistent). */
  const LOCKED_PLACEHOLDERS: Record<string, number> = {
    Overall: 72,
    Potential: 68,
    Masculinity: 65,
    'Skin quality': 78,
    Jawline: 71,
    Cheekbones: 74,
  };

  const MetricRow = ({ label, value, blurred }: { label: string; value?: number; blurred?: boolean }) => {
    const displayValue = value ?? LOCKED_PLACEHOLDERS[label] ?? 72;
    const position = value != null ? value : 0;
    const color = blurred ? undefined : getScoreColor(displayValue);
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-zinc-200 text-sm font-medium">{label}</span>
        <span
          className={`text-2xl font-bold tabular-nums ${blurred ? 'select-none text-zinc-500' : ''}`}
          style={blurred ? { filter: 'blur(6px)', userSelect: 'none' } : color ? { color } : undefined}
        >
          {displayValue}
        </span>
        <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${position}%`,
              backgroundColor: color ?? 'rgba(255,255,255,0.4)',
            }}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin mb-10 shadow-[0_0_30px_rgba(139,49,255,0.2)]" />
        <h2 className="text-2xl font-bold text-white mb-4 animate-pulse">Deep Analyzing...</h2>
        <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
          Evaluating structural symmetry and facial balance using AI...
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 pb-12 animate-in slide-in-from-bottom duration-500 overflow-y-auto overflow-x-hidden"
      style={{ paddingTop: 'max(5rem, calc(env(safe-area-inset-top) + 2.5rem))' }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute left-5 z-50 rounded-full bg-zinc-900/90 border border-white/10 p-2.5 text-zinc-200 hover:bg-zinc-800 transition-colors"
        style={{ top: 'max(4.75rem, calc(env(safe-area-inset-top) + 3.25rem))' }}
        aria-label="Close results"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col items-center mb-16 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-2 justify-center">
          {isPro || !isLocked ? 'Ratings' : '👀 Reveal your results'}
        </h2>
        {showPaywall && (
          <p className="text-zinc-500 text-sm max-w-[280px]">
            Get Looks IQ Pro to view your results
          </p>
        )}
      </div>

      <div className="relative w-full max-w-sm">
        {/* Profile Picture Circle */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-zinc-950 overflow-hidden z-20 shadow-2xl">
          <img src={image} alt="User" className="w-full h-full object-cover" />
        </div>

        {/* Results Card - subtle diffuse glow */}
        <div
          className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 pt-20"
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 80px -20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-10">
            <MetricRow label="Overall" value={result?.overall} blurred={isLocked} />
            <MetricRow label="Potential" value={result?.potential} blurred={isLocked} />
            <MetricRow label="Masculinity" value={result?.masculinity} blurred={isLocked} />
            <MetricRow label="Skin quality" value={result?.skinQuality} blurred={isLocked} />
            <MetricRow label="Jawline" value={result?.jawline} blurred={isLocked} />
            <MetricRow label="Cheekbones" value={result?.cheekbones} blurred={isLocked} />
          </div>
        </div>
      </div>

      {showPaywall && (
        <div className="w-full max-w-sm mt-12">
          <button
            className="w-full py-5 bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] hover:opacity-95 active:scale-[0.98] text-white text-lg font-bold rounded-[30px] shadow-xl transition-all flex items-center justify-center gap-2"
            onClick={onGetPro}
          >
            <span>💪</span> Get Looks IQ Pro
          </button>
        </div>
      )}
      {isPro && isLocked && onRetryAnalysis && (
        <div className="w-full max-w-sm mt-12">
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="w-full py-5 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white text-lg font-bold rounded-[30px] border border-white/20 transition-all"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
