import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientsApi, medicationsApi } from '../services/api';
import type { Medication } from '../types';

interface MedicationState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  fetchMedications: (patientId: string, showStopped?: boolean) => Promise<void>;
  addMedication: (patientId: string, data: Partial<Medication>) => Promise<Medication>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  stopMedication: (id: string) => Promise<void>;
  restartMedication: (id: string) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
}

export const useMedicationStore = create<MedicationState>((set) => ({
  medications: [],
  loading: false,
  error: null,

  fetchMedications: async (patientId, showStopped = false) => {
    set({ loading: true, error: null });
    try {
      const { data } = await patientsApi.getMedications(patientId, showStopped);
      set({ medications: data });
      try { await AsyncStorage.setItem(`cache:medications:${patientId}`, JSON.stringify(data)); } catch {}
    } catch (err: any) {
      try {
        const cached = await AsyncStorage.getItem(`cache:medications:${patientId}`);
        if (cached) {
          set({ medications: JSON.parse(cached), error: 'Showing cached data (offline)', loading: false });
          return;
        }
      } catch {}
      set({ error: err?.response?.data?.error || err?.message || 'Failed to load medications' });
    } finally {
      set({ loading: false });
    }
  },

  addMedication: async (patientId, data) => {
    const { data: med } = await patientsApi.addMedication(patientId, data);
    set((state) => ({ medications: [...state.medications, med] }));
    return med;
  },

  updateMedication: async (id, data) => {
    const { data: updated } = await medicationsApi.update(id, data);
    set((state) => ({
      medications: state.medications.map((m) => (m.id === id ? updated : m)),
    }));
  },

  stopMedication: async (id) => {
    // API call first — only update local state if it succeeds
    await medicationsApi.stop(id);
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, isActive: false } : m
      ),
    }));
  },

  restartMedication: async (id) => {
    // API call first — only update local state if it succeeds
    await medicationsApi.restart(id);
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, isActive: true } : m
      ),
    }));
  },

  deleteMedication: async (id) => {
    await medicationsApi.delete(id);
    set((state) => ({
      medications: state.medications.filter((m) => m.id !== id),
    }));
  },
}));
