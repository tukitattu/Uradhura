import React, { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SeedState, RoundResultEvent } from '../../lib/types';
import { truncateHex } from '../../lib/game';

interface FairnessModalProps {
  visible: boolean;
  onClose: () => void;
  seed: SeedState | null;
  result: RoundResultEvent | null;
  onRotateSeed: (clientSeed: string) => void;
}

export default function FairnessModal({ visible, onClose, seed, result, onRotateSeed }: FairnessModalProps) {
  const [clientSeed, setClientSeed] = useState('');

  const revealed = result?.fairPlay ?? null;
  const hash = revealed?.serverSeedHash ?? seed?.serverSeedHash ?? null;
  const client = revealed?.clientSeed ?? seed?.clientSeed ?? null;
  const nonce = revealed?.nonce ?? seed?.nonce ?? null;

  const openVerify = () => {
    if (revealed?.url) {
      Linking.openURL(revealed.url).catch(() => undefined);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Provably Fair</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.section}>Commitment (published before the round)</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Server seed hash</Text>
            <Text style={styles.rowValue} selectable>
              {truncateHex(hash, 14)}
            </Text>
          </View>

          {revealed ? (
            <>
              <Text style={styles.section}>Revealed after settlement</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Server seed</Text>
                <Text style={styles.rowValue} selectable>
                  {truncateHex(revealed.revealedServerSeed, 16)}
                </Text>
              </View>
              <TouchableOpacity style={styles.verifyButton} onPress={openVerify}>
                <Text style={styles.verifyText}>Verify on server</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.pending}>The server seed is revealed after each round settles.</Text>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Client seed</Text>
            <Text style={styles.rowValue} selectable>
              {client ? truncateHex(client, 14) : '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nonce</Text>
            <Text style={styles.rowValue}>{nonce ?? '—'}</Text>
          </View>

          <Text style={styles.section}>Your client seed (next rounds)</Text>
          <View style={styles.rotateRow}>
            <TextInput
              style={styles.input}
              value={clientSeed}
              onChangeText={setClientSeed}
              placeholder="Enter 8-128 chars: letters, numbers, - _ :"
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.rotateButton, clientSeed.length < 8 && styles.rotateButtonDisabled]}
              disabled={clientSeed.length < 8}
              onPress={() => {
                onRotateSeed(clientSeed);
                setClientSeed('');
              }}
            >
              <Text style={styles.rotateText}>Rotate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,22,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#16243f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#24395f',
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  close: {
    fontSize: 18,
    color: '#aaa',
    paddingHorizontal: 6,
  },
  section: {
    fontSize: 11,
    color: '#4ecca3',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 13,
    color: '#888',
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  pending: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    lineHeight: 18,
  },
  verifyButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#4ecca320',
    borderWidth: 1,
    borderColor: '#4ecca3',
  },
  verifyText: {
    color: '#4ecca3',
    fontSize: 13,
    fontWeight: '600',
  },
  rotateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#0a1220',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#24395f',
  },
  rotateButton: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rotateButtonDisabled: {
    opacity: 0.5,
  },
  rotateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});