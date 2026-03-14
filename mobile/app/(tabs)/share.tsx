import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, ActivityIndicator, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { usePatientStore } from '../../src/stores/patientStore';
import { patientsApi } from '../../src/services/api';

export default function ShareScreen() {
  const { activePatient } = usePatientStore();
  const [shareData, setShareData] = useState<{ shareUrl: string; qrCodeDataUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!activePatient) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📤</Text>
        <Text style={styles.emptyTitle}>No patient selected</Text>
        <Text style={styles.emptyText}>Select a patient from the Patients tab first.</Text>
      </View>
    );
  }

  async function handleGenerateLink() {
    setLoading(true);
    try {
      const { data } = await patientsApi.createShare(activePatient!.id);
      setShareData(data);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
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
            <QRCode value={shareData.shareUrl} size={220} color="#0f4c81" backgroundColor="#fff" />
          </View>
          <Text style={styles.qrNote}>Providers can scan this QR code to instantly access the medication list</Text>

          <View style={styles.urlBox}>
            <Text style={styles.urlText} numberOfLines={2}>{shareData.shareUrl}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
            <Text style={styles.copyBtnText}>📤 Share Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newLinkBtn} onPress={() => { setShareData(null); }}>
            <Text style={styles.newLinkText}>Generate New Link</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.displayModeCard}>
        <Text style={styles.displayModeTitle}>Patient Display Mode</Text>
        <Text style={styles.displayModeText}>Large-text view for your loved one to show to providers or keep on their home screen.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f8fafc' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 20 },
  btn: { backgroundColor: '#0f4c81', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  shareBox: { alignItems: 'center' },
  qrContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  qrNote: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  urlBox: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, width: '100%', marginBottom: 14 },
  urlText: { fontSize: 13, color: '#475569', fontFamily: 'monospace' },
  copyBtn: { backgroundColor: '#0f4c81', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12 },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  newLinkBtn: { paddingVertical: 10 },
  newLinkText: { color: '#64748b', fontSize: 14 },
  displayModeCard: { marginTop: 32, backgroundColor: '#ecfdf5', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#6ee7b7' },
  displayModeTitle: { fontSize: 16, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  displayModeText: { fontSize: 14, color: '#047857', lineHeight: 20 },
});
