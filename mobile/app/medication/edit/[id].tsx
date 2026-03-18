import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { medicationsApi } from '../../../src/services/api';
import { showSuccess } from '../../../src/utils/toast';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every morning', 'Every evening', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Weekly', 'Other'];

function parseDateInput(input: string): string | null {
  if (!input.trim()) return null;
  const parsed = new Date(input.trim());
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  const parts = input.trim().split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drugName, setDrugName] = useState('');
  const [dose, setDose] = useState('');
  const [form, setForm] = useState('');
  const [route, setRoute] = useState('');
  const [frequency, setFrequency] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prescriber, setPrescriber] = useState('');
  const [indication, setIndication] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [refillDate, setRefillDate] = useState('');
  const [pillsRemaining, setPillsRemaining] = useState('');

  function fetchMed() {
    setLoading(true);
    setError(null);
    medicationsApi.get(id)
      .then(({ data }) => {
        setDrugName(data.drugName ?? '');
        setDose(data.dose ?? '');
        setForm(data.form ?? '');
        setRoute(data.route ?? '');
        setFrequency(data.frequency ?? '');
        setInstructions(data.instructions ?? '');
        setPrescriber(data.prescriber ?? '');
        setIndication(data.indication ?? '');
        setPharmacy(data.pharmacy ?? '');
        setRefillDate(data.nextRefillDate
          ? new Date(data.nextRefillDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
          : '');
        setPillsRemaining(data.pillsRemaining != null ? String(data.pillsRemaining) : '');
      })
      .catch(() => setError('Failed to load medication. Tap to retry.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMed();
  }, [id]);

  async function handleSave() {
    if (pillsRemaining.trim()) {
      const n = parseInt(pillsRemaining.trim(), 10);
      if (isNaN(n) || n < 0 || String(n) !== pillsRemaining.trim()) {
        Alert.alert('Pills Remaining must be a non-negative whole number');
        return;
      }
    }
    setActionLoading(true);
    try {
      await medicationsApi.update(id, {
        dose: dose.trim() || null,
        form: form.trim() || null,
        route: route.trim() || null,
        frequency: frequency || null,
        instructions: instructions.trim() || null,
        prescriber: prescriber.trim() || null,
        indication: indication.trim() || null,
        pharmacy: pharmacy.trim() || null,
        nextRefillDate: parseDateInput(refillDate),
        pillsRemaining: pillsRemaining.trim() ? parseInt(pillsRemaining.trim(), 10) : null,
      });
      showSuccess('Medication updated');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#0f4c81" />;

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: '#64748b', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity onPress={fetchMed}>
          <Text style={{ color: '#0d9488', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {drugName ? (
        <View style={styles.drugNameHeader}>
          <Text style={styles.drugNameHeaderText}>{drugName}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Dose</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 10 mg, 500 mg"
        value={dose}
        onChangeText={setDose}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Form</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Tablet, Capsule, Liquid"
        value={form}
        onChangeText={setForm}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Route</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Oral, Topical, Inhaled"
        value={route}
        onChangeText={setRoute}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Frequency</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginBottom: 18 }}>
        {FREQUENCIES.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.freqOption, frequency === f && styles.freqSelected]}
            onPress={() => setFrequency(f)}
          >
            <Text style={[styles.freqOptionText, frequency === f && styles.freqSelectedText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Special Instructions</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="e.g. Take with food, avoid grapefruit"
        value={instructions}
        onChangeText={setInstructions}
        multiline
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Prescriber</Text>
      <TextInput
        style={styles.input}
        placeholder="Doctor's name (optional)"
        value={prescriber}
        onChangeText={setPrescriber}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Indication (Reason for Taking)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. High blood pressure, Type 2 diabetes"
        value={indication}
        onChangeText={setIndication}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Pharmacy</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. CVS, Walgreens"
        value={pharmacy}
        onChangeText={setPharmacy}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Next Refill Date (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="MM/DD/YYYY"
        value={refillDate}
        onChangeText={setRefillDate}
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Pills Remaining</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 30"
        value={pillsRemaining}
        onChangeText={setPillsRemaining}
        keyboardType="numeric"
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity
        style={[styles.saveBtn, actionLoading && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={actionLoading}
      >
        {actionLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Changes</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  drugNameHeader: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  drugNameHeaderText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, marginBottom: 18, color: '#0f172a' },
  freqOption: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 16, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  freqSelected: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  freqOptionText: { color: '#64748b', fontSize: 16 },
  freqSelectedText: { color: '#1e40af', fontWeight: '600' },
  saveBtn: { backgroundColor: '#0f4c81', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
