import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getPillImage } from '../../src/services/rxnorm';
import { drugsApi } from '../../src/services/api';
import { usePatientStore } from '../../src/stores/patientStore';
import { useMedicationStore } from '../../src/stores/medicationStore';
import { showSuccess } from '../../src/utils/toast';
import type { DrugSearchResult } from '../../src/types';

type Step = 'search' | 'details';

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

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every morning', 'Every evening', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Weekly', 'Other'];

export default function AddMedicationScreen() {
  const { activePatient } = usePatientStore();
  const { addMedication } = useMedicationStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<DrugSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DrugSearchResult | null>(null);

  // Details form
  const [dose, setDose] = useState('');
  const [form, setForm] = useState('');
  const [route, setRoute] = useState('');
  const [frequency, setFrequency] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prescriber, setPrescriber] = useState('');
  const [indication, setIndication] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [refillDate, setRefillDate] = useState('');
  const [pillsRemaining, setPillsRemaining] = useState('');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  function handleSearchChange(text: string) {
    setSearchTerm(text);
    setSearchError(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (text.length < 2) { setResults([]); return; }

    debounceTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: candidates } = await drugsApi.search(text);
        const seen = new Set<string>();
        const unique = candidates.filter((c: DrugSearchResult) => {
          if (!c.name?.trim()) return false;
          const key = c.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setResults(unique.slice(0, 8));
        setSearchError(false);
      } catch {
        setResults([]);
        setSearchError(true);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  async function handleSelectDrug(candidate: DrugSearchResult) {
    setSelected(candidate);
    setStep('details');
    // Fetch pill image in background — don't block navigation
    try {
      const imageUrl = await getPillImage(candidate.rxcui);
      if (imageUrl) setSelected((prev) => prev ? { ...prev, pillImageUrl: imageUrl } : prev);
    } catch {
      // Non-critical: pill image is optional
    }
  }

  async function handleSave() {
    if (!activePatient) return;
    if (!selected) {
      Alert.alert('Select a medication', 'Please search for and select a medication first.');
      return;
    }
    if (!dose.trim() && !frequency.trim()) {
      Alert.alert('Please enter at least a dose or frequency');
      return;
    }
    if (pillsRemaining.trim()) {
      const n = parseInt(pillsRemaining.trim(), 10);
      if (isNaN(n) || n < 0 || String(n) !== pillsRemaining.trim()) {
        Alert.alert('Invalid amount', 'Please enter a whole number like 30 (no decimals).');
        return;
      }
    }
    setSaving(true);
    try {
      await addMedication(activePatient.id, {
        rxcui: selected.rxcui,
        drugName: selected.name,
        dose: dose.trim() || undefined,
        form: form.trim() || undefined,
        route: route.trim() || undefined,
        frequency: frequency || undefined,
        instructions: instructions.trim() || undefined,
        prescriber: prescriber.trim() || undefined,
        indication: indication.trim() || undefined,
        pillImageUrl: selected.pillImageUrl,
        nextRefillDate: parseDateInput(refillDate) || undefined,
        pillsRemaining: pillsRemaining.trim() ? parseInt(pillsRemaining.trim(), 10) : undefined,
      });
      showSuccess('Medication added');
      router.back();
    } catch (err: any) {
      Alert.alert('Error saving medication', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (step === 'search') {
    return (
      <View style={styles.container}>
        <Text style={styles.stepTitle}>Search for a drug</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Type drug name (e.g. metformin, lisinopril)"
          value={searchTerm}
          onChangeText={handleSearchChange}
          autoFocus
          placeholderTextColor="#94a3b8"
        />
        {searching && <ActivityIndicator color="#0f4c81" style={{ marginTop: 12 }} />}
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.rxcui}-${item.name || ''}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectDrug(item)}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultRxcui}>RxCUI: {item.rxcui}</Text>
              </View>
              <Text style={styles.resultArrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchTerm.length >= 2 && !searching ? (
              searchError ? (
                <Text style={styles.noResults}>Search failed. Check your connection.</Text>
              ) : results.length === 0 && searchTerm.length > 2 ? (
                <Text style={styles.noResultsHint}>
                  No results. Try a generic name (e.g. "lisinopril") or brand name (e.g. "Prinivil").
                </Text>
              ) : (
                <Text style={styles.noResults}>No results found. Try a different spelling.</Text>
              )
            ) : null
          }
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <View style={styles.selectedDrug}>
        {selected?.pillImageUrl ? (
          <Image source={{ uri: selected.pillImageUrl }} style={styles.pillImg} />
        ) : (
          <View style={styles.pillPlaceholder}><Text style={{ fontSize: 32 }}>💊</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedName}>{selected?.name}</Text>
          <TouchableOpacity onPress={() => setStep('search')}>
            <Text style={styles.changeText}>Change drug</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>Dose</Text>
      <TextInput style={styles.input} placeholder="e.g. 10 mg, 500 mg" value={dose} onChangeText={setDose} placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Form</Text>
      <TextInput style={styles.input} placeholder="e.g. Tablet, Capsule, Liquid" value={form} onChangeText={setForm} placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Route</Text>
      <TextInput style={styles.input} placeholder="e.g. Oral, Topical, Inhaled" value={route} onChangeText={setRoute} placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Frequency</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginBottom: 14 }}>
        {FREQUENCIES.map((f) => (
          <TouchableOpacity key={f} style={[styles.freqOption, frequency === f && styles.freqSelected]} onPress={() => setFrequency(f)}>
            <Text style={[styles.freqOptionText, frequency === f && styles.freqSelectedText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Special Instructions</Text>
      <TextInput style={[styles.input, { height: 80 }]} placeholder="e.g. Take with food, avoid grapefruit" value={instructions} onChangeText={setInstructions} multiline placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Prescriber</Text>
      <TextInput style={styles.input} placeholder="Doctor's name (optional)" value={prescriber} onChangeText={setPrescriber} placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Indication (Reason for Taking)</Text>
      <TextInput style={styles.input} placeholder="e.g. High blood pressure, Type 2 diabetes" value={indication} onChangeText={setIndication} placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Next Refill Date (optional)</Text>
      <TextInput style={styles.input} placeholder="MM/DD/YYYY" value={refillDate} onChangeText={setRefillDate} placeholderTextColor="#94a3b8" />

      <Text style={styles.label}>Pills Remaining</Text>
      <TextInput style={styles.input} placeholder="e.g. 30" value={pillsRemaining} onChangeText={setPillsRemaining} keyboardType="numeric" placeholderTextColor="#94a3b8" />

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Medication</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 20, marginTop: 16, marginBottom: 12 },
  searchInput: { margin: 16, marginTop: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a' },
  resultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  resultRxcui: { fontSize: 15, color: '#94a3b8', marginTop: 2 },
  resultArrow: { fontSize: 22, color: '#94a3b8' },
  noResults: { textAlign: 'center', color: '#94a3b8', marginTop: 24, marginHorizontal: 20, fontSize: 15 },
  noResultsHint: { fontSize: 15, color: '#64748b', textAlign: 'center', padding: 16, fontStyle: 'italic' },
  selectedDrug: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  pillImg: { width: 72, height: 72, borderRadius: 10, resizeMode: 'contain' },
  pillPlaceholder: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  selectedName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  changeText: { color: '#0f4c81', fontSize: 15 },
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
