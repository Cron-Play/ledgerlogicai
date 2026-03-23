import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChevronRight, Trash2, Search, X } from 'lucide-react-native';
import { COLORS } from '@/constants/FinLexColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getSessions, deleteSession, ChatSession } from '@/utils/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SkeletonItem() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceSecondary }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ width: '60%', height: 14, borderRadius: 7, backgroundColor: COLORS.surfaceSecondary }} />
        <View style={{ width: '40%', height: 11, borderRadius: 6, backgroundColor: COLORS.surfaceSecondary }} />
      </View>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    console.log('[History] Loading sessions');
    setError(null);
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
      console.log('[History] Loaded', data.length, 'sessions');
    } catch (err) {
      console.error('[History] Failed to load sessions:', err);
      setError('Couldn\'t load your conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    console.log('[History] Delete session pressed:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSession(id);
      console.log('[History] Session deleted:', id);
    } catch (err) {
      console.error('[History] Failed to delete session:', err);
      loadSessions();
    }
  }, [loadSessions]);

  const handleSessionPress = useCallback((session: ChatSession) => {
    console.log('[History] Session pressed:', session.id, session.title);
    router.push({ pathname: '/chat/[id]', params: { id: session.id } });
  }, [router]);

  const toggleSearch = useCallback(() => {
    console.log('[History] Search toggled');
    setSearchVisible((v) => {
      if (!v) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
      }
      return !v;
    });
  }, []);

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.lastMessage ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  const renderItem = useCallback(({ item, index }: { item: ChatSession; index: number }) => {
    const initial = (item.title ?? 'C').charAt(0).toUpperCase();
    const timeDisplay = formatRelativeTime(item.updatedAt ?? item.createdAt);
    const preview = item.lastMessage ?? 'No messages yet';

    return (
      <AnimatedListItem index={index}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <AnimatedPressable
            onPress={() => handleSessionPress(item)}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderCurve: 'continuous',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk-Bold',
                    fontSize: 16,
                    color: COLORS.primary,
                  }}
                >
                  {initial}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk-SemiBold',
                    fontSize: 14,
                    color: COLORS.text,
                    marginBottom: 3,
                  }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk-Regular',
                    fontSize: 13,
                    color: COLORS.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {preview}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk-Regular',
                    fontSize: 12,
                    color: COLORS.textTertiary,
                  }}
                >
                  {timeDisplay}
                </Text>
                <ChevronRight size={14} color={COLORS.textTertiary} strokeWidth={2} />
              </View>
            </View>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => handleDelete(item.id)}
            scaleValue={0.9}
            style={{ marginLeft: 8 }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(218, 54, 51, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={16} color={COLORS.danger} strokeWidth={2} />
            </View>
          </AnimatedPressable>
        </View>
      </AnimatedListItem>
    );
  }, [handleSessionPress, handleDelete]);

  const EmptyState = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: COLORS.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <BookOpen size={32} color={COLORS.primary} strokeWidth={1.5} />
      </View>
      <Text
        style={{
          fontFamily: 'SpaceGrotesk-SemiBold',
          fontSize: 18,
          color: COLORS.text,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        No conversations yet
      </Text>
      <Text
        style={{
          fontFamily: 'SpaceGrotesk-Regular',
          fontSize: 14,
          color: COLORS.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        }}
      >
        Start a new chat to get expert accounting and tax guidance
      </Text>
    </View>
  );

  const ErrorState = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 }}>
      <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 17, color: COLORS.text, marginBottom: 8 }}>
        Couldn't load history
      </Text>
      <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 }}>
        Check your connection and try again
      </Text>
      <AnimatedPressable onPress={loadSessions}>
        <View
          style={{
            backgroundColor: COLORS.primaryMuted,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: COLORS.primary }}>
            Try again
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.divider,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Bold',
              fontSize: 28,
              color: COLORS.text,
              letterSpacing: -0.5,
            }}
          >
            Chat History
          </Text>
          <AnimatedPressable onPress={toggleSearch} scaleValue={0.9}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: searchVisible ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: searchVisible ? COLORS.primary : COLORS.border,
              }}
            >
              {searchVisible ? (
                <X size={16} color={COLORS.primary} strokeWidth={2} />
              ) : (
                <Search size={16} color={COLORS.textSecondary} strokeWidth={2} />
              )}
            </View>
          </AnimatedPressable>
        </View>
        {searchVisible && (
          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingHorizontal: 12,
              height: 40,
              gap: 8,
            }}
          >
            <Search size={14} color={COLORS.textTertiary} strokeWidth={2} />
            <TextInput
              ref={searchInputRef}
              style={{
                flex: 1,
                fontFamily: 'SpaceGrotesk-Regular',
                fontSize: 14,
                color: COLORS.text,
              }}
              placeholder="Search conversations..."
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ padding: 20 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </View>
      ) : error ? (
        <ErrorState />
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 120,
            flexGrow: 1,
          }}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
