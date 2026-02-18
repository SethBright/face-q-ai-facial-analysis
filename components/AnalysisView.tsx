
import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisViewProps {
  result: AnalysisResult | null;
  isLoading?: boolean;
  image: string;
  onClose: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, isLoading, image, onClose }) => {
  const MetricRow = ({ label, value }: { label: string; value?: number }) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-zinc-200 text-sm font-medium">{label}</span>
      </div>
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-shimmer" />
        ) : (
          <>
            {/* Blurred Teaser Overlay */}
            <div className="absolute inset-0 bg-white/10 blur-[6px] rounded-full scale-x-[0.6] origin-left" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-purple-400/30 blur-md w-[80%]" />
          </>
        )}
      </div>
    </div>
  );

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

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 pb-12 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col items-center mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-2 justify-center">
          👀 Reveal your results
        </h2>
        <p className="text-zinc-500 text-sm max-w-[280px]">
          Invite 3 friends or get Face-Q Pro to view your results
        </p>
      </div>

      <div className="relative w-full max-w-sm">
        {/* Profile Picture Circle */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-zinc-950 overflow-hidden z-20 shadow-2xl">
          <img src={image} alt="User" className="w-full h-full object-cover" />
        </div>

        {/* Results Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 pt-20 shadow-2xl">
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

      <div className="w-full max-w-sm mt-12 space-y-4">
        <button 
          className="w-full py-5 bg-[#8b31ff] hover:bg-[#9d4edd] active:scale-[0.98] text-white text-lg font-bold rounded-[30px] shadow-xl transition-all flex items-center justify-center gap-2"
          onClick={() => alert("Upgrade to Face-Q Pro to unlock your full analysis!")}
        >
          <span>💪</span> Get Face-Q Pro
        </button>
        <button 
          onClick={onClose}
          className="w-full py-5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white text-lg font-bold rounded-[30px] transition-all active:scale-[0.98]"
        >
          Invite 3 Friends
        </button>
      </div>
    </div>
  );
};

export default AnalysisView;
