import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { rankFace, completeChallenge, declineChallenge } from '../lib/api';
import { CameraOverlay } from './CameraOverlay';
import type { CameraHandle } from './CameraOverlay';
import { Inbox, Swords, X, Loader2, Coins, Share2, Sparkles, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import * as htmlToImage from 'html-to-image';
import type { RankResult } from '../lib/api';

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
    const setIsCameraActive = useAppStore(state => state.setIsCameraActive);

    // Duel results state
    const [duelResult, setDuelResult] = useState<{
        result: RankResult;
        capturedImage: string;
        challengeId: string;
        challengerScore: number;
        challengerImage: string | null;
        challengerId: string;
    } | null>(null);
    const [isGeneratingCard, setIsGeneratingCard] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsCameraActive(!!activeChallengeId);
        return () => setIsCameraActive(false);
    }, [activeChallengeId, setIsCameraActive]);

    const activeChallenge = challenges.find(c => c.id === activeChallengeId);

    const handleDecline = async (id: string) => {
        try {
            await declineChallenge(id);
            await fetchChallenges();
        } catch (err: any) {
            alert(err.message || "Failed to decline challenge");
        }
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
                // Set the result to show the cool results screen
                setDuelResult({
                    result: res,
                    capturedImage: imageToScore,
                    challengeId: activeChallenge.id,
                    challengerScore: activeChallenge.challenger_score || 0,
                    challengerImage: activeChallenge.challenger_image_url || null,
                    challengerId: activeChallenge.profiles?.id || 'Player'
                });
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

    const handleShare = async () => {
        if (!resultRef.current) return;
        setIsGeneratingCard(true);
        try {
            const dataUrl = await htmlToImage.toJpeg(resultRef.current, {
                quality: 0.95,
                backgroundColor: '#0f172a'
            });
            const link = document.createElement('a');
            link.download = `looksrank-duel-${duelResult?.result.score}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to generate image', err);
            alert("Failed to save image. Please try again.");
        } finally {
            setIsGeneratingCard(false);
        }
    };

    if (duelResult) {
        const winner = duelResult.result.score > duelResult.challengerScore ? 'YOU' :
            duelResult.result.score < duelResult.challengerScore ? 'CHALLENGER' : 'TIE';

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center p-4 bg-dark-950/95 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
                <div className="w-full max-w-md flex flex-col gap-6 my-auto pt-8 pb-12">

                    {/* Winner Banner */}
                    <div className="text-center bg-dark-900/50 backdrop-blur-md py-6 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] aspect-square bg-gradient-radial from-primary-500/10 to-transparent pointer-events-none" />
                        <h3 className="text-yellow-400 font-black text-3xl uppercase tracking-tighter flex justify-center items-center gap-3 relative z-10">
                            <Sparkles className="w-8 h-8" />
                            {winner === 'TIE' ? "IT'S A TIE!" : winner === 'YOU' ? "YOU WIN!" : "YOU LOST!"}
                            <Sparkles className="w-8 h-8" />
                        </h3>
                        <p className="text-xs text-gray-400 uppercase tracking-[0.3em] mt-2 relative z-10 font-bold">
                            {winner === 'YOU' ? "Coins have been credited" : "Better luck next time"}
                        </p>
                    </div>

                    {/* Result Card Content (for sharing) */}
                    <div ref={resultRef} className="flex flex-col gap-6 p-6 rounded-3xl bg-dark-900 border border-white/10 shadow-2xl relative">
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {/* Challenger Card */}
                            <div className={clsx(
                                "p-3 flex flex-col items-center gap-2 rounded-2xl border transition-all overflow-hidden",
                                winner === 'CHALLENGER' ? "border-red-500 bg-red-500/10" : "border-white/5 opacity-60 bg-dark-800/50"
                            )}>
                                <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10 bg-dark-800">
                                    {duelResult.challengerImage ? (
                                        <img src={duelResult.challengerImage} alt="Challenger" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Inbox className="w-8 h-8 text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                <h4 className="font-bold text-[10px] text-gray-400 truncate w-full text-center uppercase tracking-widest">{duelResult.challengerId}</h4>
                                <div className="text-4xl font-black">{duelResult.challengerScore}</div>
                            </div>

                            {/* Your Card */}
                            <div className={clsx(
                                "p-3 flex flex-col items-center gap-2 rounded-2xl border transition-all overflow-hidden",
                                winner === 'YOU' ? "border-primary-500 bg-primary-500/10" : "border-white/5 opacity-60 bg-dark-800/50"
                            )}>
                                <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10">
                                    <img src={duelResult.capturedImage} alt="You" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="font-bold text-[10px] text-gray-400 truncate w-full text-center uppercase tracking-widest">YOU</h4>
                                <div className="text-4xl font-black">{Math.round(duelResult.result.score)}</div>
                            </div>
                        </div>

                        {/* Detailed Comparison */}
                        <div className="flex flex-col gap-3 px-1 w-full">
                            {['harmony', 'dimorphism', 'angularity', 'skin'].map((key) => {
                                const valYou = (duelResult.result.details as any)?.[key] || 0;
                                const valThem = Math.max(0, Math.min(100, duelResult.challengerScore * (0.8 + Math.random() * 0.4))); // Heuristic for visual comparison
                                const diff = valYou - valThem;

                                return (
                                    <div key={key} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-end text-[8px] font-bold uppercase tracking-widest text-gray-400 px-1">
                                            <span className={clsx(diff < 0 && "text-red-400")}>{Math.round(valThem)}%</span>
                                            <span className="text-gray-500 opacity-60 font-black">{key}</span>
                                            <span className={clsx(diff > 0 && "text-primary-400")}>{Math.round(valYou)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-dark-800 rounded-full overflow-hidden flex border border-white/5">
                                            <div
                                                className={clsx("h-full transition-all duration-1000", diff < 0 ? "bg-red-500" : "bg-dark-700")}
                                                style={{ width: `${(valThem / (valThem + valYou || 1)) * 100}%` }}
                                            />
                                            <div
                                                className={clsx("h-full transition-all duration-1000", diff > 0 ? "bg-primary-500" : "bg-dark-700")}
                                                style={{ width: `${(valYou / (valThem + valYou || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Your Detailed Rating Card (Inlined) */}
                        <div className="mt-4 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                            <div className="flex flex-col items-center">
                                <div className="text-xs font-black tracking-[0.2em] uppercase text-yellow-400 mb-1">{duelResult.result.tier}</div>
                                <div className="text-[10px] text-gray-500 font-mono bg-dark-800 px-3 py-1 rounded-full border border-white/10 uppercase">
                                    PSL: <span className="text-primary-400 font-bold">{duelResult.result.psl.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="w-full flex flex-col gap-2.5">
                                {Object.entries(duelResult.result.details || {}).map(([key, val]) => (
                                    <div key={key} className="flex flex-col gap-1 w-full">
                                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-500">
                                            <span>{key}</span>
                                            <span className="text-white font-mono">{val}/100</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary-500 to-indigo-400 rounded-full"
                                                style={{ width: `${val}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Brand watermark */}
                        <div className="flex justify-center items-center gap-2 opacity-50 mt-4">
                            <Swords className="w-3 h-3" />
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase">LooksRank Duel Match</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleShare}
                            disabled={isGeneratingCard}
                            className="py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold active:scale-95 transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
                        >
                            {isGeneratingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Share2 className="w-4 h-4" /> Share Card</>}
                        </button>
                        <button
                            onClick={() => {
                                setDuelResult(null);
                            }}
                            className="py-4 rounded-2xl bg-dark-800 hover:bg-dark-700 text-white font-bold active:scale-95 transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-widest"
                        >
                            <RefreshCw className="w-4 h-4" /> Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
