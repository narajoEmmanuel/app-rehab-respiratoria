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
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import {
  showTherapyReadinessAlert,
  useTherapyReadinessGate,
} from '@/src/modules/device/volume-estimation';
import { navigateToInitialEvaluation } from '@/src/modules/diagnostics/navigate-to-initial-evaluation';
import { isTechnicalCalibrationEnabled } from '@/src/modules/app-mode';
import {
  PATIENT_MEASUREMENT_LOAD_ERROR,
  patientMeasurementStatusLabel,
  resolvePatientMeasurementPhase,
} from '@/src/modules/device/calibration/patient-measurement-copy';
import { formatCalibrationCardSubtitle } from '@/src/modules/device/calibration/calibration-display-utils';
import { isRealSensorTransportConnected } from '@/src/modules/device/sensor-real-connection';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import { useCalibrationSnapshot } from '@/src/modules/device/state/use-calibration-snapshot';
import { getCurrentActiveLevel, hasDiagnostic, getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import { HomeLastSessionCard } from '@/src/modules/home/components/HomeLastSessionCard';
import { RespiraWelcomeOnboarding } from '@/src/modules/onboarding/components/RespiraWelcomeOnboarding';
import {
  hasSeenWelcomeOnboarding,
  markWelcomeOnboardingSeen,
} from '@/src/modules/onboarding/storage/onboarding-storage';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { useConsentActive } from '@/src/modules/legal/use-consent-active';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import { getLevelDisplayMeta } from '@/src/modules/session/levels/level-difficulty-config';
import { getLevelById } from '@/src/modules/session/registry/level-registry';
import { logLevelSensorModeSelected } from '@/src/modules/session/sensor/level-sensor-debug';
import { evaluateLevelSensorReadiness } from '@/src/modules/session/sensor/level-sensor-readiness';
import { resolveTherapySessionLaunchInputMode } from '@/src/modules/session/hooks/resolve-therapy-session-launch';
import { useTouchPracticeGate } from '@/src/modules/session/hooks/use-touch-practice-gate';
import { useTouchPracticePreference } from '@/src/modules/session/hooks/use-touch-practice-preference';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { updateDailyProgress } from '@/src/modules/session/session-progress-service';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { isLevelEntryLockedForUi } from '@/src/config/dev-level-flags';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppText } from '@/src/shared/ui/AppText';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { IconSymbol, type IconSymbolName } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { appScreenBackground, wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

const ACCENT = wellnessColors.primary;
const HOME_SENSOR_CONNECT_COPY = 'Conecta el sensor para medir tu volumen estimado.';
const HOME_SENSOR_REVIEW_COPY = 'Revisa la conexión del sensor antes de iniciar.';

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
  const { selectLevel } = useLevelsProgress();
  const {
    refresh: refreshTherapyGate,
    lastReading,
    sensorConnected: therapyGateSensorConnected,
    sensorStatus: therapyGateSensorStatus,
  } = useTherapyReadinessGate();
  const { lastDataReceivedAt, sensorStreamState, status: sensorStatus, mode: sensorMode } =
    useSensorConnection();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);
  const [currentLevelLabel, setCurrentLevelLabel] = useState('Nivel 1');
  const [currentLevelHumanName, setCurrentLevelHumanName] = useState('');
  const [activeLevelId, setActiveLevelId] = useState<LevelId | null>(null);
  const [todayCompletedSessions, setTodayCompletedSessions] = useState(0);
  const [patientSessions, setPatientSessions] = useState<SessionRecord[]>([]);
  const [, setLatestDiag] = useState<DiagnosticRecord | null>(null);
  const [startingLevel, setStartingLevel] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeCheckedPatientId, setWelcomeCheckedPatientId] = useState<number | null>(null);
  const bottomPad = dashboardScrollBottomPadding(insets.bottom);
  const { reload: reloadTouchPracticePreference } = useTouchPracticePreference();

  const loadProgress = useCallback(async () => {
    if (!patient) {
      setHasCompletedDiagnostic(false);
      setCurrentLevelLabel('Nivel 1');
      setCurrentLevelHumanName('');
      setActiveLevelId(null);
      setTodayCompletedSessions(0);
      setPatientSessions([]);
      setLatestDiag(null);
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
      const levelId = activeLevel?.level_id ?? 'level-1';
      setActiveLevelId(levelId as LevelId);
      setCurrentLevelLabel(`Nivel ${levelId.split('-')[1]}`);
      setCurrentLevelHumanName(getLevelDisplayMeta(levelId).humanName);
      setTodayCompletedSessions(daily.completedToday);
      const diag = await getLatestDiagnostic(patient.paciente_id);
      setLatestDiag(diag);
    } else {
      setCurrentLevelLabel('Nivel 1');
      setCurrentLevelHumanName('');
      setActiveLevelId(null);
      setTodayCompletedSessions(0);
      setLatestDiag(null);
    }
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
      void refreshTherapyGate();
      void reloadTouchPracticePreference();
    }, [loadProgress, refreshTherapyGate, reloadTouchPracticePreference]),
  );

  useEffect(() => {
    void loadProgress();
  }, [patient?.paciente_id, patient?.clave, loadProgress]);

  useEffect(() => {
    const patientId = patient?.paciente_id;
    if (!hydrated || patientId == null || !Number.isFinite(patientId)) {
      setWelcomeVisible(false);
      setWelcomeCheckedPatientId(null);
      return;
    }
    if (welcomeCheckedPatientId === patientId) {
      return;
    }

    let cancelled = false;
    setWelcomeVisible(false);
    void (async () => {
      try {
        const seen = await hasSeenWelcomeOnboarding(patientId);
        if (cancelled) return;
        setWelcomeCheckedPatientId(patientId);
        setWelcomeVisible(!seen);
      } catch (error) {
        console.warn('[HomeScreen] hasSeenWelcomeOnboarding failed', error);
        if (!cancelled) {
          setWelcomeCheckedPatientId(patientId);
          setWelcomeVisible(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, patient?.paciente_id, welcomeCheckedPatientId]);

  const handleWelcomeContinue = useCallback(() => {
    const patientId = patient?.paciente_id;
    if (patientId == null || !Number.isFinite(patientId)) {
      setWelcomeVisible(false);
      return;
    }
    void (async () => {
      try {
        await markWelcomeOnboardingSeen(patientId);
      } catch (error) {
        console.warn('[HomeScreen] markWelcomeOnboardingSeen failed', error);
      } finally {
        setWelcomeVisible(false);
      }
    })();
  }, [patient?.paciente_id]);

  const lastSession = useMemo(() => {
    if (patientSessions.length === 0) return null;
    return [...patientSessions].sort(compareSessionRecency)[0] ?? null;
  }, [patientSessions]);

  const hasAnySession = patientSessions.length > 0;

  const weeklyCompleted = useMemo(() => {
    if (patientSessions.length === 0) return 0;
    return countWeeklyCompleted(patientSessions, getLocalDateKey());
  }, [patientSessions]);

  const navigateToSession = useCallback(
    (levelId: LevelId, inputMode: SessionInputMode) => {
      selectLevel(levelId);
      router.push({
        pathname: '/(tabs)/sesion',
        params: {
          levelId,
          sessionRunId: `${levelId}-${Date.now()}`,
          inputMode,
        },
      });
    },
    [router, selectLevel],
  );

  const sensorTransportConnected = isRealSensorTransportConnected(sensorStatus, sensorMode);
  const { effectiveTouchPracticeEnabled } = useTouchPracticeGate({
    sensorConnected: sensorTransportConnected,
  });
  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || sensorMode === 'mock';

  const beginOfficialSensorSession = useCallback(
    async (levelId: LevelId) => {
      setStartingLevel(true);
      try {
        const readiness = await evaluateLevelSensorReadiness({
          inputMode: 'sensor',
          sensorConnected: therapyGateSensorConnected,
          sensorStatus: therapyGateSensorStatus,
          lastReading,
          receivedAtMs: lastDataReceivedAt,
          sensorStreamState,
          patientId: patient?.paciente_id ?? null,
        });

        if (!readiness.canStart) {
          if (readiness.blockReason === 'no_live_reading') {
            Alert.alert(
              'Esperando datos del sensor',
              'Conecta el sensor y verifica que esté enviando lecturas antes de comenzar.',
              [{ text: 'Entendido', style: 'default' }],
            );
            return;
          }
          showTherapyReadinessAlert(readiness.gate, (route) => router.push(route));
          return;
        }

        navigateToSession(levelId, 'sensor');
      } finally {
        setStartingLevel(false);
      }
    },
    [
      lastReading,
      lastDataReceivedAt,
      navigateToSession,
      patient?.paciente_id,
      router,
      sensorStreamState,
      therapyGateSensorConnected,
      therapyGateSensorStatus,
    ],
  );

  const goStartRecommendedLevel = useCallback(() => {
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
    if (!activeLevelId || startingLevel) {
      onLightImpact();
      router.push('/(tabs)/terapia');
      return;
    }
    const levelDef = getLevelById(activeLevelId);
    if (isLevelEntryLockedForUi(false, levelDef?.comingSoon)) {
      onLightImpact();
      router.push('/(tabs)/terapia');
      return;
    }
    onLightImpact();

    const launchMode = resolveTherapySessionLaunchInputMode({
      sensorTransportConnected,
      effectiveTouchPracticeEnabled,
    });
    logLevelSensorModeSelected(launchMode);
    if (launchMode === 'touch_practice') {
      navigateToSession(activeLevelId, 'touch_practice');
      return;
    }
    void beginOfficialSensorSession(activeLevelId);
  }, [
    activeLevelId,
    beginOfficialSensorSession,
    consentActive,
    consentUiReady,
    effectiveTouchPracticeEnabled,
    hasCompletedDiagnostic,
    navigateToSession,
    router,
    sensorTransportConnected,
    startingLevel,
  ]);

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

  const sensorStreamReceiving =
    sensorMode === 'mock' ? sensorConnected : isSensorStreamActivelyReceiving(sensorStreamState);
  const sensorSignalLive =
    sensorStreamReceiving &&
    Boolean(lastReading) &&
    lastReading?.distanceValid === true &&
    typeof lastReading?.distanceMm === 'number' &&
    Number.isFinite(lastReading.distanceMm);

  const goInitialEvaluation = useCallback(() => {
    onLightImpact();
    navigateToInitialEvaluation(router);
  }, [router]);

  if (!hydrated || !patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <AppText variant="bodyLarge" style={styles.mutedBody}>
            Cargando tu información…
          </AppText>
          <Pressable
            style={styles.textLinkWrap}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <AppText variant="link" style={styles.textLink}>
              Ir al acceso
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = normalizePatientDisplayName(patient.nombre_completo);
  const firstName = displayName.trim().split(/\s+/)[0] ?? displayName;
  const therapyCtaDisabled =
    !hasCompletedDiagnostic || !consentUiReady || !consentActive;
  const dailyGoalMet = hasCompletedDiagnostic && todayCompletedSessions >= 6;
  const levelDisplayName = currentLevelHumanName || currentLevelLabel;
  const homeLayoutState = !hasCompletedDiagnostic
    ? 'pre_eval'
    : !hasAnySession
      ? 'eval_no_sessions'
      : 'has_sessions';

  const sensorCard = (
    <DeviceCard
      calibrationSnapshot={calibrationSnapshot}
      sensorConnected={sensorConnected}
      sensorSignalLive={sensorSignalLive}
      onPress={goSensorConnection}
      homePresentation
    />
  );

  const quickAccessSection = (
    <>
      <SectionHeader title="Accesos rápidos" />
      <HomeQuickAccessGrid
        onTherapy={() => {
          onLightImpact();
          router.push('/(tabs)/terapia');
        }}
        onHistory={() => {
          onLightImpact();
          router.push('/(tabs)/historial');
        }}
        onSensor={goSensorConnection}
        onProfile={() => {
          onLightImpact();
          router.push('/profile');
        }}
      />
    </>
  );

  const footerSection = (
    <>
      {consentUiReady && !consentActive ? (
        <View style={styles.consentCard} accessibilityRole="alert">
          <AppText variant="titleSmall" style={styles.consentTitle}>
            Consentimiento pendiente
          </AppText>
          <AppText variant="bodyMedium" style={styles.consentBody}>
            Revisa y acepta los documentos para continuar con la terapia.
          </AppText>
          <Pressable
            style={styles.consentBtn}
            onPress={() => router.push(LEGAL_ACCEPT_HREF)}
            accessibilityRole="button"
            accessibilityLabel="Revisar documentos legales">
            <AppText variant="button" style={styles.consentBtnText}>
              Revisar documentos
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <AppCard
        pressable
        onPress={() => {
          onLightImpact();
          router.push('/data-export');
        }}
        style={styles.exportCardProminent}>
        <View style={styles.exportCardTopRow}>
          <View style={styles.exportCardIconWrap}>
            <IconSymbol name="doc.text.fill" size={22} color={ACCENT} />
          </View>
          <View style={styles.exportCardTextCol}>
            <AppText variant="label" style={styles.exportCardKicker}>
              Seguimiento clínico
            </AppText>
            <AppText variant="titleSmall" style={styles.exportCardTitle}>
              Resumen para tu profesional
            </AppText>
            <AppText variant="bodySmall" style={styles.exportCardBody}>
              Exporta tus sesiones y progreso para compartirlos.
            </AppText>
          </View>
        </View>
        <View style={styles.exportCardCtaRow}>
          <AppText variant="statusValue" style={styles.exportCardCtaText}>
            Exportar resumen
          </AppText>
        </View>
      </AppCard>

      <View style={styles.claveRow}>
        <AppText variant="label" style={styles.claveLabel}>
          Tu clave de acceso
        </AppText>
        <AppText variant="titleSmall" style={styles.claveValue}>
          {patient.clave}
        </AppText>
        <AppText variant="caption" style={styles.claveHint}>
          Guárdala para volver a entrar.
        </AppText>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}>
        <AppText variant="titleLarge" style={styles.greeting}>
          Hola, {firstName}
        </AppText>
        <AppText variant="bodyLarge" style={styles.tagline}>
          Tu resumen diario en RESPIRA+
        </AppText>

        {!hasCompletedDiagnostic ? (
          <AppCard variant="highlight" style={styles.primaryActionCard}>
            <AppText variant="titleLarge" style={styles.primaryActionTitle}>
              Conoce tu volumen de referencia
            </AppText>
            <AppText variant="bodyMedium" style={styles.primaryActionBody}>
              Realiza tu evaluación inicial para personalizar tus niveles.
            </AppText>
            <AppButton title="Comenzar evaluación" onPress={goInitialEvaluation} />
          </AppCard>
        ) : dailyGoalMet ? (
          <AppCard variant="highlight" style={styles.primaryActionCard}>
            <AppText variant="titleLarge" style={styles.primaryActionTitle}>
              Meta diaria completada
            </AppText>
            <AppText variant="bodyMedium" style={styles.primaryActionBody}>
              Revisa tu progreso en Historial.
            </AppText>
            <AppButton
              title="Ver historial"
              onPress={() => {
                onLightImpact();
                router.push('/(tabs)/historial');
              }}
            />
          </AppCard>
        ) : (
          <AppCard variant="highlight" style={styles.primaryActionCard}>
            <AppText variant="titleLarge" style={styles.primaryActionTitle}>
              Continúa tu terapia guiada
            </AppText>
            <AppText variant="bodyMedium" style={styles.primaryActionBody}>
              Nivel sugerido: {levelDisplayName}
            </AppText>
            <AppButton
              title={
                !consentUiReady
                  ? 'Preparando…'
                  : !consentActive
                    ? 'Activa el consentimiento para continuar'
                    : 'Empezar nivel sugerido'
              }
              onPress={goStartRecommendedLevel}
              disabled={therapyCtaDisabled}
            />
          </AppCard>
        )}

        {homeLayoutState === 'pre_eval' ? (
          <>
            {sensorCard}
            {quickAccessSection}
          </>
        ) : null}

        {homeLayoutState === 'eval_no_sessions' ? (
          <>
            {sensorCard}
            <SectionHeader title="Progreso de hoy" />
            <AppCard variant="soft" style={styles.progressCardSpacing}>
              <AppText variant="titleSmall" style={styles.emptyTitle}>
                Sin sesiones completadas hoy
              </AppText>
              <AppText variant="bodyMedium" style={styles.emptyBody}>
                Completa tu primera sesión para ver tu progreso.
              </AppText>
            </AppCard>
            {quickAccessSection}
          </>
        ) : null}

        {homeLayoutState === 'has_sessions' ? (
          <>
            <SectionHeader title="Progreso de hoy" />
            <AppCard style={styles.progressCardSpacing}>
              <View style={styles.weekMetricsRow}>
                <MetricTile
                  label="Hoy"
                  value={`${todayCompletedSessions}/6`}
                  helper="meta diaria"
                />
                <MetricTile
                  label="Esta semana"
                  value={weeklyCompleted === 0 ? '0' : String(weeklyCompleted)}
                  helper={`sesión${weeklyCompleted === 1 ? '' : 'es'} completada${weeklyCompleted === 1 ? '' : 's'}`}
                />
              </View>
              <View style={styles.progressTrackNoMargin}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (todayCompletedSessions / 6) * 100)}%` },
                  ]}
                />
              </View>
            </AppCard>
            {sensorCard}
            {lastSession ? <HomeLastSessionCard session={lastSession} /> : null}
            {quickAccessSection}
          </>
        ) : null}

        {footerSection}
      </ScrollView>
      <RespiraWelcomeOnboarding visible={welcomeVisible} onContinue={handleWelcomeContinue} />
    </SafeAreaView>
  );
}

type CalibrationSnapshot = ReturnType<typeof useCalibrationSnapshot>['snapshot'];

type QuickAccessItem = {
  label: string;
  icon: IconSymbolName;
  onPress: () => void;
};

function HomeQuickAccessGrid({
  onTherapy,
  onHistory,
  onSensor,
  onProfile,
}: {
  onTherapy: () => void;
  onHistory: () => void;
  onSensor: () => void;
  onProfile: () => void;
}) {
  const items: QuickAccessItem[] = [
    { label: 'Terapia', icon: 'waveform.path.ecg', onPress: onTherapy },
    { label: 'Historial', icon: 'clock.fill', onPress: onHistory },
    { label: 'Sensor', icon: 'dot.radiowaves.left.and.right', onPress: onSensor },
    { label: 'Perfil', icon: 'person.crop.circle', onPress: onProfile },
  ];

  return (
    <View style={styles.quickAccessGrid}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={({ pressed }) => [styles.quickAccessTile, pressed && styles.quickAccessTilePressed]}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}>
          <View style={styles.quickAccessIconWrap}>
            <IconSymbol name={item.icon} size={18} color={ACCENT} />
          </View>
          <AppText variant="chip" style={styles.quickAccessLabel}>
            {item.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function describeDeviceState(
  snapshot: CalibrationSnapshot,
  technicalCalibrationEnabled: boolean,
  sensorConnected: boolean,
  sensorSignalLive: boolean,
): {
  badge: string | null;
  showBadge: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
  variant: 'ready' | 'pending' | 'warn' | 'loading';
} {
  const therapyReady =
    snapshot.kind !== 'loading' && snapshot.therapy.isReadyForTherapy;
  const therapyStatus = snapshot.kind === 'loading' ? 'pending' : snapshot.therapy.status;

  const phase = resolvePatientMeasurementPhase({
    technicalMode: technicalCalibrationEnabled,
    snapshotLoading: snapshot.kind === 'loading',
    snapshotCorrupt: snapshot.kind === 'corrupt',
    therapyReady,
    therapyStatus,
    sensorConnected,
    signalLive: sensorSignalLive,
  });

  const badge = patientMeasurementStatusLabel(phase, technicalCalibrationEnabled);

  if (snapshot.kind === 'loading') {
    return {
      badge: technicalCalibrationEnabled ? null : badge,
      showBadge: !technicalCalibrationEnabled,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? 'Revisando el estado del sensor…'
        : 'Verificando medición…',
      ctaLabel: 'Revisar sensor',
      variant: 'loading',
    };
  }

  if (snapshot.kind === 'ready' && therapyReady) {
    const { profile } = snapshot;
    const readyBadge = technicalCalibrationEnabled
      ? 'Calibración verificada'
      : sensorSignalLive
        ? 'Sensor listo para medir'
        : 'Calibración activa';
    return {
      badge: readyBadge,
      showBadge: true,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? formatCalibrationCardSubtitle(profile, snapshot.therapy.activeModel)
        : sensorSignalLive
          ? `${snapshot.therapy.spirometerLabel ?? profile.name} · volumen estimado en vivo`
          : HOME_SENSOR_CONNECT_COPY,
      ctaLabel: 'Revisar sensor',
      variant: 'ready',
    };
  }

  if (snapshot.kind === 'corrupt') {
    return {
      badge: technicalCalibrationEnabled ? 'Revisar calibración' : badge,
      showBadge: true,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? 'La calibración guardada no se pudo leer.'
        : PATIENT_MEASUREMENT_LOAD_ERROR,
      ctaLabel: 'Revisar sensor',
      variant: 'warn',
    };
  }

  if (snapshot.kind === 'ready' || snapshot.kind === 'none') {
    return {
      badge,
      showBadge: true,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? (snapshot.therapy.detailMessage ?? 'Completa la calibración verificada del espirómetro.')
        : sensorConnected
          ? 'Verificando medición…'
          : HOME_SENSOR_CONNECT_COPY,
      ctaLabel: technicalCalibrationEnabled ? 'Configurar espirómetro' : 'Conectar sensor',
      variant: 'pending',
    };
  }

  return {
    badge: null,
    showBadge: false,
    title: 'Dispositivo RESPIRA+',
    subtitle: technicalCalibrationEnabled
      ? 'Conecta el sensor y verifica la calibración del espirómetro.'
      : HOME_SENSOR_CONNECT_COPY,
    variant: 'pending',
    ctaLabel: technicalCalibrationEnabled ? 'Configurar sensor' : 'Conectar sensor',
  };
}

function applyHomeDevicePresentation(
  state: ReturnType<typeof describeDeviceState>,
  sensorConnected: boolean,
  technicalCalibrationEnabled: boolean,
): ReturnType<typeof describeDeviceState> {
  if (technicalCalibrationEnabled) {
    return { ...state, showBadge: false };
  }

  let subtitle = state.subtitle;
  if (state.variant === 'loading') {
    subtitle = 'Verificando medición…';
  } else if (state.variant === 'warn') {
    subtitle = state.subtitle;
  } else {
    subtitle = sensorConnected ? HOME_SENSOR_REVIEW_COPY : HOME_SENSOR_CONNECT_COPY;
  }

  return {
    ...state,
    showBadge: false,
    subtitle,
    ctaLabel: 'Revisar sensor',
  };
}

function DeviceCard({
  calibrationSnapshot,
  sensorConnected,
  sensorSignalLive,
  onPress,
  homePresentation = false,
}: {
  calibrationSnapshot: CalibrationSnapshot;
  sensorConnected: boolean;
  sensorSignalLive: boolean;
  onPress: () => void;
  homePresentation?: boolean;
}) {
  const technicalCalibrationEnabled = isTechnicalCalibrationEnabled();
  const baseState = describeDeviceState(
    calibrationSnapshot,
    technicalCalibrationEnabled,
    sensorConnected,
    sensorSignalLive,
  );
  const state = homePresentation
    ? applyHomeDevicePresentation(baseState, sensorConnected, technicalCalibrationEnabled)
    : baseState;
  const isReady = state.variant === 'ready';
  const isWarn = state.variant === 'warn';
  return (
    <Pressable
      style={({ pressed }) => [styles.deviceCard, pressed && styles.deviceCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${state.title}. ${state.showBadge && state.badge ? state.badge : ''} ${state.subtitle}`}>
      <View style={styles.deviceTopRow}>
        <View style={styles.deviceIconWrap}>
          <View style={styles.deviceIcon}>
            <IconSymbol name="dot.radiowaves.left.and.right" size={34} color={ACCENT} />
          </View>
        </View>
        <View style={styles.deviceContent}>
          {state.showBadge && state.badge ? (
            <View
              style={[
                styles.deviceBadge,
                isReady ? styles.deviceBadgeReady : isWarn ? styles.deviceBadgeWarn : styles.deviceBadgePending,
              ]}>
              <AppText
                variant="caption"
                style={[
                  styles.deviceBadgeText,
                  isReady
                    ? styles.deviceBadgeTextReady
                    : isWarn
                      ? styles.deviceBadgeTextWarn
                      : styles.deviceBadgeTextPending,
                ]}>
                {state.badge}
              </AppText>
            </View>
          ) : null}
          <AppText variant="titleMedium" style={[styles.deviceTitle, styles.deviceTitleNoBadge]}>
            {state.title}
          </AppText>
          <AppText variant="bodySmall" style={styles.deviceSubtitle}>
            {state.subtitle}
          </AppText>
          <View style={styles.deviceCtaRow}>
            <AppText variant="statusValue" style={styles.deviceCtaLabel}>
              {state.ctaLabel}
            </AppText>
            <IconSymbol name="chevron.right" size={18} color={ACCENT} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: appScreenBackground },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  greeting: {
    color: wellnessColors.textPrimary,
    marginBottom: 2,
  },
  tagline: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  primaryActionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryActionTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: wellnessColors.textPrimary,
  },
  primaryActionBody: {
    color: wellnessColors.textSecondary,
  },
  progressCardSpacing: {
    marginBottom: spacing.sm,
  },
  secondaryCardSpacing: {
    marginBottom: spacing.sm,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAccessTile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: wellnessColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
    ...wellnessShadows.soft,
  },
  quickAccessTilePressed: {
    opacity: 0.92,
  },
  quickAccessIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessLabel: {
    color: wellnessColors.textPrimary,
  },
  consentCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  consentTitle: {
    fontSize: 17,
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  consentBody: {
    color: wellnessColors.textSecondary,
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
  },
  progressTrackNoMargin: {
    height: 6,
    borderRadius: 4,
    backgroundColor: wellnessColors.neutralSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  emptyTitle: {
    fontSize: 17,
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    color: wellnessColors.textSecondary,
  },
  weekMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  deviceCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...wellnessShadows.soft,
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
    backgroundColor: wellnessColors.primarySoft,
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
  deviceBadgeReady: { backgroundColor: wellnessColors.primarySoft, borderColor: 'rgba(52, 171, 165, 0.32)' },
  deviceBadgePending: { backgroundColor: wellnessColors.neutralSoft, borderColor: wellnessColors.border },
  deviceBadgeWarn: { backgroundColor: wellnessColors.dangerSoft, borderColor: '#FECACA' },
  deviceBadgeText: { fontWeight: '700', letterSpacing: 0.2 },
  deviceBadgeTextReady: { color: wellnessColors.primaryDark },
  deviceBadgeTextPending: { color: wellnessColors.textSecondary },
  deviceBadgeTextWarn: { color: wellnessColors.danger },
  deviceTitle: { fontSize: 20, color: wellnessColors.textPrimary, marginTop: 8 },
  deviceTitleNoBadge: { marginTop: 0 },
  deviceSubtitle: {
    marginTop: 6,
    color: wellnessColors.textSecondary,
  },
  deviceCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  deviceCtaLabel: { color: ACCENT },
  exportCardProminent: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  exportCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  exportCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCardTextCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  exportCardKicker: {
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exportCardTitle: {
    fontSize: 17,
    color: wellnessColors.textPrimary,
    marginBottom: 4,
  },
  exportCardBody: {
    color: wellnessColors.textSecondary,
  },
  exportCardCtaRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  exportCardCtaText: {
    color: ACCENT,
    textAlign: 'center',
  },
  claveRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  claveLabel: {
    fontWeight: '600',
    color: wellnessColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  claveValue: {
    fontSize: 18,
    color: wellnessColors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  claveHint: {
    color: wellnessColors.textMuted,
    lineHeight: 16,
    fontWeight: '400',
  },
  mutedBody: { color: wellnessColors.textSecondary, marginBottom: spacing.md },
  textLinkWrap: { padding: spacing.md },
  textLink: { fontSize: 16, color: authPalette.link, textDecorationLine: 'underline' },
});
