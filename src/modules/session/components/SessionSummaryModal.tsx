/**
 * Purpose: Post-session summary modal before navigating to the full summary screen.
 * Module: session
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SessionProgressCopy } from '@/src/modules/session/patient-ui/session-progress-copy';
import { TARGET_ATTEMPTS } from '@/src/modules/session/session-progress-service';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type SessionSummaryKind = 'completed' | 'interrupted';

function sessionSummaryModalTitle(kind: SessionSummaryKind, sessionNumber: number): string {
  return kind === 'interrupted'
    ? `Sesión ${sessionNumber} detenida`
    : `Sesión ${sessionNumber} completada`;
}

type Props = {
  visible: boolean;
  summaryKind: SessionSummaryKind;
  sessionNumber: number;
  levelTitle: string;
  validAttempts: number;
  failedAttempts: number;
  sessionProgress: SessionProgressCopy;
  perfectSession: boolean;
  maxVolume: number;
  avgVolume: number;
  maxHoldSeconds: number;
  avgHoldSeconds: number;
  savingSummary: boolean;
  onViewSummary: () => void;
  onExitToTherapy: () => void;
};

export function SessionSummaryModal({
  visible,
  summaryKind,
  sessionNumber,
  levelTitle,
  validAttempts,
  failedAttempts,
  sessionProgress,
  perfectSession,
  maxVolume,
  avgVolume,
  maxHoldSeconds,
  avgHoldSeconds,
  savingSummary,
  onViewSummary,
  onExitToTherapy,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCardShell}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <Text style={styles.modalTitle}>
              {sessionSummaryModalTitle(summaryKind, sessionNumber)}
            </Text>
            <View style={styles.modalMetaRow}>
              <Text style={styles.modalMetaChip}>{levelTitle}</Text>
              <Text style={styles.modalMetaChip}>Sesión {sessionNumber}/6</Text>
            </View>
            <View style={styles.modalGrid}>
              <View style={styles.modalTile}>
                <Text style={styles.modalTileLabel}>Repeticiones válidas</Text>
                <Text style={styles.modalTileValue}>{validAttempts}</Text>
              </View>
              <View style={styles.modalTile}>
                <Text style={styles.modalTileLabel}>No completadas</Text>
                <Text style={styles.modalTileValue}>{failedAttempts}</Text>
              </View>
            </View>
            <View style={styles.modalComplianceBlock}>
              <Text style={styles.modalComplianceLabel}>Progreso de sesión</Text>
              <Text style={styles.modalProgressHeadline}>{sessionProgress.headline}</Text>
              {sessionProgress.support ? (
                <Text style={styles.modalProgressSupport}>{sessionProgress.support}</Text>
              ) : null}
              <View style={styles.modalComplianceTrack}>
                <View
                  style={[
                    styles.modalComplianceFill,
                    { width: `${Math.round(sessionProgress.progressRatio * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.modalProgressMeta}>
                {validAttempts} repeticiones válidas de {TARGET_ATTEMPTS}
              </Text>
            </View>
            {perfectSession ? (
              <View style={styles.modalBadgeRow}>
                <Text style={styles.modalBadgeStar}>★</Text>
                <Text style={styles.modalBadgeText}>Sesión completada con buen control</Text>
              </View>
            ) : null}
            <View style={styles.modalGrid}>
              <View style={styles.modalTileWide}>
                <Text style={styles.modalTileLabel}>Vol. máx. / prom. estimado</Text>
                <Text style={styles.modalTileValueSmall}>
                  {maxVolume} mL · {avgVolume} mL
                </Text>
              </View>
              <View style={styles.modalTileWide}>
                <Text style={styles.modalTileLabel}>Tiempo máx. / prom. sostenido</Text>
                <Text style={styles.modalTileValueSmall}>
                  {maxHoldSeconds.toFixed(1)} s · {avgHoldSeconds.toFixed(1)} s
                </Text>
              </View>
            </View>
            <Text style={styles.modalMotivation}>
              {perfectSession
                ? 'Tu progreso se construye sesión a sesión. Buen control.'
                : 'Sigue a tu ritmo. Cada sesión cuenta para tu avance.'}
            </Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalPrimaryButton, savingSummary && { opacity: 0.7 }]}
              disabled={savingSummary}
              onPress={onViewSummary}>
              <Text style={styles.modalPrimaryButtonText}>
                {savingSummary ? 'Guardando…' : 'Ver resumen'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modalSecondaryButton, savingSummary && { opacity: 0.7 }]}
              disabled={savingSummary}
              onPress={onExitToTherapy}>
              <Text style={styles.modalSecondaryButtonText}>Volver a terapia</Text>
            </Pressable>
          </View>
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
  modalCardShell: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
    overflow: 'hidden',
  },
  modalScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  modalFooter: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: wellness.border,
    backgroundColor: wellness.card,
  },
  modalTitle: {
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  modalMetaChip: {
    backgroundColor: wellness.softGreen,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: wellness.primaryDark,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  modalTile: {
    flex: 1,
    minWidth: '42%',
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalTileWide: {
    flex: 1,
    minWidth: '100%',
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: 4,
  },
  modalTileValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  modalTileValueSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.text,
  },
  modalComplianceBlock: {
    marginBottom: 12,
  },
  modalComplianceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalProgressHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: 4,
  },
  modalProgressSupport: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  modalProgressMeta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  modalComplianceTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: wellness.border,
    overflow: 'hidden',
  },
  modalComplianceFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: wellness.primary,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  modalBadgeStar: {
    fontSize: 18,
    color: '#C9A227',
  },
  modalBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  modalMotivation: {
    color: wellness.text,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 4,
    fontWeight: '600',
    lineHeight: 22,
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
