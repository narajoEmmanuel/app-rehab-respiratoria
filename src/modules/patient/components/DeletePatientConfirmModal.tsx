/**
 * Confirmación fuerte: escribir ELIMINAR PACIENTE antes de borrar el perfil local.
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export const DELETE_PATIENT_CONFIRM_PHRASE = 'ELIMINAR PACIENTE';

type Props = {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeletePatientConfirmModal({ visible, busy, onCancel, onConfirm }: Props) {
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    if (!visible) {
      setPhrase('');
    }
  }, [visible]);

  const phraseMatches = phrase.trim() === DELETE_PATIENT_CONFIRM_PHRASE;
  const canConfirm = phraseMatches && !busy;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Confirmar eliminación</Text>
          <Text style={styles.body}>
            Escribe exactamente{' '}
            <Text style={styles.phraseEmphasis}>{DELETE_PATIENT_CONFIRM_PHRASE}</Text> para continuar.
          </Text>
        </View>

        <TextInput
          value={phrase}
          onChangeText={setPhrase}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
          placeholder={DELETE_PATIENT_CONFIRM_PHRASE}
          placeholderTextColor={wellness.textSecondary}
          style={styles.input}
          accessibilityLabel="Frase de confirmación"
        />

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
            onPress={onCancel}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Cancelar">
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              !canConfirm && styles.deleteBtnDisabled,
              pressed && canConfirm && styles.btnPressed,
            ]}
            onPress={onConfirm}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityLabel="Eliminar definitivamente">
            <Text style={[styles.deleteBtnText, !canConfirm && styles.deleteBtnTextDisabled]}>
              Eliminar definitivamente
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: wellness.textSecondary,
  },
  phraseEmphasis: {
    fontWeight: '800',
    color: wellness.text,
  },
  input: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    borderRadius: wellnessRadii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 17,
    fontWeight: '600',
    color: wellness.text,
    backgroundColor: wellness.card,
    marginBottom: spacing.xl,
  },
  actions: {
    gap: spacing.md,
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: wellnessRadii.pill,
    backgroundColor: '#B91C1C',
  },
  deleteBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteBtnTextDisabled: {
    color: '#9CA3AF',
  },
  btnPressed: {
    opacity: 0.88,
  },
});
