import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricState {
  isEnabled: boolean;
  isLocked: boolean;
  loadSetting: () => Promise<void>;
  setSetting: (enabled: boolean) => Promise<void>;
  unlock: () => Promise<boolean>;
  lock: () => void;
}

export const useBiometricStore = create<BiometricState>((set) => ({
  isEnabled: false,
  isLocked: false,

  loadSetting: async () => {
    try {
      const value = await AsyncStorage.getItem('biometric:enabled');
      set({ isEnabled: value === 'true' });
    } catch {}
  },

  setSetting: async (enabled) => {
    try {
      await AsyncStorage.setItem('biometric:enabled', enabled ? 'true' : 'false');
      set({ isEnabled: enabled, isLocked: enabled });
    } catch {}
  },

  unlock: async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to open MedCard',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });
      if (result.success) {
        set({ isLocked: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  lock: () => set({ isLocked: true }),
}));
