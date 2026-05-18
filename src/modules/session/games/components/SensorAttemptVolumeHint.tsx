import { StyleSheet, Text, View } from 'react-native';

import {
  getSensorAttemptEvaluationUiHint,
  type SensorAttemptEvaluation,
} from '@/src/modules/session/sensor-evaluation';
import { wellness } from '@/src/shared/theme/wellness-theme';

type SensorAttemptVolumeHintProps = {
  evaluation: SensorAttemptEvaluation;
  needsHoldTime?: boolean;
};

const hintToneStyles = {
  ok: { bg: 'rgba(52, 171, 165, 0.1)', border: 'rgba(52, 171, 165, 0.22)', text: wellness.primaryDark },
  warn: { bg: 'rgba(201, 162, 39, 0.12)', border: 'rgba(201, 162, 39, 0.32)', text: '#7A5E12' },
  muted: { bg: 'rgba(61, 90, 74, 0.06)', border: wellness.border, text: wellness.textSecondary },
} as const;

function hintTone(
  status: SensorAttemptEvaluation['status'],
): keyof typeof hintToneStyles {
  if (status === 'target_reached') return 'ok';
  if (status === 'uncertain' || status === 'out_of_range') return 'warn';
  return 'muted';
}

export function SensorAttemptVolumeHint({ evaluation, needsHoldTime }: SensorAttemptVolumeHintProps) {
  const ui = getSensorAttemptEvaluationUiHint(evaluation, { needsHoldTime });
  if (!ui) return null;

  const tone = hintToneStyles[hintTone(evaluation.status)];

  return (
    <View
      style={[styles.wrap, { backgroundColor: tone.bg, borderColor: tone.border }]}
      accessibilityRole="text"
      accessibilityLabel={[ui.title, ui.marginText, ui.confidenceText, ui.holdHint]
        .filter(Boolean)
        .join('. ')}>
      <Text style={[styles.title, { color: tone.text }]}>{ui.title}</Text>
      <View style={styles.metaRow}>
        {ui.marginText ? <Text style={styles.meta}>{ui.marginText}</Text> : null}
        {ui.confidenceText ? <Text style={styles.meta}>{ui.confidenceText}</Text> : null}
      </View>
      {ui.holdHint ? <Text style={styles.holdHint}>{ui.holdHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  holdHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
});
