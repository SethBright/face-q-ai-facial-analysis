import React from 'react';
import { MAX_SCANS_PER_WEEK } from '../services/usageStorage';
import { MAX_COACH_MESSAGES_PER_WEEK } from '../services/coachUsageStorage';

interface LimitReachedModalProps {
  resetDate: string;
  onClose: () => void;
  /** Default: scan limit message */
  variant?: 'scan' | 'coach';
}

const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ resetDate, onClose, variant = 'scan' }) => {
  const isCoach = variant === 'coach';
  const title = 'Weekly limit reached';
  const message = isCoach
    ? `You've used all ${MAX_COACH_MESSAGES_PER_WEEK} coach messages this week. Your limit resets ${resetDate}.`
    : `You've used all ${MAX_SCANS_PER_WEEK} scans this week. Your limit resets ${resetDate}.`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[24px] bg-zinc-900 border border-white/10 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm text-center mb-6">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] active:scale-[0.98] transition-transform"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default LimitReachedModal;
