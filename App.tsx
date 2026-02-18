
import React, { useState, useRef, useEffect } from 'react';
import { SettingsIcon, ScanIcon, DailyIcon, CoachIcon } from './components/Icons';
import { AppTab, ScanStep, AnalysisResult } from './types';
import Scanner from './components/Scanner';
import AnalysisView from './components/AnalysisView';
import { analyzeFaceImage } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('scan');
  const [scanStep, setScanStep] = useState<ScanStep>('landing');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLandingSlide, setCurrentLandingSlide] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      const slideIndex = Math.round(scrollLeft / width);
      setCurrentLandingSlide(slideIndex);
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
      setIsAnalyzing(true);
      setAnalysisResult(null); // Clear previous results

      // Analyze the front image (displayed in results) — both images are now captured
      const imageToAnalyze = frontImage;
      if (!imageToAnalyze) {
        setIsAnalyzing(false);
        setScanStep('side_upload');
        alert('Please capture a front selfie first.');
        return;
      }

      try {
        const result = await analyzeFaceImage(imageToAnalyze);
        setAnalysisResult(result);
      } catch (error) {
        console.error("Analysis failed", error);
        alert("Analysis failed. Please try again.");
        setScanStep('landing');
        setFrontImage(null);
        setSideImage(null);
        setAnalysisResult(null);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const renderScanContent = () => {
    switch (scanStep) {
      case 'landing':
        return (
          <div className="flex flex-col h-full bg-zinc-900">
            <header className="flex justify-between items-center px-6 pt-8 mb-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">Facial Analysis</h1>
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
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
                <div className="w-full flex-shrink-0 snap-center flex flex-col justify-center px-6">
                  <div className="relative group w-full max-w-sm mx-auto overflow-hidden rounded-[48px] bg-black shadow-2xl border border-white/5 aspect-[3/4.2]">
                    <img 
                      src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&auto=format&fit=crop" 
                      alt="Model" 
                      className="w-full h-full object-cover grayscale-[0.2]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    
                    <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center">
                      <h2 className="text-white text-3xl font-bold text-center mb-8 leading-tight px-4">
                        Get your ratings and recommendations
                      </h2>
                      <button 
                        onClick={() => setScanStep('front_upload')}
                        className="w-full py-5 bg-[#8b31ff] hover:bg-[#9d4edd] active:scale-[0.98] text-white text-xl font-bold rounded-[30px] shadow-xl transition-all"
                      >
                        Begin scan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Empty State */}
                <div className="w-full flex-shrink-0 snap-center flex flex-col items-center justify-center px-10 text-center">
                  <p className="text-xl text-white italic font-medium opacity-80 leading-relaxed max-w-[200px]">
                    your completed scans will show up here
                  </p>
                </div>
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center items-center gap-2 mb-8 mt-4">
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
          <div className="flex flex-col h-full px-6 pt-10 animate-in fade-in duration-500 bg-zinc-900 min-h-screen">
            <header className="flex items-center mb-8 relative">
              <button 
                onClick={() => setScanStep(isFront ? 'landing' : 'front_upload')} 
                className="p-3 text-zinc-400 hover:text-white transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-white tracking-tight whitespace-nowrap">
                Upload a {isFront ? 'front' : 'side'} selfie
              </h1>
            </header>
            <main className="flex-1 flex flex-col items-center">
              <div className="w-full max-w-sm aspect-[4/5] bg-black rounded-[32px] overflow-hidden border border-white/5 relative mb-16 shadow-2xl">
                {capturedImage ? (
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                ) : (
                  <img 
                    src={isFront ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop" : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop"} 
                    className="w-full h-full object-cover opacity-60 grayscale"
                    alt="Guide"
                  />
                )}
              </div>
              
              <div className="w-full max-w-sm px-2">
                <button 
                  onClick={() => setIsCapturing(true)}
                  className="w-full py-6 bg-[#8b31ff] hover:bg-[#9d4edd] active:scale-[0.98] text-white text-xl font-bold rounded-[30px] shadow-2xl transition-all"
                >
                  Take Picture
                </button>
              </div>
            </main>
          </div>
        );

      case 'results':
        return (
          <AnalysisView 
            result={analysisResult} 
            isLoading={isAnalyzing}
            image={frontImage || ''} 
            onClose={() => setScanStep('landing')} 
          />
        );
    }
  };

  const renderContent = () => {
    if (activeTab === 'scan') return renderScanContent();
    return (
      <div className="p-10 text-center h-full flex flex-col justify-center">
        <h2 className="text-2xl font-bold mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
        <p className="text-zinc-500">Coming soon in Face-Q Pro.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-zinc-900 flex flex-col relative overflow-hidden text-white shadow-2xl">
      <div className="flex-1 pb-24">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      {(scanStep === 'landing' || activeTab !== 'scan') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-2xl border-t border-white/5 py-3 px-6 pb-8 z-40 max-w-md mx-auto">
          <div className="flex justify-around items-center max-w-sm mx-auto">
            <button onClick={() => { setActiveTab('scan'); setScanStep('landing'); }} className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
              <ScanIcon active={activeTab === 'scan'} />
              <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === 'scan' ? 'text-white' : 'text-zinc-500'}`}>scan</span>
            </button>
            <button onClick={() => setActiveTab('daily')} className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
              <DailyIcon active={activeTab === 'daily'} />
              <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === 'daily' ? 'text-white' : 'text-zinc-500'}`}>daily</span>
            </button>
            <button onClick={() => setActiveTab('coach')} className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
              <CoachIcon active={activeTab === 'coach'} />
              <span className={`text-[10px] font-bold tracking-widest uppercase ${activeTab === 'coach' ? 'text-white' : 'text-zinc-500'}`}>coach</span>
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
    </div>
  );
};

export default App;
