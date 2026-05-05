/**
 * Purpose: Patient home — dashboard with primary therapy CTA, session snapshot, and essentials.
 * Module: home
 * Dependencies: expo-router, patient session, consent, session storage, diagnostics
 * Notes: Redundant shortcuts (niveles, calendario, logout) live in other areas of the app.
 */

import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { getCurrentActiveLevel, hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { HomeLastSessionCard } from '@/src/modules/home/components/HomeLastSessionCard';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { useConsentActive } from '@/src/modules/legal/use-consent-active';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { updateDailyProgress } from '@/src/modules/session/session-progress-service';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset } from '@/src/shared/theme/wellness-theme';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

const ACCENT = '#34aba5';

function onLightImpact() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function compareSessionRecency(a: SessionRecord, b: SessionRecord): number {
  const ta = Date.parse(a.session_date);
  const tb = Date.parse(b.session_date);
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && tb !== ta) {
    return tb - ta;
  }
  return b.session_id - a.session_id;
}

function countWeeklyCompleted(sessions: SessionRecord[], todayKey: string): number {
  const start = addDaysLocal(todayKey, -6);
  return sessions.filter((s) => {
    const k = sessionRecordLocalDayKey(s.session_date);
    if (k == null || k < start || k > todayKey) return false;
    return s.completed && s.interrupted !== true;
  }).length;
}

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, hydrated } = usePatientSession();
  const { ready: consentUiReady, active: consentActive } = useConsentActive();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);
  const [currentLevelLabel, setCurrentLevelLabel] = useState('Nivel 1');
  const [todayCompletedSessions, setTodayCompletedSessions] = useState(0);
  const [patientSessions, setPatientSessions] = useState<SessionRecord[]>([]);

  const bottomPad = insets.bottom + wellnessFloatingTabBarInset;

  const loadProgress = useCallback(async () => {
    if (!patient) {
      setHasCompletedDiagnostic(false);
      setCurrentLevelLabel('Nivel 1');
      setTodayCompletedSessions(0);
      setPatientSessions([]);
      return;
    }
    const [exists, allSessions] = await Promise.all([
      hasDiagnostic(patient.paciente_id),
      readAllSessions(),
    ]);
    const mine = allSessions.filter((s) => s.patient_id === patient.paciente_id);
    setPatientSessions(mine);

    setHasCompletedDiagnostic(exists);
    if (exists) {
      const activeLevel = await getCurrentActiveLevel(patient.paciente_id);
      const daily = await updateDailyProgress(patient.paciente_id);
      setCurrentLevelLabel(activeLevel ? `Nivel ${activeLevel.level_id.split('-')[1]}` : 'Nivel 1');
      setTodayCompletedSessions(daily.completedToday);
    } else {
      setCurrentLevelLabel('Nivel 1');
      setTodayCompletedSessions(0);
    }
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const lastSession = useMemo(() => {
    if (patientSessions.length === 0) return null;
    return [...patientSessions].sort(compareSessionRecency)[0] ?? null;
  }, [patientSessions]);

  const hasAnySession = patientSessions.length > 0;

  const weeklyCompleted = useMemo(() => {
    if (patientSessions.length === 0) return 0;
    return countWeeklyCompleted(patientSessions, getLocalDateKey());
  }, [patientSessions]);

  const goStartTerapia = useCallback(() => {
    if (!consentUiReady) return;
    if (!consentActive) {
      Alert.alert(
        'Consentimiento',
        'Para iniciar terapia necesitas un consentimiento activo. Puedes revisar y aceptar los documentos ahora o desde Perfil.',
        [
          { text: 'Entendido', style: 'cancel' },
          { text: 'Revisar y aceptar', onPress: () => router.push(LEGAL_ACCEPT_HREF) },
        ],
      );
      return;
    }
    onLightImpact();
    router.push('/(tabs)/terapia');
  }, [consentActive, consentUiReady, router]);

  const goSensorConnection = useCallback(() => {
    if (consentUiReady && !consentActive) {
      Alert.alert(
        'Consentimiento',
        'Para usar la conexión del sensor necesitas un consentimiento activo. Puedes volver a aceptar los documentos desde Perfil.',
      );
      return;
    }
    onLightImpact();
    router.push('/sensor-connection');
  }, [consentActive, consentUiReady, router]);

  const goDiagnostico = useCallback(() => {
    onLightImpact();
    router.push('/diagnostico');
  }, [router]);

  if (!hydrated || !patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.mutedBody}>Cargando tu información…</Text>
          <Pressable
            style={styles.textLinkWrap}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <Text style={styles.textLink}>Ir al acceso</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = patient.nombre_completo.trim().split(/\s+/)[0] ?? patient.nombre_completo;
  const therapyCtaDisabled = !consentUiReady || !consentActive;
  const heroSubtitle = hasCompletedDiagnostic
    ? `${currentLevelLabel} · ${todayCompletedSessions} de 6 sesiones hoy`
    : `${currentLevelLabel} · evaluación opcional para afinar tu plan`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Hola, {firstName}</Text>
        <Text style={styles.tagline}>Tu resumen diario en RESPIRA+</Text>

        {consentUiReady && !consentActive ? (
          <View style={styles.consentCard} accessibilityRole="alert">
            <Text style={styles.consentTitle}>Consentimiento pendiente</Text>
            <Text style={styles.consentBody}>
              Sin consentimiento activo no podrás usar Terapia, Historial ni la conexión del sensor. Revisa los
              documentos y acepta cuando estés listo.
            </Text>
            <Pressable
              style={styles.consentBtn}
              onPress={() => router.push(LEGAL_ACCEPT_HREF)}
              accessibilityRole="button"
              accessibilityLabel="Revisar y aceptar documentos legales">
              <Text style={styles.consentBtnText}>Revisar y aceptar</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>Sesión recomendada</Text>
          <Text style={styles.heroTitle}>Terapia guiada</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
          {hasCompletedDiagnostic ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (todayCompletedSessions / 6) * 100)}%` },
                ]}
              />
            </View>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.primaryCta,
              therapyCtaDisabled && styles.primaryCtaDisabled,
              pressed && !therapyCtaDisabled && styles.primaryCtaPressed,
            ]}
            onPress={goStartTerapia}
            disabled={!consentUiReady}
            accessibilityRole="button"
            accessibilityLabel="Iniciar terapia"
            accessibilityState={{ disabled: therapyCtaDisabled || !consentUiReady }}>
            <Text style={styles.primaryCtaText}>
              {!consentUiReady ? 'Preparando…' : !consentActive ? 'Activa el consentimiento para continuar' : 'Iniciar terapia'}
            </Text>
          </Pressable>
        </View>

        {!hasAnySession ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aún no hay sesiones registradas</Text>
            <Text style={styles.emptyBody}>
              Cuando completes tu primera sesión verás aquí un resumen con cumplimiento y volumen. Empieza cuando te
              sientas preparado.
            </Text>
          </View>
        ) : null}

        {lastSession ? <HomeLastSessionCard session={lastSession} /> : null}

        {hasAnySession ? (
          <View style={styles.weekCard}>
            <Text style={styles.weekKicker}>Constancia</Text>
            <Text style={styles.weekTitle}>Últimos 7 días</Text>
            <Text style={styles.weekValue}>
              {weeklyCompleted === 0
                ? 'Sin sesiones completadas esta semana'
                : `${weeklyCompleted} sesión${weeklyCompleted === 1 ? '' : 'es'} completada${weeklyCompleted === 1 ? '' : 's'}`}
            </Text>
            <Text style={styles.weekHint}>El historial completo está en la pestaña Historial.</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.secondaryRow, pressed && styles.secondaryRowPressed]}
          onPress={goSensorConnection}
          accessibilityRole="button"
          accessibilityLabel="Conexión del sensor">
          <View style={styles.secondaryIcon}>
            <IconSymbol name="dot.radiowaves.left.and.right" size={22} color={ACCENT} />
          </View>
          <View style={styles.secondaryTextCol}>
            <Text style={styles.secondaryTitle}>Sensor</Text>
            <Text style={styles.secondarySubtitle}>Conexión y calibración antes de entrenar</Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color={wellness.textSecondary} />
        </Pressable>

        <Pressable style={styles.evalLink} onPress={goDiagnostico} accessibilityRole="button">
          <Text style={styles.evalLinkText}>
            {hasCompletedDiagnostic ? 'Repetir evaluación respiratoria (opcional)' : 'Evaluación respiratoria (opcional)'}
          </Text>
        </Pressable>

        <View style={styles.claveRow}>
          <Text style={styles.claveLabel}>Tu clave de acceso</Text>
          <Text style={styles.claveValue}>{patient.clave}</Text>
          <Text style={styles.claveHint}>Guárdala en un lugar seguro para volver a entrar.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F6' },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: spacing.lg,
  },
  consentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  consentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.sm,
  },
  consentBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: spacing.md,
  },
  consentBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  consentBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#6B7280',
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: '#E8EDEA',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  primaryCta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  primaryCtaDisabled: {
    opacity: 0.5,
  },
  primaryCtaPressed: {
    opacity: 0.92,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  weekKicker: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  weekValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  weekHint: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  secondaryRowPressed: {
    opacity: 0.92,
  },
  secondaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTextCol: { flex: 1 },
  secondaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  secondarySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  evalLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  evalLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
  },
  claveRow: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  claveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  claveValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  claveHint: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  mutedBody: { fontSize: 16, color: '#6B7280', marginBottom: spacing.md },
  textLinkWrap: { padding: spacing.md },
  textLink: { fontSize: 16, fontWeight: '700', color: authPalette.link, textDecorationLine: 'underline' },
});
