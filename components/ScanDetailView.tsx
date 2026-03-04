import React from 'react';
import type { ScanRecord } from '../types';

interface ScanDetailViewProps {
  scan: ScanRecord;
  onClose: () => void;
}

/** Score 1-100 → color for number and bar: red (low) → orange → yellow → green (good). */
function getScoreColor(score: number): string {
  if (score <= 30) return '#ef4444';
  if (score <= 50) return '#f97316';
  if (score <= 70) return '#eab308';
  return '#22c55e';
}

const ScanDetailView: React.FC<ScanDetailViewProps> = ({ scan, onClose }) => {
  const { thumbnail, result, date } = scan;
  const formattedDate = new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const MetricRow = ({ label, value }: { label: string; value?: number }) => {
    const position = value != null ? value : 0;
    const color = value != null ? getScoreColor(value) : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-zinc-200 text-sm font-medium">{label}</span>
        {value != null && (
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>
            {value}
          </span>
        )}
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

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center p-6 pb-12 overflow-y-auto" style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))' }}>
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Past scan</h1>
        <div className="w-10" />
      </div>
      <div className="w-full max-w-sm">
        <p className="text-zinc-500 text-xs text-center mb-3">{formattedDate}</p>
        <div className="w-28 h-28 rounded-full border-4 border-zinc-900 overflow-hidden shadow-2xl mx-auto mb-6">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
        <div
          className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 w-full"
          style={{
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.04), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 80px -20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-10">
            <MetricRow label="Overall" value={result.overall} />
            <MetricRow label="Potential" value={result.potential} />
            <MetricRow label="Masculinity" value={result.masculinity} />
            <MetricRow label="Skin quality" value={result.skinQuality} />
            <MetricRow label="Jawline" value={result.jawline} />
            <MetricRow label="Cheekbones" value={result.cheekbones} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanDetailView;
