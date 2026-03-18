import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePatientStore } from '../../src/stores/patientStore';
import { useAuthStore } from '../../src/stores/authStore';
import type { Patient } from '../../src/types';

export default function PatientsScreen() {
  const { patients, fetchPatients, createPatient, selectPatient, loading, error } = usePatientStore();
  const { signOut, user } = useAuthStore();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [allergies, setAllergies] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(useCallback(() => { fetchPatients(); }, []));

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    Keyboard.dismiss();
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
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'there'}</Text>
        <TouchableOpacity onPress={handleSignOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      {patients.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Ionicons name="people-circle-outline" size={64} color="#0d9488" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>{error ? 'Failed to load' : 'No patients yet'}</Text>
          <Text style={styles.emptyText}>{error ?? 'Add a loved one to start managing their medications.'}</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openPatient(item)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                <Text style={styles.cardSub}>{item.medications?.length ?? 0} active medications</Text>
                {(item.allergies?.length ?? 0) > 0 && (
                  <View style={styles.allergyChip}>
                    <Ionicons name="warning-outline" size={18} color="#dc2626" style={{ marginRight: 4 }} />
                    <Text style={styles.allergyText} numberOfLines={2} ellipsizeMode="tail">{(item.allergies ?? []).join(', ')}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add Patient</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Patient Profile</Text>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowAdd(false); }}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Full name *" value={name} onChangeText={setName} autoCapitalize="words" placeholderTextColor="#94a3b8" />
            <TextInput style={styles.input} placeholder="Date of birth (MM/DD/YYYY)" value={dob} onChangeText={setDob} placeholderTextColor="#94a3b8" />
            <TextInput style={styles.input} placeholder="Allergies (comma-separated, or leave blank)" value={allergies} onChangeText={setAllergies} placeholderTextColor="#94a3b8" />
            <TouchableOpacity style={[styles.btn, creating && styles.btnDisabled]} onPress={handleCreate} disabled={creating}>
              <Text style={styles.btnText}>{creating ? 'Creating…' : 'Create Profile'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#0d9488' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  signOut: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 16, color: '#64748b', marginTop: 2 },
  allergyChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderWidth: 2, borderColor: '#dc2626', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginTop: 8, alignSelf: 'flex-start' },
  allergyText: { color: '#dc2626', fontSize: 18, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#0d9488', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, padding: 24, paddingTop: 32, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose: { fontSize: 20, color: '#64748b' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 14, color: '#0f172a' },
  btn: { backgroundColor: '#0d9488', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
