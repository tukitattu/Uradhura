import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSocketContext } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Message } from '../../lib/types';
import MessageBubble from '../../components/MessageBubble';
import LoadingSpinner from '../../components/LoadingSpinner';

type RouteParams = {
  params: {
    conversationId: string;
  };
};

export default function ChatScreen() {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { conversationId } = route.params;
  const { chat: chatSocket } = useSocketContext();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!chatSocket) return;

    chatSocket.emit('join:conversation', { conversationId });

    chatSocket.on('message:receive', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    chatSocket.on('message:read', (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, isRead: true } : m))
      );
    });

    return () => {
      chatSocket.emit('leave:conversation', { conversationId });
      chatSocket.off('message:receive');
      chatSocket.off('message:read');
    };
  }, [chatSocket, conversationId]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get<{ data: Message[] }>(`/chat/conversations/${conversationId}/messages`);
      setMessages(data.data);
    } catch (error) {
      console.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !chatSocket) return;

    chatSocket.emit('message:send', {
      conversationId,
      content: inputText.trim(),
      type: 'text',
    });
    setInputText('');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.senderId === user?.id} />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <View style={styles.sendButtonInner}>
            <View style={styles.sendArrow} />
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: '#fff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  sendArrow: {
    width: 0,
    height: 0,
  },
});
