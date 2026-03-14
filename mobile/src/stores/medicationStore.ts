import { create } from 'zustand';
import { patientsApi, medicationsApi } from '../services/api';
import type { Medication } from '../types';

interface MedicationState {
  medications: Medication[];
  loading: boolean;
  fetchMedications: (patientId: string, showStopped?: boolean) => Promise<void>;
  addMedication: (patientId: string, data: Partial<Medication>) => Promise<Medication>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  stopMedication: (id: string) => Promise<void>;
  restartMedication: (id: string) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
}

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  loading: false,

  fetchMedications: async (patientId, showStopped = false) => {
    set({ loading: true });
    const { data } = await patientsApi.getMedications(patientId, showStopped);
    set({ medications: data, loading: false });
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
    await medicationsApi.stop(id);
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, isActive: false } : m
      ),
    }));
  },

  restartMedication: async (id) => {
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
