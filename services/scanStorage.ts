import type { AnalysisResult, ScanRecord } from '../types';

const STORAGE_KEY = 'faceq_scans';
const MAX_SCANS = 20;
const THUMBNAIL_WIDTH = 120;

/** Create a small base64 thumbnail from a data URL image. */
export function createThumbnail(dataUrl: string, maxWidth: number = THUMBNAIL_WIDTH): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        reject(new Error('toDataURL failed'));
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

function loadScans(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveScans(scans: ScanRecord[]): void {
  const trimmed = scans.slice(0, MAX_SCANS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getScans(): ScanRecord[] {
  const scans = loadScans();
  return scans.sort((a, b) => (b.date > a.date ? 1 : -1));
}

export async function saveScan(imageDataUrl: string, result: AnalysisResult): Promise<ScanRecord> {
  const thumbnail = await createThumbnail(imageDataUrl);
  const record: ScanRecord = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    thumbnail,
    result,
  };
  const scans = loadScans();
  scans.unshift(record);
  saveScans(scans);
  return record;
}

export function deleteScan(id: string): void {
  const scans = loadScans().filter((s) => s.id !== id);
  saveScans(scans);
}
