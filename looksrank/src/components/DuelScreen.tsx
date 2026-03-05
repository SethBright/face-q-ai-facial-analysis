import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { rankFace } from '../lib/api';
import type { RankResult } from '../lib/api';
import { Coins, Loader2, Sparkles, User, UserPlus, Swords, Share2 } from 'lucide-react';
import { CameraOverlay } from './CameraOverlay';
import type { CameraHandle } from './CameraOverlay';
import * as htmlToImage from 'html-to-image';
import clsx from 'clsx';

export const DuelScreen: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [playerAName, setPlayerAName] = useState('');
    const [playerBName, setPlayerBName] = useState('');

    const [resultA, setResultA] = useState<RankResult | null>(null);
    const [resultB, setResultB] = useState<RankResult | null>(null);
    const [imageA, setImageA] = useState<string | null>(null);
    const [imageB, setImageB] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const cameraRefA = useRef<CameraHandle>(null);
    const cameraRefB = useRef<CameraHandle>(null);

    // For sharing
    const duelResultRef = useRef<HTMLDivElement>(null);
    const [isGeneratingCard, setIsGeneratingCard] = useState(false);
    const setIsCameraActive = useAppStore(state => state.setIsCameraActive);

    useEffect(() => {
        setIsCameraActive(step > 1);
        return () => setIsCameraActive(false);
    }, [step, setIsCameraActive]);

    const coins = useAppStore(state => state.coins);
    const deductCoins = useAppStore(state => state.deductCoins);

    const handleStartDuel = () => {
        if (coins < 3) return alert("Not enough coins! Duel requires 3 coins.");
        deductCoins(3);
        setStep(2);
    };

    const captureA = async () => {
        if (!cameraRefA.current) return;
        const image = (cameraRefA.current as any).capture() as string | null;
        if (!image) return alert("Failed to capture photo A!");

        setIsScanning(true);
        try {
            setImageA(image);
            const res = await rankFace(image);
            setResultA(res);
            setStep(3);
        } catch (err: any) {
            alert(err.message || "Failed to analyze Player 1");
        } finally {
            setIsScanning(false);
        }
    };

    const captureB = async () => {
        if (!cameraRefB.current) return;
        const image = (cameraRefB.current as any).capture() as string | null;
        if (!image) return alert("Failed to capture photo B!");

        setIsScanning(true);
        try {
            setImageB(image);
            const res = await rankFace(image);
            setResultB(res);
        } catch (err: any) {
            alert(err.message || "Failed to analyze Player 2");
        } finally {
            setIsScanning(false);
        }
    };

    const handleShare = async () => {
        if (!duelResultRef.current) return;
        setIsGeneratingCard(true);
        try {
            const dataUrl = await htmlToImage.toJpeg(duelResultRef.current, { quality: 0.95, backgroundColor: '#0f172a' });
            const link = document.createElement('a');
            link.download = `looksrank-duel-${playerAName}-vs-${playerBName}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to generate image', err);
        } finally {
            setIsGeneratingCard(false);
        }
    };

    const winner = (resultA && resultB)
        ? (resultA.score > resultB.score ? 'A' : resultA.score < resultB.score ? 'B' : 'TIE')
        : null;

    return (
        <div className="flex flex-col gap-6 p-4 pt-8 animate-in fade-in duration-300">
            <div className="text-center mb-2">
                <h2 className="text-2xl font-black uppercase tracking-wider text-primary-400 flex justify-center items-center gap-2">
                    <Swords className="w-6 h-6" /> Local Duel
                </h2>
                <p className="text-gray-400 text-sm mt-1">Pass-and-play against a friend.</p>
            </div>

            {/* STEP 1: SETUP */}
            {step === 1 && (
                <div className="flex flex-col gap-6 glass-panel p-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-primary-400 uppercase tracking-wider">Player 1 Name</label>
                        <div className="relative">
                            <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text" value={playerAName} onChange={(e) => setPlayerAName(e.target.value)}
                                placeholder="Enter P1..."
                                className="w-full bg-dark-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-wider">Player 2 Name</label>
                        <div className="relative">
                            <UserPlus className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text" value={playerBName} onChange={(e) => setPlayerBName(e.target.value)}
                                placeholder="Enter P2..."
                                className="w-full bg-dark-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleStartDuel}
                        disabled={!playerAName || !playerBName}
                        className="w-full mt-4 py-4 rounded-2xl primary-gradient text-white font-black shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                    >
                        START DUEL <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-400" /> 3</span>
                    </button>
                </div>
            )}

            {/* STEP 2/3: CAPTURES */}
            {(step === 2 || step === 3) && !resultB && (
                <div className="flex flex-col items-center gap-6">
                    <div className="text-center">
                        <span className="text-xs uppercase font-bold tracking-widest text-gray-500">Pass phone to</span>
                        <h3 className={clsx("text-3xl font-black mt-1", step === 2 ? "text-primary-400" : "text-red-400")}>
                            {step === 2 ? playerAName : playerBName}
                        </h3>
                    </div>

                    <div className="relative w-full aspect-[3/4] glass-panel overflow-hidden flex flex-col items-center justify-center border-2 border-white/5 shadow-2xl">
                        {isScanning ? (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-dark-900/80 backdrop-blur-sm animate-in fade-in">
                                <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                                <p className="font-bold text-sm tracking-widest uppercase text-white">Analyzing...</p>
                            </div>
                        ) : null}

                        <CameraOverlay
                            ref={step === 2 ? cameraRefA : cameraRefB}
                            isScanning={isScanning}
                            onCapture={() => { }}
                        />
                    </div>

                    <button
                        onClick={step === 2 ? captureA : captureB}
                        disabled={isScanning}
                        className={clsx(
                            "w-full py-4 rounded-2xl font-black text-xl text-white shadow-lg active:scale-95 transition-all disabled:opacity-50",
                            step === 2 ? "bg-primary-500 shadow-primary-500/20" : "bg-red-500 shadow-red-500/20"
                        )}
                    >
                        {isScanning ? 'SCANNING...' : 'TAKE SELFIE'}
                    </button>
                </div>
            )}

            {/* STEP 4: RESULTS */}
            {resultA && resultB && (
                <div className="flex flex-col gap-6 animate-in zoom-in-95 duration-500">
                    {/* Shareable Duel Result Card */}
                    <div ref={duelResultRef} className="flex flex-col gap-6 p-4 rounded-3xl bg-dark-900 border border-white/10 shadow-2xl relative">
                        {/* Background flare */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] aspect-square bg-gradient-radial from-primary-500/10 to-transparent pointer-events-none" />

                        {/* Winner Banner */}
                        <div className="text-center glass-panel py-4 rounded-2xl border-yellow-500/30 relative z-10">
                            <h3 className="text-yellow-400 font-black text-xl uppercase flex justify-center items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                {winner === 'TIE' ? "It's a Tie!" : `${winner === 'A' ? playerAName : playerBName} WINS`}
                                <Sparkles className="w-5 h-5" />
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {/* Player A Card */}
                            <div className={clsx(
                                "glass-panel p-4 flex flex-col items-center gap-2 rounded-2xl border-2 transition-all overflow-hidden",
                                winner === 'A' ? "border-primary-500 bg-primary-500/10 shadow-[0_0_30px_rgba(139,92,246,0.3)]" : "border-white/5 opacity-80 bg-dark-800/50"
                            )}>
                                {imageA && (
                                    <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10 mb-2">
                                        <img src={imageA} alt={playerAName} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h4 className="font-bold text-gray-200 truncate w-full text-center tracking-wide">{playerAName}</h4>
                                <div className="text-5xl font-black mt-2">{Math.round(resultA.score)}</div>
                                <div className="text-xs px-3 py-1 mt-2 rounded-full bg-dark-900 border border-white/10 font-mono text-gray-300">{resultA.tier}</div>
                            </div>

                            {/* Player B Card */}
                            <div className={clsx(
                                "glass-panel p-4 flex flex-col items-center gap-2 rounded-2xl border-2 transition-all overflow-hidden",
                                winner === 'B' ? "border-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "border-white/5 opacity-80 bg-dark-800/50"
                            )}>
                                {imageB && (
                                    <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10 mb-2">
                                        <img src={imageB} alt={playerBName} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h4 className="font-bold text-gray-200 truncate w-full text-center tracking-wide">{playerBName}</h4>
                                <div className="text-5xl font-black mt-2">{Math.round(resultB.score)}</div>
                                <div className="text-xs px-3 py-1 mt-2 rounded-full bg-dark-900 border border-white/10 font-mono text-gray-300">{resultB.tier}</div>
                            </div>
                        </div>

                        {/* Detailed Comparison */}
                        <div className="flex flex-col gap-3 px-2 pb-2 relative z-10 w-full overflow-hidden">
                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center mb-1">Detailed Breakdown</h5>
                            {['harmony', 'dimorphism', 'angularity', 'skin'].map((key) => {
                                const valA = (resultA.details as any)?.[key] || 0;
                                const valB = (resultB.details as any)?.[key] || 0;
                                const diff = valA - valB;

                                return (
                                    <div key={key} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-end text-[9px] font-bold uppercase tracking-widest text-gray-400 px-1">
                                            <span className={clsx(diff > 0 && "text-primary-400 font-black")}>{valA}%</span>
                                            <span className="text-gray-500 opacity-60 font-black">{key}</span>
                                            <span className={clsx(diff < 0 && "text-red-400 font-black")}>{valB}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden flex border border-white/5">
                                            <div
                                                className={clsx(
                                                    "h-full rounded-l-full transition-all duration-1000",
                                                    diff > 0 ? "bg-primary-500" : "bg-dark-700"
                                                )}
                                                style={{ width: `${(valA / (valA + valB)) * 100}%` }}
                                            />
                                            <div
                                                className={clsx(
                                                    "h-full rounded-r-full transition-all duration-1000",
                                                    diff < 0 ? "bg-red-500" : "bg-dark-700"
                                                )}
                                                style={{ width: `${(valB / (valA + valB)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Brand watermark for sharing */}
                        <div className="flex justify-center items-center gap-2 opacity-50 relative z-10 mt-2">
                            <Swords className="w-4 h-4 ml-1" />
                            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">LooksRank Duel Duel Match</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                            onClick={handleShare}
                            disabled={isGeneratingCard}
                            className="py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white font-bold active:scale-95 transition-all flex justify-center items-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {isGeneratingCard ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Share2 className="w-5 h-5" /> Share Card</>}
                        </button>
                        <button
                            onClick={() => {
                                setStep(1);
                                setResultA(null);
                                setResultB(null);
                                setImageA(null);
                                setImageB(null);
                            }}
                            className="py-4 rounded-2xl bg-dark-800 hover:bg-dark-700 border border-white/10 text-white font-bold active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
