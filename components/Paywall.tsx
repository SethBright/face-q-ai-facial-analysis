import React, { useState, useRef } from 'react';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../constants/legalUrls';

interface PaywallProps {
  onClose: () => void;
  /** Called when user completes purchase or restore (paywall will close). */
  onUnlock?: () => void | Promise<void>;
  /** Called to attempt purchase. Returns { success, error? }. */
  onPurchase: () => Promise<{ success: boolean; error?: string }>;
  /** Called to restore purchases. Returns { success, isPro, error? }. */
  onRestore: () => Promise<{ success: boolean; isPro: boolean; error?: string }>;
}

const PAYWALL_SLIDES = [
  {
    title: 'Get your ratings',
    content: 'ratings' as const,
  },
  {
    title: 'Improvement coach',
    content: 'coach' as const,
  },
  {
    title: 'Start improving',
    content: 'start' as const,
  },
  {
    title: 'Learn about yourself',
    content: 'learn' as const,
  },
];

const Paywall: React.FC<PaywallProps> = ({ onClose, onUnlock, onPurchase, onRestore }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleUnlock = async () => {
    setPurchaseError(null);
    setIsPurchasing(true);
    try {
      const result = await onPurchase();
      if (result.success) {
        onUnlock?.();
      } else {
        setPurchaseError(result.error ?? 'Purchase could not be completed. Please try again.');
      }
    } catch {
      setPurchaseError('Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchaseError(null);
    setIsPurchasing(true);
    try {
      const result = await onRestore();
      if (result.isPro) {
        onUnlock?.();
      } else {
        setPurchaseError(result.error ?? 'No active subscription found to restore.');
      }
    } catch {
      setPurchaseError('Restore failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, offsetWidth } = scrollRef.current;
      const index = Math.round(scrollLeft / offsetWidth);
      setCurrentSlide(index);
    }
  };

  const ratings = [
    { label: 'Overall', value: 68, high: false },
    { label: 'Potential', value: 91, high: true },
    { label: 'Jawline', value: 56, high: false },
    { label: 'Masculinity', value: 81, high: true },
    { label: 'Skin quality', value: 65, high: false },
    { label: 'Cheekbones', value: 76, high: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #1e1b4b 0%, #0f0a1e 40%, #000 100%)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pb-4" style={{ paddingTop: 'max(5rem, calc(env(safe-area-inset-top) + 2.5rem))' }}>
        <h1
          className="text-3xl font-extrabold text-white text-center tracking-tight"
          style={{ textShadow: '0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.2)' }}
        >
          LEVEL UP
        </h1>
        <p className="text-zinc-400 text-sm text-center mt-1.5">Proven to help you max your looks.</p>
      </div>

      {/* Carousel - flex row so slides sit side-by-side and swipe works */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth min-h-0 touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* Slide 1: Get your ratings (dot 1) */}
        <div className="flex-[0_0_100%] snap-center px-6 pb-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-800/60 rounded-[24px] p-6 border border-white/5">
            <h2 className="text-white font-bold text-lg mb-4">Get your ratings</h2>
            <div className="grid grid-cols-3 gap-3">
              {ratings.map(({ label, value, high }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs">{label}</span>
                    <span className="text-white text-sm font-bold">{value}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${value}%`,
                        backgroundColor: high ? '#22c55e' : '#f59e0b',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slide 2: Improvement coach (dot 2) */}
        <div className="flex-[0_0_100%] snap-center px-6 pb-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-800/60 rounded-[24px] p-6 border border-white/5">
            <h2 className="text-white font-bold text-lg mb-4">Improvement coach</h2>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-4 py-3 text-zinc-800 text-sm">
                  What&apos;s up! I&apos;m your personal self improvement coach. What are you looking to learn?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-[#7c3aed] rounded-2xl rounded-br-sm px-4 py-3 text-white text-sm">
                  How do I become more attractive?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-4 py-3 text-zinc-800 text-sm">
                  Becoming more attractive includes a few different steps. You can start by...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 3: Start improving (dot 3) */}
        <div className="flex-[0_0_100%] snap-center px-6 pb-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-800/60 rounded-[24px] p-6 border border-white/5">
            <h2 className="text-white font-bold text-lg mb-4">Start improving</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-amber-400/80 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">Start a skincare routine</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Skincare routines are crucial for a clear, healthy face. Tap to learn more.
                  </p>
                </div>
                <span className="text-zinc-500 text-lg shrink-0">&gt;</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-sky-400/60 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">Diamond face styling</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    You have a diamond face shape... let&apos;s teach you how to style it!
                  </p>
                </div>
                <span className="text-zinc-500 text-lg shrink-0">&gt;</span>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 4: Learn about yourself (dot 4) */}
        <div className="flex-[0_0_100%] snap-center px-6 pb-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-800/60 rounded-[24px] p-6 border border-white/5">
            <h2 className="text-white font-bold text-lg mb-4">Learn about yourself</h2>
            <div className="space-y-4">
              {[
                { label: 'Canthal Tilt', value: 'Positive' },
                { label: 'Face Shape', value: 'Diamond' },
                { label: 'Eye Shape', value: 'Almond' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-zinc-400 text-sm">{label}</span>
                  <span className="text-white font-bold text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 py-2 shrink-0">
        {PAYWALL_SLIDES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentSlide ? 'bg-white w-2.5 h-2' : 'bg-zinc-600 w-2 h-2'
            }`}
          />
        ))}
      </div>

      {/* CTA + Pricing + Footer */}
      <div
        className="shrink-0 px-6 pt-4 pb-8 flex flex-col items-center gap-3"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        {purchaseError && (
          <p className="text-red-400 text-sm text-center mb-2">{purchaseError}</p>
        )}
        <button
          onClick={handleUnlock}
          disabled={isPurchasing}
          className="w-full max-w-sm py-4 px-6 rounded-[20px] font-bold text-white text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.5), 0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {isPurchasing ? 'Processing…' : <>Unlock now <span>👏</span></>}
        </button>
        <p className="text-zinc-500 text-sm">$3.99 per week</p>
        <div className="flex justify-center gap-6 text-zinc-500 text-xs mt-2">
          <button type="button" onClick={() => TERMS_OF_USE_URL && window.open(TERMS_OF_USE_URL, '_blank')} className="hover:text-zinc-400 transition-colors disabled:opacity-50" disabled={!TERMS_OF_USE_URL}>Terms of Use</button>
          <button type="button" onClick={handleRestore} disabled={isPurchasing} className="hover:text-zinc-400 transition-colors disabled:opacity-50">Restore Purchase</button>
          <button type="button" onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')} className="hover:text-zinc-400 transition-colors">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
};

export default Paywall;
