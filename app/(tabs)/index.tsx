import { Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: '#F2F2F7' }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16 }}
    >
      <Text style={{ fontSize: 34, fontWeight: '700', color: '#000' }}>Home</Text>
      <Text style={{ fontSize: 17, color: '#3C3C43', lineHeight: 24 }}>
        Welcome to your new app. Start building something amazing.
      </Text>
    </ScrollView>
  );
}
