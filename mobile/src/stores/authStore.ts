import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  loadSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const { data } = await api.post('/api/auth/sync');
          set({ user: data, loading: false });
        } catch {
          await supabase.auth.signOut();
          set({ user: null, loading: false });
        }
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    const { data } = await api.post('/api/auth/sync');
    if (!data) throw new Error('Session sync failed. Please try again.');
    set({ user: data });
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw error;
    // User needs to verify email before signing in
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
