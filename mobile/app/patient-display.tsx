/**
 * Patient Display Mode — the large-text lock-screen card
 * Designed for elderly patients to show to providers.
 * Accessible via share link (no auth) or from the app.
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePatientStore } from '../src/stores/patientStore';
import { useMedicationStore } from '../src/stores/medicationStore';
import type { Medication } from '../src/types';

export default function PatientDisplayScreen() {
  const { activePatient } = usePatientStore();
  const { medications, fetchMedications } = useMedicationStore();
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  const bg = darkMode ? '#0f172a' : '#ffffff';
  const text = darkMode ? '#f8fafc' : '#0f172a';
  const subText = darkMode ? '#94a3b8' : '#475569';
  const cardBg = darkMode ? '#1e293b' : '#f8fafc';
  const border = darkMode ? '#334155' : '#e2e8f0';

  useEffect(() => {
    if (!activePatient) return;
    // Skip refetch only if we already have meds for THIS patient
    if (medications.length > 0 && medications[0].patientId === activePatient.id) return;
    fetchMedications(activePatient.id);
  }, [activePatient?.id]);

  if (!activePatient) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <Text style={[styles.noPatient, { color: text }]}>No patient selected</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/')} style={{ marginTop: 16 }}>
          <Text style={{ color: '#0d9488', fontWeight: '600', fontSize: 15 }}>Go to Patients</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const active = medications.filter((m) => m.isActive);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: darkMode ? '#1e293b' : '#0d9488' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{activePatient.name}</Text>
          {activePatient.dateOfBirth ? (
            <Text style={styles.headerSub}>DOB: {new Date(activePatient.dateOfBirth).toLocaleDateString('en-US')}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={styles.modeToggle}>
          <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Allergy Banner */}
      {activePatient.allergies.length > 0 ? (
        <View style={styles.allergyBanner}>
          <Ionicons name="warning-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.allergyBannerText}>ALLERGIES: {activePatient.allergies.join(', ').toUpperCase()}</Text>
        </View>
      ) : (
        <View style={[styles.allergyBanner, styles.noAllergyBanner]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.noAllergyText}>No Known Drug Allergies</Text>
        </View>
      )}

      {/* Medication count */}
      <Text style={[styles.countText, { color: subText }]}>
        {active.length} Active Medication{active.length !== 1 ? 's' : ''}
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {active.length === 0 ? (
          <Text style={[styles.noMeds, { color: subText }]}>No active medications on record.</Text>
        ) : (
          active.map((med) => (
            <MedCard key={med.id} med={med} bg={cardBg} border={border} text={text} subText={subText} />
          ))
        )}
      </ScrollView>

      <Text style={[styles.footer, { color: subText }]}>
        KinRx · Last updated {activePatient.updatedAt ? new Date(activePatient.updatedAt).toLocaleDateString('en-US') : '—'}
      </Text>
    </SafeAreaView>
  );
}

function MedCard({ med, bg, border, text, subText }: { med: Medication; bg: string; border: string; text: string; subText: string }) {
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.cardLeft}>
        {med.pillImageUrl ? (
          <Image source={{ uri: med.pillImageUrl }} style={styles.pillImg} />
        ) : (
          <View style={[styles.pillPlaceholder, { backgroundColor: border }]}>
            <Ionicons name="medical-outline" size={32} color="#0d9488" />
          </View>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.medName, { color: text }]}>{med.drugName}</Text>
        {med.brandName ? <Text style={[styles.brandName, { color: subText }]}>{med.brandName}</Text> : null}
        {med.indication ? (
          <Text style={[styles.indicationText, { color: '#0d9488' }]}>For: {med.indication}</Text>
        ) : null}
        {med.dose || med.form ? (
          <Text style={[styles.doseText, { color: subText }]}>
            {[med.dose, med.form].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {med.frequency ? (
          <View style={styles.freqBadge}>
            <Text style={styles.freqText}>{med.frequency}</Text>
          </View>
        ) : null}
        {med.instructions ? (
          <Text style={[styles.instructions, { color: subText }]}>{med.instructions}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPatient: { fontSize: 18, fontWeight: '600' },
  header: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center' },
  patientName: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 16, color: '#99f6e4', marginTop: 2 },
  modeToggle: { padding: 8 },
  allergyBanner: { backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  allergyBannerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noAllergyBanner: { backgroundColor: '#16a34a' },
  noAllergyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  countText: { fontSize: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  noMeds: { fontSize: 18, textAlign: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardLeft: {},
  pillImg: { width: 80, height: 80, borderRadius: 10, resizeMode: 'contain' },
  pillPlaceholder: { width: 80, height: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardRight: { flex: 1 },
  medName: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  brandName: { fontSize: 15, marginTop: 2 },
  indicationText: { fontSize: 15, marginTop: 4, fontStyle: 'italic' },
  doseText: { fontSize: 16, marginTop: 4 },
  freqBadge: { backgroundColor: '#ccfbf1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 },
  freqText: { color: '#0f766e', fontSize: 14, fontWeight: '600' },
  instructions: { fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  footer: { textAlign: 'center', fontSize: 12, paddingVertical: 16 },
});
