import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, ActivityIndicator, ScrollView, Switch, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePatientStore } from '../../src/stores/patientStore';
import { patientsApi } from '../../src/services/api';
import { useBiometricStore } from '../../src/stores/biometricStore';
import { showSuccess } from '../../src/utils/toast';

export default function ShareScreen() {
  const { activePatient } = usePatientStore();
  const router = useRouter();
  const [shareData, setShareData] = useState<{ shareUrl: string; qrCodeDataUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { isEnabled, setSetting } = useBiometricStore();

  // Clear stale link whenever the active patient changes
  useEffect(() => {
    setShareData(null);
  }, [activePatient?.id]);

  if (!activePatient) {
    return (
      <View style={styles.empty}>
        <Ionicons name="share-social-outline" size={64} color="#0d9488" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No patient selected</Text>
        <Text style={styles.emptyText}>Select a patient from the Patients tab first.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/')}>
          <Text style={styles.emptyBtnText}>Go to Patients</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleGenerateLink() {
    setLoading(true);
    try {
      const { data } = await patientsApi.createShare(activePatient!.id);
      setShareData(data);
      showSuccess('Share link generated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!shareData) return;
    await Share.share({ message: `${activePatient!.name}'s medication list: ${shareData.shareUrl}` });
  }

  async function handleBiometricToggle(value: boolean) {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometrics Unavailable', 'This device does not have biometric authentication set up.');
        return;
      }
    }
    await setSetting(value);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Text style={styles.title}>Share {activePatient.name}'s Meds</Text>
      <Text style={styles.subtitle}>
        Generate a read-only link for hospital providers, family members, or anyone who needs to see the medication list. No login required to view.
      </Text>

      {!shareData ? (
        <TouchableOpacity style={styles.btn} onPress={handleGenerateLink} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Generate Share Link</Text>}
        </TouchableOpacity>
      ) : (
        <View style={styles.shareBox}>
          <View style={styles.qrContainer}>
            <QRCode value={shareData.shareUrl} size={Math.min(Dimensions.get('window').width - 64, 400)} color="#0d9488" backgroundColor="#fff" />
          </View>
          <Text style={styles.qrNote}>
            Show this QR code to a doctor, pharmacist, or family member — they can scan it with their phone to instantly see the medication list.
          </Text>
          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#0f766e" style={{ marginTop: 1 }} />
            <Text style={styles.privacyNoteText}>
              Recipients can only view the list — they cannot edit anything or access your account.
            </Text>
          </View>

          <View style={styles.urlBox}>
            <Text style={styles.urlText} numberOfLines={2}>{shareData.shareUrl}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
            <Ionicons name="share-social-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.copyBtnText}>Share Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newLinkBtn} onPress={() => {
            Alert.alert(
              'Generate New Link?',
              'This will create a new link. The previous link will stop working.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Generate New', style: 'destructive', onPress: () => { setShareData(null); } },
              ]
            );
          }}>
            <Text style={styles.newLinkText}>Generate New Link</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.displayModeCard} onPress={() => router.push('/patient-display')}>
        <View style={styles.displayModeRow}>
          <Ionicons name="tablet-landscape-outline" size={28} color="#065f46" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.displayModeTitle}>Patient Display Mode</Text>
            <Text style={styles.displayModeText}>Large-text view for your loved one to show to providers or keep on their home screen.</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#059669" />
        </View>
      </TouchableOpacity>

      <View style={styles.securityCard}>
        <View style={styles.securityRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Require Biometrics</Text>
            <Text style={styles.securitySubtitle}>Lock the app when it goes to the background</Text>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: '#e2e8f0', true: '#0d9488' }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f8fafc' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#0d9488', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 17, color: '#64748b', marginBottom: 28, lineHeight: 24 },
  btn: { backgroundColor: '#0d9488', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  shareBox: { alignItems: 'center' },
  qrContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  qrNote: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 10, lineHeight: 22 },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 16, width: '100%' },
  privacyNoteText: { flex: 1, fontSize: 13, color: '#0f766e', lineHeight: 18 },
  urlBox: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, width: '100%', marginBottom: 14 },
  urlText: { fontSize: 13, color: '#475569', fontFamily: 'monospace' },
  copyBtn: { backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12 },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  newLinkBtn: { paddingVertical: 10 },
  newLinkText: { color: '#64748b', fontSize: 14 },
  displayModeCard: { marginTop: 32, backgroundColor: '#ecfdf5', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#6ee7b7' },
  displayModeRow: { flexDirection: 'row', alignItems: 'center' },
  displayModeTitle: { fontSize: 16, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  displayModeText: { fontSize: 14, color: '#047857', lineHeight: 20 },
  securityCard: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  securityRow: { flexDirection: 'row', alignItems: 'center' },
  securityTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  securitySubtitle: { fontSize: 13, color: '#64748b' },
});
