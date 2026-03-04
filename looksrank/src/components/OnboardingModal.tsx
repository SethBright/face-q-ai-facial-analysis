import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Sparkles, ArrowRight } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
    const [name, setName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');

    const createProfile = useAppStore(state => state.createProfile);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsJoining(true);
        setError('');

        const res = await createProfile(name.trim());
        if (!res.success) {
            // Handle postgres unique constraint
            if (res.error?.includes('duplicate key') || res.error?.includes('unique constraint')) {
                setError('Handle is already taken!');
            } else {
                setError(res.error || 'Failed to join');
            }
            setIsJoining(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-dark-900 animate-in fade-in duration-500">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-primary-500/20 blur-[100px] rounded-full translate-y-[-50%]" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full translate-y-[50%] translate-x-[50%]" />

            <div className="w-full max-w-sm flex flex-col gap-8 relative z-10">
                <div className="text-center animate-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl primary-gradient shadow-2xl shadow-primary-500/30 mb-6">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-widest text-white drop-shadow-lg">
                        Looks<span className="text-primary-400">Rank</span>
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm max-w-[280px] mx-auto leading-relaxed">
                        The ultimate AI facial analysis leaderboard. Climb the ranks or lose your coins trying.
                    </p>
                </div>

                <form onSubmit={handleJoin} className="flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-4">Choose your handle</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={15}
                            placeholder="e.g. ChadMan99"
                            disabled={isJoining}
                            className={`w-full bg-dark-800/80 border-2 rounded-2xl px-6 py-4 text-xl text-center text-white font-bold placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-primary-500'}`}
                        />
                        {error && (
                            <p className="text-red-400 text-xs font-bold text-center mt-1 animate-in slide-in-from-top-1">
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || isJoining}
                        className="relative w-full py-4 rounded-2xl primary-gradient text-white font-black text-lg shadow-xl shadow-primary-500/20 active:scale-95 transition-all overflow-hidden group disabled:opacity-50 disabled:active:scale-100 mt-2"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <span className="relative flex items-center justify-center gap-2">
                            {isJoining ? (
                                <span className="animate-pulse">JOINING...</span>
                            ) : (
                                <>ENTER THE ARENA <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </span>
                    </button>

                    <p className="text-center text-[10px] text-gray-600 font-mono mt-4">
                        By joining, you agree to being relentlessly roasted by AI.
                    </p>
                </form>
            </div>
        </div>
    );
};
