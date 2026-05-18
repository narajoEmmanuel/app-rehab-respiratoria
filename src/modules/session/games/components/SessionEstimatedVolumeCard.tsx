import { StyleSheet, Text, View } from 'react-native';

import type { VolumeEstimationReadinessStatus } from '@/src/modules/device/volume-estimation/volume-estimation-types';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { wellness } from '@/src/shared/theme/wellness-theme';

export type SessionDisplayVolumeSource = 'sensor' | 'fallback';

type SessionSensorStatusChipProps = {
  sessionInputMode?: SessionInputMode;
  status: VolumeEstimationReadinessStatus;
  displaySource: SessionDisplayVolumeSource;
};

type ChipPresentation = {
  label: string;
  tone: 'ok' | 'warn' | 'muted';
  showClinicalNote: boolean;
};

function resolveChipPresentation(
  status: VolumeEstimationReadinessStatus,
  displaySource: SessionDisplayVolumeSource,
): ChipPresentation | null {
  if (status === 'loading') return null;

  if (displaySource === 'sensor' && status === 'ready') {
    return {
      label: 'Sensor activo · En rango',
      tone: 'ok',
      showClinicalNote: true,
    };
  }

  switch (status) {
    case 'out_of_range':
      return { label: 'Fuera de rango', tone: 'warn', showClinicalNote: displaySource === 'sensor' };
    case 'sensor_disconnected':
      return { label: 'Sensor desconectado', tone: 'muted', showClinicalNote: false };
    case 'model_stale':
      return { label: 'Modelo desactualizado', tone: 'warn', showClinicalNote: false };
    case 'no_active_model':
    case 'missing_curve':
    case 'no_spirometer':
    case 'not_ready_for_therapy':
      return { label: 'Calibración requerida', tone: 'muted', showClinicalNote: false };
    case 'invalid_sensor_reading':
    case 'error':
      return { label: 'Modelo no disponible', tone: 'muted', showClinicalNote: false };
    default:
      return null;
  }
}

const chipToneStyles = {
  ok: { bg: 'rgba(52, 171, 165, 0.12)', text: wellness.primaryDark, border: 'rgba(52, 171, 165, 0.22)' },
  warn: { bg: 'rgba(201, 162, 39, 0.14)', text: '#7A5E12', border: 'rgba(201, 162, 39, 0.35)' },
  muted: { bg: 'rgba(61, 90, 74, 0.08)', text: wellness.textSecondary, border: wellness.border },
} as const;

/** Chip compacto de estado del sensor o de práctica táctil. */
export function SessionEstimatedVolumeCard({
  sessionInputMode = 'sensor',
  status,
  displaySource,
}: SessionSensorStatusChipProps) {
  if (sessionInputMode === 'touch_practice') {
    const tone = chipToneStyles.muted;
    return (
      <View style={styles.wrap}>
        <View style={[styles.chip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.chipText, { color: tone.text }]}>Modo práctica táctil</Text>
        </View>
        <Text style={styles.clinicalNote}>Sin medición del sensor</Text>
      </View>
    );
  }

  const presentation = resolveChipPresentation(status, displaySource);
  if (!presentation) return null;

  const tone = chipToneStyles[presentation.tone];

  return (
    <View style={styles.wrap}>
      <View style={[styles.chip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Text style={[styles.chipText, { color: tone.text }]}>{presentation.label}</Text>
      </View>
      {presentation.showClinicalNote ? (
        <Text style={styles.clinicalNote}>Pendiente de validación clínica</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clinicalNote: {
    fontSize: 10,
    fontWeight: '600',
    color: wellness.textSecondary,
    opacity: 0.85,
  },
});
