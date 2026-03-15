import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const { user, loading, loadSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user && inAuth) router.replace('/(tabs)/');
  }, [user, loading, segments]);

  return (
    <ErrorBoundary>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="patient/[id]" options={{ headerShown: true, title: 'Patient Profile' }} />
      <Stack.Screen name="medication/add" options={{ headerShown: true, title: 'Add Medication' }} />
      <Stack.Screen name="medication/[id]" options={{ headerShown: true, title: 'Medication Details' }} />
      <Stack.Screen name="medication/edit/[id]" options={{ headerShown: true, title: 'Edit Medication' }} />
      <Stack.Screen name="patient-display" options={{ headerShown: false }} />
    </Stack>
    </ErrorBoundary>
  );
}
