import { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePatientStore } from '../../src/stores/patientStore';
import { useMedicationStore } from '../../src/stores/medicationStore';
import type { Medication } from '../../src/types';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function MedicationsScreen() {
  const { activePatient } = usePatientStore();
  const { medications, fetchMedications, stopMedication, loading, error } = useMedicationStore();
  const [showStopped, setShowStopped] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const router = useRouter();
  const fetchIdRef = useRef(0);

  useFocusEffect(useCallback(() => {
    if (!activePatient) return;
    const fetchId = ++fetchIdRef.current;
    fetchMedications(activePatient.id, showStopped).then(() => {
      // If a newer fetch started while this one was in flight, ignore (store already has fresher data)
      if (fetchId < fetchIdRef.current) return;
    }).catch(() => {});
  }, [activePatient, showStopped]));

  if (!activePatient) {
    return (
      <View style={styles.empty}>
        <Ionicons name="medical-outline" size={64} color="#0d9488" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No patient selected</Text>
        <Text style={styles.emptyText}>Go to the Patients tab and select a patient first.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/')}>
          <Text style={styles.emptyBtnText}>Go to Patients</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Failed to load</Text>
      <Text style={styles.emptyText}>{error}</Text>
    </View>
  );

  const active = medications.filter((m) => m.isActive);
  const stopped = medications.filter((m) => !m.isActive);

  function confirmStop(med: Medication) {
    Alert.alert('Stop Medication', `Mark "${med.drugName}" as stopped?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => {
        setStoppingId(med.id);
        try { await stopMedication(med.id); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed to stop medication'); }
        finally { setStoppingId(null); }
      }},
    ]);
  }

  const renderMed = ({ item }: { item: Medication }) => (
    <TouchableOpacity style={[styles.card, !item.isActive && styles.cardStopped]}
      onPress={() => router.push(`/medication/${item.id}`)}>
      <View style={styles.cardLeft}>
        {item.pillImageUrl ? (
          <Image source={{ uri: item.pillImageUrl }} style={styles.pillImg} />
        ) : (
          <View style={styles.pillPlaceholder}>
            <Ionicons name="medical-outline" size={26} color="#0d9488" />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.drugName} numberOfLines={1} ellipsizeMode="tail">{item.drugName}</Text>
        {item.brandName ? <Text style={styles.brandName} numberOfLines={1}>{item.brandName}</Text> : null}
        <Text style={styles.doseText} numberOfLines={1}>{[item.dose, item.form, item.route].filter(Boolean).join(' · ')}</Text>
        {item.indication ? <Text style={styles.indicationText} numberOfLines={1} ellipsizeMode="tail">{item.indication}</Text> : null}
        {item.frequency ? <View style={styles.freqChip}><Text style={styles.freqText}>{item.frequency}</Text></View> : null}
        {(() => {
          if (!item.nextRefillDate) return null;
          const d = daysUntil(item.nextRefillDate);
          if (isNaN(d)) return null;
          if (d < 0) return (
            <View style={[styles.refillBadge, { backgroundColor: '#dc2626' }]}>
              <Text style={styles.refillText}>Refill Overdue</Text>
            </View>
          );
          if (d <= 7) return (
            <View style={styles.refillBadge}>
              <Text style={styles.refillText}>Refill in {d}d</Text>
            </View>
          );
          return null;
        })()}
      </View>
      {item.isActive && (
        <TouchableOpacity
          style={[styles.stopBtn, stoppingId === item.id && { opacity: 0.5 }]}
          onPress={() => confirmStop(item)}
          disabled={stoppingId !== null}
        >
          {stoppingId === item.id
            ? <ActivityIndicator size="small" color="#dc2626" />
            : <Text style={styles.stopBtnText}>Stop</Text>
          }
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.patientName}>{activePatient.name}</Text>
        <Text style={styles.count}>{active.length} active</Text>
      </View>

      <FlatList
        data={showStopped ? medications : active}
        keyExtractor={(m) => m.id}
        renderItem={renderMed}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListFooterComponent={
          stopped.length > 0 ? (
            <TouchableOpacity onPress={() => setShowStopped(!showStopped)} style={styles.toggleStopped}>
              <Text style={styles.toggleText}>{showStopped ? 'Hide' : `Show ${stopped.length} stopped`} medication{stopped.length !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/medication/add')}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add Medication</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0d9488', padding: 20, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  patientName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  count: { color: '#99f6e4', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f8fafc' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#0d9488', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardStopped: { opacity: 0.5 },
  cardLeft: { marginRight: 12 },
  pillImg: { width: 56, height: 56, borderRadius: 8, resizeMode: 'contain' },
  pillPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  drugName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  brandName: { fontSize: 13, color: '#64748b' },
  doseText: { fontSize: 13, color: '#475569', marginTop: 2 },
  indicationText: { fontSize: 12, color: '#0d9488', fontStyle: 'italic', marginTop: 2 },
  freqChip: { backgroundColor: '#ccfbf1', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  freqText: { color: '#0f766e', fontSize: 11, fontWeight: '600' },
  refillBadge: { backgroundColor: '#f59e0b', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  refillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stopBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  stopBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  toggleStopped: { alignItems: 'center', paddingVertical: 12 },
  toggleText: { color: '#64748b', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
