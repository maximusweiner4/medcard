import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Please enter email and password'); return; }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>MedCard</Text>
        <Text style={styles.tagline}>Your family's medication list, always ready.</Text>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword}
          secureTextEntry placeholderTextColor="#94a3b8" />

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 36, fontWeight: '800', color: '#0d9488', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 14, color: '#0f172a',
  },
  btn: {
    backgroundColor: '#0d9488', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#64748b', fontSize: 14 },
  linkBold: { color: '#0d9488', fontWeight: '600' },
});
