/**
 * Visualización técnica read-only del hardware RESPIRA+ y la calibración
 * predeterminada para la versión web (web_touch).
 *
 * Solo informativa: no abre WebSocket, no conecta el sensor y no modifica
 * la calibración. Se reutiliza en la pantalla normal de sensor (modo demo web)
 * y en el fallback SensorUnavailableScreen.
 */

import { StyleSheet, View } from 'react-native';

import {
  RESPIRA_3000_CALIBRATED_RANGE_ML,
  RESPIRA_3000_CALIBRATION_STATUS_LABEL,
  RESPIRA_3000_CAPACITY_ML,
  RESPIRA_3000_COMMUNICATION_LABEL,
  RESPIRA_3000_DISPLAY_CALIBRATION_ID,
  RESPIRA_3000_LINEAR_MODEL,
  RESPIRA_3000_MICROCONTROLLER_LABEL,
  RESPIRA_3000_MODEL_KIND_LABEL,
  RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO,
  RESPIRA_3000_SENSOR_LABEL,
  RESPIRA_3000_SPIROMETER_MODEL_LABEL,
} from '@/src/modules/device/calibration/predefined-calibration-models';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { StatusPill } from '@/src/shared/ui/StatusPill';

/** URL esperada del WebSocket del ESP32 en campo (solo texto informativo; no se conecta). */
const EXPECTED_WEBSOCKET_LABEL = 'ws://192.168.4.1:81';

type TechnicalRow = { label: string; value: string };

const HARDWARE_ROWS: TechnicalRow[] = [
  { label: 'Microcontrolador', value: RESPIRA_3000_MICROCONTROLLER_LABEL },
  { label: 'Sensor de distancia', value: RESPIRA_3000_SENSOR_LABEL },
  {
    label: 'Espirómetro incentivador',
    value: `${RESPIRA_3000_SPIROMETER_MODEL_LABEL} (${RESPIRA_3000_CAPACITY_ML} mL)`,
  },
  { label: 'Comunicación', value: RESPIRA_3000_COMMUNICATION_LABEL },
  { label: 'WebSocket esperado', value: EXPECTED_WEBSOCKET_LABEL },
];

const CALIBRATION_ROWS: TechnicalRow[] = [
  { label: 'Calibración activa', value: RESPIRA_3000_DISPLAY_CALIBRATION_ID },
  { label: 'Estado', value: RESPIRA_3000_CALIBRATION_STATUS_LABEL },
  { label: 'Fecha de banco', value: RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO },
  { label: 'Modelo', value: RESPIRA_3000_MODEL_KIND_LABEL },
  {
    label: 'Ecuación distancia→volumen',
    value: `V(mL) = ${RESPIRA_3000_LINEAR_MODEL.slope.toFixed(3)} × d(mm) − ${Math.abs(
      RESPIRA_3000_LINEAR_MODEL.intercept,
    ).toFixed(3)}`,
  },
  { label: 'R²', value: RESPIRA_3000_LINEAR_MODEL.rSquared.toFixed(4) },
  { label: 'MAE', value: `${RESPIRA_3000_LINEAR_MODEL.maeMl.toFixed(1)} mL` },
  { label: 'RMSE', value: `${RESPIRA_3000_LINEAR_MODEL.rmseMl.toFixed(1)} mL` },
  {
    label: 'Rango calibrado',
    value: `${RESPIRA_3000_CALIBRATED_RANGE_ML.min}–${RESPIRA_3000_CALIBRATED_RANGE_ML.max} mL`,
  },
];

function TechnicalRowsCard({ title, rows }: { title: string; rows: TechnicalRow[] }) {
  return (
    <AppCard style={styles.techCard}>
      <AppText variant="titleSmall" style={styles.techCardTitle}>
        {title}
      </AppText>
      <View style={styles.techRows}>
        {rows.map((row, index) => (
          <View key={row.label}>
            {index > 0 ? <View style={styles.techDivider} /> : null}
            <View style={styles.techRow}>
              <AppText variant="bodySmall" style={styles.techLabel}>
                {row.label}
              </AppText>
              <AppText variant="bodySmall" style={styles.techValue}>
                {row.value}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

export function SensorWebTechnicalOverview() {
  return (
    <View style={styles.techSection}>
      <View style={styles.techHeaderRow}>
        <StatusPill label="Visualización técnica" tone="info" size="sm" />
        <StatusPill label="Sin conexión real" tone="neutral" size="sm" />
      </View>
      <AppText variant="bodySmall" style={styles.techIntro}>
        Información de referencia del prototipo RESPIRA+ para revisión. Es solo lectura: en esta
        versión web no se conecta el sensor ni se modifica la calibración.
      </AppText>

      <TechnicalRowsCard title="Hardware del dispositivo" rows={HARDWARE_ROWS} />
      <TechnicalRowsCard title="Calibración predeterminada" rows={CALIBRATION_ROWS} />

      <AppText variant="caption" style={styles.techFootnote}>
        Calibración de banco validada por el equipo. Las sesiones de esta versión web usan práctica
        táctil y no registran mediciones del sensor.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  techSection: {
    gap: spacing.sm,
  },
  techHeaderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  techIntro: {
    color: wellnessColors.textSecondary,
  },
  techFootnote: {
    color: wellnessColors.textMuted,
  },
  techCard: {
    padding: spacing.md,
  },
  techCardTitle: {
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  techRows: {
    gap: 6,
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  techDivider: {
    height: 1,
    backgroundColor: wellnessColors.neutralSoft,
    marginBottom: 6,
  },
  techLabel: {
    flexShrink: 0,
    maxWidth: '46%',
    fontWeight: '500',
    color: wellnessColors.textSecondary,
  },
  techValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: wellnessColors.textPrimary,
  },
});
