import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, Plus, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/FinLexColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getMessages, sendMessage, createSession, ChatMessage } from '@/utils/api';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginBottom: 16,
        maxWidth: '85%',
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.primaryMuted,
          borderRadius: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginBottom: 6,
          alignSelf: 'flex-start',
        }}
      >
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-SemiBold',
            fontSize: 10,
            color: COLORS.primary,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          FinLex
        </Text>
      </View>
      <View
        style={{
          backgroundColor: COLORS.assistantBubble,
          borderRadius: 16,
          borderTopLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          flexDirection: 'row',
          gap: 6,
          alignItems: 'center',
        }}
      >
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: COLORS.primary,
              opacity: dot,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function SkeletonMessage({ isUser }: { isUser: boolean }) {
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
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        width: isUser ? '55%' : '75%',
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 16,
          padding: 14,
          height: isUser ? 44 : 80,
        }}
      />
      <View
        style={{
          width: 50,
          height: 10,
          borderRadius: 5,
          backgroundColor: COLORS.surfaceSecondary,
          marginTop: 6,
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}
      />
    </Animated.View>
  );
}

function parseMarkdown(text: string | undefined | null): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <View
          key={key++}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 8,
            padding: 12,
            marginVertical: 6,
            borderWidth: 1,
            borderColor: COLORS.surfaceTertiary,
          }}
        >
          <Text
            style={{
              fontFamily: 'SpaceMono',
              fontSize: 12,
              color: COLORS.text,
              lineHeight: 18,
            }}
          >
            {codeLines.join('\n')}
          </Text>
        </View>
      );
      continue;
    }

    // Heading
    if (line.startsWith('### ')) {
      nodes.push(
        <Text
          key={key++}
          style={{
            fontFamily: 'SpaceGrotesk-SemiBold',
            fontSize: 15,
            color: COLORS.text,
            marginTop: 10,
            marginBottom: 4,
          }}
        >
          {line.slice(4)}
        </Text>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <Text
          key={key++}
          style={{
            fontFamily: 'SpaceGrotesk-Bold',
            fontSize: 16,
            color: COLORS.text,
            marginTop: 12,
            marginBottom: 4,
          }}
        >
          {line.slice(3)}
        </Text>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <Text
          key={key++}
          style={{
            fontFamily: 'SpaceGrotesk-Bold',
            fontSize: 18,
            color: COLORS.text,
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          {line.slice(2)}
        </Text>
      );
      continue;
    }

    // Bullet point
    if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push(
        <View key={key++} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
          <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, marginRight: 8, marginTop: 1 }}>
            •
          </Text>
          <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: COLORS.text, lineHeight: 22 }}>
            {renderInlineMarkdown(line.slice(2), key++)}
          </Text>
        </View>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      nodes.push(
        <View key={key++} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
          <Text style={{ color: COLORS.primary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, marginRight: 8, minWidth: 20 }}>
            {numberedMatch[1]}.
          </Text>
          <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: COLORS.text, lineHeight: 22 }}>
            {renderInlineMarkdown(numberedMatch[2], key++)}
          </Text>
        </View>
      );
      continue;
    }

    // Horizontal rule
    if (line === '---' || line === '***') {
      nodes.push(
        <View key={key++} style={{ height: 1, backgroundColor: COLORS.surfaceTertiary, marginVertical: 10 }} />
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      nodes.push(<View key={key++} style={{ height: 6 }} />);
      continue;
    }

    // Regular paragraph
    nodes.push(
      <Text
        key={key++}
        style={{
          fontFamily: 'SpaceGrotesk-Regular',
          fontSize: 14,
          color: COLORS.text,
          lineHeight: 22,
          marginBottom: 2,
        }}
      >
        {renderInlineMarkdown(line, key++)}
      </Text>
    );
  }

  return nodes;
}

function renderInlineMarkdown(text: string, baseKey: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`${baseKey}-t-${i++}`} style={{ fontFamily: 'SpaceGrotesk-Regular', color: COLORS.text }}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }
    if (match[2]) {
      parts.push(
        <Text key={`${baseKey}-b-${i++}`} style={{ fontFamily: 'SpaceGrotesk-Bold', color: COLORS.text }}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      parts.push(
        <Text key={`${baseKey}-i-${i++}`} style={{ fontFamily: 'SpaceGrotesk-Regular', fontStyle: 'italic', color: COLORS.text }}>
          {match[3]}
        </Text>
      );
    } else if (match[4]) {
      parts.push(
        <Text
          key={`${baseKey}-c-${i++}`}
          style={{
            fontFamily: 'SpaceMono',
            fontSize: 12,
            color: COLORS.primary,
            backgroundColor: COLORS.surfaceSecondary,
          }}
        >
          {match[4]}
        </Text>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`${baseKey}-t-${i++}`} style={{ fontFamily: 'SpaceGrotesk-Regular', color: COLORS.text }}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  if (parts.length === 0) return text;
  if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
  return <Text>{parts}</Text>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const timeDisplay = formatTime(message.createdAt);

  if (isUser) {
    return (
      <View style={{ alignSelf: 'flex-end', marginBottom: 16, maxWidth: '80%' }}>
        <View
          style={{
            backgroundColor: COLORS.userBubble,
            borderRadius: 18,
            borderBottomRightRadius: 4,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: 'rgba(28, 42, 58, 0.8)',
          }}
        >
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Regular',
              fontSize: 14,
              color: COLORS.text,
              lineHeight: 22,
            }}
            selectable
          >
            {message.content}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-Regular',
            fontSize: 11,
            color: COLORS.textTertiary,
            marginTop: 4,
            alignSelf: 'flex-end',
          }}
        >
          {timeDisplay}
        </Text>
      </View>
    );
  }

  const contentNodes = parseMarkdown(message.content ?? '');

  return (
    <View style={{ alignSelf: 'flex-start', marginBottom: 16, maxWidth: '92%' }}>
      <View
        style={{
          backgroundColor: COLORS.primaryMuted,
          borderRadius: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginBottom: 6,
          alignSelf: 'flex-start',
        }}
      >
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-SemiBold',
            fontSize: 10,
            color: COLORS.primary,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          FinLex
        </Text>
      </View>
      <View
        style={{
          backgroundColor: COLORS.assistantBubble,
          borderRadius: 16,
          borderTopLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {contentNodes}
      </View>
      <Text
        style={{
          fontFamily: 'SpaceGrotesk-Regular',
          fontSize: 11,
          color: COLORS.textTertiary,
          marginTop: 4,
          alignSelf: 'flex-start',
        }}
      >
        {timeDisplay}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { id, prompt } = useLocalSearchParams<{ id: string; prompt?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const promptSentRef = useRef(false);

  useEffect(() => {
    if (id) {
      loadMessages();
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    console.log('[Chat] Loading messages for session:', id);
    setError(null);
    setLoading(true);
    try {
      const data = await getMessages(id);
      const safeData = Array.isArray(data) ? data : [];
      setMessages(safeData);
      console.log('[Chat] Loaded', safeData.length, 'messages');
    } catch (err) {
      console.error('[Chat] Failed to load messages:', err);
      setError('Couldn\'t load messages');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Auto-send prompt from quick start
  useEffect(() => {
    if (!loading && prompt && !promptSentRef.current && messages.length === 0) {
      promptSentRef.current = true;
      console.log('[Chat] Auto-sending prompt from quick start');
      handleSendMessage(prompt);
    }
  }, [loading, prompt, messages.length]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const handleSendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    console.log('[Chat] Sending message:', trimmed.slice(0, 80));

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      sessionId: id,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), optimisticMsg]);
    setInputText('');
    setSending(true);
    scrollToBottom();

    try {
      const response = await sendMessage(id, trimmed);
      console.log('[Chat] Message sent, response received');
      // Replace optimistic + add assistant response
      setMessages((prev) => {
        const withoutOptimistic = (Array.isArray(prev) ? prev : []).filter((m) => m.id !== optimisticMsg.id);
        return [...withoutOptimistic, response];
      });
      // Reload to get both user + assistant messages
      const updated = await getMessages(id);
      setMessages(Array.isArray(updated) ? updated : []);
      scrollToBottom();
    } catch (err) {
      console.error('[Chat] Failed to send message:', err);
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [id, sending, scrollToBottom]);

  const handleSend = useCallback(() => {
    handleSendMessage(inputText);
  }, [inputText, handleSendMessage]);

  const handleNewChat = useCallback(async () => {
    console.log('[Chat] New chat button pressed');
    try {
      const session = await createSession('New Chat');
      console.log('[Chat] New session created:', session.id);
      router.replace({ pathname: '/chat/[id]', params: { id: session.id } });
    } catch (err) {
      console.error('[Chat] Failed to create new session:', err);
    }
  }, [router]);

  const canSend = inputText.trim().length > 0 && !sending;

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const sessionTitle = messages.length > 0
    ? (messages[0]?.content?.slice(0, 40) ?? 'Chat')
    : 'FinLex AI';

  return (
    <>
      <Stack.Screen
        options={{
          title: sessionTitle,
          headerRight: () => (
            <AnimatedPressable onPress={handleNewChat} scaleValue={0.9}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Plus size={16} color={COLORS.primary} strokeWidth={2.5} />
              </View>
            </AnimatedPressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, padding: 20 }}>
            <SkeletonMessage isUser={false} />
            <SkeletonMessage isUser={true} />
            <SkeletonMessage isUser={false} />
            <SkeletonMessage isUser={true} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 17, color: COLORS.text, marginBottom: 8, textAlign: 'center' }}>
              Couldn't load messages
            </Text>
            <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              Check your connection and try again
            </Text>
            <AnimatedPressable onPress={loadMessages}>
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
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 16,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: COLORS.primary }}>
                    SA
                  </Text>
                </View>
                <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: COLORS.text, marginBottom: 8 }}>
                  Ask FinLex AI anything
                </Text>
                <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 }}>
                  Expert guidance on SA accounting, tax law, IFRS, and audit standards
                </Text>
              </View>
            }
            ListFooterComponent={sending ? <TypingIndicator /> : null}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {/* Input Bar */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: insets.bottom + 10,
            backgroundColor: COLORS.surface,
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
                maxHeight: 144,
                paddingTop: 6,
                paddingBottom: 6,
              }}
              placeholder="Ask about SA accounting or tax..."
              placeholderTextColor={COLORS.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="default"
              editable={!sending}
            />
            <AnimatedPressable
              onPress={handleSend}
              disabled={!canSend}
              scaleValue={0.88}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: canSend ? COLORS.primary : COLORS.surfaceTertiary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: canSend ? 1 : 0.4,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <ArrowUp size={18} color={canSend ? COLORS.background : COLORS.textTertiary} strokeWidth={2.5} />
                )}
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
