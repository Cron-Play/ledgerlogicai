import React from 'react';
import { View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/FinLexColors';

const TABS = [
  {
    name: '(chat)',
    route: '/(tabs)/(chat)' as const,
    icon: 'chat_bubble_outline' as const,
    label: 'New Chat',
  },
  {
    name: '(history)',
    route: '/(tabs)/(history)' as const,
    icon: 'history' as const,
    label: 'History',
  },
];

export default function TabLayout() {
  const pathname = usePathname();
  const isInsideChat = pathname.startsWith('/chat/');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(chat)" />
        <Stack.Screen name="(history)" />
      </Stack>
      {!isInsideChat && (
        <FloatingTabBar
          tabs={TABS}
          containerWidth={220}
          borderRadius={35}
          bottomMargin={20}
        />
      )}
    </View>
  );
}
