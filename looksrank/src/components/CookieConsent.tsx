import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-28 left-4 right-4 z-[90] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-dark-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 max-w-sm mx-auto">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-500/10 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-primary-500" />
                    </div>
                    <p className="text-[10px] text-gray-300 font-medium leading-tight">
                        We use essential cookies for auth and to improve your experience.
                        By using LooksRank, you agree to our <span className="text-white font-bold">Privacy Policy</span>.
                    </p>
                </div>
                <button
                    onClick={handleAccept}
                    className="whitespace-nowrap bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-colors"
                >
                    Got it
                </button>
            </div>
        </div>
    );
};
