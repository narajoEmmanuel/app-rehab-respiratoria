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
  showTherapyReadinessAlert,
  useTherapyReadinessGate,
} from '@/src/modules/device/volume-estimation';
import { navigateToInitialEvaluation } from '@/src/modules/diagnostics/navigate-to-initial-evaluation';
import { isTechnicalCalibrationEnabled } from '@/src/modules/app-mode';
import {
  PATIENT_MEASUREMENT_CONNECT_SENSOR,
  PATIENT_MEASUREMENT_LOAD_ERROR,
  patientMeasurementStatusLabel,
  resolvePatientMeasurementPhase,
} from '@/src/modules/device/calibration/patient-measurement-copy';
import { formatCalibrationCardSubtitle } from '@/src/modules/device/calibration/calibration-display-utils';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import { useCalibrationSnapshot } from '@/src/modules/device/state/use-calibration-snapshot';
import { getCurrentActiveLevel, hasDiagnostic, getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import { HomeLastSessionCard } from '@/src/modules/home/components/HomeLastSessionCard';
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
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { updateDailyProgress } from '@/src/modules/session/session-progress-service';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { isLevelEntryLockedForUi } from '@/src/config/dev-level-flags';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppButton } from '@/src/shared/ui/AppButton';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { InfoTile } from '@/src/shared/ui/InfoTile';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { appScreenBackground, wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

const ACCENT = wellnessColors.primary;

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
  const [latestDiag, setLatestDiag] = useState<DiagnosticRecord | null>(null);
  const [startingLevel, setStartingLevel] = useState(false);
  const bottomPad = dashboardScrollBottomPadding(insets.bottom);

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
    }, [loadProgress, refreshTherapyGate]),
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
      sensorStreamState,
      navigateToSession,
      patient?.paciente_id,
      router,
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
    logLevelSensorModeSelected('sensor');
    void beginOfficialSensorSession(activeLevelId);
  }, [
    activeLevelId,
    beginOfficialSensorSession,
    consentActive,
    consentUiReady,
    hasCompletedDiagnostic,
    router,
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

  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || sensorMode === 'mock';
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

  const goEvaluationSummary = useCallback(() => {
    onLightImpact();
    router.push('/evaluacion-resumen');
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

  const displayName = normalizePatientDisplayName(patient.nombre_completo);
  const firstName = displayName.trim().split(/\s+/)[0] ?? displayName;
  const therapyCtaDisabled =
    !hasCompletedDiagnostic || !consentUiReady || !consentActive;
  const dailyGoalMet = hasCompletedDiagnostic && todayCompletedSessions >= 6;
  const levelDisplayName = currentLevelHumanName || currentLevelLabel;

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
              Revisa y acepta los documentos para continuar con la terapia.
            </Text>
            <Pressable
              style={styles.consentBtn}
              onPress={() => router.push(LEGAL_ACCEPT_HREF)}
              accessibilityRole="button"
              accessibilityLabel="Revisar documentos legales">
              <Text style={styles.consentBtnText}>Revisar documentos</Text>
            </Pressable>
          </View>
        ) : null}

        {!hasCompletedDiagnostic ? (
          <AppCard variant="highlight" style={styles.diagnosticHeroCard}>
            <Text style={styles.diagnosticHeroKicker}>Evaluación inicial</Text>
            <Text style={styles.diagnosticHeroTitle}>Conoce tu volumen de referencia</Text>
            <Text style={styles.diagnosticHeroBody}>
              Realiza tu evaluación inicial para personalizar tus niveles de terapia.
            </Text>
            <AppButton title="Comenzar evaluación" onPress={goInitialEvaluation} />
          </AppCard>
        ) : dailyGoalMet ? (
          <AppCard style={styles.heroCardSpacing}>
            <Text style={styles.heroKicker}>Progreso de hoy</Text>
            <Text style={styles.heroTitle}>Sesiones de hoy completadas</Text>
            <Text style={styles.heroSubtitle}>
              Puedes revisar tu progreso o continuar según la indicación de tu profesional.
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <AppButton
              title="Ver historial"
              onPress={() => {
                onLightImpact();
                router.push('/(tabs)/historial');
              }}
              variant="secondary"
            />
          </AppCard>
        ) : (
          <AppCard style={styles.heroCardSpacing}>
            <Text style={styles.heroKicker}>Próxima acción</Text>
            <Text style={styles.heroTitle}>Continúa tu terapia guiada</Text>
            <Text style={styles.heroSubtitle}>
              {`Nivel sugerido: ${levelDisplayName}\nHoy: ${todayCompletedSessions} de 6 sesiones`}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (todayCompletedSessions / 6) * 100)}%` },
                ]}
              />
            </View>
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

        {!hasAnySession ? (
          <AppCard>
            <Text style={styles.emptyTitle}>Aún no hay sesiones registradas</Text>
            <Text style={styles.emptyBody}>
              Cuando completes tu primera sesión verás aquí un resumen con tu progreso y volumen. Empieza cuando te
              sientas preparado.
            </Text>
          </AppCard>
        ) : null}

        {lastSession ? <HomeLastSessionCard session={lastSession} /> : null}

        {hasAnySession ? (
          <AppCard style={styles.weekCardSpacing}>
            <SectionHeader title="Constancia" subtitle="Últimos 7 días" />
            <View style={styles.weekMetricsRow}>
              <MetricTile
                label="Esta semana"
                value={weeklyCompleted === 0 ? '0' : String(weeklyCompleted)}
                helper={`sesión${weeklyCompleted === 1 ? '' : 'es'} completada${weeklyCompleted === 1 ? '' : 's'}`}
              />
              <MetricTile
                label="Hoy"
                value={`${todayCompletedSessions}/6`}
                helper="meta diaria"
              />
            </View>
            <Text style={styles.weekHint}>El historial completo está en la pestaña Historial.</Text>
          </AppCard>
        ) : null}

        {hasCompletedDiagnostic ? (
          <AppCard variant="soft" style={styles.evalCardSpacing}>
            <View style={styles.evalCardHeader}>
              <View style={styles.evalCardIconWrap}>
                <IconSymbol name="lungs.fill" size={24} color={ACCENT} />
              </View>
              <View style={styles.evalCardHeaderText}>
                <Text style={styles.evalCardTitle}>Evaluación inicial</Text>
                <Text style={styles.evalCardSubtitle}>
                  Actualiza tu volumen de referencia para personalizar tus metas de terapia.
                </Text>
              </View>
            </View>
            {latestDiag ? (
              <View style={styles.evalCardMetrics}>
                <MetricTile
                  label="Volumen de referencia"
                  value={`${latestDiag.max_inspiratory_volume} mL`}
                  iconName="lungs.fill"
                />
                <View style={styles.evalCardMetricRow}>
                  <InfoTile
                    label="Última evaluación"
                    value={new Date(latestDiag.diagnostic_date).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    tone="neutral"
                  />
                  {latestDiag.diagnostic_number != null ? (
                    <MetricTile
                      label="Evaluación"
                      value={`#${latestDiag.diagnostic_number}`}
                      size="compact"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
            <View style={styles.evalActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.evalActionPill, pressed && styles.evalActionPillPressed]}
                onPress={goEvaluationSummary}
                accessibilityRole="button"
                accessibilityLabel="Ver resumen de evaluación inicial">
                <Text style={styles.evalActionPillText}>Ver resumen</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.evalActionPill,
                  styles.evalActionPillSecondary,
                  pressed && styles.evalActionPillPressed,
                ]}
                onPress={goInitialEvaluation}
                accessibilityRole="button"
                accessibilityLabel="Repetir evaluación inicial">
                <Text style={[styles.evalActionPillText, styles.evalActionPillTextSecondary]}>
                  Repetir evaluación
                </Text>
              </Pressable>
            </View>
          </AppCard>
        ) : null}

        <DeviceCard
          calibrationSnapshot={calibrationSnapshot}
          sensorConnected={sensorConnected}
          sensorSignalLive={sensorSignalLive}
          onPress={goSensorConnection}
        />

        <SectionHeader title="Resumen para tu profesional" />
        <AppCard
          pressable
          onPress={() => {
            onLightImpact();
            router.push('/data-export');
          }}
          style={styles.exportCardSpacing}>
          <View style={styles.exportCardHeader}>
            <View style={styles.exportCardIconWrap}>
              <IconSymbol name="doc.text.fill" size={22} color={ACCENT} />
            </View>
            <View style={styles.exportCardTextCol}>
              <Text style={styles.exportCardBody}>
                Comparte tus sesiones y progreso en un archivo exportable.
              </Text>
            </View>
          </View>
          <View style={styles.exportCardCtaRow}>
            <Text style={styles.exportCardCtaText}>Exportar resumen</Text>
            <IconSymbol name="chevron.right" size={16} color={ACCENT} />
          </View>
        </AppCard>

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
          ? `${snapshot.therapy.spirometerLabel ?? profile.name} · volumen en vivo`
          : 'Conecta el sensor para ver tu volumen en vivo.',
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
          : PATIENT_MEASUREMENT_CONNECT_SENSOR,
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
      : PATIENT_MEASUREMENT_CONNECT_SENSOR,
    ctaLabel: technicalCalibrationEnabled ? 'Configurar sensor' : 'Conectar sensor',
    variant: 'pending',
  };
}

function DeviceCard({
  calibrationSnapshot,
  sensorConnected,
  sensorSignalLive,
  onPress,
}: {
  calibrationSnapshot: CalibrationSnapshot;
  sensorConnected: boolean;
  sensorSignalLive: boolean;
  onPress: () => void;
}) {
  const state = describeDeviceState(
    calibrationSnapshot,
    isTechnicalCalibrationEnabled(),
    sensorConnected,
    sensorSignalLive,
  );
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
          ) : null}
          <Text style={[styles.deviceTitle, !state.showBadge && styles.deviceTitleNoBadge]}>{state.title}</Text>
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
  safe: { flex: 1, backgroundColor: appScreenBackground },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.lg,
  },
  consentCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  consentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  consentBody: {
    fontSize: 15,
    lineHeight: 22,
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
    fontSize: 16,
    fontWeight: '700',
  },
  diagnosticHeroCard: {
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
    color: wellnessColors.textPrimary,
    lineHeight: 32,
  },
  diagnosticHeroBody: {
    fontSize: 16,
    lineHeight: 24,
    color: wellnessColors.textSecondary,
  },
  heroCardSpacing: {
    marginBottom: spacing.lg,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: wellnessColors.neutralSoft,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
  },
  weekCardSpacing: {
    marginBottom: spacing.lg,
  },
  weekMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  weekHint: {
    fontSize: 13,
    color: wellnessColors.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  deviceCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  deviceBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  deviceBadgeTextReady: { color: wellnessColors.primaryDark },
  deviceBadgeTextPending: { color: wellnessColors.textSecondary },
  deviceBadgeTextWarn: { color: wellnessColors.danger },
  deviceTitle: { fontSize: 20, fontWeight: '800', color: wellnessColors.textPrimary, marginTop: 8 },
  deviceTitleNoBadge: { marginTop: 0 },
  deviceSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
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
  deviceCtaLabel: { fontSize: 15, fontWeight: '700', color: ACCENT },
  evalCardSpacing: {
    marginBottom: spacing.lg,
  },
  evalCardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  evalCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalCardHeaderText: {
    flex: 1,
  },
  evalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginBottom: 4,
  },
  evalCardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  evalCardMetrics: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  evalCardMetricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  evalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  evalActionPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  evalActionPillSecondary: {
    backgroundColor: wellnessColors.card,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  evalActionPillPressed: {
    opacity: 0.88,
  },
  evalActionPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  evalActionPillTextSecondary: {
    color: wellnessColors.primaryDark,
  },
  exportCardSpacing: {
    marginBottom: spacing.lg,
  },
  exportCardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  exportCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCardTextCol: {
    flex: 1,
  },
  exportCardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  exportCardCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  exportCardCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
  claveRow: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  claveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  claveValue: {
    fontSize: 20,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  claveHint: {
    fontSize: 13,
    color: wellnessColors.textMuted,
    lineHeight: 18,
  },
  mutedBody: { fontSize: 16, color: wellnessColors.textSecondary, marginBottom: spacing.md },
  textLinkWrap: { padding: spacing.md },
  textLink: { fontSize: 16, fontWeight: '700', color: authPalette.link, textDecorationLine: 'underline' },
});
