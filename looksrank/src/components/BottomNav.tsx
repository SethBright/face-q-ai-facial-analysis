import React from 'react';
import { useAppStore } from '../lib/store';
import type { Tab } from '../lib/store';
import { Camera, Trophy, Swords, Inbox } from 'lucide-react';
import clsx from 'clsx';

export const BottomNav: React.FC = () => {
    const activeTab = useAppStore((state) => state.activeTab);
    const setActiveTab = useAppStore((state) => state.setActiveTab);

    const challenges = useAppStore((state) => state.challenges);
    const userId = useAppStore((state) => state.userId);
    const lastViewedInbox = useAppStore((state) => state.lastViewedInbox);

    const pendingCount = challenges.filter(c =>
        c.status === 'pending' &&
        c.target_id === userId &&
        (!lastViewedInbox || new Date(c.created_at) > new Date(lastViewedInbox))
    ).length;

    const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'leaderboard', label: 'Ranks', icon: <Trophy className="w-6 h-6" /> },
        { id: 'rank', label: 'Scan', icon: <Camera className="w-6 h-6" /> },
        { id: 'duel', label: 'Duel', icon: <Swords className="w-6 h-6" /> },
        { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-6 h-6" />, badge: pendingCount },
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full p-4 z-50">
            <div className="glass-panel w-full max-w-md mx-auto flex justify-around items-center p-2 rounded-full">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={clsx(
                                "relative flex flex-col items-center justify-center p-3 rounded-full transition-all duration-300",
                                isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            <div className={clsx(
                                "absolute inset-0 rounded-full transition-all duration-300",
                                isActive ? "primary-gradient opacity-100 scale-100" : "opacity-0 scale-75"
                            )} />
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <div className="relative">
                                    {item.icon}
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-dark-900">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                {isActive && (
                                    <span className="text-[10px] font-bold tracking-wider uppercase">
                                        {item.label}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
