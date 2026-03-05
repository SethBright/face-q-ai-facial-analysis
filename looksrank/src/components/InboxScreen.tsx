import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { rankFace, completeChallenge } from '../lib/api';
import { CameraOverlay } from './CameraOverlay';
import type { CameraHandle } from './CameraOverlay';
import { Inbox, Swords, X, Loader2, Coins } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';

export const InboxScreen: React.FC = () => {
    const challenges = useAppStore(state => state.challenges);
    const fetchChallenges = useAppStore(state => state.fetchChallenges);
    const userId = useAppStore(state => state.userId);
    const addCoins = useAppStore(state => state.addCoins);
    const deductCoins = useAppStore(state => state.deductCoins);
    const coins = useAppStore(state => state.coins);

    const markInboxAsRead = useAppStore(state => state.markInboxAsRead);

    useEffect(() => {
        if (userId) {
            fetchChallenges();
            markInboxAsRead();
        }
    }, [userId, fetchChallenges, markInboxAsRead]);

    const pendingReceived = challenges.filter(c => c.status === 'pending' && c.target_id === userId);
    const pendingSent = challenges.filter(c => c.status === 'pending' && c.challenger_id === userId);
    const pastChallenges = challenges.filter(c => c.status !== 'pending');

    const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const cameraRef = useRef<CameraHandle>(null);

    const activeChallenge = challenges.find(c => c.id === activeChallengeId);

    const handleDecline = async (id: string) => {
        await supabase.from('challenges').update({ status: 'declined' }).eq('id', id);
        await fetchChallenges();
    };

    const handleAcceptAndScan = async () => {
        if (!activeChallenge) return;
        if (coins < activeChallenge.wager) {
            alert("You don't have enough coins to match this wager!");
            return;
        }

        let imageToScore = null;
        if (cameraRef.current) {
            imageToScore = cameraRef.current.capture();
        }

        if (!imageToScore) {
            alert("Please allow camera access to scan!");
            return;
        }

        // Deduct matching wager from our balance instantly
        await deductCoins(activeChallenge.wager);

        setIsScanning(true);

        try {
            const res = await rankFace(imageToScore);
            setIsScanning(false);

            // We use the backend to handle payouts securely
            const fulfillRes = await completeChallenge(activeChallenge.id, userId!, res.score);

            if (fulfillRes.success) {
                // If the user won, they get the payout.
                // We don't call addCoins here because the profile update will sync it on refresh,
                // but for immediate feedback we should probably refresh the store coins.
                // However, fetchChallenges normally updates the UI.

                // Alert the user of the result
                alert(fulfillRes.message);
            }
        } catch (err: any) {
            console.error("Fulfillment error:", err);
            alert(err.message || "Analysis failed.");
            await addCoins(activeChallenge.wager); // Refund matching bet on fail
        } finally {
            setIsScanning(false);
            await fetchChallenges();
            // We should also refresh the profile to see the new coin balance
            useAppStore.getState().initializeAuth();
            setActiveChallengeId(null);
        }
    };

    if (activeChallengeId && activeChallenge) {
        return (
            <div className="flex flex-col gap-6 p-4 pt-8 animate-in slide-in-from-right duration-300 h-full">
                <button onClick={() => setActiveChallengeId(null)} className="flex items-center gap-2 text-gray-400 hover:text-white font-bold uppercase text-xs tracking-widest">
                    <X className="w-4 h-4" /> Cancel
                </button>

                <div className="text-center">
                    <h2 className="text-xl font-black uppercase tracking-wider text-red-500 flex justify-center items-center gap-2">
                        <Swords className="w-5 h-5" /> Versus {activeChallenge.profiles?.id || 'Player'}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">You must score higher than <strong className="text-white text-lg">{activeChallenge.challenger_score || 0}</strong></p>
                </div>

                <div className="glass-panel p-4 flex justify-between items-center rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
                    <div className="text-xs uppercase tracking-widest font-bold text-yellow-500">Pot Size</div>
                    <div className="flex items-center gap-1 font-black text-2xl text-yellow-400">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        {activeChallenge.wager * 2}
                    </div>
                </div>

                <div className="relative aspect-[3/4] glass-panel overflow-hidden flex flex-col items-center justify-center border-2 border-white/5 shadow-2xl">
                    {isScanning ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-dark-900/80 backdrop-blur-sm">
                            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                            <p className="font-bold text-sm tracking-widest uppercase text-white">Analyzing...</p>
                        </div>
                    ) : null}
                    <CameraOverlay ref={cameraRef} isScanning={isScanning} onCapture={() => { }} />
                </div>

                <button
                    onClick={handleAcceptAndScan}
                    disabled={isScanning || coins < activeChallenge.wager}
                    className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                    {isScanning ? 'EVALUATING...' : `MATCH & FIGHT (-${activeChallenge.wager} Coins)`}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 pt-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dark-800 rounded-full flex items-center justify-center border border-white/10">
                    <Inbox className="w-5 h-5 text-gray-300" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-widest">Inbox</h1>
            </div>

            <div className="flex flex-col gap-4">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Action Required</h2>
                {pendingReceived.length === 0 ? (
                    <div className="glass-panel p-6 text-center rounded-2xl border border-white/5 text-gray-500 font-mono text-sm">
                        No pending challenges.
                    </div>
                ) : (
                    pendingReceived.map(challenge => (
                        <div key={challenge.id} className="glass-panel p-4 rounded-2xl flex flex-col gap-3 border border-red-500/20 bg-red-500/5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Challenged by</div>
                                    <div className="font-black text-xl text-white">{challenge.profiles?.id || 'Player'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Target Score</div>
                                    <div className="font-black text-2xl text-red-400">{challenge.challenger_score || 0}</div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/5 my-1" />

                            <div className="flex justify-between items-center relative z-10">
                                <span className="flex items-center gap-1 font-bold text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full text-sm border border-yellow-500/20">
                                    <Coins className="w-4 h-4" /> Wager: {challenge.wager}
                                </span>

                                <div className="flex gap-2">
                                    <button onClick={() => handleDecline(challenge.id)} className="w-10 h-10 rounded-full bg-dark-800 hover:bg-dark-700 flex items-center justify-center border border-white/10 transition-colors">
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button onClick={() => setActiveChallengeId(challenge.id)} className="px-4 h-10 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center font-bold text-sm tracking-widest text-white shadow-lg shadow-red-500/20 transition-all">
                                        MATCH & FIGHT
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {pendingSent.length > 0 && (
                <div className="flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sent Challenges</h2>
                    {pendingSent.map(challenge => (
                        <div key={challenge.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-white/10 bg-white/5 opacity-80">
                            <div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Waiting for</div>
                                <div className="font-bold text-white">{challenge.profiles?.id || 'Player'}</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Wager</div>
                                <div className="flex items-center gap-1 font-black text-yellow-400">
                                    <Coins className="w-3 h-3" /> {challenge.wager}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {pastChallenges.length > 0 && (
                <div className="flex flex-col gap-3 mt-4">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">History</h2>
                    <div className="flex flex-col gap-2">
                        {pastChallenges.map(c => (
                            <div key={c.id} className="bg-dark-800 p-3 rounded-xl border border-white/5 flex items-center justify-between opacity-80">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold truncate">vs {c.profiles?.id || 'Player'}</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-widest font-mono">
                                        {c.status === 'declined' ? 'Declined' : c.winner_id === userId ? 'Won' : 'Lost'}
                                    </span>
                                </div>
                                <span className={clsx(
                                    "text-sm font-black font-mono",
                                    c.status === 'declined' ? "text-gray-500" :
                                        c.winner_id === userId ? "text-green-400" : "text-red-400"
                                )}>
                                    {c.status === 'declined' ? '0' : c.winner_id === userId ? `+${Math.floor(c.wager * 0.85)}` : `-${c.wager}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <p className="text-center text-xs text-gray-500 mt-6 font-mono leading-relaxed mb-4">
                Challenge Arena Active.
            </p>
        </div>
    );
};
