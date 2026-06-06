/**
 * Purpose: Day detail modal on the history screen.
 * Module: history
 */

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  LEVEL1_DAILY_GOAL,
  dayDetailMotivation,
  formatDisplayDateEs,
  type DayAggregate,
} from '@/src/modules/history/services/history-aggregates';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type Props = {
  selectedDay: DayAggregate | null;
  sensorDebug: boolean;
  onClose: () => void;
};

export function HistoryDayDetailModal({ selectedDay, sensorDebug, onClose }: Props) {
  return (
    <Modal
      visible={selectedDay !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {selectedDay ? (
            <>
              <AppText variant="titleMedium" style={styles.modalTitle}>
                {formatDisplayDateEs(selectedDay.dateKey)}
              </AppText>
              <View style={styles.modalChipRow}>
                <View style={[styles.modalChip, styles.modalChipStatus]}>
                  <AppText variant="chip" style={styles.modalChipText}>
                    {selectedDay.statusLabel}
                  </AppText>
                </View>
                {selectedDay.classification.sensorSessionsCount > 0 ? (
                  <View style={[styles.modalChip, styles.modalChipSensor]}>
                    <AppText variant="chip" style={styles.modalChipText}>
                      Con medición
                    </AppText>
                  </View>
                ) : null}
                {selectedDay.classification.practiceSessionsCount > 0 ? (
                  <View style={[styles.modalChip, styles.modalChipPractice]}>
                    <AppText variant="chip" style={styles.modalChipText}>
                      Práctica
                    </AppText>
                  </View>
                ) : null}
                {selectedDay.classification.unclassifiedSessionsCount > 0 ? (
                  <View style={[styles.modalChip, styles.modalChipUnclassified]}>
                    <AppText variant="chip" style={styles.modalChipText}>
                      Sin clasificar
                    </AppText>
                  </View>
                ) : null}
              </View>

              <View style={styles.modalSection}>
                <AppText variant="label" style={styles.modalSectionTitle}>
                  Resumen del día
                </AppText>
                <AppText variant="bodyLarge" style={styles.modalLine}>
                  Completadas: {selectedDay.completedCount}/{LEVEL1_DAILY_GOAL} · Perfectas:{' '}
                  {selectedDay.perfectCount}
                </AppText>
                {selectedDay.interruptedCount > 0 ? (
                  <AppText variant="bodyLarge" style={styles.modalLine}>
                    Interrumpidas: {selectedDay.interruptedCount}
                  </AppText>
                ) : null}
                <AppText variant="bodyLarge" style={styles.modalLine}>
                  Mejor inspiración:{' '}
                  {selectedDay.bestHoldSeconds != null && selectedDay.bestHoldSeconds > 0
                    ? `${selectedDay.bestHoldSeconds.toFixed(1)} s`
                    : '—'}
                </AppText>
              </View>

              {selectedDay.classification.sensorSessionsCount > 0 ? (
                <View style={styles.modalSection}>
                  <AppText variant="label" style={styles.modalSectionTitle}>
                    Tu inspiración
                  </AppText>
                  <AppText variant="bodyLarge" style={styles.modalLine}>
                    {selectedDay.classification.sensorSessionsCount}{' '}
                    {selectedDay.classification.sensorSessionsCount === 1 ? 'sesión' : 'sesiones'}
                    {selectedDay.maxVolumeMl != null && selectedDay.maxVolumeMl > 0
                      ? ` · Mejor volumen estimado ${selectedDay.maxVolumeMl} mL`
                      : ''}
                  </AppText>
                  {sensorDebug && selectedDay.classification.maxSensorU95Ml != null ? (
                    <AppText variant="bodySmall" style={styles.modalLineMuted}>
                      U95 máx. ±{Math.round(selectedDay.classification.maxSensorU95Ml)} mL (debug)
                    </AppText>
                  ) : null}
                </View>
              ) : null}

              {selectedDay.classification.practiceSessionsCount > 0 ? (
                <View style={styles.modalSection}>
                  <AppText variant="label" style={styles.modalSectionTitle}>
                    Práctica táctil
                  </AppText>
                  <AppText variant="bodySmall" style={styles.modalLineMuted}>
                    {selectedDay.classification.practiceSessionsCount}{' '}
                    {selectedDay.classification.practiceSessionsCount === 1 ? 'sesión' : 'sesiones'}{' '}
                    · No terapéutica
                  </AppText>
                </View>
              ) : null}

              {selectedDay.classification.unclassifiedSessionsCount > 0 ? (
                <View style={styles.modalSection}>
                  <AppText variant="label" style={styles.modalSectionTitle}>
                    Sin clasificar
                  </AppText>
                  <AppText variant="bodySmall" style={styles.modalLineMuted}>
                    {selectedDay.classification.unclassifiedSessionsCount}{' '}
                    {selectedDay.classification.unclassifiedSessionsCount === 1
                      ? 'sesión'
                      : 'sesiones'}{' '}
                    · Registro anterior a la clasificación
                  </AppText>
                </View>
              ) : null}

              <AppText variant="bodyMedium" style={styles.modalMotivation}>
                {dayDetailMotivation(selectedDay)}
              </AppText>
              <Pressable
                style={styles.modalClose}
                onPress={onClose}
                accessibilityRole="button">
                <AppText variant="button" style={styles.modalCloseText}>
                  Cerrar
                </AppText>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.text,
    textTransform: 'capitalize',
  },
  modalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalChipStatus: {
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
  },
  modalChipSensor: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
  },
  modalChipPractice: {
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  modalChipUnclassified: {
    backgroundColor: 'rgba(158, 158, 158, 0.15)',
  },
  modalChipText: {
    fontWeight: '600',
    color: wellness.text,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalLine: {
    color: wellness.text,
    marginBottom: 4,
  },
  modalLineMuted: {
    color: wellness.textSecondary,
    marginBottom: 4,
  },
  modalMotivation: {
    marginTop: spacing.sm,
    fontWeight: '600',
    color: wellness.primaryDark,
  },
  modalClose: {
    marginTop: spacing.lg,
    backgroundColor: wellness.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
});
