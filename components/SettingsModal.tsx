import React, { useState, useCallback } from 'react';
import { requestAppReview } from '../services/ratingService';
import { getGender, setGender } from '../services/genderPreferenceStorage';
import { clearAllAppData } from '../services/clearAllData';
import { CONTACT_SUPPORT_URL, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../constants/legalUrls';

interface SettingsModalProps {
  onClose: () => void;
  /** Called after user confirms delete: clear data then reset app to start of onboarding. */
  onAccountDeleted?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onAccountDeleted }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRateUs = useCallback(async () => {
    await requestAppReview();
  }, []);

  const handleChangeGender = useCallback(() => {
    const current = getGender();
    setGender(current === 'female' ? 'male' : 'female');
    onClose();
  }, [onClose]);

  const handleDeleteAccount = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    clearAllAppData();
    setShowDeleteConfirm(false);
    onClose();
    onAccountDeleted?.();
  }, [onClose, onAccountDeleted]);

  const menuItems = [
    { label: 'Rate us', emoji: '⭐', onClick: handleRateUs },
    { label: 'Copy my referral code', emoji: '#️⃣', onClick: () => {}, comingSoon: true },
    { label: 'Change gender', emoji: '👫', onClick: handleChangeGender },
    { label: 'Contact support', emoji: '✉️', onClick: () => window.open(CONTACT_SUPPORT_URL, '_blank') },
    { label: 'Delete my account', emoji: '❌', onClick: handleDeleteAccount, danger: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-900"
      style={{ paddingTop: 'max(4rem, calc(env(safe-area-inset-top) + 2rem))' }}
    >
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="rounded-2xl border border-white/5 overflow-hidden bg-zinc-800/40">
          {menuItems.map((item, i) =>
            item.comingSoon ? (
              <div
                key={item.label}
                className={`relative w-full flex items-center gap-4 px-4 py-4 text-left select-none ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <span className="text-xl blur-sm" aria-hidden>{item.emoji}</span>
                <span className="font-medium text-white blur-sm">{item.label}</span>
                <span
                  className="absolute inset-0 flex items-center justify-center bg-zinc-800/60 backdrop-blur-[2px] rounded-none text-zinc-400 font-medium text-sm"
                  aria-hidden
                >
                  Coming soon
                </span>
              </div>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors active:bg-white/5 ${
                  i > 0 ? 'border-t border-white/5' : ''
                } ${item.danger ? 'text-red-400' : 'text-white'}`}
              >
                <span className="text-xl" aria-hidden>{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          )}
        </div>

        <div className="flex justify-center gap-8 mt-8 text-zinc-500 text-sm">
          <button
            type="button"
            onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')}
            className="hover:text-zinc-300 transition-colors"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => TERMS_OF_USE_URL && window.open(TERMS_OF_USE_URL, '_blank')}
            className="hover:text-zinc-300 transition-colors"
            disabled={!TERMS_OF_USE_URL}
          >
            Terms
          </button>
        </div>
      </div>

      {/* Delete account confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/70" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-zinc-800 rounded-2xl border border-white/10 p-5 max-w-sm w-full">
            <h3 id="delete-dialog-title" className="text-lg font-bold text-white mb-2">Delete my account</h3>
            <p className="text-zinc-400 text-sm mb-5">
              This will permanently delete all your scans, progress, streak, and data from this device. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium text-zinc-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-xl font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Delete all data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;
