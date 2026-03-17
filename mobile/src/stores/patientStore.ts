import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientsApi } from '../services/api';
import type { Patient } from '../types';

interface PatientState {
  patients: Patient[];
  activePatient: Patient | null;
  loading: boolean;
  error: string | null;
  fetchPatients: () => Promise<void>;
  selectPatient: (patient: Patient) => void;
  createPatient: (data: { name: string; dateOfBirth?: string; allergies?: string[] }) => Promise<Patient>;
  updatePatient: (id: string, data: any) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set) => ({
  patients: [],
  activePatient: null,
  loading: false,
  error: null,

  fetchPatients: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await patientsApi.list();
      set({ patients: data });
      try { await AsyncStorage.setItem('cache:patients', JSON.stringify(data)); } catch {}
    } catch (err: any) {
      try {
        const cached = await AsyncStorage.getItem('cache:patients');
        if (cached) {
          set({ patients: JSON.parse(cached), error: 'Showing cached data (offline)', loading: false });
          return;
        }
      } catch {}
      set({ error: err?.response?.data?.error || err?.message || 'Failed to load patients' });
    } finally {
      set({ loading: false });
    }
  },

  selectPatient: (patient) => set({ activePatient: patient }),

  createPatient: async (data) => {
    const { data: patient } = await patientsApi.create(data);
    set((state) => ({ patients: [...state.patients, patient] }));
    try { await AsyncStorage.removeItem('cache:patients'); } catch {}
    return patient;
  },

  updatePatient: async (id, data) => {
    const { data: updated } = await patientsApi.update(id, data);
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? updated : p)),
      activePatient: state.activePatient?.id === id ? updated : state.activePatient,
    }));
    try { await AsyncStorage.removeItem('cache:patients'); } catch {}
  },
}));
