import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DISCLAIMER_KEY = 'disclaimer:accepted';

interface Props {
  onAccept: () => void;
}

export default function DisclaimerScreen({ onAccept }: Props) {
  async function handleAccept() {
    await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
    onAccept();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>KinRx</Text>
        <Text style={styles.title}>Before You Continue</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Disclaimer</Text>
          <Text style={styles.body}>
            KinRx is a medication list management tool designed to help you organize
            and share your medication information with caregivers and healthcare providers.
          </Text>
          <Text style={styles.body}>
            KinRx is <Text style={styles.bold}>not a medical device</Text> and is{' '}
            <Text style={styles.bold}>not a substitute</Text> for professional medical
            advice, diagnosis, or treatment.
          </Text>
          <Text style={styles.body}>
            Always consult a qualified healthcare provider before making any changes
            to your medications. In case of a medical emergency, call 911 immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          <Text style={styles.body}>
            Your medication information is stored securely and is only shared with
            people you explicitly invite or send a share link to. We do not sell
            your data or use it for advertising.
          </Text>
          <Text style={styles.body}>
            By continuing, you agree to our{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://maximusweiner4.github.io/kinrx/privacy')}>
              Privacy Policy
            </Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://maximusweiner4.github.io/kinrx/tos')}>
              Terms of Service
            </Text>
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleAccept}>
          <Text style={styles.btnText}>I Understand — Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0d9488', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 28, alignItems: 'center' },
  logo: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  title: { fontSize: 18, color: '#ccfbf1', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, gap: 8 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0d9488', marginBottom: 12 },
  body: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 10 },
  bold: { fontWeight: '700', color: '#0f172a' },
  link: { color: '#0d9488', textDecorationLine: 'underline' },
  footer: { padding: 24, paddingBottom: 40, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btn: { backgroundColor: '#0d9488', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
