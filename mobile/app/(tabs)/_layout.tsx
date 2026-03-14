import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0f4c81',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0', height: 60, paddingBottom: 8 },
      headerStyle: { backgroundColor: '#0f4c81' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Patients', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👥</Text> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💊</Text> }} />
      <Tabs.Screen name="share" options={{ title: 'Share', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📤</Text> }} />
    </Tabs>
  );
}
