
export interface AnalysisResult {
  overall: number;
  potential: number;
  masculinity: number;
  skinQuality: number;
  jawline: number;
  cheekbones: number;
  faceShape: string;
  recommendations: {
    skincare: string[];
    grooming: string[];
  };
  summary: string;
}

export type AppTab = 'scan' | 'daily' | 'coach';
export type ScanStep = 'landing' | 'front_upload' | 'side_upload' | 'results';

export interface Message {
  role: 'user' | 'model';
  text: string;
}
