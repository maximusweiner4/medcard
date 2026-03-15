import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePatientStore } from '../../src/stores/patientStore';
import { useMedicationStore } from '../../src/stores/medicationStore';
import { patientsApi, caregiversApi } from '../../src/services/api';
import { CaregiverRelation } from '../../src/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activePatient } = usePatientStore();
  const { medications, fetchMedications } = useMedicationStore();
  const router = useRouter();

  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{ interactions: any[]; message?: string; checkedAt?: string } | null>(null);
  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [caregivers, setCaregivers] = useState<CaregiverRelation[]>([]);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverRelationship, setCaregiverRelationship] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [caregiverSectionVisible, setCaregiverSectionVisible] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMedications(id);
      patientsApi.get(id).then(({ data }) => {
        if (data.caregivers) setCaregivers(data.caregivers);
      }).catch(() => {});
    }
  }, [id]);

  const patient = activePatient;
  if (!patient) return null;

  const active = medications.filter((m) => m.isActive);

  async function checkInteractions() {
    setInteractionLoading(true);
    try {
      const { data } = await patientsApi.checkInteractions(patient!.id);
      setInteractionResult(data);
      setInteractionModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to check interactions');
    } finally {
      setInteractionLoading(false);
    }
  }

  async function exportPdf() {
    setExportLoading(true);
    try {
      const token = (await (await import('../../src/services/supabase')).supabase.auth.getSession()).data.session?.access_token;
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const fileUri = (FileSystem.cacheDirectory ?? '') + 'medications.pdf';
      const result = await FileSystem.downloadAsync(
        `${baseUrl}/api/patients/${patient.id}/pdf`,
        fileUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (result.status !== 200) throw new Error('Export failed');
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Export Medication List' });
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  }

  function removeCaregiver(relationId: string, name: string) {
    Alert.alert('Remove Caregiver', `Remove ${name} as a caregiver?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await caregiversApi.remove(relationId);
          setCaregivers((prev) => prev.filter((c) => c.id !== relationId));
        } catch (err: any) {
          Alert.alert('Error', err?.response?.data?.error || 'Failed to remove caregiver');
        }
      }},
    ]);
  }

  async function inviteCaregiver() {
    if (!caregiverEmail.trim()) { Alert.alert('Email required'); return; }
    setInviteLoading(true);
    try {
      await patientsApi.inviteCaregiver(patient!.id, { email: caregiverEmail.trim().toLowerCase(), relationship: caregiverRelationship.trim() || undefined });
      setCaregiverEmail('');
      setCaregiverRelationship('');
      const { data } = await patientsApi.get(patient!.id);
      if (data.caregivers) setCaregivers(data.caregivers);
      Alert.alert('Success', 'Caregiver invited successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to invite caregiver');
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.profileCard}>
        <Ionicons name="person-circle-outline" size={64} color="#0f4c81" style={{ marginBottom: 12 }} />
        <Text style={styles.name}>{patient.name}</Text>
        {patient.dateOfBirth && (
          <Text style={styles.dob}>DOB: {new Date(patient.dateOfBirth).toLocaleDateString('en-US')}</Text>
        )}
        {patient.allergies.length > 0 ? (
          <View style={styles.allergyBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Ionicons name="warning-outline" size={14} color="#dc2626" />
              <Text style={styles.allergyLabel}>Allergies</Text>
            </View>
            <Text style={styles.allergyValues}>{patient.allergies.join(', ')}</Text>
          </View>
        ) : (
          <View style={[styles.allergyBox, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#16a34a" />
              <Text style={[styles.allergyLabel, { color: '#16a34a' }]}>No Known Drug Allergies</Text>
            </View>
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

      <TouchableOpacity
        style={[styles.actionBtn, styles.interactionBtn, { opacity: interactionLoading ? 0.6 : 1 }]}
        onPress={checkInteractions}
        disabled={interactionLoading}
      >
        {interactionLoading ? (
          <ActivityIndicator color="#7c3aed" size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="git-compare-outline" size={18} color="#7c3aed" />
            <Text style={[styles.actionBtnText, { color: '#7c3aed' }]}>Check Drug Interactions</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.exportBtn, { opacity: exportLoading ? 0.6 : 1 }]}
        onPress={exportPdf}
        disabled={exportLoading}
      >
        {exportLoading ? <ActivityIndicator color="#0f4c81" size="small" /> :
          <Text style={[styles.actionBtnText, { color: '#0f4c81' }]}>Export PDF</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/medication/add')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="medkit-outline" size={18} color="#0f172a" />
          <Text style={styles.actionBtnText}>Add Medication</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.displayBtn]} onPress={() => router.push('/patient-display')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="tablet-landscape-outline" size={18} color="#065f46" />
          <Text style={[styles.actionBtnText, { color: '#065f46' }]}>Patient Display Mode</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={() => router.push('/(tabs)/share')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="share-outline" size={18} color="#0f4c81" />
          <Text style={[styles.actionBtnText, { color: '#0f4c81' }]}>Share Medication List</Text>
        </View>
      </TouchableOpacity>

      {/* Caregivers Section */}
      <TouchableOpacity style={styles.sectionToggle} onPress={() => setCaregiverSectionVisible(!caregiverSectionVisible)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="people-outline" size={18} color="#0f172a" />
          <Text style={styles.sectionToggleText}>Caregivers ({caregivers.length})</Text>
        </View>
        <Ionicons name={caregiverSectionVisible ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </TouchableOpacity>

      {caregiverSectionVisible && (
        <View style={styles.caregiverSection}>
          {caregivers.length === 0 && (
            <Text style={styles.emptyCaregiverText}>No caregivers added yet.</Text>
          )}
          {caregivers.map((c) => (
            <View key={c.id} style={styles.caregiverRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.caregiverName}>{c.caregiver.name}</Text>
                <Text style={styles.caregiverEmail}>{c.caregiver.email}</Text>
                {c.relationship ? <Text style={styles.caregiverRelationship}>{c.relationship}</Text> : null}
              </View>
              <View style={[styles.permBadge, { backgroundColor: c.permissionLevel === 'ADMIN' ? '#ccfbf1' : '#f1f5f9' }]}>
                <Text style={[styles.permText, { color: c.permissionLevel === 'ADMIN' ? '#0f766e' : '#475569' }]}>
                  {c.permissionLevel === 'ADMIN' ? 'Admin' : 'View Only'}
                </Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeCaregiver(c.id, c.caregiver.name)}>
                <Ionicons name="close-circle-outline" size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.inviteForm}>
            <Text style={styles.inviteTitle}>Invite Caregiver</Text>
            <TextInput
              style={styles.inviteInput}
              placeholder="Email address"
              value={caregiverEmail}
              onChangeText={setCaregiverEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.inviteInput}
              placeholder="Relationship (optional, e.g. Spouse)"
              value={caregiverRelationship}
              onChangeText={setCaregiverRelationship}
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={[styles.inviteBtn, inviteLoading && { opacity: 0.6 }]}
              onPress={inviteCaregiver}
              disabled={inviteLoading}
            >
              {inviteLoading ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={styles.inviteBtnText}>Invite Caregiver</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={interactionModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Drug Interactions</Text>
            <TouchableOpacity onPress={() => setInteractionModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {interactionResult?.message ? (
              <View style={styles.noInteractionsBox}>
                <Ionicons name="information-circle-outline" size={32} color="#0d9488" />
                <Text style={styles.noInteractionsText}>{interactionResult.message}</Text>
              </View>
            ) : interactionResult?.interactions.length === 0 ? (
              <View style={styles.noInteractionsBox}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#16a34a" />
                <Text style={styles.noInteractionsText}>No known interactions found.</Text>
              </View>
            ) : (
              interactionResult?.interactions.map((item, idx) => (
                <View key={idx} style={styles.interactionItem}>
                  <View style={styles.interactionHeader}>
                    <Text style={styles.interactionDrugs}>{item.drug1} + {item.drug2}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: item.severity === 'high' ? '#dc2626' : item.severity === 'moderate' ? '#f59e0b' : '#64748b' }]}>
                      <Text style={styles.severityText}>{item.severity}</Text>
                    </View>
                  </View>
                  <Text style={styles.interactionDesc}>{item.description}</Text>
                </View>
              ))
            )}
            {interactionResult?.checkedAt && (
              <Text style={styles.checkedAt}>Checked: {new Date(interactionResult.checkedAt).toLocaleString()}</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
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
  interactionBtn: { backgroundColor: '#f5f3ff', borderColor: '#c4b5fd' },
  exportBtn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  noInteractionsBox: { alignItems: 'center', padding: 32, gap: 12 },
  noInteractionsText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  interactionItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  interactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  interactionDrugs: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  severityBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  interactionDesc: { fontSize: 13, color: '#475569', lineHeight: 20 },
  checkedAt: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 16 },
  sectionToggle: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionToggleText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  caregiverSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyCaregiverText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  caregiverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  caregiverName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  caregiverEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  caregiverRelationship: { fontSize: 12, color: '#0d9488', marginTop: 1 },
  permBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 },
  permText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { padding: 4 },
  inviteForm: { marginTop: 16, gap: 10 },
  inviteTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  inviteInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  inviteBtn: { backgroundColor: '#0f4c81', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
