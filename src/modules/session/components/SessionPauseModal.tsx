/**
 * Purpose: Pause modal on the session screen.
 * Module: session
 */

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type Props = {
  visible: boolean;
  onContinue: () => void;
  onSaveAndExit: () => void;
};

export function SessionPauseModal({ visible, onContinue, onSaveAndExit }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.modalBackdrop}>
        <View style={styles.pauseModalCard}>
          <Text style={styles.pauseModalTitle}>Sesión en pausa</Text>
          <Text style={styles.pauseModalSubtitle}>
            Tómate un momento. Tu progreso de esta repetición queda en espera.
          </Text>
          <Pressable style={styles.modalPrimaryButton} onPress={onContinue}>
            <Text style={styles.modalPrimaryButtonText}>Continuar</Text>
          </Pressable>
          <Pressable style={styles.modalSecondaryButton} onPress={onSaveAndExit}>
            <Text style={styles.modalSecondaryButtonText}>Guardar y salir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 74, 62, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  pauseModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: 22,
  },
  pauseModalTitle: {
    color: wellness.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  pauseModalSubtitle: {
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  modalPrimaryButton: {
    backgroundColor: wellness.primary,
    paddingVertical: 14,
    borderRadius: wellnessRadii.pill,
    marginBottom: 8,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    paddingVertical: 12,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
  },
  modalSecondaryButtonText: {
    color: wellness.primaryDark,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
});
