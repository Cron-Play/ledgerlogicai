import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Building2,
  Calculator,
  Shield,
  ArrowUp,
  ChevronRight,
  MessageSquarePlus,
} from 'lucide-react-native';
import { COLORS } from '@/constants/FinLexColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getSessions, createSession, ChatSession } from '@/utils/api';

const QUICK_START_CARDS = [
  {
    id: 'ifrs',
    title: 'IFRS Standards',
    icon: BookOpen,
    description: 'Revenue, leases, instruments & more',
    prompt: 'I need help understanding IFRS Standards. Can you give me an overview of the key standards relevant to South African accountants, including IFRS 15 (Revenue), IFRS 16 (Leases), and IFRS 9 (Financial Instruments)?',
  },
  {
    id: 'ifrs-sme',
    title: 'IFRS for SMEs',
    icon: Building2,
    description: 'Simplified reporting for smaller entities',
    prompt: 'Explain IFRS for SMEs as it applies in South Africa. What are the key differences from full IFRS, and which entities qualify to use it?',
  },
  {
    id: 'tax',
    title: 'Tax Law',
    icon: Calculator,
    description: 'Income Tax, VAT, CGT & SARS rulings',
    prompt: 'I need guidance on South African tax law. Can you cover the key aspects of Income Tax Act, VAT Act, Capital Gains Tax, and recent SARS rulings that accountants should know?',
  },
  {
    id: 'audit',
    title: 'Audit & Assurance',
    icon: Shield,
    description: 'ISAs, IRBA standards & compliance',
    prompt: 'Explain the audit and assurance standards applicable in South Africa, including International Standards on Auditing (ISAs), IRBA requirements, and key compliance considerations for registered auditors.',
  },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function AnimatedCard({ index, children, onPress }: { index: number; children: React.ReactNode; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: 100 + index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: 100 + index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], flex: 1 }}>
      <AnimatedPressable onPress={onPress} style={{ flex: 1 }}>
        {children}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function NewChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [creating, setCreating] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadRecentSessions();
  }, []);

  const loadRecentSessions = useCallback(async () => {
    console.log('[NewChat] Loading recent sessions');
    try {
      const sessions = await getSessions();
      setRecentSessions(sessions.slice(0, 3));
    } catch (err) {
      console.error('[NewChat] Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const handleQuickStart = useCallback(async (card: typeof QUICK_START_CARDS[0]) => {
    console.log('[NewChat] Quick start card pressed:', card.title);
    if (creating) return;
    setCreating(true);
    try {
      const session = await createSession(card.title);
      console.log('[NewChat] Session created:', session.id);
      router.push({ pathname: '/chat/[id]', params: { id: session.id, prompt: card.prompt } });
    } catch (err) {
      console.error('[NewChat] Failed to create session:', err);
    } finally {
      setCreating(false);
    }
  }, [creating, router]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || creating) return;
    console.log('[NewChat] Send button pressed, text:', text);
    setCreating(true);
    try {
      const session = await createSession(text.slice(0, 60));
      console.log('[NewChat] Session created for send:', session.id);
      setInputText('');
      router.push({ pathname: '/chat/[id]', params: { id: session.id, prompt: text } });
    } catch (err) {
      console.error('[NewChat] Failed to create session on send:', err);
    } finally {
      setCreating(false);
    }
  }, [inputText, creating, router]);

  const handleRecentChat = useCallback((session: ChatSession) => {
    console.log('[NewChat] Recent chat pressed:', session.id, session.title);
    router.push({ pathname: '/chat/[id]', params: { id: session.id } });
  }, [router]);

  const canSend = inputText.trim().length > 0 && !creating;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: 160,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View
          style={{
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.surfaceTertiary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 4px 24px rgba(212, 168, 67, 0.15)',
            }}
          >
            <Text
              style={{
                fontFamily: 'SpaceGrotesk-Bold',
                fontSize: 26,
                color: COLORS.primary,
                letterSpacing: -0.5,
              }}
            >
              SA
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Bold',
              fontSize: 28,
              color: COLORS.text,
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            LedgerLogicAI
          </Text>
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Regular',
              fontSize: 14,
              color: COLORS.textSecondary,
              textAlign: 'center',
              letterSpacing: 0.2,
            }}
          >
            South African Accounting & Tax Intelligence
          </Text>
        </Animated.View>

        {/* Quick Start Grid */}
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-SemiBold',
            fontSize: 12,
            color: COLORS.textTertiary,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Quick Start
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {QUICK_START_CARDS.slice(0, 2).map((card, index) => {
            const Icon = card.icon;
            return (
              <AnimatedCard key={card.id} index={index} onPress={() => handleQuickStart(card)}>
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    minHeight: 110,
                    borderCurve: 'continuous',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Icon size={18} color={COLORS.primary} strokeWidth={2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk-SemiBold',
                      fontSize: 13,
                      color: COLORS.text,
                      marginBottom: 4,
                    }}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk-Regular',
                      fontSize: 11,
                      color: COLORS.textSecondary,
                      lineHeight: 16,
                    }}
                    numberOfLines={2}
                  >
                    {card.description}
                  </Text>
                </View>
              </AnimatedCard>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          {QUICK_START_CARDS.slice(2, 4).map((card, index) => {
            const Icon = card.icon;
            return (
              <AnimatedCard key={card.id} index={index + 2} onPress={() => handleQuickStart(card)}>
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    minHeight: 110,
                    borderCurve: 'continuous',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Icon size={18} color={COLORS.primary} strokeWidth={2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk-SemiBold',
                      fontSize: 13,
                      color: COLORS.text,
                      marginBottom: 4,
                    }}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'SpaceGrotesk-Regular',
                      fontSize: 11,
                      color: COLORS.textSecondary,
                      lineHeight: 16,
                    }}
                    numberOfLines={2}
                  >
                    {card.description}
                  </Text>
                </View>
              </AnimatedCard>
            );
          })}
        </View>

        {/* Recent Chats */}
        {(loadingSessions || recentSessions.length > 0) && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk-SemiBold',
                fontSize: 12,
                color: COLORS.textTertiary,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Recent Chats
            </Text>
            {loadingSessions ? (
              <View style={{ gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 14,
                      height: 56,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {recentSessions.map((session) => {
                  const timeDisplay = formatRelativeTime(session.updatedAt ?? session.createdAt);
                  return (
                    <AnimatedPressable key={session.id} onPress={() => handleRecentChat(session)}>
                      <View
                        style={{
                          backgroundColor: COLORS.surface,
                          borderRadius: 12,
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderCurve: 'continuous',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: 'SpaceGrotesk-Medium',
                              fontSize: 14,
                              color: COLORS.text,
                              marginBottom: 2,
                            }}
                            numberOfLines={1}
                          >
                            {session.title}
                          </Text>
                          <Text
                            style={{
                              fontFamily: 'SpaceGrotesk-Regular',
                              fontSize: 12,
                              color: COLORS.textTertiary,
                            }}
                          >
                            {timeDisplay}
                          </Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.textTertiary} strokeWidth={2} />
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 80,
          paddingTop: 12,
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.divider,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingLeft: 16,
            paddingRight: 6,
            paddingVertical: 6,
            gap: 8,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontFamily: 'SpaceGrotesk-Regular',
              fontSize: 15,
              color: COLORS.text,
              maxHeight: 120,
              paddingTop: 6,
              paddingBottom: 6,
            }}
            placeholder="Ask anything about SA accounting or tax..."
            placeholderTextColor={COLORS.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="default"
            onSubmitEditing={handleSend}
          />
          <AnimatedPressable
            onPress={handleSend}
            disabled={!canSend}
            scaleValue={0.9}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: canSend ? COLORS.primary : COLORS.surfaceTertiary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canSend ? 1 : 0.5,
              }}
            >
              {creating ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <ArrowUp size={18} color={canSend ? COLORS.background : COLORS.textTertiary} strokeWidth={2.5} />
              )}
            </View>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}
