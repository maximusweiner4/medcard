import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useBiometricStore } from '../src/stores/biometricStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const { user, loading, loadSession } = useAuthStore();
  const { isEnabled, isLocked, loadSetting, unlock, lock, cancelLock } = useBiometricStore();
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    loadSession().catch(() => {});
    loadSetting();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isEnabled) lock();
      }
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isEnabled) unlock();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isEnabled]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user && inAuth) router.replace('/(tabs)/');
  }, [user, loading, segments]);

  if (isLocked && user) {
    return (
      <View style={lockStyles.container}>
        <Text style={lockStyles.icon}>🔒</Text>
        <Text style={lockStyles.title}>MedCard is locked</Text>
        <Text style={lockStyles.subtitle}>Authenticate to continue</Text>
        <TouchableOpacity style={lockStyles.btn} onPress={unlock}>
          <Text style={lockStyles.btnText}>Use Biometrics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[lockStyles.btn, lockStyles.cancelBtn]} onPress={cancelLock}>
          <Text style={[lockStyles.btnText, lockStyles.cancelBtnText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

const lockStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f4c81', alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#bfdbfe', marginBottom: 40 },
  btn: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#0f4c81', fontWeight: '800', fontSize: 16 },
  cancelBtn: { marginTop: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff', shadowOpacity: 0, elevation: 0 },
  cancelBtnText: { color: '#fff' },
});
