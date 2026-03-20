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

// Track the latest requested patientId to discard stale concurrent fetches
let _latestMedFetchId = '';

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  loading: false,
  error: null,

  fetchMedications: async (patientId, showStopped = false) => {
    _latestMedFetchId = patientId;
    // Clear immediately when switching patients so stale data never shows
    const currentMeds = get().medications;
    if (currentMeds.length > 0 && currentMeds[0].patientId !== patientId) {
      set({ medications: [] });
    }
    set({ loading: true, error: null });
    // Warm-start: show cached data immediately so the list is never blank
    try {
      const cached = await AsyncStorage.getItem(`cache:medications:${patientId}`);
      if (cached && patientId === _latestMedFetchId) {
        set({ medications: JSON.parse(cached) });
      }
    } catch {}
    try {
      const { data } = await patientsApi.getMedications(patientId, showStopped);
      if (patientId !== _latestMedFetchId) return; // discard stale fetch
      set({ medications: data });
      try { await AsyncStorage.setItem(`cache:medications:${patientId}`, JSON.stringify(data)); } catch {}
    } catch (err: any) {
      if (patientId !== _latestMedFetchId) return;
      set({ error: err?.response?.data?.error || err?.message || 'Failed to load medications' });
    } finally {
      set({ loading: false });
    }
  },

  addMedication: async (patientId, data) => {
    const { data: med } = await patientsApi.addMedication(patientId, data);
    set((state) => ({ medications: [...state.medications, med] }));
    try { await AsyncStorage.removeItem(`cache:medications:${patientId}`); } catch {}
    return med;
  },

  updateMedication: async (id, data) => {
    const { data: updated } = await medicationsApi.update(id, data);
    set((state) => ({
      medications: state.medications.map((m) => (m.id === id ? updated : m)),
    }));
  },

  stopMedication: async (id) => {
    await medicationsApi.stop(id);
    const patientId = get().medications.find((m) => m.id === id)?.patientId;
    set((state) => ({
      medications: state.medications.map((m) => m.id === id ? { ...m, isActive: false } : m),
    }));
    if (patientId) { try { await AsyncStorage.removeItem(`cache:medications:${patientId}`); } catch {} }
  },

  restartMedication: async (id) => {
    await medicationsApi.restart(id);
    const patientId = get().medications.find((m) => m.id === id)?.patientId;
    set((state) => ({
      medications: state.medications.map((m) => m.id === id ? { ...m, isActive: true } : m),
    }));
    if (patientId) { try { await AsyncStorage.removeItem(`cache:medications:${patientId}`); } catch {} }
  },

  deleteMedication: async (id) => {
    const patientId = get().medications.find((m) => m.id === id)?.patientId;
    await medicationsApi.delete(id);
    set((state) => ({
      medications: state.medications.filter((m) => m.id !== id),
    }));
    if (patientId) { try { await AsyncStorage.removeItem(`cache:medications:${patientId}`); } catch {} }
  },
}));
