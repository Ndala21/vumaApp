/**
 * VUMA AI Chat Assistant Screen
 * Claude-powered, English/Swahili, escalation to human support
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { post, get } from '../../api/client';

const VUMA_AVATAR = '🤖';
const USER_AVATAR = '👤';

const GREETING_EN = "👋 Hi! I'm VUMA Assistant.\n\nI can help you with orders, payments, delivery, returns, and selling on VUMA.\n\nHow can I help you today?";
const GREETING_SW = "👋 Habari! Mimi ni VUMA Assistant.\n\nNaweza kukusaidia na maagizo, malipo, usafirishaji, na kuuza VUMA.\n\nNinawezaje kukusaidia leo?";

// ── Message Bubble ─────────────────────────────────────
const MessageBubble = memo(({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemMsgText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && <Text style={styles.avatar}>{VUMA_AVATAR}</Text>}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
          {message.time}
        </Text>
      </View>
      {isUser && <Text style={styles.avatar}>{USER_AVATAR}</Text>}
    </View>
  );
});

// ── FAQ Chip ───────────────────────────────────────────
const FAQChip = memo(({ faq, onPress }) => (
  <TouchableOpacity style={styles.faqChip} onPress={() => onPress(faq.text)}>
    <Text style={styles.faqIcon}>{faq.icon}</Text>
    <Text style={styles.faqText}>{faq.text}</Text>
  </TouchableOpacity>
));

// ── Typing Indicator ───────────────────────────────────
const TypingIndicator = memo(() => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    };
    animate(dot1, 0); animate(dot2, 150); animate(dot3, 300);
  }, []);

  return (
    <View style={styles.bubbleRow}>
      <Text style={styles.avatar}>{VUMA_AVATAR}</Text>
      <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
});

export default function AIChatScreen({ navigation }) {
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [showFAQs, setShowFAQs] = useState(true);
  const [language, setLanguage] = useState('en');
  const [turnCount, setTurnCount] = useState(0);
  const [escalated, setEscalated] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const getTime = () => new Date().toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    // Add greeting
    const greeting = language === 'sw' ? GREETING_SW : GREETING_EN;
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      time: getTime(),
    }]);
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const data = await get('/chat/ai/faq/', { language });
      setFaqs(data?.faqs || []);
    } catch {
      setFaqs([
        { text: 'How does delivery work?', icon: '🚚' },
        { text: 'How do I pay with M-Pesa?', icon: '📱' },
        { text: 'How do I return a product?', icon: '↩️' },
        { text: 'How do I start selling?', icon: '🏪' },
      ]);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text = input) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput('');
    setShowFAQs(false);

    // Detect language switch
    const swahiliWords = ['habari', 'nini', 'sijui', 'asante', 'tafadhali', 'msaada', 'bidhaa', 'agizo'];
    if (swahiliWords.some(w => msg.toLowerCase().includes(w))) setLanguage('sw');

    // Add user message
    const userMsg = { id: Date.now().toString(), role: 'user', content: msg, time: getTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    scrollToBottom();

    try {
      // Build history for API
      const history = newMessages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

      const result = await post('/chat/ai/', {
        message: msg,
        history: history.slice(0, -1), // exclude current message
        language,
        turn_count: turnCount,
      });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        time: getTime(),
      };

      setMessages(prev => [...prev, aiMsg]);
      setTurnCount(prev => prev + 1);

      if (result.escalate && !escalated) {
        setEscalated(true);
        setMessages(prev => [...prev, {
          id: 'escalate',
          role: 'system',
          content: language === 'sw'
            ? '👨‍💼 Kumeunganishwa na msaada wa binadamu. Tutawasiliana nawe hivi karibuni.'
            : '👨‍💼 Connecting you with our support team. We\'ll reach out to you soon.',
          time: getTime(),
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: 'error',
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please email support@vumastore.store for help.',
        time: getTime(),
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, messages, language, turnCount, escalated]);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'sw' : 'en';
    setLanguage(newLang);
    setMessages(prev => [...prev, {
      id: `lang_${Date.now()}`,
      role: 'system',
      content: newLang === 'sw' ? '🇹🇿 Umebadilisha lugha kwenda Kiswahili' : '🇬🇧 Switched to English',
      time: getTime(),
    }]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <Text style={styles.headerAvatar}>{VUMA_AVATAR}</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerName}>VUMA Assistant</Text>
            <Text style={styles.headerStatus}>
              {loading ? 'Typing...' : 'Online • AI-powered'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
          <Text style={styles.langBtnText}>{language === 'en' ? '🇹🇿 SW' : '🇬🇧 EN'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={loading ? <TypingIndicator /> : null}
        />

        {/* FAQ Chips */}
        {showFAQs && faqs.length > 0 && (
          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>
              {language === 'sw' ? '💡 Maswali ya kawaida:' : '💡 Quick questions:'}
            </Text>
            <FlatList
              data={faqs}
              horizontal
              keyExtractor={(item, i) => i.toString()}
              renderItem={({ item }) => <FAQChip faq={item} onPress={sendMessage} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: SPACING.sm }}
            />
          </View>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={language === 'sw' ? 'Andika ujumbe...' : 'Type a message...'}
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            editable={!loading && !escalated}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={styles.sendIcon}>➤</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Escalated — show contact options */}
        {escalated && (
          <View style={styles.escalatedBar}>
            <TouchableOpacity style={styles.escalatedBtn}>
              <Text style={styles.escalatedBtnText}>📧 support@vumastore.store</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, gap: SPACING.sm },
  backBtn: { padding: 4 },
  backIcon: { fontSize: FONTS.xl, color: 'white', fontWeight: FONTS.bold },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { fontSize: 28 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.secondary },
  headerName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: 'white' },
  headerStatus: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  langBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  langBtnText: { fontSize: FONTS.xs, color: 'white', fontWeight: FONTS.bold },
  messageList: { padding: SPACING.base, paddingBottom: SPACING.sm },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, marginBottom: SPACING.base },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatar: { fontSize: 22, width: 28 },
  bubble: { maxWidth: '78%', borderRadius: RADIUS.xl, padding: SPACING.sm + 4, ...SHADOWS.sm },
  bubbleAI: { backgroundColor: 'white', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: FONTS.base, color: COLORS.textPrimary, lineHeight: 22 },
  bubbleTextUser: { color: 'white' },
  bubbleTime: { fontSize: FONTS.xs - 1, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.7)' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.base, gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  systemMsg: { alignSelf: 'center', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs, marginBottom: SPACING.base },
  systemMsgText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium, textAlign: 'center' },
  faqSection: { backgroundColor: 'white', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  faqTitle: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.semiBold, paddingHorizontal: SPACING.base, marginBottom: SPACING.xs },
  faqChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, gap: 4, borderWidth: 1, borderColor: COLORS.primary + '40' },
  faqIcon: { fontSize: 14 },
  faqText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.sm, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: COLORS.divider, gap: SPACING.sm },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, fontSize: FONTS.base, color: COLORS.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: { fontSize: FONTS.base, color: 'white', fontWeight: FONTS.bold },
  escalatedBar: { backgroundColor: COLORS.primaryFade, padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  escalatedBtn: { alignItems: 'center', padding: SPACING.xs },
  escalatedBtnText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
});