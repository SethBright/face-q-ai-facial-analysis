import React, { useState, useEffect } from 'react';
import { Trophy, Star, Swords, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ChallengeWagerModal } from './ChallengeWagerModal';

export const LeaderboardScreen: React.FC = () => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'all-time'>('daily');
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<any[]>([]);
    const bestToday = useAppStore(state => state.bestToday);
    const [challengeTarget, setChallengeTarget] = useState<{ id: string, name: string, score: number } | null>(null);

    useEffect(() => {
        fetchLeaderboard();
    }, [period]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        let column = 'best_today';
        if (period === 'weekly') column = 'best_weekly';
        if (period === 'all-time') column = 'best_all_time';

        const { data, error } = await supabase
            .from('profiles')
            .select('id, coins, best_today, best_weekly, best_all_time, tier, avatar_url')
            .gt(column, 0) // Only show users who have done a rating
            .order(column, { ascending: false })
            .limit(500); // Show top 500

        if (!error && data) {
            setEntries(data);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-4 p-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">

            {/* Tabs */}
            <div className="flex bg-dark-800 rounded-full p-1 border border-white/5">
                {(['daily', 'weekly', 'all-time'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setPeriod(tab)}
                        className={clsx(
                            "flex-1 py-2 text-sm font-bold capitalize rounded-full transition-all duration-300",
                            period === tab
                                ? "bg-dark-700 text-white shadow-md shadow-black/20"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Your Rank summary */}
            <div className="p-4 rounded-3xl primary-gradient text-white flex items-center justify-between shadow-lg shadow-primary-500/20 mb-2 border border-white/20">
                <div>
                    <h3 className="font-bold">Your Best Today</h3>
                    <p className="text-3xl font-black">{bestToday > 0 ? Math.round(bestToday) : '--'}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3 pb-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                        <p className="text-gray-500 font-bold text-xs tracking-widest uppercase">Fetching Arena Ranking...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="glass-panel p-10 text-center rounded-3xl border border-white/5 text-gray-500 font-mono text-sm leading-relaxed">
                        The arena is empty.<br />Start scanning to take the throne.
                    </div>
                ) : (
                    entries.map((entry, idx) => (
                        <div
                            key={entry.id}
                            className="flex items-center gap-4 p-3 rounded-2xl bg-dark-800/80 border border-white/5 shadow-md hover:bg-dark-700/80 transition-colors"
                        >
                            <div className="w-8 flex justify-center font-black text-lg text-gray-500">
                                {idx === 0 ? <Trophy className="w-6 h-6 text-yellow-400 fill-yellow-400/20" /> :
                                    idx === 1 ? <Trophy className="w-6 h-6 text-gray-300 fill-gray-300/20" /> :
                                        idx === 2 ? <Trophy className="w-6 h-6 text-amber-600 fill-amber-600/20" /> :
                                            idx + 1}
                            </div>

                            <div className="w-12 h-12 rounded-full border border-white/10 bg-dark-900 flex items-center justify-center font-black text-primary-500 text-sm overflow-hidden shrink-0">
                                {entry.avatar_url ? (
                                    <img
                                        src={entry.avatar_url}
                                        alt={entry.username}
                                        className="w-full h-full object-cover animate-in fade-in duration-500"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerText = entry.id.substring(0, 2).toUpperCase();
                                        }}
                                    />
                                ) : (
                                    entry.username.substring(0, 2).toUpperCase()
                                )}
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-base truncate pr-2 tracking-tight">{entry.id}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="max-w-fit text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-dark-900 border border-white/5 text-gray-400">
                                        {entry.tier || 'ROOKIE'}
                                    </p>
                                    <span className="text-[10px] text-gray-600 font-bold">{entry.coins} Coins</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 text-right min-w-[60px]">
                                <div className="font-black text-2xl leading-none bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500">
                                    {Math.round(period === 'daily' ? entry.best_today : entry.best_all_time)}
                                </div>

                                {/* Fight button for everyone except #1 or yourself */}
                                {idx > 0 && entry.id !== useAppStore.getState().userId && (
                                    <button
                                        onClick={() => setChallengeTarget({ id: entry.id, name: entry.username, score: period === 'daily' ? entry.best_today : entry.best_all_time })}
                                        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-primary-400 hover:text-white transition-colors bg-primary-500/10 hover:bg-primary-500/30 px-2 py-0.5 rounded border border-primary-500/20"
                                    >
                                        <Swords className="w-3 h-3" /> Fight
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {challengeTarget && (
                <ChallengeWagerModal
                    targetId={challengeTarget.id}
                    targetName={challengeTarget.id}
                    targetScore={challengeTarget.score}
                    onClose={() => setChallengeTarget(null)}
                />
            )}
        </div>
    );
};
