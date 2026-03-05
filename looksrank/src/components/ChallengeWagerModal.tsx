import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { X, Swords, Coins, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CameraOverlay } from './CameraOverlay';
import type { CameraHandle } from './CameraOverlay';
import { rankFace } from '../lib/api';
import clsx from 'clsx';

interface ChallengeWagerModalProps {
    targetId: string;
    targetName: string;
    targetScore: number;
    onClose: () => void;
}

export const ChallengeWagerModal: React.FC<ChallengeWagerModalProps> = ({ targetId, targetName, targetScore, onClose }) => {
    const userId = useAppStore(state => state.userId);
    const coins = useAppStore(state => state.coins);
    const deductCoins = useAppStore(state => state.deductCoins);
    const fetchChallenges = useAppStore(state => state.fetchChallenges);
    const [wager, setWager] = useState<number>(10);
    const [isSent, setIsSent] = useState(false);
    const [phase, setPhase] = useState<'wager' | 'camera'>('wager');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const cameraRef = useRef<CameraHandle>(null);

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const maxWager = Math.max(4, Math.min(coins, 500));

    const handleSendChallenge = async () => {
        if (coins < wager || !userId || !cameraRef.current) return;

        const image = cameraRef.current.capture();
        if (!image) {
            alert("Please allow camera access to capture your selfie!");
            return;
        }

        setIsAnalyzing(true);

        try {
            // 1. Analyze the face FIRST (so we don't charge if it fails)
            const res = await rankFace(image);

            // 2. Insert into Supabase with the new score
            const { error } = await supabase
                .from('challenges')
                .insert({
                    challenger_id: userId,
                    target_id: targetId,
                    wager: wager,
                    challenger_score: res.score,
                    status: 'pending'
                });

            if (error) throw error;

            // 3. Deduct coins ONLY after everything succeeded
            await deductCoins(wager);
            setIsSent(true);

            // Refresh challenges locally
            setTimeout(() => {
                fetchChallenges();
                onClose();
            }, 2000);
        } catch (err: any) {
            alert(err.message || "Failed to send challenge");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm glass-panel p-6 shadow-2xl shadow-primary-500/20 border border-primary-500/30 animate-in zoom-in-95 duration-300 relative overflow-y-auto max-h-[90vh] custom-scrollbar">

                {isSent ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in zoom-in-50">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center border-2 border-green-500">
                            <Swords className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-white px-4 text-center">Challenge Sent!</h2>
                        <p className="text-sm font-mono text-gray-400 text-center px-4">
                            {wager} coins locked in escrow.<br />Waiting for {targetName} to accept.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                                <Swords className="w-5 h-5" /> Challenge
                            </h2>
                            <button onClick={onClose} className="p-2 bg-dark-800 rounded-full hover:bg-dark-700 transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className={clsx("flex flex-col items-center gap-1 mb-6 text-center transition-all duration-300", phase === 'camera' ? "scale-90 opacity-80" : "scale-100")}>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Target to Beat</div>
                            <div className={clsx("font-black text-white transition-all", phase === 'camera' ? "text-2xl" : "text-4xl")}>
                                {Math.round(targetScore)}
                            </div>
                            <div className="text-[10px] text-primary-300 font-mono bg-primary-500/10 px-3 py-0.5 rounded-full border border-primary-500/20">
                                {targetName}
                            </div>
                        </div>

                        {phase === 'wager' ? (
                            <>
                                <div className="flex flex-col gap-3 p-4 bg-dark-800/80 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex justify-between items-center text-sm font-bold text-gray-300">
                                        <span className="uppercase tracking-widest text-[10px] text-gray-500">Wager Amount</span>
                                        <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" /> {wager}</span>
                                    </div>

                                    <input
                                        type="range"
                                        min="4"
                                        max={maxWager}
                                        step="1"
                                        value={wager}
                                        onChange={(e) => setWager(Number(e.target.value))}
                                        className="w-full h-2 bg-dark-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        disabled={coins < 4}
                                    />

                                    <div className="grid grid-cols-4 gap-2">
                                        {[10, 50, 100, maxWager].map((amt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setWager(Math.max(4, amt))}
                                                disabled={coins < amt}
                                                className="py-2 ml-0.5 mr-0.5 rounded-lg bg-dark-900 border border-white/5 text-xs font-mono text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 transition-colors disabled:opacity-30 disabled:hover:border-white/5 disabled:hover:text-gray-400"
                                            >
                                                {i === 3 ? 'MAX' : amt}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-1 mt-2">
                                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex justify-between">
                                            <span>Your Bet: {wager}</span>
                                            <span>Opponent Match: {wager}</span>
                                        </div>
                                        <div className="text-[10px] text-primary-400 font-black text-center mt-1">
                                            TOTAL POT: {wager * 2} COINS
                                        </div>
                                    </div>

                                    {coins < 4 && (
                                        <div className="text-xs text-red-400 text-center font-bold mt-2">Not enough coins to challenge</div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setPhase('camera')}
                                    disabled={coins < wager}
                                    className="w-full mt-4 py-4 rounded-xl primary-gradient text-white font-black uppercase tracking-widest text-sm active:scale-95 transition-all shadow-lg shadow-primary-500/20"
                                >
                                    Next: Take Selfie
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-300">
                                <div className="relative aspect-[3/4] glass-panel overflow-hidden border-2 border-primary-500/30 shadow-2xl rounded-2xl">
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-dark-900/80 backdrop-blur-sm animate-in fade-in">
                                            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                                            <p className="font-bold text-xs tracking-[0.2em] uppercase text-white">Analyzing...</p>
                                        </div>
                                    )}
                                    <CameraOverlay ref={cameraRef} isScanning={isAnalyzing} onCapture={() => { }} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPhase('wager')}
                                        disabled={isAnalyzing}
                                        className="py-4 rounded-xl bg-dark-800 text-gray-400 font-bold uppercase text-xs tracking-widest border border-white/5 active:scale-95 transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSendChallenge}
                                        disabled={isAnalyzing}
                                        className="py-4 rounded-xl primary-gradient text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex justify-center items-center gap-2"
                                    >
                                        {isAnalyzing ? 'SENDING...' : `SEND (-${wager})`}
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">Coins deducted only after scan</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
