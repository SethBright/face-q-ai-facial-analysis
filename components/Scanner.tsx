
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ScannerProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        const videoEl = videoRef.current;
        if (!videoEl) return;
        videoEl.srcObject = stream;
        // iOS/Capacitor WebView often ignores autoPlay; must call play() after stream is attached.
        // Use loadedmetadata so we play once the video is ready (required on iOS).
        const playWhenReady = () => {
          videoEl.play().catch(() => {});
          videoEl.removeEventListener('loadedmetadata', playWhenReady);
          videoEl.removeEventListener('loadeddata', playWhenReady);
        };
        videoEl.addEventListener('loadedmetadata', playWhenReady);
        videoEl.addEventListener('loadeddata', playWhenReady);
        // Also try immediately in case events already fired or aren't used
        videoEl.play().catch(() => {});
      } catch (err) {
        setError('Camera access denied. Please check permissions.');
      }
    };

    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally so captured image matches un-mirrored preview (not inverted)
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
      }
    }
  }, [onCapture]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[60] bg-zinc-900 flex flex-col items-center justify-center p-10 text-center">
        <p className="text-red-500 mb-6">{error}</p>
        <button onClick={onCancel} className="px-6 py-2 bg-zinc-800 rounded-full font-bold text-white">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black overflow-hidden select-none isolate">
      {/* Background Video - Full Screen; scaleX(-1) un-mirrors front camera so it's not inverted */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        disablePictureInPicture
        disableRemotePlayback
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {/* Overlays Container - elevated above video to prevent debug text bleed-through */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
        
        {/* Top Bar - Close Button */}
        <div className="p-8 flex justify-start pointer-events-auto">
          <button 
            onClick={onCancel}
            className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full text-white active:scale-90 transition-transform shadow-lg border border-white/10"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Center UI - Brackets & Align Label */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-[75%] aspect-[4/5] max-w-[320px] relative">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-[8px] border-l-[8px] border-white/60 rounded-tl-[40px] -translate-x-1 -translate-y-1" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-[8px] border-r-[8px] border-white/60 rounded-tr-[40px] translate-x-1 -translate-y-1" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[8px] border-l-[8px] border-white/60 rounded-bl-[40px] -translate-x-1 translate-y-1" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[8px] border-r-[8px] border-white/60 rounded-br-[40px] translate-x-1 translate-y-1" />
            
            {/* Subtle center line */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10" />
          </div>

          {/* Align Label */}
          <div className="mt-16 px-8 py-3 bg-black/50 backdrop-blur-2xl rounded-full border border-white/10">
            <p className="text-white text-[13px] font-bold tracking-[0.2em] uppercase">Align your face</p>
          </div>
        </div>

        {/* Bottom Control Area - Overlaid */}
        <div className="pb-16 flex flex-col items-center justify-center pointer-events-auto">
          <button 
            onClick={handleCapture}
            className="group relative w-24 h-24 rounded-full flex items-center justify-center active:scale-95 transition-transform outline-none focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {/* Outer Decorative Ring */}
            <div className="absolute inset-0 rounded-full border-[8px] border-white/20" />
            {/* Inner White Button */}
            <div className="w-16 h-16 rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,0.4)] group-active:bg-zinc-200" />
          </button>
          <p className="mt-4 text-[11px] text-white/60 uppercase tracking-[0.25em] font-black drop-shadow-md">Tap to capture</p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Scanner;
