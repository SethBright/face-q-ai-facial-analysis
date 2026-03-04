import React from 'react';
import type { GenderPreference } from '../services/genderPreferenceStorage';

/* Matches main app "Begin scan" / primary CTA: rounded-[20px], gradient, subtle glow */
const BUTTON_CLASS =
  'w-full max-w-sm py-3.5 text-white text-base font-bold rounded-[20px] shadow-[0_0_20px_rgba(139,49,255,0.3)] bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] hover:opacity-95 active:scale-[0.98] transition-all border border-white/5';

interface OnboardingScreenProps {
  onComplete: (gender: GenderPreference | null) => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  return (
    <div
      className="min-h-screen max-w-md mx-auto bg-zinc-900 flex flex-col text-white"
      style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold text-white text-center mb-10">Choose gender</h1>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button
            type="button"
            onClick={() => onComplete('male')}
            className={BUTTON_CLASS}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => onComplete('female')}
            className={BUTTON_CLASS}
          >
            Female
          </button>
        </div>
      </div>

      <div className="flex justify-center pt-6 pb-2">
        <button
          type="button"
          onClick={() => onComplete(null)}
          className="text-zinc-500 hover:text-zinc-400 text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
