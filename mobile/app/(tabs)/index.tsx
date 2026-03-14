import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { usePatientStore } from '../../src/stores/patientStore';
import { useAuthStore } from '../../src/stores/authStore';
import type { Patient } from '../../src/types';

export default function PatientsScreen() {
  const { patients, fetchPatients, createPatient, selectPatient, loading } = usePatientStore();
  const { signOut, user } = useAuthStore();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [allergies, setAllergies] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPatients(); }, []);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    setCreating(true);
    try {
      const allergyList = allergies.split(',').map((a) => a.trim()).filter(Boolean);
      await createPatient({ name: name.trim(), dateOfBirth: dob || undefined, allergies: allergyList });
      setShowAdd(false);
      setName(''); setDob(''); setAllergies('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  }

  function openPatient(patient: Patient) {
    selectPatient(patient);
    router.push(`/patient/${patient.id}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      {patients.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👴</Text>
          <Text style={styles.emptyTitle}>No patients yet</Text>
          <Text style={styles.emptyText}>Add a loved one to start managing their medications.</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openPatient(item)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.medications?.length ?? 0} active medications</Text>
                {item.allergies.length > 0 && (
                  <View style={styles.allergyChip}>
                    <Text style={styles.allergyText}>⚠️ {item.allergies.join(', ')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ Add Patient</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Patient Profile</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="Full name *" value={name} onChangeText={setName} autoCapitalize="words" placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Date of birth (MM/DD/YYYY)" value={dob} onChangeText={setDob} placeholderTextColor="#94a3b8" />
          <TextInput style={styles.input} placeholder="Allergies (comma-separated, or leave blank)" value={allergies} onChangeText={setAllergies} placeholderTextColor="#94a3b8" />
          <TouchableOpacity style={[styles.btn, creating && styles.btnDisabled]} onPress={handleCreate} disabled={creating}>
            <Text style={styles.btnText}>{creating ? 'Creating…' : 'Create Profile'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0f4c81' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  signOut: { color: '#93c5fd', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  allergyChip: { backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, alignSelf: 'flex-start' },
  allergyText: { color: '#dc2626', fontSize: 12, fontWeight: '500' },
  chevron: { fontSize: 24, color: '#94a3b8' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#0f4c81', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, padding: 24, paddingTop: 32, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose: { fontSize: 20, color: '#64748b' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 14, color: '#0f172a' },
  btn: { backgroundColor: '#0f4c81', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
