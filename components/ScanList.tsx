import React from 'react';
import type { ScanRecord } from '../types';

interface ScanListProps {
  scans: ScanRecord[];
  onSelectScan: (scan: ScanRecord) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const ScanList: React.FC<ScanListProps> = ({ scans, onSelectScan }) => {
  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-10 text-center min-h-[200px]">
        <p className="text-xl text-white italic font-medium opacity-80 leading-relaxed max-w-[200px]">
          your completed scans will show up here
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 overflow-y-auto px-6 py-4">
      <ul className="space-y-3">
        {scans.map((scan) => (
          <li key={scan.id}>
            <button
              type="button"
              onClick={() => onSelectScan(scan)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl bg-zinc-800/80 border border-white/5 hover:bg-zinc-800 active:scale-[0.99] transition-all text-left"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-900">
                <img
                  src={scan.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">
                  Overall {scan.result.overall}
                </p>
                <p className="text-zinc-500 text-sm">
                  {formatDate(scan.date)}
                </p>
              </div>
              <span className="text-zinc-500 shrink-0" aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScanList;
