/**
 * Purpose: Manual export of clinical data (JSON / CSV) via local file + share sheet.
 * Module: export
 */

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getClinicalExportSnapshot } from '@/src/modules/export/services/clinical-export-service';
import { exportPatientCsv, exportPatientJson } from '@/src/modules/export/services/patient-clinical-export-service';
import { isConsentActive } from '@/src/modules/legal/consent-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

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
        contentContainerStyle={[styles.scroll, { paddingBottom: wellnessFloatingTabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Datos y exportación</Text>
        <Text style={styles.lead}>
          Exporta un archivo con tu ficha, diagnósticos, niveles, sesiones e intentos guardados en este dispositivo.
          Los archivos pueden incluir datos personales y de salud: trátalos con cuidado y compártelos solo si tú lo
          decides.
        </Text>

        {!hydrated || (patient != null && consentOk === null) ? (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Comprobando permisos y datos…</Text>
          </View>
        ) : null}

        {patient == null ? <Text style={styles.warning}>Inicia sesión para exportar tus datos.</Text> : null}

        {patient && showConsentBlock ? (
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>Exportación no disponible</Text>
            <Text style={styles.blockText}>
              El consentimiento digital no está activo. Reactiva el consentimiento en Perfil para poder exportar tus
              datos clínicos.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {successHint ? <Text style={styles.success}>{successHint}</Text> : null}

        {patient && consentOk === true && summary != null ? (
          <>
            <Text style={styles.meta}>
              Resumen: diagnósticos {summary.diagnostics}, niveles {summary.levels}, sesiones {summary.sessions}. Ficha
              de paciente: {summary.hasPatient ? 'incluida' : 'no encontrada en almacenamiento local'}.
            </Text>
            <Text style={styles.emptyHint}>
              Puedes exportar aunque algunas tablas estén vacías (por ejemplo, antes de la primera sesión).
            </Text>
          </>
        ) : null}

        {patient && consentOk === true && summary != null ? (
          busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={wellness.primaryDark} />
              <Text style={styles.muted}>Generando archivo…</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={[styles.primaryBtn, !canExport && styles.btnDisabled]}
                disabled={!canExport}
                onPress={() => void runExport('json')}
                accessibilityRole="button"
                accessibilityLabel="Exportar JSON">
                <Text style={styles.primaryBtnText}>Exportar JSON</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryBtn, !canExport && styles.btnDisabled]}
                disabled={!canExport}
                onPress={() => void runExport('csv')}
                accessibilityRole="button"
                accessibilityLabel="Exportar CSV">
                <Text style={styles.primaryBtnText}>Exportar CSV</Text>
              </Pressable>
            </>
          )
        ) : null}

        <Text style={styles.hint}>
          En la web, el archivo se descarga con el navegador. En el teléfono, se guarda un archivo temporal y se abre la
          hoja de compartir para que elijas dónde guardarlo. No enviamos datos automáticamente a correo, nube ni
          mensajería.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  muted: {
    fontSize: 14,
    color: wellness.textSecondary,
  },
  warning: {
    fontSize: 15,
    color: '#9a3b2f',
    fontWeight: '600',
  },
  blockCard: {
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    gap: spacing.sm,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
  },
  blockText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  error: {
    fontSize: 14,
    color: '#9a3b2f',
    lineHeight: 20,
  },
  success: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1B5E20',
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
    color: wellness.textSecondary,
    lineHeight: 20,
  },
  primaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: wellness.textSecondary,
    marginTop: spacing.sm,
  },
});
