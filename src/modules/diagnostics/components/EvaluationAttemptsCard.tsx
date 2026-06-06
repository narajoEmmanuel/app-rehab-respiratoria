import { StyleSheet, View } from 'react-native';

import { DEFAULT_DIAGNOSTIC_INPUT_MODE } from '@/src/modules/diagnostics/diagnostic-input-mode';
import {
  formatEvaluationVolumeMl,
  resolveBestAttemptNumber,
} from '@/src/modules/diagnostics/diagnostic-evaluation-display-utils';
import type { DiagnosticAttemptNumber, DiagnosticRecord } from '@/src/modules/diagnostics/types';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';

const ATTEMPT_NUMBERS: DiagnosticAttemptNumber[] = [1, 2, 3];

type EvaluationAttemptsCardProps = {
  diagnostic: DiagnosticRecord;
};

function attemptLabelForRow(
  attemptNumber: DiagnosticAttemptNumber,
  peakMl: number,
  valid: boolean,
): string {
  if (!valid) return 'Sin lectura válida';
  if (peakMl <= 0) return 'No válido';
  return formatEvaluationVolumeMl(peakMl);
}

export function EvaluationAttemptsCard({ diagnostic }: EvaluationAttemptsCardProps) {
  const attempts = diagnostic.attempts;
  const inputMode = diagnostic.input_mode ?? DEFAULT_DIAGNOSTIC_INPUT_MODE;

  if (!attempts?.length) {
    return (
      <AppCard>
        <AppText variant="titleSmall" style={styles.sectionTitle}>
          Intentos realizados
        </AppText>
        <AppText variant="bodySmall" style={styles.legacyMessage}>
          Esta evaluación fue registrada antes de guardar intentos individuales.
        </AppText>
      </AppCard>
    );
  }

  const bestAttemptNumber = resolveBestAttemptNumber(attempts, inputMode);

  return (
    <AppCard>
      <AppText variant="titleSmall" style={styles.sectionTitle}>
        Intentos realizados
      </AppText>
      {ATTEMPT_NUMBERS.map((attemptNumber, index) => {
        const row = attempts.find((a) => a.attempt_number === attemptNumber);
        const peak = Math.max(0, row?.peak_volume_ml ?? 0);
        const valid = row != null && row.valid === true;
        const isBest = bestAttemptNumber === attemptNumber && valid && peak > 0;

        return (
          <View key={attemptNumber}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={[styles.row, isBest && styles.rowBest]}>
              <View style={styles.labelWrap}>
                <AppText variant="bodyLarge" style={styles.rowLabel}>
                  Intento {attemptNumber}
                </AppText>
                {isBest ? (
                  <AppText variant="chipSmall" style={styles.bestPill}>
                    Mejor intento
                  </AppText>
                ) : null}
              </View>
              <AppText variant="metricSmall" style={[styles.rowValue, isBest && styles.rowValueBest]}>
                {attemptLabelForRow(attemptNumber, peak, valid)}
              </AppText>
            </View>
          </View>
        );
      })}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  legacyMessage: {
    color: wellnessColors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowBest: {
    backgroundColor: wellnessColors.primarySoft,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: wellnessRadii.card,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  rowLabel: {
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
  bestPill: {
    color: wellnessColors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  rowValue: {
    color: wellnessColors.textPrimary,
  },
  rowValueBest: {
    color: wellnessColors.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: wellness.border,
    marginVertical: spacing.sm,
  },
});
