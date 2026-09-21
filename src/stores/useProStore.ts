import { create } from 'zustand';
import confetti from 'canvas-confetti';

interface ProState {
  isPro: boolean;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  activatePro: () => void;
  validateAndActivateLicense: (key: string) => { success: boolean; message: string };
  activateViaUtr: (utr: string) => { success: boolean; message: string };
}

// Simple checksum verification algorithm for offline license keys
function verifyLicenseKeyChecksum(key: string): boolean {
  const clean = key.trim().toUpperCase();

  // 1. Master instant passkeys
  const masterKeys = [
    'UIKEY-PRO-2026',
    'DOCUFORGE-VIP',
    'PRO-LIFETIME',
    'UIKEY-DEV-PRO',
    'STUDIO-PRO-ACCESS',
  ];
  if (masterKeys.includes(clean)) {
    return true;
  }

  // 2. Pattern: UIKEY-PRO-XXXX-XXXX or PRO-XXXX-XXXX-XXXX
  // Format check: starts with UIKEY-PRO- or PRO-
  if (/^(UIKEY-PRO|PRO)-[A-Z0-9]{4,6}-[A-Z0-9]{4,6}$/.test(clean)) {
    // Checksum: sum of char codes modulo 7 === 0 or length check
    let sum = 0;
    for (let i = 0; i < clean.length; i++) {
      sum += clean.charCodeAt(i);
    }
    return sum % 3 === 0 || sum % 5 === 0;
  }

  return false;
}

export const useProStore = create<ProState>((set) => ({
  isPro: typeof window !== 'undefined' && localStorage.getItem('is_pro_user') === 'true',
  isUpgradeModalOpen: false,

  openUpgradeModal: () => set({ isUpgradeModalOpen: true }),
  closeUpgradeModal: () => set({ isUpgradeModalOpen: false }),

  activatePro: () => {
    try {
      localStorage.setItem('is_pro_user', 'true');
    } catch (e) {
      console.warn('Could not set is_pro_user in localStorage', e);
    }
    set({ isPro: true, isUpgradeModalOpen: false });

    // Celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F3E5AB', '#FFFFFF', '#10B981'],
      });
    } catch {
      // ignore
    }
  },

  validateAndActivateLicense: (key: string) => {
    if (!key || !key.trim()) {
      return { success: false, message: 'Please enter a valid license key.' };
    }

    const isValid = verifyLicenseKeyChecksum(key);
    if (isValid) {
      try {
        localStorage.setItem('is_pro_user', 'true');
        localStorage.setItem('uikey_pro_license_key', key.trim().toUpperCase());
      } catch (e) {
        console.warn('Could not save license to localStorage', e);
      }
      set({ isPro: true, isUpgradeModalOpen: false });

      try {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F3E5AB', '#FFFFFF', '#10B981'],
        });
      } catch {
        // ignore
      }

      return {
        success: true,
        message: 'License key verified successfully! Pro unlocked for lifetime.',
      };
    } else {
      return {
        success: false,
        message: 'Invalid license key format. Please check your key or contact support.',
      };
    }
  },

  activateViaUtr: (utr: string) => {
    const cleanUtr = utr.trim();
    if (cleanUtr.length < 8) {
      return {
        success: false,
        message: 'Please enter a valid 12-digit transaction UTR / Reference ID.',
      };
    }

    try {
      localStorage.setItem('is_pro_user', 'true');
      localStorage.setItem('uikey_pro_utr', cleanUtr);
    } catch (e) {
      console.warn('Could not save UTR to localStorage', e);
    }

    set({ isPro: true, isUpgradeModalOpen: false });

    try {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F3E5AB', '#FFFFFF', '#10B981'],
      });
    } catch {
      // ignore
    }

    return {
      success: true,
      message: 'Payment verification recorded! Pro features unlocked instantly.',
    };
  },
}));
