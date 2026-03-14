import { create } from 'zustand';
import { patientsApi } from '../services/api';
import type { Patient } from '../types';

interface PatientState {
  patients: Patient[];
  activePatient: Patient | null;
  loading: boolean;
  fetchPatients: () => Promise<void>;
  selectPatient: (patient: Patient) => void;
  createPatient: (data: { name: string; dateOfBirth?: string; allergies?: string[] }) => Promise<Patient>;
  updatePatient: (id: string, data: any) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  activePatient: null,
  loading: false,

  fetchPatients: async () => {
    set({ loading: true });
    const { data } = await patientsApi.list();
    set({ patients: data, loading: false });
  },

  selectPatient: (patient) => set({ activePatient: patient }),

  createPatient: async (data) => {
    const { data: patient } = await patientsApi.create(data);
    set((state) => ({ patients: [...state.patients, patient] }));
    return patient;
  },

  updatePatient: async (id, data) => {
    const { data: updated } = await patientsApi.update(id, data);
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? updated : p)),
      activePatient: state.activePatient?.id === id ? updated : state.activePatient,
    }));
  },
}));
