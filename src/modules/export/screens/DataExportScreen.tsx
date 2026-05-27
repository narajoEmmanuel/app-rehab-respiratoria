/**
 * Purpose: Manual export of clinical data (JSON / CSV) via local file + share sheet.
 * Module: export
 */

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exportCalibrationTechnicalCsv } from '@/src/modules/export/services/calibration-technical-export-service';
import { getClinicalExportSnapshot } from '@/src/modules/export/services/clinical-export-service';
import { exportPatientCsv, exportPatientJson } from '@/src/modules/export/services/patient-clinical-export-service';
import { isConsentActive } from '@/src/modules/legal/consent-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { InfoTile } from '@/src/shared/ui/InfoTile';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

type SnapshotSummary = {
  sessions: number;
  diagnostics: number;
  levels: number;
  hasPatient: boolean;
};

export function DataExportScreen() {
  const router = useRouter();
  const { patient, hydrated } = usePatientSession();
  const [consentOk, setConsentOk] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<SnapshotSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  const refreshGate = useCallback(async () => {
    if (!patient) {
      setConsentOk(null);
      setSummary(null);
      return;
    }
    const [active, snapshot] = await Promise.all([
      isConsentActive(),
      getClinicalExportSnapshot(patient.paciente_id),
    ]);
    setConsentOk(active);
    setSummary({
      sessions: snapshot.sessions.length,
      diagnostics: snapshot.diagnostics.length,
      levels: snapshot.patient_levels.length,
      hasPatient: snapshot.patient != null,
    });
  }, [patient]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshGate();
  }, [hydrated, refreshGate]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      void refreshGate();
    }, [hydrated, refreshGate]),
  );

  useEffect(() => {
    if (!successHint) return;
    const t = setTimeout(() => setSuccessHint(null), 4500);
    return () => clearTimeout(t);
  }, [successHint]);

  const runExport = useCallback(
    async (kind: 'json' | 'csv') => {
      if (!patient) return;
      setError(null);
      setSuccessHint(null);
      const active = await isConsentActive();
      if (!active) {
        setConsentOk(false);
        setError('El consentimiento no está activo. No se puede exportar.');
        return;
      }
      setBusy(true);
      try {
        const result =
          kind === 'json'
            ? await exportPatientJson(patient.paciente_id)
            : await exportPatientCsv(patient.paciente_id);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        await refreshGate();
        setSuccessHint(
          result.mode === 'web_download'
            ? 'Descarga iniciada en el navegador.'
            : 'Archivo generado. Usa el menú para guardar o compartir.',
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo generar la exportación.';
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [patient, refreshGate],
  );

  const runCalibrationExport = useCallback(async () => {
    setError(null);
    setSuccessHint(null);
    setBusy(true);
    try {
      const result = await exportCalibrationTechnicalCsv();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccessHint(
        result.mode === 'web_download'
          ? 'Descarga de calibración iniciada.'
          : 'Archivo de calibración generado.',
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo exportar la calibración.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const showConsentBlock = consentOk === false;
  const canExport =
    consentOk === true && summary != null && !busy && hydrated && patient != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Exportar resumen"
          subtitle="Genera un archivo con tus sesiones, evaluaciones iniciales y progreso para revisarlo con un profesional de la salud."
        />

        {!hydrated || (patient != null && consentOk === null) ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={wellnessColors.primary} />
            <Text style={styles.muted}>Comprobando permisos y datos…</Text>
          </View>
        ) : null}

        {patient == null ? (
          <AppCard variant="soft">
            <Text style={styles.emptyTitle}>Sin sesión activa</Text>
            <Text style={styles.emptyBody}>Inicia sesión para exportar tus datos.</Text>
          </AppCard>
        ) : null}

        {patient && showConsentBlock ? (
          <AppCard>
            <StatusPill label="Consentimiento inactivo" tone="warning" size="sm" />
            <Text style={styles.blockTitle}>Exportación no disponible</Text>
            <Text style={styles.blockText}>
              Reactiva el consentimiento en Perfil para poder exportar tu resumen de progreso.
            </Text>
          </AppCard>
        ) : null}

        {error ? (
          <View style={styles.feedbackRow}>
            <StatusPill label={error} tone="danger" size="sm" />
          </View>
        ) : null}
        {successHint ? (
          <View style={styles.feedbackRow}>
            <StatusPill label={successHint} tone="success" size="sm" />
          </View>
        ) : null}

        {patient && consentOk === true && summary != null ? (
          <>
            <AppCard style={styles.contentCard}>
              <Text style={styles.contentCardTitle}>Contenido del archivo</Text>
              <Text style={styles.contentCardBody}>
                Incluye tu ficha, evaluaciones iniciales, niveles, sesiones e intentos guardados en
                este dispositivo.
              </Text>
            </AppCard>

            <View style={styles.metricsRow}>
              <MetricTile
                label="Sesiones"
                value={String(summary.sessions)}
                tone={summary.sessions > 0 ? 'success' : 'default'}
                size="compact"
              />
              <MetricTile
                label="Evaluaciones"
                value={String(summary.diagnostics)}
                tone={summary.diagnostics > 0 ? 'success' : 'default'}
                size="compact"
              />
              <InfoTile
                label="Formato"
                value="CSV y JSON"
                helper="CSV recomendado"
                tone="info"
                compact
              />
            </View>

            {summary.sessions === 0 && summary.diagnostics === 0 ? (
              <Text style={styles.emptyHint}>
                Aún no hay sesiones ni evaluaciones registradas. Puedes exportar de todas formas para verificar la estructura.
              </Text>
            ) : null}
          </>
        ) : null}

        {patient && consentOk === true && summary != null ? (
          busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={wellnessColors.primary} />
              <Text style={styles.muted}>Generando archivo…</Text>
            </View>
          ) : (
            <View style={styles.actionsSection}>
              <AppButton
                title="Exportar CSV"
                onPress={() => void runExport('csv')}
                variant="primary"
                disabled={!canExport}
                iconName="arrow.down.doc.fill"
              />
              <Text style={styles.formatHint}>Recomendado para revisión rápida con profesionales.</Text>

              <AppButton
                title="Exportar JSON"
                onPress={() => void runExport('json')}
                variant="secondary"
                disabled={!canExport}
                iconName="doc.text.fill"
                style={styles.secondaryAction}
              />
              <Text style={styles.formatHintSecondary}>Formato técnico completo.</Text>

              <View style={styles.technicalDivider} />
              <Text style={styles.technicalSectionTitle}>Calibración técnica</Text>
              <Text style={styles.formatHintSecondary}>
                Descarga puntos, modelo y métricas de calibración para revisión técnica.
              </Text>
              <AppButton
                title="Exportar datos técnicos"
                onPress={() => void runCalibrationExport()}
                variant="ghost"
                disabled={busy}
                iconName="wrench.fill"
                style={styles.secondaryAction}
              />
            </View>
          )
        ) : null}

        <Text style={styles.disclaimer}>
          En la web, el archivo se descarga con el navegador. En el teléfono, se guarda un archivo
          temporal y se abre la hoja de compartir. No enviamos datos automáticamente a correo, nube
          ni mensajería.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellnessColors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  muted: {
    fontSize: 14,
    color: wellnessColors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginTop: spacing.sm,
  },
  blockText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
    marginTop: 4,
  },
  feedbackRow: {
    alignItems: 'flex-start',
  },
  contentCard: {
    gap: spacing.xs,
  },
  contentCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
  },
  contentCardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 19,
    color: wellnessColors.textMuted,
    fontStyle: 'italic',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionsSection: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  formatHint: {
    fontSize: 12,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  formatHintSecondary: {
    fontSize: 12,
    color: wellnessColors.textMuted,
    marginLeft: 2,
  },
  secondaryAction: {
    marginTop: spacing.xs,
  },
  technicalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: wellnessColors.neutralSoft,
    marginVertical: spacing.md,
  },
  technicalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: wellnessColors.textMuted,
    marginTop: spacing.md,
    borderRadius: wellnessRadius.sm,
    backgroundColor: wellnessColors.neutralSoft,
    padding: spacing.md,
  },
});
