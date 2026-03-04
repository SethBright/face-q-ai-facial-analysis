import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { X, Swords, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

    const maxWager = Math.max(4, Math.min(coins, 500));

    const handleSendChallenge = async () => {
        if (coins < wager || !userId) return;

        try {
            // Actually insert into Supabase
            const { error } = await supabase
                .from('challenges')
                .insert({
                    challenger_id: userId,
                    target_id: targetId,
                    wager: wager,
                    status: 'pending'
                });

            if (error) throw error;

            await deductCoins(wager);
            setIsSent(true);

            // Refresh challenges locally
            setTimeout(() => {
                fetchChallenges();
                onClose();
            }, 2000);
        } catch (err: any) {
            alert("Failed to send challenge: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm glass-panel p-6 shadow-2xl shadow-primary-500/20 border border-primary-500/30 animate-in zoom-in-95 duration-300 relative overflow-hidden">

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

                        <div className="flex flex-col items-center gap-2 mb-6 text-center">
                            <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">Target to Beat</div>
                            <div className="text-4xl font-black text-white">{Math.round(targetScore)}</div>
                            <div className="text-xs text-primary-300 font-mono bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
                                {targetName}
                            </div>
                        </div>

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

                            {coins < 4 && (
                                <div className="text-xs text-red-400 text-center font-bold mt-2">Not enough coins to challenge</div>
                            )}
                        </div>

                        <button
                            onClick={handleSendChallenge}
                            disabled={coins < wager}
                            className="w-full mt-4 py-4 rounded-xl primary-gradient text-white font-black active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center leading-tight shadow-lg shadow-primary-500/20"
                        >
                            <span className="flex items-center gap-1 uppercase tracking-wider text-sm">
                                Send Challenge
                            </span>
                            <span className="text-[10px] text-white/70 mt-1 font-mono uppercase tracking-widest">
                                Est Payout: {Math.floor(wager * 1.85)} (15% Rake)
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
