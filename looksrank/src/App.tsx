import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { useAppStore } from './lib/store';

import { RankScreen } from './components/RankScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { DuelScreen } from './components/DuelScreen';
import { InboxScreen } from './components/InboxScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { LegalModal } from './components/LegalModal';
import { CookieConsent } from './components/CookieConsent';
import { NotFound } from './components/NotFound';
import { useState } from 'react';

function App() {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const activeTab = useAppStore((state) => state.activeTab);
  const displayName = useAppStore((state) => state.displayName);
  const [is404, setIs404] = useState(window.location.pathname !== '/');
  const [legalType, setLegalType] = useState<'privacy' | 'terms' | 'support' | null>(null);

  useEffect(() => {
    useAppStore.getState().initializeAuth();

    // Subscribe to real-time challenges globally so notification badge stays in sync
    const unsubscribe = useAppStore.getState().subscribeToChallenges();
    return () => unsubscribe();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-primary-500 border-white/10 animate-spin" />
      </div>
    );
  }

  if (is404) {
    return <NotFound onReset={() => setIs404(false)} />;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white font-sans flex flex-col select-none [-webkit-tap-highlight-color:transparent]">
      {!displayName && <OnboardingModal />}
      <CookieConsent />

      <div className="max-w-md mx-auto w-full relative min-h-screen flex flex-col shadow-2xl bg-dark-800/20">
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-4 relative z-0 hide-scrollbar flex flex-col">
          <div className="flex-1">
            {activeTab === 'rank' && <RankScreen />}
            {activeTab === 'leaderboard' && <LeaderboardScreen />}
            {activeTab === 'duel' && <DuelScreen />}
            {activeTab === 'inbox' && <InboxScreen />}
          </div>

          {/* Subtle Footer Links */}
          <div className="mt-8 mb-24 px-6 flex justify-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
            <button onClick={() => setLegalType('privacy')} className="hover:text-white transition-colors">Privacy</button>
            <span>•</span>
            <button onClick={() => setLegalType('terms')} className="hover:text-white transition-colors">Terms</button>
            <span>•</span>
            <button onClick={() => setLegalType('support')} className="hover:text-white transition-colors">Support</button>
          </div>
        </main>

        <BottomNav />
      </div>

      {legalType && (
        <LegalModal
          type={legalType}
          onClose={() => setLegalType(null)}
        />
      )}
    </div>
  );
}

export default App;
