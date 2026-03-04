import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';

export const AuthScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'signup' | 'login'>('signup');

    const signUp = useAppStore(state => state.signUp);
    const logIn = useAppStore(state => state.logIn);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !password.trim() || password.length < 6) {
            setError('Handle and a 6+ char password required.');
            return;
        }

        setIsProcessing(true);
        setError('');

        const action = mode === 'signup' ? signUp : logIn;
        const res = await action(name.trim(), password);

        if (!res.success) {
            setError(res.error || 'Authentication failed');
            setIsProcessing(false);
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

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">

                    {/* Mode Toggle */}
                    <div className="flex bg-dark-800/50 p-1 rounded-xl mb-2">
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setError(''); }}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === 'signup' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Claim Handle
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); }}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === 'login' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Log In
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} // only alphanumeric and underscores
                                maxLength={15}
                                placeholder="Handle (e.g. ChadMan99)"
                                disabled={isProcessing}
                                className={`w-full bg-dark-800/80 border-2 rounded-2xl px-6 py-4 text-center text-white font-bold placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-primary-500'}`}
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password (min 6 chars)"
                                disabled={isProcessing}
                                className={`w-full bg-dark-800/80 border-2 rounded-2xl px-6 py-4 text-center text-white font-bold placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-primary-500'}`}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                <Lock className="w-5 h-5 opacity-50" />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-xs font-bold text-center mt-1 animate-in slide-in-from-top-1">
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || password.length < 6 || isProcessing}
                        className="relative w-full py-4 rounded-2xl primary-gradient text-white font-black text-lg shadow-xl shadow-primary-500/20 active:scale-95 transition-all overflow-hidden group disabled:opacity-50 disabled:active:scale-100 mt-2"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <span className="relative flex items-center justify-center gap-2">
                            {isProcessing ? (
                                <span className="animate-pulse">{mode === 'signup' ? 'CLAIMING...' : 'LOGGING IN...'}</span>
                            ) : (
                                <>{mode === 'signup' ? 'ENTER THE ARENA' : 'ACCESS PROFILE'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
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
