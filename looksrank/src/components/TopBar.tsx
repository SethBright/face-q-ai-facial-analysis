import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Coins, Crown } from 'lucide-react';
import { CoinStoreModal } from './CoinStoreModal';

export const TopBar: React.FC = () => {
    const coins = useAppStore((state) => state.coins);
    const [showStore, setShowStore] = useState(false);

    return (
        <>
            <div className="w-full h-16 glass-panel flex items-center justify-between px-6 rounded-none rounded-b-3xl sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 primary-gradient rounded-full shadow-lg shadow-primary-500/20">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-white">
                        LooksRank
                    </h1>
                </div>

                <button
                    onClick={() => setShowStore(true)}
                    className="flex items-center gap-2 bg-dark-800/80 border border-white/5 py-1.5 px-3 rounded-full shadow-inner hover:bg-dark-700 active:scale-95 transition-all text-yellow-500"
                >
                    <Coins className="w-4 h-4 fill-yellow-500" />
                    <span className="font-bold text-sm text-yellow-500">{coins}</span>
                </button>
            </div>

            {showStore && <CoinStoreModal onClose={() => setShowStore(false)} />}
        </>
    );
};
