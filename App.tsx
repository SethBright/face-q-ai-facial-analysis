import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SettingsIcon, ScanIcon, DailyIcon, CoachIcon } from './components/Icons';
import { AppTab, ScanStep, AnalysisResult, ScanRecord } from './types';
import Scanner from './components/Scanner';
import AnalysisView from './components/AnalysisView';
import Paywall from './components/Paywall';
import ScanList from './components/ScanList';
import ScanDetailView from './components/ScanDetailView';
import DailyView from './components/DailyView';
import CoachView from './components/CoachView';
import SettingsModal from './components/SettingsModal';
import LimitReachedModal from './components/LimitReachedModal';
import OnboardingScreen from './components/OnboardingScreen';
import { analyzeFaceImage } from './services/geminiService';
import { configurePurchases, purchasePro, restorePurchases, isPro } from './services/purchasesService';
import { getGender, setGender } from './services/genderPreferenceStorage';
import { getOnboardingDone, setOnboardingDone } from './services/onboardingStorage';
import { getScans, saveScan } from './services/scanStorage';
import { getUsage, canUseScan, incrementUsage } from './services/usageStorage';
import { recordStreakActivity, getCurrentStreak } from './services/streakStorage';
import { triggerTapHaptic } from './services/haptics';

const App: React.FC = () => {
  const [onboardingComplete, setOnboardingComplete] = useState(() => getOnboardingDone());
  const [activeTab, setActiveTab] = useState<AppTab>('scan');
  const [scanStep, setScanStep] = useState<ScanStep>('landing');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLandingSlide, setCurrentLandingSlide] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>(() => getScans());
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const [limitResetDate, setLimitResetDate] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [uploadPhotoError, setUploadPhotoError] = useState<string | null>(null);
  const [isProOnResults, setIsProOnResults] = useState<boolean | null>(null);
  const [, setStreakRefresh] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    configurePurchases();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest('button');
      if (!button) return;
      void triggerTapHaptic();
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    if (currentLandingSlide === 1) setScans(getScans());
  }, [currentLandingSlide]);

  // Re-check Pro status when results screen is shown (e.g. if isPro() was slow or failed earlier)
  useEffect(() => {
    if (scanStep !== 'results' || !Capacitor.isNativePlatform()) return;
    if (isProOnResults !== null) return;
    let cancelled = false;
    isPro()
      .then((pro) => { if (!cancelled) setIsProOnResults(pro); })
      .catch(() => { if (!cancelled) setIsProOnResults(false); });
    return () => { cancelled = true; };
  }, [scanStep, isProOnResults]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      const slideIndex = Math.round(scrollLeft / width);
      setCurrentLandingSlide(slideIndex);
    }
  };

  const handleTakePicture = async () => {
    // Always use the in-app Scanner so the user sees the face alignment overlay
    // (brackets + "Align your face" + "Tap to capture") and front camera.
    setIsCapturing(true);
  };

  const handleUploadPhoto = async () => {
    setUploadPhotoError(null);
    if (Capacitor.isNativePlatform()) {
      try {
        // Android: request permission first so the picker can open. iOS: start permission request without awaiting so getPhoto runs in the same user gesture and the picker can show.
        if (Capacitor.getPlatform() === 'android') {
          await Camera.requestPermissions({ permissions: ['photos'] });
        } else {
          void Camera.requestPermissions({ permissions: ['photos'] });
        }
        const photo = await Camera.getPhoto({
          source: CameraSource.Photos,
          resultType: CameraResultType.DataUrl,
          quality: 90,
          allowEditing: false,
        });
        if (photo?.dataUrl) {
          await handleCapture(photo.dataUrl);
        } else {
          setUploadPhotoError('No photo selected.');
        }
      } catch (err) {
        console.warn('Upload photo:', err);
        setUploadPhotoError('Couldn\'t open photos. Check app permissions in Settings.');
      }
    } else {
      // Web: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = undefined;
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (dataUrl) void handleCapture(dataUrl);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const handleCapture = async (base64: string) => {
    setIsCapturing(false);
    if (scanStep === 'front_upload') {
      setFrontImage(base64);
      setScanStep('side_upload');
    } else if (scanStep === 'side_upload') {
      setSideImage(base64);
      setScanStep('results');
      setAnalysisResult(null);
      // Know Pro status on results so we never show paywall to subscribers.
      if (Capacitor.isNativePlatform()) {
        isPro()
          .then((pro) => {
            setIsProOnResults(pro);
            if (pro) void handleGetPro();
          })
          .catch(() => {
            setIsProOnResults(false);
          });
      } else {
        setIsProOnResults(false);
      }
    }
  };

  const handleGetPro = async () => {
    if (!frontImage) return;
    if (!canUseScan()) {
      const usage = getUsage();
      setLimitResetDate(usage.resetDate);
      setShowLimitReached(true);
      return;
    }
    const imageToAnalyze = frontImage;
    setIsAnalyzing(true);
    try {
      const result = await analyzeFaceImage(frontImage, sideImage ?? null);
      setAnalysisResult(result);
      incrementUsage();
      try {
        await saveScan(imageToAnalyze, result);
        recordStreakActivity();
        setScans(getScans());
      } catch (e) {
        console.error('Failed to save scan to history', e);
      }
    } catch (err) {
      console.error('Analysis failed', err);
      let message = err instanceof Error && err.message ? err.message : 'Analysis failed. Please try again.';
      if (message.length > 100 || message.trim().startsWith('{') || message.includes('"code":')) {
        message = 'Analysis is busy or unavailable. Please try again in a minute.';
      }
      alert(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openPaywall = () => {
    // If running on a native device, check subscription status first
    // so Pro users skip the paywall and go straight to analysis.
    if (Capacitor.isNativePlatform()) {
      isPro()
        .then((pro) => {
          if (pro) {
            void handleGetPro();
          } else {
            setShowPaywall(true);
          }
        })
        .catch(() => {
          // On any error, fall back to showing the paywall.
          setShowPaywall(true);
        });
    } else {
      setShowPaywall(true);
    }
  };

  const handleCloseResults = () => {
    setScanStep('landing');
    setFrontImage(null);
    setSideImage(null);
    setAnalysisResult(null);
    setIsProOnResults(null);
    setScans(getScans());
  };

  const renderScanContent = () => {
    switch (scanStep) {
      case 'landing':
        return (
          <div className="flex flex-col h-full bg-zinc-900">
            <header className="flex justify-between items-center px-6 pb-5" style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))' }}>
              <h1 className="text-3xl font-bold text-white tracking-tight">Facial Analysis</h1>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                aria-label="Settings"
              >
                <SettingsIcon />
              </button>
            </header>

            <main className="flex-1 relative flex flex-col min-h-0">
              {/* Carousel Container */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Slide 1: Landing / Begin Scan */}
                <div className="w-full flex-shrink-0 snap-center flex flex-col items-center justify-center px-6 pb-6">
                  <div 
                    className="relative w-full max-w-sm overflow-hidden rounded-[32px] shadow-2xl border border-white/5"
                    style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 0 30px rgba(255,255,255,0.04)' }}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-t-[32px]">
                      <img 
                        src={getGender() === 'female' ? '/landing-hero-female.png' : '/landing-hero.png'} 
                        alt="Model" 
                        className="w-full h-full object-cover"
                      />
                      {/* Grid clipped to face oval; lines follow brow, eyes, nose, mouth, chin and face contour */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                        <defs>
                          <clipPath id="face-clip">
                            {/* Ellipse over face: forehead to chin, cheek to cheek */}
                            <ellipse cx="50" cy="44" rx="34" ry="30" />
                          </clipPath>
                          <pattern id="scan-grid" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                            <path d="M 6 0 L 0 0 0 6" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" fill="none"/>
                          </pattern>
                          {/* Horizontal: follow brow, eyes, nose, mouth, chin with gentle face curve (dip at center) */}
                          <pattern id="scan-grid-curved" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M 0 16 Q 50 14 100 16" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 0 26 Q 50 24 100 26" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 0 36 Q 50 34 100 36" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 0 46 Q 50 44 100 46" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 0 56 Q 50 54 100 56" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 0 66 Q 50 64 100 66" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 0 76 Q 50 74 100 76" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            {/* Vertical: curve with face contour (sides bulge out at cheeks) */}
                            <path d="M 20 0 Q 18 50 20 100" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 35 0 Q 33 50 35 100" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 50 0 L 50 100" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" fill="none"/>
                            <path d="M 65 0 Q 67 50 65 100" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                            <path d="M 80 0 Q 82 50 80 100" stroke="rgba(255,255,255,0.45)" strokeWidth="0.25" fill="none"/>
                          </pattern>
                        </defs>
                        <g clipPath="url(#face-clip)">
                          <rect width="100" height="100" fill="url(#scan-grid)"/>
                          <rect width="100" height="100" fill="url(#scan-grid-curved)"/>
                        </g>
                      </svg>
                      {/* Fade to black gradient - from lower image down */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.9) 92%, black 100%)' }}
                      />
                    </div>
                    <div className="relative bg-black -mt-4 pt-2 pb-4 px-6 flex flex-col items-center gap-5 rounded-b-[32px] text-center w-full">
                      <h2 className="text-white text-xl font-bold leading-tight text-center w-full">
                        Get your ratings and recommendations
                      </h2>
                      <button 
                        onClick={() => setScanStep('front_upload')}
                        className="w-full py-3 bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] hover:opacity-95 active:scale-[0.98] text-white text-base font-bold rounded-[20px] shadow-[0_0_20px_rgba(139,49,255,0.3)] transition-all"
                      >
                        Begin scan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Past scans */}
                <div className="w-full flex-shrink-0 snap-center flex flex-col min-h-0">
                  <ScanList
                    scans={scans}
                    onSelectScan={(scan) => {
                      setSelectedScan(scan);
                      setScanStep('scan_detail');
                    }}
                  />
                </div>
              </div>

              {/* Pagination Dots */}
              <div 
                className="flex justify-center items-center gap-2 mt-1"
                style={{ marginBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentLandingSlide === 0 ? 'bg-white w-2.5 h-2.5' : 'bg-zinc-600'}`} />
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentLandingSlide === 1 ? 'bg-white w-2.5 h-2.5' : 'bg-zinc-600'}`} />
              </div>
            </main>
          </div>
        );

      case 'front_upload':
      case 'side_upload':
        const isFront = scanStep === 'front_upload';
        const capturedImage = isFront ? frontImage : sideImage;
        return (
          <div className="flex flex-col h-full bg-zinc-900 min-h-screen" style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))' }}>
            <header className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
              <button 
                onClick={() => { setUploadPhotoError(null); setScanStep(isFront ? 'landing' : 'front_upload'); }} 
                className="p-2 -ml-1 text-zinc-400 hover:text-white transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-white tracking-tight whitespace-nowrap pointer-events-none">
                Upload a {isFront ? 'front' : 'side'} selfie
              </h1>
              <div className="w-10" aria-hidden />
            </header>
            <main className="flex-1 flex flex-col items-center justify-start min-h-0 px-6 pt-8 pb-4">
              <div className="w-full max-w-sm mx-auto flex flex-col items-center min-h-0">
                <div className="w-full aspect-[4/5] max-h-[60vh] bg-black rounded-[32px] overflow-hidden border border-white/5 shadow-2xl mx-auto flex items-center justify-center">
                  {capturedImage ? (
                    <img src={capturedImage} className="w-full h-full min-w-full min-h-full object-cover object-center" alt="Captured" />
                  ) : (
                    <img 
                      src={isFront ? "/front-selfie-guide.png" : "/side-selfie-guide.png"} 
                      className="w-full h-full min-w-full min-h-full object-cover object-center opacity-60 grayscale"
                      alt="Guide"
                    />
                  )}
                </div>
              </div>
              <div className="w-full max-w-sm mx-auto shrink-0 pt-8 pb-2 flex flex-col gap-3">
                <button 
                  onClick={handleTakePicture}
                  type="button"
                  className="w-full py-5 bg-[#8b31ff] hover:bg-[#9d4edd] active:scale-[0.98] text-white text-xl font-bold rounded-[30px] shadow-2xl border border-white/20 transition-all"
                >
                  Take Selfie
                </button>
                <button 
                  onClick={() => void handleUploadPhoto()}
                  type="button"
                  className="w-full py-4 text-zinc-300 hover:text-white hover:bg-white/10 active:scale-[0.98] text-base font-semibold rounded-[24px] border border-white/20 transition-all cursor-pointer touch-manipulation"
                  aria-label="Choose photo from library"
                >
                  Upload photo
                </button>
                {uploadPhotoError && (
                  <p className="text-sm text-amber-400/90 text-center px-2">{uploadPhotoError}</p>
                )}
              </div>
            </main>
          </div>
        );

      case 'scan_detail':
        if (selectedScan) {
          return (
            <ScanDetailView
              scan={selectedScan}
              onClose={() => {
                setScanStep('landing');
                setSelectedScan(null);
              }}
            />
          );
        }
        return null;

      case 'results':
        return (
          <AnalysisView
            image={frontImage || ''}
            result={analysisResult}
            isLoading={isAnalyzing}
            isPro={isProOnResults === true}
            onClose={handleCloseResults}
            onGetPro={openPaywall}
            onRetryAnalysis={handleGetPro}
          />
        );
    }
  };

  const handleOnboardingComplete = (gender: 'male' | 'female' | null) => {
    if (gender) setGender(gender);
    setOnboardingDone();
    setOnboardingComplete(true);
  };

  if (!onboardingComplete) {
    return (
      <div className="min-h-screen max-w-md mx-auto bg-zinc-900 flex flex-col relative overflow-hidden text-white">
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  const renderContent = () => {
    if (activeTab === 'scan') return renderScanContent();
    if (activeTab === 'daily') {
      return (
        <DailyView
          scans={scans}
          streak={getCurrentStreak()}
          onScanPress={() => {
            setActiveTab('scan');
            setScanStep('landing');
            setTimeout(() => {
              scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
            }, 100);
          }}
          onViewProgress={() => {
            setActiveTab('scan');
            setScanStep('landing');
            setCurrentLandingSlide(1);
            setTimeout(() => {
              const el = scrollContainerRef.current;
              if (el) {
                el.scrollTo({ left: el.offsetWidth, behavior: 'smooth' });
              }
            }, 150);
          }}
          onSummaryPress={(scan) => {
            setSelectedScan(scan);
            setScanStep('scan_detail');
            setActiveTab('scan');
          }}
          onSettingsPress={() => setShowSettings(true)}
          onStreakChange={() => setStreakRefresh((r) => r + 1)}
        />
      );
    }
    if (activeTab === 'coach') {
      return <CoachView onGetPro={openPaywall} latestScan={scans[0]} />;
    }
    return null;
  };

  return (
    <div 
      className="min-h-screen max-w-md mx-auto bg-zinc-900 flex flex-col relative overflow-hidden text-white shadow-2xl"
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(255,255,255,0.03)' }}
    >
      <div 
        className="flex-1 min-h-0 max-h-[100dvh] overflow-hidden flex flex-col"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      {(scanStep === 'landing' || scanStep === 'front_upload' || scanStep === 'side_upload' || activeTab !== 'scan') && (
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-2xl border-t border-white/5 py-3 px-6 z-40 max-w-md mx-auto"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-around items-center max-w-sm mx-auto">
            <button onClick={() => setActiveTab('daily')} className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
              <DailyIcon active={activeTab === 'daily'} />
              <span className={`text-[10px] font-bold tracking-widest ${activeTab === 'daily' ? 'text-white' : 'text-zinc-500'}`}>daily</span>
            </button>
            <button onClick={() => { setActiveTab('scan'); setScanStep('landing'); }} className="flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90 min-w-[4rem]">
              <ScanIcon active={activeTab === 'scan'} />
              <span className={`text-[10px] tracking-wide lowercase ${activeTab === 'scan' ? 'text-white font-medium' : 'text-[#94a3b8] font-normal'}`}>scan</span>
            </button>
            <button onClick={() => setActiveTab('coach')} className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
              <CoachIcon active={activeTab === 'coach'} />
              <span className={`text-[10px] font-bold tracking-widest ${activeTab === 'coach' ? 'text-white' : 'text-zinc-500'}`}>coach</span>
            </button>
          </div>
        </nav>
      )}

      {isCapturing && (
        <Scanner 
          onCapture={handleCapture} 
          onCancel={() => setIsCapturing(false)} 
        />
      )}

      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onUnlock={() => {
            setShowPaywall(false);
            handleGetPro();
          }}
          onPurchase={purchasePro}
          onRestore={restorePurchases}
        />
      )}

      {showLimitReached && (
        <LimitReachedModal
          resetDate={limitResetDate}
          onClose={() => setShowLimitReached(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onAccountDeleted={() => {
            setScans(getScans());
            setOnboardingComplete(false);
            setScanStep('landing');
            setCurrentLandingSlide(0);
            setActiveTab('scan');
            setTimeout(() => scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' }), 100);
          }}
        />
      )}
    </div>
  );
};

export default App;
