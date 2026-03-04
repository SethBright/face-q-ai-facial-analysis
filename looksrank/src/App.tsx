import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { useAppStore } from './lib/store';

import { RankScreen } from './components/RankScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { DuelScreen } from './components/DuelScreen';
import { InboxScreen } from './components/InboxScreen';
import { OnboardingModal } from './components/OnboardingModal';

function App() {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const activeTab = useAppStore((state) => state.activeTab);
  const displayName = useAppStore((state) => state.displayName);

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

  return (
    <div className="min-h-screen bg-dark-900 text-white font-sans flex flex-col select-none [-webkit-tap-highlight-color:transparent]">
      {!displayName && <OnboardingModal />}

      <div className="max-w-md mx-auto w-full relative min-h-screen flex flex-col shadow-2xl bg-dark-800/20">
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-24 relative z-0 hide-scrollbar">
          {activeTab === 'rank' && <RankScreen />}
          {activeTab === 'leaderboard' && <LeaderboardScreen />}
          {activeTab === 'duel' && <DuelScreen />}
          {activeTab === 'inbox' && <InboxScreen />}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

export default App;
