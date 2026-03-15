import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0d9488',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', height: 60, paddingBottom: 8 },
      headerStyle: { backgroundColor: '#0d9488' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Patients', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: ({ color, size }) => <Ionicons name="medical-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="share" options={{ title: 'Share', tabBarIcon: ({ color, size }) => <Ionicons name="share-social-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
