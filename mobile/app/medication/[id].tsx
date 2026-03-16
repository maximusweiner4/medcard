import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { medicationsApi } from '../../src/services/api';
import { useMedicationStore } from '../../src/stores/medicationStore';
import type { Medication } from '../../src/types';

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stopMedication, restartMedication, deleteMedication } = useMedicationStore();
  const [med, setMed] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError(null);
    medicationsApi.get(id)
      .then(({ data }) => setMed(data))
      .catch(() => setError('Failed to load medication. Tap to retry.'))
      .finally(() => setLoading(false));
  }, [id]);

  function confirmStop() {
    Alert.alert('Stop Medication', `Mark "${med?.drugName}" as stopped? It will be moved to the stopped list and can be restarted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try { await stopMedication(id); router.back(); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed to stop medication'); }
        finally { setActionLoading(false); }
      }},
    ]);
  }

  function confirmDelete() {
    Alert.alert('Delete Medication', `Permanently delete "${med?.drugName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await deleteMedication(id);
          router.back();
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'Failed to delete medication');
        } finally {
          setActionLoading(false);
        }
      }},
    ]);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data } = await medicationsApi.history(id);
      setHistoryLogs(data);
    } catch {
      setHistoryError('Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0f4c81" />;
  if (!med) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: '#64748b', textAlign: 'center', marginBottom: 16 }}>
        {error || 'Medication not found.'}
      </Text>
      {error && (
        <TouchableOpacity onPress={() => { setLoading(true); setError(null); medicationsApi.get(id).then(({ data }) => setMed(data)).catch(() => setError('Failed to load medication. Tap to retry.')).finally(() => setLoading(false)); }}>
          <Text style={{ color: '#0d9488', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const details = [
    { label: 'Indication', value: med.indication },
    { label: 'Dose', value: med.dose },
    { label: 'Form', value: med.form },
    { label: 'Route', value: med.route },
    { label: 'Frequency', value: med.frequency },
    { label: 'Prescriber', value: med.prescriber },
    { label: 'Pharmacy', value: med.pharmacy },
  ].filter((d) => d.value);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.topCard}>
        {med.pillImageUrl ? (
          <Image source={{ uri: med.pillImageUrl }} style={styles.pillImg} />
        ) : (
          <View style={styles.pillPlaceholder}><Text style={{ fontSize: 40 }}>💊</Text></View>
        )}
        <Text style={styles.drugName}>{med.drugName}</Text>
        {med.brandName ? <Text style={styles.brandName}>{med.brandName}</Text> : null}
        {!med.isActive && <View style={styles.stoppedBadge}><Text style={styles.stoppedText}>STOPPED</Text></View>}
      </View>

      <View style={styles.section}>
        {details.map((d) => (
          <View key={d.label} style={styles.row}>
            <Text style={styles.rowLabel}>{d.label}</Text>
            <Text style={styles.rowValue}>{d.value}</Text>
          </View>
        ))}
      </View>

      {med.instructions ? (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Special Instructions</Text>
          <Text style={styles.instructionsText}>{med.instructions}</Text>
        </View>
      ) : null}

      {(med.pillColor || med.pillShape || med.pillImprint) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.tagRow}>
            {med.pillColor && <View style={styles.tag}><Text style={styles.tagText}>{med.pillColor}</Text></View>}
            {med.pillShape && <View style={styles.tag}><Text style={styles.tagText}>{med.pillShape}</Text></View>}
            {med.pillImprint && <View style={styles.tag}><Text style={styles.tagText}>Imprint: {med.pillImprint}</Text></View>}
          </View>
        </View>
      ) : null}

      {/* History Section */}
      <TouchableOpacity
        style={styles.historyToggle}
        onPress={() => {
          const next = !historyVisible;
          setHistoryVisible(next);
          if (next && historyLogs.length === 0) loadHistory();
        }}
      >
        <Text style={styles.historyToggleText}>
          {historyVisible ? 'Hide History' : 'Show History'}
        </Text>
        <Ionicons name={historyVisible ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
      </TouchableOpacity>

      {historyVisible && (
        <View style={styles.historySection}>
          {historyLoading ? (
            <ActivityIndicator color="#0f4c81" style={{ paddingVertical: 20 }} />
          ) : historyError ? (
            <Text style={styles.historyEmpty}>{historyError}</Text>
          ) : historyLogs.length === 0 ? (
            <Text style={styles.historyEmpty}>No history found.</Text>
          ) : (
            historyLogs.map((log) => {
              const changeColors: Record<string, { bg: string; text: string }> = {
                ADDED: { bg: '#ccfbf1', text: '#0f766e' },
                UPDATED: { bg: '#dbeafe', text: '#1e40af' },
                STOPPED: { bg: '#fee2e2', text: '#dc2626' },
                RESTARTED: { bg: '#dcfce7', text: '#16a34a' },
                DELETED: { bg: '#f1f5f9', text: '#475569' },
              };
              const colors = changeColors[log.changeType] ?? { bg: '#f1f5f9', text: '#475569' };
              return (
                <View key={log.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <View style={[styles.changeTypeBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.changeTypeText, { color: colors.text }]}>{log.changeType}</Text>
                    </View>
                    <Text style={styles.historyTime}>{timeAgo(log.createdAt)}</Text>
                  </View>
                  <Text style={styles.historyBy}>by {log.changedBy?.name || log.changedBy?.email || 'Unknown'}</Text>
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.editBtn, actionLoading && { opacity: 0.6 }]} onPress={() => router.push(`/medication/edit/${id}`)} disabled={actionLoading}>
          <Text style={styles.editBtnText}>Edit Medication</Text>
        </TouchableOpacity>
        {med.isActive ? (
          <TouchableOpacity style={[styles.stopBtn, { opacity: actionLoading ? 0.6 : 1 }]} onPress={confirmStop} disabled={actionLoading}>
            <Text style={styles.stopBtnText}>Stop Medication</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.restartBtn, { opacity: actionLoading ? 0.6 : 1 }]} disabled={actionLoading} onPress={() => {
            Alert.alert('Restart Medication', `Mark "${med?.drugName}" as active again?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Restart', onPress: async () => {
                setActionLoading(true);
                try { await restartMedication(id); }
                catch (e: any) { Alert.alert('Error', e?.message || 'Failed to restart medication'); }
                finally { setActionLoading(false); }
              }},
            ]);
          }}>
            <Text style={styles.restartBtnText}>Restart Medication</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.deleteBtn, actionLoading && { opacity: 0.4 }]} onPress={confirmDelete} disabled={actionLoading}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  pillImg: { width: 100, height: 100, borderRadius: 12, resizeMode: 'contain', marginBottom: 16 },
  pillPlaceholder: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  drugName: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  brandName: { fontSize: 15, color: '#64748b', marginTop: 4 },
  stoppedBadge: { backgroundColor: '#fef2f2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10 },
  stoppedText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel: { fontSize: 14, color: '#64748b' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1, textAlign: 'right' },
  instructionsBox: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#fde68a', marginBottom: 12 },
  instructionsLabel: { fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 6, textTransform: 'uppercase' },
  instructionsText: { fontSize: 15, color: '#78350f', lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 13, color: '#475569' },
  actions: { gap: 10, marginTop: 8 },
  stopBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  stopBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  restartBtn: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  restartBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 15 },
  deleteBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { color: '#94a3b8', fontSize: 14 },
  editBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 0 },
  editBtnText: { color: '#1e40af', fontWeight: '700', fontSize: 15 },
  historyToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  historyToggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  historySection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  historyEmpty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  historyItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  historyItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  changeTypeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  changeTypeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  historyTime: { fontSize: 12, color: '#94a3b8' },
  historyBy: { fontSize: 12, color: '#64748b' },
});
