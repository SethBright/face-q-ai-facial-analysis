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

export interface ScanRecord {
  id: string;
  date: string; // ISO
  thumbnail: string; // base64 data URL
  result: AnalysisResult;
}

export type AppTab = 'scan' | 'daily' | 'coach';
export type ScanStep = 'landing' | 'front_upload' | 'side_upload' | 'results' | 'scan_detail';

export interface Message {
  role: 'user' | 'model';
  text: string;
}
