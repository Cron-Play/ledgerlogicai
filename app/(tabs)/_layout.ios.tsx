import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { COLORS } from '@/constants/FinLexColors';

export default function TabLayout() {
  return (
    <NativeTabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <NativeTabs.Trigger name="(chat)">
        <Icon sf="square.and.pencil" />
        <Label>New Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        <Icon sf="clock" />
        <Label>History</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
