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
    <View style={styles.container}>
      <View style={styles.roomHeader}>
        <Text style={styles.roomTitle}>{room.title}</Text>
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerCount}>{room.viewerCount}</Text>
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
        <TouchableOpacity
          style={styles.giftButton}
          onPress={() => setShowGiftSelector(!showGiftSelector)}
        >
          <Text style={styles.giftButtonText}>Gift</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Say something..."
          placeholderTextColor="#666"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  viewerBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messageList: {
    padding: 16,
  },
  giftOverlay: {
    padding: 12,
    backgroundColor: '#e9456020',
  },
  giftText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    gap: 8,
  },
  giftButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  giftButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
