import axios from 'axios';
import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ─── Drug Search ──────────────────────────────────────────────────────────────
export const drugsApi = {
  search: (term: string) => api.get(`/api/drugs/search?term=${encodeURIComponent(term)}`),
  getImage: (rxcui: string) => api.get(`/api/drugs/${rxcui}/image`),
  getAppearance: (rxcui: string) => api.get(`/api/drugs/${rxcui}/appearance`),
  getProducts: (rxcui: string) => api.get(`/api/drugs/${rxcui}/products`),
};

// ─── Patients ─────────────────────────────────────────────────────────────────
export const patientsApi = {
  list: () => api.get('/api/patients'),
  get: (id: string) => api.get(`/api/patients/${id}`),
  create: (data: { name: string; dateOfBirth?: string; allergies?: string[] }) =>
    api.post('/api/patients', data),
  update: (id: string, data: any) => api.patch(`/api/patients/${id}`, data),
  createShare: (id: string, expiresAt?: string) =>
    api.post(`/api/patients/${id}/share`, { expiresAt }),
  getMedications: (id: string, showStopped?: boolean) =>
    api.get(`/api/patients/${id}/medications${showStopped ? '?showStopped=true' : ''}`),
  addMedication: (id: string, data: any) => api.post(`/api/patients/${id}/medications`, data),
  inviteCaregiver: (id: string, data: { email: string; permissionLevel?: string; relationship?: string }) =>
    api.post(`/api/patients/${id}/caregivers`, data),
};

// ─── Medications ──────────────────────────────────────────────────────────────
export const medicationsApi = {
  get: (id: string) => api.get(`/api/medications/${id}`),
  update: (id: string, data: any) => api.patch(`/api/medications/${id}`, data),
  stop: (id: string) => api.patch(`/api/medications/${id}/stop`),
  restart: (id: string) => api.patch(`/api/medications/${id}/restart`),
  delete: (id: string) => api.delete(`/api/medications/${id}`),
  history: (id: string) => api.get(`/api/medications/${id}/history`),
};
