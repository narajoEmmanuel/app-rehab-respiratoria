/**
 * Purpose: Patient home — dashboard with primary therapy CTA, session snapshot, and essentials.
 * Module: home
 * Dependencies: expo-router, patient session, consent, session storage, diagnostics
 * Notes: Redundant shortcuts (niveles, calendario, logout) live in other areas of the app.
 */

import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import {
  evaluateDiagnosticSensorReadinessOnDemand,
  showDiagnosticPlayModePicker,
  showDiagnosticSensorReadyConfirmation,
  showTherapyReadinessAlert,
} from '@/src/modules/device/volume-estimation';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { useCalibrationSnapshot } from '@/src/modules/device/state/use-calibration-snapshot';
import { getCurrentActiveLevel, hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { HomeLastSessionCard } from '@/src/modules/home/components/HomeLastSessionCard';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { useConsentActive } from '@/src/modules/legal/use-consent-active';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { updateDailyProgress } from '@/src/modules/session/session-progress-service';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { dashboardScreen, dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
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
  const { snapshot: calibrationSnapshot } = useCalibrationSnapshot();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);
  const [currentLevelLabel, setCurrentLevelLabel] = useState('Nivel 1');
  const [todayCompletedSessions, setTodayCompletedSessions] = useState(0);
  const [patientSessions, setPatientSessions] = useState<SessionRecord[]>([]);

  const bottomPad = dashboardScrollBottomPadding(insets.bottom);

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

  useEffect(() => {
    void loadProgress();
  }, [patient?.paciente_id, patient?.clave, loadProgress]);

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
    if (!hasCompletedDiagnostic) {
      Alert.alert(
        'Evaluación inicial pendiente',
        'Completa tu evaluación inicial para personalizar tu terapia.',
      );
      return;
    }
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
  }, [consentActive, consentUiReady, hasCompletedDiagnostic, router]);

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

  const { status: sensorStatus, mode: sensorMode } = useSensorConnection();
  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || sensorMode === 'mock';

  const diagnosticPatientId = patient?.paciente_id ?? null;
  const goDiagnostico = useCallback(() => {
    onLightImpact();
    showDiagnosticPlayModePicker({
      onWithSensor: () => {
        void (async () => {
          const gate = await evaluateDiagnosticSensorReadinessOnDemand({
            sensorConnected,
            patientId: diagnosticPatientId,
          });
          if (!gate.canStartDiagnostic) {
            showTherapyReadinessAlert(gate, (route) => router.push(route), {
              onPracticeWithoutSensor: () => {
                router.push({ pathname: '/diagnostico', params: { inputMode: 'touch_practice' } });
              },
              practiceButtonLabel: 'Modo práctica',
            });
            return;
          }
          showDiagnosticSensorReadyConfirmation({
            gate,
            isRepeat: hasCompletedDiagnostic,
            onConfirm: () => {
              router.push({ pathname: '/diagnostico', params: { inputMode: 'sensor' } });
            },
          });
        })();
      },
      onPracticeMode: () => {
        router.push({ pathname: '/diagnostico', params: { inputMode: 'touch_practice' } });
      },
    });
  }, [diagnosticPatientId, hasCompletedDiagnostic, router, sensorConnected]);

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

  const displayName = normalizePatientDisplayName(patient.nombre_completo);
  const firstName = displayName.trim().split(/\s+/)[0] ?? displayName;
  const therapyCtaDisabled =
    !hasCompletedDiagnostic || !consentUiReady || !consentActive;
  const heroSubtitle = hasCompletedDiagnostic
    ? `${currentLevelLabel} · ${todayCompletedSessions} de 6 sesiones hoy`
    : `${currentLevelLabel}`;

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

        {!hasCompletedDiagnostic ? (
          <>
            <View style={styles.diagnosticHeroCard}>
              <Text style={styles.diagnosticHeroKicker}>Evaluación inicial</Text>
              <Text style={styles.diagnosticHeroTitle}>Evaluación inicial</Text>
              <Text style={styles.diagnosticHeroBody}>
                Mide tu volumen de referencia para personalizar tus metas de terapia.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.diagnosticHeroBtn, pressed && styles.diagnosticHeroBtnPressed]}
                onPress={goDiagnostico}
                accessibilityRole="button"
                accessibilityLabel="Iniciar evaluación">
                <Text style={styles.diagnosticHeroBtnText}>Iniciar evaluación</Text>
              </Pressable>
            </View>

            <View style={[styles.heroCard, styles.heroCardBlocked]}>
              <Text style={styles.heroKicker}>Sesión recomendada</Text>
              <Text style={styles.heroTitle}>Terapia guiada</Text>
              <Text style={styles.heroSubtitleBlocked}>
                Completa tu evaluación inicial para personalizar tu terapia.
              </Text>
              <Pressable
                style={[styles.primaryCta, styles.primaryCtaBlocked]}
                disabled
                accessibilityRole="button"
                accessibilityLabel="Terapia bloqueada hasta completar evaluación inicial"
                accessibilityState={{ disabled: true }}>
                <Text style={styles.primaryCtaTextMuted}>Iniciar terapia</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>Sesión recomendada</Text>
            <Text style={styles.heroTitle}>Terapia guiada</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (todayCompletedSessions / 6) * 100)}%` },
                ]}
              />
            </View>
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
                {!consentUiReady
                  ? 'Preparando…'
                  : !consentActive
                    ? 'Activa el consentimiento para continuar'
                    : 'Iniciar terapia'}
              </Text>
            </Pressable>
          </View>
        )}

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

        <DeviceCard
          calibrationSnapshot={calibrationSnapshot}
          onPress={goSensorConnection}
        />

        {hasCompletedDiagnostic ? (
          <Pressable style={styles.evalLink} onPress={goDiagnostico} accessibilityRole="button">
            <Text style={styles.evalLinkText}>Repetir evaluación</Text>
          </Pressable>
        ) : null}

        <View style={styles.claveRow}>
          <Text style={styles.claveLabel}>Tu clave de acceso</Text>
          <Text style={styles.claveValue}>{patient.clave}</Text>
          <Text style={styles.claveHint}>Guárdala en un lugar seguro para volver a entrar.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type CalibrationSnapshot = ReturnType<typeof useCalibrationSnapshot>['snapshot'];

function formatShortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function describeDeviceState(snapshot: CalibrationSnapshot): {
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  variant: 'ready' | 'pending' | 'warn' | 'loading';
} {
  if (snapshot.kind === 'loading') {
    return {
      badge: 'Cargando',
      title: 'Dispositivo RESPIRA+',
      subtitle: 'Revisando estado del sensor…',
      ctaLabel: 'Preparar dispositivo',
      variant: 'loading',
    };
  }
  if (snapshot.kind === 'ready') {
    const { profile } = snapshot;
    return {
      badge: 'Calibración guardada',
      title: 'Dispositivo RESPIRA+',
      subtitle: `${profile.points.length} ${profile.points.length === 1 ? 'punto' : 'puntos'} · ${formatShortDate(profile.updatedAt)}`,
      ctaLabel: 'Revisar dispositivo',
      variant: 'ready',
    };
  }
  if (snapshot.kind === 'corrupt') {
    return {
      badge: 'Revisar dispositivo',
      title: 'Dispositivo RESPIRA+',
      subtitle: 'La calibración guardada no se pudo leer.',
      ctaLabel: 'Revisar dispositivo',
      variant: 'warn',
    };
  }
  return {
    badge: 'Sin preparar',
    title: 'Dispositivo RESPIRA+',
    subtitle: 'Conecta y calibra para usar lectura confiable.',
    ctaLabel: 'Preparar dispositivo',
    variant: 'pending',
  };
}

function DeviceCard({
  calibrationSnapshot,
  onPress,
}: {
  calibrationSnapshot: CalibrationSnapshot;
  onPress: () => void;
}) {
  const state = describeDeviceState(calibrationSnapshot);
  const isReady = state.variant === 'ready';
  const isWarn = state.variant === 'warn';
  return (
    <Pressable
      style={({ pressed }) => [styles.deviceCard, pressed && styles.deviceCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${state.title}. ${state.badge}. ${state.subtitle}`}>
      <View style={styles.deviceTopRow}>
        <View style={styles.deviceIconWrap}>
          <View style={styles.deviceIcon}>
            <IconSymbol name="dot.radiowaves.left.and.right" size={34} color={ACCENT} />
          </View>
        </View>
        <View style={styles.deviceContent}>
          <View
            style={[
              styles.deviceBadge,
              isReady ? styles.deviceBadgeReady : isWarn ? styles.deviceBadgeWarn : styles.deviceBadgePending,
            ]}>
            <Text
              style={[
                styles.deviceBadgeText,
                isReady
                  ? styles.deviceBadgeTextReady
                  : isWarn
                    ? styles.deviceBadgeTextWarn
                    : styles.deviceBadgeTextPending,
              ]}>
              {state.badge}
            </Text>
          </View>
          <Text style={styles.deviceTitle}>{state.title}</Text>
          <Text style={styles.deviceSubtitle}>{state.subtitle}</Text>
          <View style={styles.deviceCtaRow}>
            <Text style={styles.deviceCtaLabel}>{state.ctaLabel}</Text>
            <IconSymbol name="chevron.right" size={18} color={ACCENT} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dashboardScreen.screenBg },
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
  diagnosticHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.45)',
    padding: spacing.lg + 4,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  diagnosticHeroKicker: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  diagnosticHeroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
  },
  diagnosticHeroBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  diagnosticHeroBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  diagnosticHeroBtnPressed: {
    opacity: 0.92,
  },
  diagnosticHeroBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroCardBlocked: {
    borderStyle: 'dashed',
    opacity: 0.92,
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
  heroSubtitleBlocked: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9CA3AF',
    marginBottom: spacing.md,
    fontWeight: '600',
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
  primaryCtaBlocked: {
    backgroundColor: '#D1D5DB',
    opacity: 1,
  },
  primaryCtaPressed: {
    opacity: 0.92,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  primaryCtaTextMuted: {
    color: '#6B7280',
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
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  deviceCardPressed: { opacity: 0.94 },
  deviceTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  deviceIconWrap: {
    justifyContent: 'center',
  },
  deviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 171, 165, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceContent: { flex: 1 },
  deviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  deviceBadgeReady: { backgroundColor: 'rgba(52, 171, 165, 0.12)', borderColor: 'rgba(52, 171, 165, 0.32)' },
  deviceBadgePending: { backgroundColor: '#F4F6F5', borderColor: '#E5E7EB' },
  deviceBadgeWarn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  deviceBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  deviceBadgeTextReady: { color: '#1F7A75' },
  deviceBadgeTextPending: { color: '#6B7280' },
  deviceBadgeTextWarn: { color: '#B91C1C' },
  deviceTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 8 },
  deviceSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  deviceCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  deviceCtaLabel: { fontSize: 15, fontWeight: '700', color: ACCENT },
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
