import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatMetricValue,
  resolveCalibrationDisplayMetadata,
} from '@/src/modules/device/calibration/calibration-display-utils';
import { ensureRespira3000PredefinedCalibrationInstalled } from '@/src/modules/device/calibration/predefined-calibration-service';
import { RESPIRA_3000_OVER_RANGE_FOOTNOTE, RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT } from '@/src/modules/device/calibration/predefined-calibration-models';
import { useActiveVolumeEstimate } from '@/src/modules/device/volume-estimation';
import { exportCalibrationTechnicalCsv } from '@/src/modules/export/services/calibration-technical-export-service';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessRadius, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { StatusPill } from '@/src/shared/ui/StatusPill';

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

type MetricStatCardProps = {
  label: string;
  value: string;
  unit?: string;
};

function MetricStatCard({ label, value, unit }: MetricStatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

type IdentityRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function IdentityRow({ label, value, mono }: IdentityRowProps) {
  return (
    <View style={styles.identityRow}>
      <Text style={styles.identityLabel}>{label}</Text>
      <Text style={[styles.identityValue, mono && styles.identityValueMono]} selectable={mono}>
        {value}
      </Text>
    </View>
  );
}

type SystemRowProps = {
  label: string;
  value: string;
};

function SystemRow({ label, value }: SystemRowProps) {
  return (
    <View style={styles.systemRow}>
      <Text style={styles.systemLabel}>{label}</Text>
      <Text style={styles.systemValue}>{value}</Text>
    </View>
  );
}

export function CalibrationTechnicalSummaryScreen() {
  const { calibrationProfile, activeModel, loading } = useActiveVolumeEstimate({ enabled: true });

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    void (async () => {
      setRefreshing(true);
      await ensureRespira3000PredefinedCalibrationInstalled();
      setRefreshing(false);
    })();
  }, []);

  const meta = useMemo(
    () => resolveCalibrationDisplayMetadata(calibrationProfile, activeModel),
    [activeModel, calibrationProfile],
  );

  const metricCards = useMemo(
    () => [
      { label: 'R²', value: formatMetricValue(meta.rSquared, 4) },
      { label: 'MAE', value: formatMetricValue(meta.maeMl, 2), unit: ' mL' },
      { label: 'RMSE', value: formatMetricValue(meta.rmseMl, 2), unit: ' mL' },
      { label: 'Error máx.', value: formatMetricValue(meta.maxAbsErrorMl, 2), unit: ' mL' },
      { label: 'Pendiente', value: formatMetricValue(meta.slope, 4), unit: ' mL/mm' },
      { label: 'Intercepto', value: formatMetricValue(meta.intercept, 2), unit: ' mL' },
      { label: 'Capacidad', value: `${meta.capacityMl}`, unit: ' mL' },
      { label: 'Puntos', value: `${RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT}` },
      { label: 'Calibración', value: meta.calibrationDateShort },
    ],
    [meta],
  );

  const onExportCsv = useCallback(async () => {
    hapticLight();
    setExporting(true);
    setExportMessage(null);
    try {
      const result = await exportCalibrationTechnicalCsv({
        profile: calibrationProfile ?? undefined,
        technicalContext: { activeModel },
      });
      if (result.ok) {
        setExportMessage('CSV técnico descargado.');
      } else {
        setExportMessage(result.message);
      }
    } catch (error) {
      setExportMessage(
        error instanceof Error ? error.message : 'No se pudo exportar el CSV técnico.',
      );
    } finally {
      setExporting(false);
    }
  }, [activeModel, calibrationProfile]);

  const busy = loading || refreshing;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Resumen técnico</Text>
          <Text style={styles.subtitle}>Calibración validada RESPIRA+ 3000 mL</Text>
        </View>

        {busy ? (
          <ActivityIndicator color={wellnessColors.primary} style={styles.loader} />
        ) : (
          <>
            <AppCard style={styles.identityCard}>
              <Text style={styles.sectionTitle}>Identidad de calibración</Text>
              <IdentityRow label="ID" value={meta.displayCalibrationId} mono />
              <IdentityRow label="Fecha" value={meta.calibrationDateLabel} />
              <IdentityRow label="Espirómetro" value={meta.spirometerModel} />
              <IdentityRow label="Modelo" value={meta.modelKind} />
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Estado</Text>
                <StatusPill label={meta.statusLabel} tone="success" size="sm" />
              </View>
            </AppCard>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Métricas de calibración</Text>
              <View style={styles.statsGrid}>
                {metricCards.map((card) => (
                  <MetricStatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    unit={card.unit}
                  />
                ))}
              </View>
            </View>

            <View style={styles.equationCard}>
              <Text style={styles.sectionTitle}>Ecuación activa</Text>
              <Text style={styles.equationText} selectable>
                {meta.equationLabel}
              </Text>
              <Text style={styles.equationHint}>{meta.equationHint}</Text>
            </View>

            <AppCard style={styles.systemCard}>
              <Text style={styles.sectionTitle}>Sistema de medición</Text>
              <SystemRow label="Sensor" value={meta.sensorLabel} />
              <SystemRow label="Microcontrolador" value={meta.microcontrollerLabel} />
              <SystemRow label="Firmware" value={meta.firmwareLabel} />
              <SystemRow label="Comunicación" value={meta.communicationLabel} />
            </AppCard>

            <Text style={styles.footnote}>{RESPIRA_3000_OVER_RANGE_FOOTNOTE}</Text>
          </>
        )}

        <View style={styles.actions}>
          <AppButton
            title={exporting ? 'Exportando…' : 'Descargar CSV técnico'}
            onPress={() => void onExportCsv()}
            variant="primary"
            iconName="arrow.down.doc.fill"
            disabled={busy || exporting}
          />

          {exportMessage ? <Text style={styles.exportHint}>{exportMessage}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  headerBlock: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: wellnessColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identityCard: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...wellnessShadows.card,
  },
  identityRow: {
    gap: 4,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  identityValue: {
    fontSize: 16,
    lineHeight: 22,
    color: wellnessColors.textPrimary,
    fontWeight: '500',
  },
  identityValueMono: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.16)',
    borderLeftWidth: 3,
    borderLeftColor: wellnessColors.primary,
    gap: spacing.sm,
    ...wellnessShadows.card,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellnessColors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.4,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
  equationCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: wellnessRadius.lg,
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
  },
  equationText: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    color: wellnessColors.primaryDark,
    letterSpacing: -0.2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  equationHint: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textSecondary,
  },
  systemCard: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...wellnessShadows.card,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  systemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    flexShrink: 0,
  },
  systemValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: wellnessColors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: wellnessColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  exportHint: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
