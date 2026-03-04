import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { X, Coins, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface CoinStoreModalProps {
    onClose: () => void;
}

export const CoinStoreModal: React.FC<CoinStoreModalProps> = ({ onClose }) => {
    const userId = useAppStore(state => state.userId);
    const [selectedPack, setSelectedPack] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const packs = [
        { amount: 40, price: '$2.99', amountCents: 299, popular: false, save: null },
        { amount: 150, price: '$7.99', amountCents: 799, popular: true, save: 'Save 15%' },
        { amount: 400, price: '$19.99', amountCents: 1999, popular: false, save: 'Save 25%' },
    ];

    const handleBuy = async () => {
        if (!selectedPack || !userId) return;
        setIsProcessing(true);

        try {
            const pack = packs.find(p => p.amount === selectedPack);
            if (!pack) throw new Error("Invalid pack");

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: pack.amountCents,
                    coins: pack.amount
                })
            });

            const data = await res.json();
            if (data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error("Failed to get checkout URL");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to initiate checkout. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-dark-900 sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-white/5 animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 relative overflow-hidden flex flex-col">

                {/* Header background glow */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-primary-500/20 blur-[50px] -translate-y-1/2 pointer-events-none" />

                <div className="px-6 pt-6 pb-4 flex justify-between items-center relative z-10 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                            Store
                        </h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Refill your balance</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-dark-800 rounded-full hover:bg-dark-700 transition-colors border border-white/5">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 hide-scrollbar relative z-10">
                    {packs.map(pack => {
                        const isSelected = selectedPack === pack.amount;
                        return (
                            <button
                                key={pack.amount}
                                onClick={() => setSelectedPack(pack.amount)}
                                className={clsx(
                                    "relative w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group overflow-hidden text-left",
                                    isSelected
                                        ? "bg-primary-500/10 border-primary-500 shadow-lg shadow-primary-500/20"
                                        : "bg-dark-800 border-white/5 hover:border-white/10"
                                )}
                            >
                                {pack.popular && (
                                    <div className="absolute top-0 right-4 bg-primary-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-b-md shadow-md">
                                        Best Value
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-xl flex items-center justify-center outline outline-4 outline-offset-2 transition-all",
                                        isSelected ? "bg-primary-500 text-white outline-primary-500/20" : "bg-dark-900 text-yellow-500 outline-transparent group-hover:bg-dark-700"
                                    )}>
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-2xl text-white tracking-tight">{pack.amount}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coins</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-black text-xl text-white tracking-tight">{pack.price}</span>
                                    {pack.save && (
                                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-400/10 px-1.5 rounded">{pack.save}</span>
                                    )}
                                </div>

                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary-500/5 pointer-events-none" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="p-6 pt-2 pb-8 sm:pb-6 relative z-10 bg-dark-900 border-t border-white/5">
                    <div className="flex items-center justify-center gap-4 mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure</span>
                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Stripe</span>
                    </div>

                    <button
                        onClick={handleBuy}
                        disabled={!selectedPack || isProcessing}
                        className={clsx(
                            "w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all overflow-hidden relative",
                            !selectedPack ? "bg-dark-800 text-gray-500 cursor-not-allowed" :
                                isProcessing ? "bg-primary-600" :
                                    "primary-gradient shadow-xl shadow-primary-500/30 active:scale-95 hover:brightness-110"
                        )}
                    >
                        {isProcessing ? (
                            <span className="animate-pulse flex items-center gap-2">
                                Processing...
                            </span>
                        ) : selectedPack ? (
                            <>
                                Pay {packs.find(p => p.amount === selectedPack)?.price} <ChevronRight className="w-5 h-5" />
                            </>
                        ) : (
                            "Select a Pack"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
