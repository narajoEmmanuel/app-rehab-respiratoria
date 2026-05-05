/**
 * Purpose: Manual export of stored respiratory sessions (JSON / CSV).
 * Module: export
 */

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildSessionExportCsv } from '@/src/modules/export/formatters/session-csv-exporter';
import { buildSessionExportJson } from '@/src/modules/export/formatters/session-json-exporter';
import { getPatientExportData } from '@/src/modules/export/services/session-export-service';
import { downloadExportFile } from '@/src/modules/export/utils/download-export-file';
import { isConsentActive } from '@/src/modules/legal/consent-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

function exportBasename(patientId: number): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `respira-sesiones-${patientId}-${stamp}`;
}

export function DataExportScreen() {
  const router = useRouter();
  const { patient, hydrated } = usePatientSession();
  const [consentOk, setConsentOk] = useState<boolean | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGate = useCallback(async () => {
    if (!patient) {
      setConsentOk(null);
      setSessionCount(null);
      return;
    }
    const [active, data] = await Promise.all([isConsentActive(), getPatientExportData(patient.paciente_id)]);
    setConsentOk(active);
    setSessionCount(data.sessions.length);
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

  const runExport = useCallback(
    async (kind: 'json' | 'csv') => {
      if (!patient) return;
      setError(null);
      const active = await isConsentActive();
      if (!active) {
        setConsentOk(false);
        setError('El consentimiento no está activo. No se puede exportar.');
        return;
      }
      setBusy(true);
      try {
        const data = await getPatientExportData(patient.paciente_id);
        setSessionCount(data.sessions.length);
        const base = exportBasename(patient.paciente_id);
        if (kind === 'json') {
          const body = buildSessionExportJson(data);
          const result = await downloadExportFile(body, `${base}.json`, 'application/json');
          if (!result.ok) {
            setError(result.message);
          }
        } else {
          const body = buildSessionExportCsv(data);
          const result = await downloadExportFile(body, `${base}.csv`, 'text/csv');
          if (!result.ok) {
            setError(result.message);
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo generar la exportación.';
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [patient],
  );

  const showConsentBlock = consentOk === false;
  const noSessions = consentOk === true && sessionCount === 0;
  const canExport =
    consentOk === true && sessionCount !== null && sessionCount > 0 && !busy && hydrated && patient != null;

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
          Puedes descargar o compartir un archivo con tus sesiones guardadas en este dispositivo. Los archivos pueden
          incluir datos personales y de salud: trátalos con cuidado y compártelos solo si tú lo decides.
        </Text>

        {!hydrated || (patient != null && consentOk === null) ? (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Comprobando permisos y sesiones…</Text>
          </View>
        ) : null}

        {patient == null ? (
          <Text style={styles.warning}>Inicia sesión para exportar tus datos.</Text>
        ) : null}

        {patient && showConsentBlock ? (
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>Exportación no disponible</Text>
            <Text style={styles.blockText}>
              El consentimiento digital no está activo. Reactiva el consentimiento en Perfil para poder exportar tus
              sesiones.
            </Text>
          </View>
        ) : null}

        {patient && consentOk === true && noSessions ? (
          <Text style={styles.empty}>Aún no hay sesiones para exportar.</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {patient && consentOk === true && sessionCount !== null && sessionCount > 0 ? (
          <Text style={styles.meta}>Sesiones incluidas: {sessionCount}</Text>
        ) : null}

        {patient && consentOk === true && sessionCount !== null && sessionCount > 0 ? (
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
          En la web, el archivo se descarga con el navegador. En el iPhone, se abre la hoja de compartir para que elijas
          dónde guardarlo. No enviamos datos automáticamente a correo, nube ni mensajería.
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
  empty: {
    fontSize: 16,
    color: wellness.text,
    fontWeight: '600',
  },
  error: {
    fontSize: 14,
    color: '#9a3b2f',
    lineHeight: 20,
  },
  meta: {
    fontSize: 14,
    color: wellness.textSecondary,
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
