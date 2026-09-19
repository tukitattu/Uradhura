import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSocketContext } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { LiveRoom, Message, GiftSent } from '../../lib/types';
import MessageBubble from '../../components/MessageBubble';
import GiftSelector from '../../components/GiftSelector';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BrandBackground } from '../../components/ui/BrandBackground';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { colors, radius, spacing, backgroundKeys } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = {
  params: {
    roomId: string;
  };
};

export default function LiveRoomScreen() {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { roomId } = route.params;
  const { live: liveSocket } = useSocketContext();
  const { user } = useAuth();

  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [gifts, setGifts] = useState<GiftSent[]>([]);
  const [inputText, setInputText] = useState('');
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!liveSocket) return;

    liveSocket.emit('join:room', { roomId });

    liveSocket.on('chat:message', (message: Message) => {
      setMessages((prev) => [...prev.slice(-50), message]);
    });

    liveSocket.on('gift:sent', (gift: GiftSent) => {
      setGifts((prev) => [...prev.slice(-10), gift]);
    });

    liveSocket.on('viewer:count', (data: { count: number }) => {
      setRoom((prev) => (prev ? { ...prev, viewerCount: data.count } : null));
    });

    return () => {
      liveSocket.emit('leave:room', { roomId });
      liveSocket.off('chat:message');
      liveSocket.off('gift:sent');
      liveSocket.off('viewer:count');
    };
  }, [liveSocket, roomId]);

  const loadRoom = async () => {
    try {
      const { data } = await api.get<{ data: LiveRoom }>(`/live/rooms/${roomId}`);
      setRoom(data.data);
    } catch (error) {
      console.error('Failed to load room');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !liveSocket) return;

    liveSocket.emit('chat:send', {
      roomId,
      content: inputText.trim(),
    });
    setInputText('');
  };

  const sendGift = (giftId: string) => {
    if (!liveSocket) return;

    liveSocket.emit('gift:send', {
      roomId,
      giftId,
    });
    setShowGiftSelector(false);
  };

  if (isLoading || !room) {
    return <LoadingSpinner />;
  }

  return (
    <BrandBackground assetKey={backgroundKeys.room} overlay={0.55}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.roomHeader}>
            <View style={styles.hostInfo}>
              <BrandAsset assetKey="frame.avatar.default" size={36} />
              <View style={styles.hostText}>
                <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
                <Text style={styles.hostName} numberOfLines={1}>@{room.host.username}</Text>
              </View>
            </View>
            <View style={styles.viewerBadge}>
              <Text style={styles.viewerCount}>{room.viewerCount} watching</Text>
            </View>
          </View>

          <View style={styles.messagesContainer}>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={styles.messageList}
            />
          </View>

          {gifts.length > 0 && (
            <View style={styles.giftOverlay}>
              {gifts.slice(-1).map((gift) => (
                <Text key={gift.id} style={styles.giftText}>
                  {gift.sender.displayName} sent {gift.gift.name}!
                </Text>
              ))}
            </View>
          )}

          {showGiftSelector && (
            <GiftSelector onSelect={sendGift} onClose={() => setShowGiftSelector(false)} />
          )}

          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.giftButton} onPress={() => setShowGiftSelector(!showGiftSelector)}>
              <Text style={styles.giftButtonText}>Gift</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Say something..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  hostInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  hostText: { flex: 1 },
  roomTitle: { fontSize: 16, fontWeight: '800', color: colors.text, },
  hostName: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  viewerBadge: {
    backgroundColor: 'rgba(225,29,72,0.25)',
    borderColor: 'rgba(225,29,72,0.6)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  viewerCount: { color: colors.rose, fontSize: 12, fontWeight: '800' },
  messagesContainer: { flex: 1 },
  messageList: { padding: spacing.lg },
  giftOverlay: {
    padding: spacing.md,
    backgroundColor: 'rgba(124,58,237,0.20)',
  },
  giftText: { color: colors.rose, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  giftButton: {
    backgroundColor: colors.violet,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  giftButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  textInput: {
    flex: 1,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  sendButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});