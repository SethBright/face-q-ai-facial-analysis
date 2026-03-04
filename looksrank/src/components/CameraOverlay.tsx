import React, { useRef, useCallback, useState, useImperativeHandle } from 'react';
import Webcam from 'react-webcam';

export interface CameraHandle {
    capture: () => string | null;
}

interface CameraOverlayProps {
    onCapture: (base64Image: string) => void;
    isScanning: boolean;
    ref?: React.Ref<CameraHandle>;
}

const videoConstraints = {
    width: 720,
    height: 960,
    facingMode: "user"
};

export const CameraOverlay = React.forwardRef<CameraHandle, Omit<CameraOverlayProps, 'ref'>>(({ onCapture, isScanning }, ref) => {
    const webcamRef = useRef<Webcam>(null);
    const [isReady, setIsReady] = useState(false);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                onCapture(imageSrc);
                return imageSrc;
            }
        }
        return null;
    }, [webcamRef, onCapture]);

    useImperativeHandle(ref, () => ({
        capture
    }));

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-900 border-2 border-dashed border-white/10 z-0">
                    <span className="text-gray-500 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Camera...</span>
                </div>
            )}
            <Webcam
                audio={false}
                ref={webcamRef}
                mirrored={true}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMedia={() => setIsReady(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 relative z-10 ${isReady ? 'opacity-100' : 'opacity-0'} ${isScanning ? 'blur-sm grayscale-[50%]' : ''}`}
            />

            {/* Target Reticle Overlay */}
            {isReady && !isScanning && (
                <div className="absolute inset-x-8 inset-y-16 border-2 border-white/20 rounded-[4rem] pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] z-20" />
            )}
        </div>
    );
});
