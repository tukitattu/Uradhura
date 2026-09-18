import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../lib/types';

interface Props {
  message: Message;
  isOwn?: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <View style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}>
      {!isOwn && <Text style={styles.sender}>{message.sender.displayName}</Text>}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.content}</Text>
      </View>
      <Text style={[styles.time, isOwn && styles.timeOwn]}>
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  containerOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  containerOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  sender: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleOwn: {
    backgroundColor: '#e94560',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#16213e',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  textOwn: {
    color: '#fff',
  },
  time: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    marginHorizontal: 4,
  },
  timeOwn: {
    marginRight: 0,
  },
});
