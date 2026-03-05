import React, { useState, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { rankFace } from '../lib/api';
import type { RankResult } from '../lib/api';
import { Coins, Loader2, Share2, RefreshCw } from 'lucide-react';
import { CameraOverlay } from './CameraOverlay';
import type { CameraHandle } from './CameraOverlay';
import * as htmlToImage from 'html-to-image';
import clsx from 'clsx';

export const RankScreen: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState<RankResult | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const cameraRef = useRef<CameraHandle>(null);
    const [stakeAmount, setStakeAmount] = useState<number>(4);
    const [scanError, setScanError] = useState<string | null>(null);
    const setIsCameraActive = useAppStore(state => state.setIsCameraActive);

    React.useEffect(() => {
        setIsCameraActive(isScanning || !!result);
        return () => setIsCameraActive(false);
    }, [isScanning, result, setIsCameraActive]);

    // For sharing
    const resultRef = useRef<HTMLDivElement>(null);
    const [isGeneratingCard, setIsGeneratingCard] = useState(false);

    const coins = useAppStore((state) => state.coins);
    const addCoins = useAppStore((state) => state.addCoins);
    const deductCoins = useAppStore((state) => state.deductCoins);
    const updateBestScores = useAppStore((state) => state.updateBestScores);
    const bestToday = useAppStore((state) => state.bestToday);
    const displayName = useAppStore((state) => state.displayName); // get global name

    const handleAttempt = async (type: 'normal' | 'double-or-nothing') => {
        if (!displayName) {
            return alert("Please set your display name first!");
        }

        let cost = 0;
        if (type === 'normal') {
            cost = 2;
        } else if (type === 'double-or-nothing') {
            cost = stakeAmount;
        }

        if (coins < cost) {
            return alert("Not enough coins!");
        }

        let imageToScore: string | null = null;
        if (cameraRef.current) {
            imageToScore = (cameraRef.current as any).capture();
        }

        if (!imageToScore) {
            return alert("Failed to access camera. Please ensure permissions are granted.");
        }

        deductCoins(cost);
        setIsScanning(true);
        setResult(null);
        setCapturedImage(imageToScore);

        try {
            // Artificial delay to ensure user sees the cool animation
            await new Promise(resolve => setTimeout(resolve, 1500));

            const prevBest = bestToday;
            const res = await rankFace(imageToScore);

            setResult(res);
            updateBestScores(res, imageToScore);

            // Give rewards if beaten for double or nothing
            if (type === 'double-or-nothing' && res.score > prevBest) {
                addCoins(stakeAmount * 2);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to reach backend";
            console.error("Failed to reach backend:", e);

            // Show error briefly in the scanning UI before hiding it
            // This prevents the "flash" of the scanning screen disappearing instantly
            setScanError(message);
            await new Promise(resolve => setTimeout(resolve, 3000));
            setScanError(null);

            addCoins(cost); // Refund on catastrophic error
        } finally {
            setIsScanning(false);
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
            link.download = `looksrank-${displayName}-${result?.score}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to generate image', err);
            alert("Failed to save image. Please try again.");
        } finally {
            setIsGeneratingCard(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 pt-8 animate-in fade-in zoom-in duration-300">

            {/* Target user info */}
            <div className="flex flex-col gap-2">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
                    Welcome, <span className="text-white">{displayName}</span>
                </h2>
            </div>

            {/* Camera Card */}
            <div className={clsx(
                "relative aspect-[3/4] flex flex-col items-center justify-center border-2 border-white/5 shadow-2xl transition-all duration-500",
                !result ? "glass-panel overflow-hidden" : "bg-dark-950/20 backdrop-blur-none border-transparent shadow-none"
            )}>
                {isScanning ? (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-dark-950/90 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden">
                        {capturedImage && (
                            <img src={capturedImage} alt="Scanning..." className="absolute inset-0 w-full h-full object-cover opacity-20" />
                        )}

                        {/* Scanning Line Animation */}
                        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-start">
                            <div className="w-full h-1 bg-primary-400 shadow-[0_0_20px_rgba(139,92,246,1)] scanner-line" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-4 border-t-primary-500 border-white/10 animate-spin" />
                                <div className="absolute inset-0 border-4 border-r-indigo-500 border-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
                                <Loader2 className="w-10 h-10 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                {scanError ? (
                                    <>
                                        <p className="font-black text-xl text-red-400 tracking-widest uppercase animate-in shake">
                                            Analysis Failed
                                        </p>
                                        <p className="text-xs text-red-300/80 uppercase tracking-widest text-center max-w-[200px]">
                                            {scanError}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400 tracking-widest uppercase animate-pulse">
                                            Analyzing Face
                                        </p>
                                        <div className="flex flex-col gap-1 items-center">
                                            <p className="text-[10px] text-indigo-300/80 uppercase tracking-[0.2em] animate-pulse">
                                                Detecting facial landmarks...
                                            </p>
                                            <p className="text-[10px] text-indigo-300/40 uppercase tracking-[0.2em] animate-pulse delay-700">
                                                Calculating neural symmetry...
                                            </p>
                                            <p className="text-[10px] text-indigo-300/20 uppercase tracking-[0.2em] animate-pulse delay-1000">
                                                Finalizing PSL Metrics...
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {result && capturedImage ? (
                    <div className="fixed inset-0 z-50 flex flex-col items-center p-4 bg-dark-950/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                        <div className="w-full max-w-md flex flex-col gap-0 shadow-2xl rounded-3xl overflow-hidden border border-white/10 my-auto">
                            {/* Result Card Content (for sharing) */}
                            <div ref={resultRef} className="w-full flex flex-col items-center bg-dark-950">
                                {/* Header Image */}
                                <div className="relative w-full aspect-[4/3] overflow-hidden border-b border-white/10">
                                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-60" />

                                    <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center">
                                        <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-primary-300 to-indigo-400 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-none">
                                            {result.score}
                                        </div>
                                        <div className="text-xl font-black tracking-[0.2em] uppercase text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mt-1">
                                            {result.tier}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Area */}
                                <div className="w-full p-6 bg-dark-900 flex flex-col items-center gap-4">
                                    <div className="text-[11px] text-gray-400 font-mono bg-dark-800 px-4 py-1 rounded-full border border-white/10">
                                        PSL RATING: <span className="text-primary-400 font-bold">{result.psl.toFixed(2)}</span>
                                    </div>

                                    {result.details && (
                                        <div className="w-full flex flex-col gap-3.5 mt-2">
                                            {Object.entries(result.details).map(([key, val]) => (
                                                <div key={key} className="flex flex-col gap-1.5 w-full">
                                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                        <span>{key}</span>
                                                        <span className="text-white font-mono">{val}/100</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-primary-500 to-indigo-400 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                                                            style={{ width: `${val}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Buttons outside the capture area */}
                            <div className="w-full p-4 bg-dark-900 grid grid-cols-2 gap-3 border-t border-white/5">
                                <button
                                    onClick={handleShare}
                                    disabled={isGeneratingCard}
                                    className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isGeneratingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Share2 className="w-4 h-4" /> Share Card</>}
                                </button>
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        setCapturedImage(null);
                                    }}
                                    className="py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest"
                                >
                                    <RefreshCw className="w-4 h-4" /> Scan Again
                                </button>
                            </div>
                        </div>
                        {/* Buffer for small screens/safe areas */}
                        <div className="h-32 w-full shrink-0" />
                    </div>
                ) : null}

                <CameraOverlay
                    ref={cameraRef}
                    isScanning={isScanning}
                    onCapture={() => { }}
                />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-4">
                {!result && (
                    <>
                        <div className="flex flex-col gap-3 p-4 bg-dark-800/50 rounded-2xl border border-yellow-500/10 shadow-inner overflow-hidden">
                            <div className="flex justify-between items-center text-sm font-bold text-yellow-500/80">
                                <span className="uppercase tracking-widest text-[10px]">Set Your Bet</span>
                                <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full text-xs"><Coins className="w-3 h-3" /> {stakeAmount}</span>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max={Math.max(0, Math.min(coins, 500))}
                                step="1"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(Number(e.target.value))}
                                className="w-full h-2 bg-dark-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />

                            <div className="grid grid-cols-4 gap-2">
                                {[4, 50, 100, Math.min(coins, 500)].map((amt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setStakeAmount(amt)}
                                        disabled={coins < amt}
                                        className="py-2 ml-0.5 mr-0.5 rounded-lg bg-dark-900 border border-white/5 text-xs font-mono text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 transition-colors disabled:opacity-30 disabled:hover:border-white/5 disabled:hover:text-gray-400"
                                    >
                                        {i === 3 ? 'MAX' : amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => handleAttempt(stakeAmount > 0 ? 'double-or-nothing' : 'normal')}
                            disabled={isScanning || coins < (stakeAmount > 0 ? stakeAmount : 2) || !displayName}
                            className={clsx(
                                "relative w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl active:scale-95 transition-all overflow-hidden group disabled:opacity-50 disabled:active:scale-100",
                                stakeAmount > 0
                                    ? "bg-gradient-to-r from-yellow-600 to-amber-500 shadow-yellow-500/20"
                                    : "primary-gradient shadow-primary-500/20"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                            <span className="relative flex flex-col items-center justify-center leading-tight">
                                <span className="flex items-center gap-2">
                                    RANK ME <span className="bg-black/20 px-3 py-0.5 rounded-full text-sm font-bold flex items-center gap-1">
                                        <Coins className="w-3 h-3 text-yellow-400" /> {stakeAmount > 0 ? stakeAmount : 2}
                                    </span>
                                </span>
                                {stakeAmount > 0 && (
                                    <span className="text-[10px] text-black/50 uppercase tracking-[0.2em] mt-1 font-black">
                                        Win {stakeAmount * 2} if you beat {bestToday || '0'}
                                    </span>
                                )}
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
