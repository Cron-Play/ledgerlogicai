import { Stack } from 'expo-router';
import { COLORS } from '@/constants/FinLexColors';

export default function ChatTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
