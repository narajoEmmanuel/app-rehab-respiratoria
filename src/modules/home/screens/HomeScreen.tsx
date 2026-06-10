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
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTherapyReadinessGate } from '@/src/modules/device/volume-estimation';
import { navigateToInitialEvaluation } from '@/src/modules/diagnostics/navigate-to-initial-evaluation';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import { useCalibrationSnapshot } from '@/src/modules/device/state/use-calibration-snapshot';
import { getCurrentActiveLevel, hasDiagnostic, getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import { HomeAccessKeyCard } from '@/src/modules/home/components/HomeAccessKeyCard';
import { HomeConsentNoticeCard } from '@/src/modules/home/components/HomeConsentNoticeCard';
import { HomeDailyGoalCtaCard } from '@/src/modules/home/components/HomeDailyGoalCtaCard';
import { HomeDeviceCard } from '@/src/modules/home/components/HomeDeviceCard';
import { HomeEvaluationCtaCard } from '@/src/modules/home/components/HomeEvaluationCtaCard';
import { HomeExportCard } from '@/src/modules/home/components/HomeExportCard';
import { HomeHeaderGreeting } from '@/src/modules/home/components/HomeHeaderGreeting';
import { HomeLastSessionCard } from '@/src/modules/home/components/HomeLastSessionCard';
import { HomeLoadingState } from '@/src/modules/home/components/HomeLoadingState';
import { HomeProgressEmptyState } from '@/src/modules/home/components/HomeProgressEmptyState';
import { HomeProgressTodayCard } from '@/src/modules/home/components/HomeProgressTodayCard';
import { HomeQuickAccessGrid } from '@/src/modules/home/components/HomeQuickAccessGrid';
import { HomeTherapyCtaCard } from '@/src/modules/home/components/HomeTherapyCtaCard';
import { RespiraWelcomeOnboarding } from '@/src/modules/onboarding/components/RespiraWelcomeOnboarding';
import {
  hasSeenWelcomeOnboarding,
  markWelcomeOnboardingSeen,
} from '@/src/modules/onboarding/storage/onboarding-storage';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { useConsentActive } from '@/src/modules/legal/use-consent-active';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import { getLevelDisplayMeta } from '@/src/modules/session/levels/level-difficulty-config';
import { getLevelById } from '@/src/modules/session/registry/level-registry';
import { useTherapySessionLauncher } from '@/src/modules/session/hooks/use-therapy-session-launcher';
import { useTouchPracticePreference } from '@/src/modules/session/hooks/use-touch-practice-preference';
import { updateDailyProgress } from '@/src/modules/session/session-progress-service';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { isLevelEntryLockedForUi } from '@/src/config/dev-level-flags';
import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import { runtimeEnv } from '@/src/config/runtime-env';
import {
  showConfirmDialog,
  showInfoAlert,
} from '@/src/shared/utils/cross-platform-dialogs';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { spacing } from '@/src/shared/theme/spacing';
import { appScreenBackground } from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

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
  const sensorRuntimeEnabled = isSensorRuntimeEnabled();
  const { refresh: refreshTherapyGate } = useTherapyReadinessGate({ enabled: sensorRuntimeEnabled });
  const { launchingLevelId, launchTherapySession } = useTherapySessionLauncher();
  const { lastReading, sensorStreamState, status: sensorStatus, mode: sensorMode } =
    useSensorConnection();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);
  const [currentLevelLabel, setCurrentLevelLabel] = useState('Nivel 1');
  const [currentLevelHumanName, setCurrentLevelHumanName] = useState('');
  const [activeLevelId, setActiveLevelId] = useState<LevelId | null>(null);
  const [todayCompletedSessions, setTodayCompletedSessions] = useState(0);
  const [patientSessions, setPatientSessions] = useState<SessionRecord[]>([]);
  const [, setLatestDiag] = useState<DiagnosticRecord | null>(null);
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

  // El modo por defecto es 'mock' aun sin conexión: solo el status refleja conexión real.
  // Un mock activo (startMock) también pone status en 'connected', así que sigue cubierto.
  const sensorConnected = sensorStatus === 'connected' || sensorStatus === 'receiving';

  const goStartRecommendedLevel = useCallback(() => {
    if (!hasCompletedDiagnostic) {
      showInfoAlert(
        'Evaluación inicial pendiente',
        'Completa tu evaluación inicial para personalizar tu terapia.',
      );
      return;
    }
    if (!consentUiReady) return;
    if (!consentActive) {
      void showConfirmDialog({
        title: 'Consentimiento',
        message:
          'Para iniciar terapia necesitas un consentimiento activo. Puedes revisar y aceptar los documentos ahora o desde Perfil.',
        confirmLabel: 'Revisar y aceptar',
        cancelLabel: 'Entendido',
      }).then((accepted) => {
        if (accepted) router.push(LEGAL_ACCEPT_HREF);
      });
      return;
    }
    if (!activeLevelId || launchingLevelId !== null) {
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
    launchTherapySession(activeLevelId);
  }, [
    activeLevelId,
    consentActive,
    consentUiReady,
    hasCompletedDiagnostic,
    launchTherapySession,
    launchingLevelId,
    router,
  ]);

  const goSensorConnection = useCallback(() => {
    if (consentUiReady && !consentActive) {
      showInfoAlert(
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
    return <HomeLoadingState onGoToLogin={() => router.replace('/auth/login')} />;
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

  const therapyButtonTitle = !consentUiReady
    ? 'Preparando…'
    : !consentActive
      ? 'Activa el consentimiento para continuar'
      : 'Empezar nivel sugerido';

  const sensorCard = sensorRuntimeEnabled ? (
    <HomeDeviceCard
      calibrationSnapshot={calibrationSnapshot}
      sensorConnected={sensorConnected}
      sensorSignalLive={sensorSignalLive}
      onPress={goSensorConnection}
      homePresentation
    />
  ) : null;

  // En web_touch la ruta /sensor-connection muestra la visualización técnica
  // read-only del prototipo (sin conexión real), por eso el acceso sigue visible.
  const sensorEntryVisible = sensorRuntimeEnabled || runtimeEnv.isWebTouch;

  const quickAccessSection = (
    <>
      <SectionHeader title="Accesos rápidos" />
      <HomeQuickAccessGrid
        showSensor={sensorEntryVisible}
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}>
        <HomeHeaderGreeting firstName={firstName} />

        {!hasCompletedDiagnostic ? (
          <HomeEvaluationCtaCard onPress={goInitialEvaluation} />
        ) : dailyGoalMet ? (
          <HomeDailyGoalCtaCard
            onPress={() => {
              onLightImpact();
              router.push('/(tabs)/historial');
            }}
          />
        ) : (
          <HomeTherapyCtaCard
            levelDisplayName={levelDisplayName}
            buttonTitle={therapyButtonTitle}
            onPress={goStartRecommendedLevel}
            disabled={therapyCtaDisabled}
          />
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
            <HomeProgressEmptyState />
            {quickAccessSection}
          </>
        ) : null}

        {homeLayoutState === 'has_sessions' ? (
          <>
            <SectionHeader title="Progreso de hoy" />
            <HomeProgressTodayCard
              todayCompletedSessions={todayCompletedSessions}
              weeklyCompleted={weeklyCompleted}
            />
            {sensorCard}
            {lastSession ? <HomeLastSessionCard session={lastSession} /> : null}
            {quickAccessSection}
          </>
        ) : null}

        {consentUiReady && !consentActive ? (
          <HomeConsentNoticeCard onReviewPress={() => router.push(LEGAL_ACCEPT_HREF)} />
        ) : null}

        <HomeExportCard
          onPress={() => {
            onLightImpact();
            router.push('/data-export');
          }}
        />

        <HomeAccessKeyCard clave={patient.clave} />
      </ScrollView>
      <RespiraWelcomeOnboarding visible={welcomeVisible} onContinue={handleWelcomeContinue} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: appScreenBackground },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
