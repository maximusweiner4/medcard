import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePatientStore } from '../../src/stores/patientStore';
import { useMedicationStore } from '../../src/stores/medicationStore';

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activePatient } = usePatientStore();
  const { medications, fetchMedications } = useMedicationStore();
  const router = useRouter();

  useEffect(() => {
    if (id) fetchMedications(id);
  }, [id]);

  const patient = activePatient;
  if (!patient) return null;

  const active = medications.filter((m) => m.isActive);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.profileCard}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.name}>{patient.name}</Text>
        {patient.dateOfBirth && (
          <Text style={styles.dob}>DOB: {new Date(patient.dateOfBirth).toLocaleDateString('en-US')}</Text>
        )}
        {patient.allergies.length > 0 ? (
          <View style={styles.allergyBox}>
            <Text style={styles.allergyLabel}>⚠️ Allergies</Text>
            <Text style={styles.allergyValues}>{patient.allergies.join(', ')}</Text>
          </View>
        ) : (
          <View style={[styles.allergyBox, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Text style={[styles.allergyLabel, { color: '#16a34a' }]}>✓ No Known Drug Allergies</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{active.length}</Text>
          <Text style={styles.statLabel}>Active Meds</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{medications.filter((m) => !m.isActive).length}</Text>
          <Text style={styles.statLabel}>Stopped</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/medication/add')}>
        <Text style={styles.actionBtnText}>💊 Add Medication</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.displayBtn]} onPress={() => router.push('/patient-display')}>
        <Text style={[styles.actionBtnText, { color: '#065f46' }]}>📋 Patient Display Mode</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={() => router.push('/(tabs)/share')}>
        <Text style={[styles.actionBtnText, { color: '#0f4c81' }]}>📤 Share Medication List</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  avatar: { fontSize: 48, marginBottom: 12 },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  dob: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  allergyBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 10, padding: 12, width: '100%', alignItems: 'center' },
  allergyLabel: { fontSize: 13, fontWeight: '700', color: '#dc2626', marginBottom: 2 },
  allergyValues: { fontSize: 14, color: '#7f1d1d' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statNum: { fontSize: 32, fontWeight: '800', color: '#0f4c81' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  actionBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  displayBtn: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  shareBtn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
});
