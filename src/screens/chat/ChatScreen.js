/**
 * VUMA Store — Chat Screen
 * Real-time support chat with bot and agents
 */

import { t } from '../../i18n';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { selectAccessToken } from '../../store/authSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  API,
} from '../../utils/constants';
import { formatDateTime, getInitials } from '../../utils/helpers';
import { chatAPI } from '../../api/chat';
import Loading from '../../components/common/Loading';

export default function ChatScreen({ navigation, route }) {
  const user = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);

  const {
    roomId: initialRoomId,
    relatedOrderId,
    productId,
    vendorId,
  } = route?.params || {};

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);

  const wsRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimer = useRef(null);

  // ── Init Room ─────────────────────────────────────────
  useEffect(() => {
    initRoom();
    return () => {
      disconnectWS();
    };
  }, []);

  const initRoom = async () => {
    try {
      setLoading(true);
      let chatRoom;
      if (initialRoomId) {
        chatRoom = await chatAPI.getRoomDetail(
          initialRoomId
        );
      } else {
        chatRoom = await chatAPI.createRoom({
          room_type: vendorId
            ? 'customer_vendor'
            : 'customer_support',
          vendor_id: vendorId,
          related_order_id: relatedOrderId,
          related_product_id: productId,
        });
      }
      setRoom(chatRoom);
      await loadMessages(chatRoom.id);
      connectWS(chatRoom.id);
    } catch (e) {
      Alert.alert(
        'Error',
        'Could not open chat. Please try again.'
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const data = await chatAPI.getMessages(roomId);
      setMessages(Array.isArray(data) ? data : []);
    } catch {}
  };

  // ── WebSocket ─────────────────────────────────────────
  const connectWS = (roomId) => {
    try {
      const wsUrl = chatAPI.getWebSocketUrl(
        roomId,
        accessToken
      );
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWSMessage(data);
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      wsRef.current = ws;
    } catch {}
  };

  const disconnectWS = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleWSMessage = (data) => {
    switch (data.type) {
      case 'message':
        const newMsg = {
          id: data.message_id,
          content: data.content,
          sender: { username: data.sender_name },
          sender_id: data.sender_id,
          is_bot: data.is_bot,
          message_type: data.message_type,
          created_at: data.created_at,
          is_read: false,
        };
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.id === newMsg.id
          );
          return exists ? prev : [...prev, newMsg];
        });
        scrollToBottom();
        break;
      case 'history':
        if (data.messages) {
          setMessages(data.messages.map((m) => ({
            id: m.message_id,
            content: m.content,
            sender: { username: m.sender_name },
            sender_id: m.sender_id,
            is_bot: m.is_bot,
            message_type: m.message_type,
            created_at: m.created_at,
          })));
        }
        break;
      case 'typing':
        if (data.user_id !== user?.id?.toString()) {
          setTypingUser(data.is_typing ? data.username : null);
        }
        break;
      case 'read_receipt':
        setMessages((prev) =>
          prev.map((m) =>
            data.message_ids?.includes(m.id)
              ? { ...m, is_read: true }
              : m
          )
        );
        break;
      default:
        break;
    }
  };

  const sendWSMessage = (payload) => {
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  // ── Send Message ──────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !room) return;
    setInputText('');
    setSending(true);

    const tempMsg = {
      id: `temp_${Date.now()}`,
      content: text,
      sender: { username: user?.username },
      sender_id: user?.id?.toString(),
      is_bot: false,
      message_type: 'text',
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();

    // Send via WebSocket
    sendWSMessage({ type: 'message', content: text });

    // HTTP fallback
    try {
      await chatAPI.sendMessage(room.id, text);
    } catch {}

    setSending(false);
  }, [inputText, room, user]);

  // ── Typing Indicator ──────────────────────────────────
  const handleTyping = (text) => {
    setInputText(text);
    sendWSMessage({ type: 'typing', is_typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      sendWSMessage({
        type: 'typing',
        is_typing: false,
      });
    }, 2000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  };

  // ── Message Bubble ────────────────────────────────────
  const MessageBubble = ({ message }) => {
    const isMe =
      message.sender_id === user?.id?.toString();
    const isBot = message.is_bot;
    const isSystem =
      message.message_type === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>
            {message.content}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.msgRow,
          isMe ? styles.msgRowMe : styles.msgRowOther,
        ]}
      >
        {/* Avatar */}
        {!isMe && (
          <View
            style={[
              styles.msgAvatar,
              isBot && styles.msgAvatarBot,
            ]}
          >
            <Text style={styles.msgAvatarText}>
              {isBot
                ? '🤖'
                : getInitials(
                    message.sender?.username || 'U'
                  )}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isBot && styles.bubbleBot,
            message.pending && styles.bubblePending,
          ]}
        >
          {/* Sender name */}
          {!isMe && (
            <Text style={styles.bubbleSender}>
              {isBot ? 'VUMA Bot' : message.sender?.username}
            </Text>
          )}
          <Text
            style={[
              styles.bubbleText,
              isMe && styles.bubbleTextMe,
              isBot && styles.bubbleTextBot,
            ]}
          >
            {message.content}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              isMe && styles.bubbleTimeMe,
            ]}
          >
            {formatDateTime(message.created_at)}
            {isMe && (
              <Text>
                {' '}
                {message.is_read
                  ? '✓✓'
                  : message.pending
                  ? '⏳'
                  : '✓'}
              </Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  // ── Loading ───────────────────────────────────────────
  if (loading) {
    return <Loading fullScreen message="Opening chat..." />;
  }

  // ── Render ────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {room?.room_type === 'customer_vendor'
              ? '🏪 Vendor Chat'
              : '🤖 VUMA Support'}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                connected
                  ? styles.statusOnline
                  : styles.statusOffline,
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? 'Online' : 'Connecting...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <Text style={styles.headerMoreIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) =>
          item.id?.toString() || Math.random().toString()
        }
        renderItem={({ item }) => (
          <MessageBubble message={item} />
        )}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatText}>
              Send a message to start chatting
            </Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {typingUser && (
        <View style={styles.typingWrap}>
          <Text style={styles.typingText}>
            {typingUser} is typing...
          </Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputText.trim() || sending) &&
              styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendBtnIcon}>
            {sending ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop:
      Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  backIcon: {
    fontSize: FONTS.xl,
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  statusOnline: {
    backgroundColor: COLORS.success,
  },
  statusOffline: {
    backgroundColor: COLORS.textLight,
  },
  statusText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  headerMoreIcon: {
    fontSize: FONTS.xl,
    color: COLORS.textMuted,
  },
  messagesList: {
    padding: SPACING.base,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
  },
  emptyChatIcon: {
    fontSize: 56,
    marginBottom: SPACING.base,
  },
  emptyChatText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  systemMsg: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  systemMsgText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    textAlign: 'center',
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 3,
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarBot: {
    backgroundColor: COLORS.primaryFade,
  },
  msgAvatarText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textWhite,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: RADIUS.xl,
    padding: SPACING.sm + 2,
    gap: 3,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.sm,
  },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.sm,
    ...SHADOWS.sm,
  },
  bubbleBot: {
    backgroundColor: COLORS.primaryFade,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  bubblePending: {
    opacity: 0.7,
  },
  bubbleSender: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: COLORS.textWhite,
  },
  bubbleTextBot: {
    color: COLORS.secondary,
  },
  bubbleTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingWrap: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
  },
  typingText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    paddingBottom:
      Platform.OS === 'ios' ? SPACING.xl : SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.skeleton,
  },
  sendBtnIcon: {
    fontSize: 18,
    color: COLORS.textWhite,
    fontWeight: FONTS.bold,
  },
});
