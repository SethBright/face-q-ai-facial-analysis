import React from 'react';
import { useAppStore } from '../lib/store';
import { Home, ChevronRight } from 'lucide-react';

interface NotFoundProps {
    onReset?: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onReset }) => {
    const setActiveTab = useAppStore(state => state.setActiveTab);

    const handleBack = () => {
        if (onReset) onReset();
        setActiveTab('rank');
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6 text-center">
            <div className="max-w-xs w-full space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative bg-dark-800 border border-white/5 rounded-3xl w-full h-full flex items-center justify-center shadow-2xl overflow-hidden">
                        <img src="/logo.jpg" alt="LooksRank Branding" className="w-20 h-20 object-contain animate-pulse" />
                    </div>
                    {/* Decorative scan line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary-500/50 shadow-lg shadow-primary-500/50 animate-scan z-10" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        Face Not Found
                    </h1>
                    <p className="text-gray-400 font-medium leading-relaxed">
                        We scanned the entire database but couldn't find this page. Maybe it's hiding?
                    </p>
                </div>

                <button
                    onClick={handleBack}
                    className="w-full primary-gradient py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary-500/30 active:scale-95 transition-all hover:brightness-110"
                >
                    <Home className="w-5 h-5" /> Back to Safety <ChevronRight className="w-5 h-5" />
                </button>

                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Error Code: 404_EYE_NOT_FOUND</p>
            </div>
        </div>
    );
};
