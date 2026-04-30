/**
 * Purpose: Patient home — wellness layout, patient info, shortcuts to Niveles & Calendario.
 * Module: home
 * Dependencies: expo-router, patient session, shared wellness theme
 * Notes: Diagnostic is now optional. The "Realizar diagnóstico inicial" card is always
 *        accessible from this screen but does not block any tab or shortcut.
 */

import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { getCurrentActiveLevel, hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { updateDailyProgress } from '@/src/modules/session/session-progress-service';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessFloatingTabBarInset,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const TITLE = 28;
const BODY = 18;
const LEAD = 16;

function onShortcutPress() {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, clearSession, hydrated } = usePatientSession();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);
  const [currentLevelLabel, setCurrentLevelLabel] = useState('Nivel 1');
  const [todayCompletedSessions, setTodayCompletedSessions] = useState(0);

  const bottomPad = insets.bottom + wellnessFloatingTabBarInset;

  const loadProgress = useCallback(async () => {
    if (!patient) {
      setHasCompletedDiagnostic(false);
      setCurrentLevelLabel('Nivel 1');
      setTodayCompletedSessions(0);
      return;
    }
    const exists = await hasDiagnostic(patient.paciente_id);
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

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const onLogout = useCallback(async () => {
    await clearSession();
    router.replace('/auth/login');
  }, [clearSession, router]);

  const goNiveles = useCallback(() => {
    onShortcutPress();
    router.push('/(tabs)/niveles');
  }, [router]);

  const goCalendario = useCallback(() => {
    onShortcutPress();
    router.push('/(tabs)/calendario');
  }, [router]);

  const goSensorConnection = useCallback(() => {
    onShortcutPress();
    router.push('/sensor-connection');
  }, [router]);

  const goDiagnostico = useCallback(() => {
    onShortcutPress();
    router.push('/diagnostico');
  }, [router]);

  if (!hydrated || !patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.body}>Cargando tu información…</Text>
          <Pressable
            style={styles.linkBtn}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <Text style={styles.link}>Ir al acceso</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = patient.nombre_completo.trim().split(/\s+/)[0] ?? patient.nombre_completo;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Hola, {firstName}</Text>
        <Text style={styles.welcome}>
          Bienvenido a tu espacio de rehabilitación respiratoria. Aquí tienes lo esencial.
        </Text>

        <View style={styles.cardGlass}>
          <Text style={styles.cardTitle}>Tu clave de acceso</Text>
          <Text style={styles.clave}>{patient.clave}</Text>
          <Text style={styles.cardHint}>
            Guárdala en un lugar seguro. La usarás cuando vuelvas a abrir la aplicación.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLine}>
            <Text style={styles.infoBold}>Nombre: </Text>
            {patient.nombre_completo}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoBold}>Edad: </Text>
            {patient.edad} años
          </Text>
        </View>

        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Realizar diagnóstico inicial</Text>
          <Text style={styles.pendingDescription}>
            {hasCompletedDiagnostic
              ? 'Puedes repetir el diagnóstico cuando quieras para actualizar tu capacidad pulmonar.'
              : 'Mide tu capacidad pulmonar para personalizar tu tratamiento. Es opcional y puedes hacerlo cuando quieras.'}
          </Text>
          <Pressable
            style={styles.pendingBtn}
            onPress={goDiagnostico}
            accessibilityRole="button"
            accessibilityLabel="Realizar diagnóstico inicial">
            <Text style={styles.pendingBtnText}>
              {hasCompletedDiagnostic ? 'Repetir diagnóstico' : 'Realizar diagnóstico'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Accesos rápidos</Text>

        {hasCompletedDiagnostic ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>{currentLevelLabel} activo</Text>
            <Text style={styles.progressMetric}>Sesiones completadas hoy: {todayCompletedSessions}/6</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (todayCompletedSessions / 6) * 100)}%` }]} />
            </View>
            <Text style={styles.progressMessage}>
              {todayCompletedSessions >= 6
                ? '¡Completaste tus 6 sesiones de hoy!'
                : `Te faltan ${6 - todayCompletedSessions} sesiones para completar el nivel de hoy`}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.shortcutCard, pressed && styles.shortcutCardPressed]}
          onPress={goSensorConnection}
          accessibilityRole="button"
          accessibilityLabel="Conexión y calibración del sensor">
          <View style={styles.shortcutIconWrap}>
            <IconSymbol name="dot.radiowaves.left.and.right" size={28} color={wellness.primaryDark} />
          </View>
          <View style={styles.shortcutTextCol}>
            <Text style={styles.shortcutTitle}>Conexión y calibración del sensor</Text>
            <Text style={styles.shortcutSubtitle}>
              Prepara el dispositivo antes de una sesión (simulado)
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={22} color={wellness.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.shortcutCard, pressed && styles.shortcutCardPressed]}
          onPress={goNiveles}
          accessibilityRole="button"
          accessibilityLabel="Ir a niveles">
          <View style={styles.shortcutIconWrap}>
            <IconSymbol name="square.grid.2x2.fill" size={28} color={wellness.primaryDark} />
          </View>
          <View style={styles.shortcutTextCol}>
            <Text style={styles.shortcutTitle}>Niveles</Text>
            <Text style={styles.shortcutSubtitle}>Ver y elegir tu progreso por nivel</Text>
          </View>
          <IconSymbol name="chevron.right" size={22} color={wellness.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.shortcutCard, pressed && styles.shortcutCardPressed]}
          onPress={goCalendario}
          accessibilityRole="button"
          accessibilityLabel="Ver calendario">
          <View style={styles.shortcutIconWrap}>
            <IconSymbol name="calendar" size={28} color={wellness.primaryDark} />
          </View>
          <View style={styles.shortcutTextCol}>
            <Text style={styles.shortcutTitle}>Ver calendario</Text>
            <Text style={styles.shortcutSubtitle}>Consulta tus días y hábitos</Text>
          </View>
          <IconSymbol name="chevron.right" size={22} color={wellness.textSecondary} />
        </Pressable>

        <Text style={styles.footerHint}>
          También puedes usar el menú inferior para ir a Inicio, Terapia, Plan o Historial.
        </Text>

        <Pressable
          style={styles.logoutBtn}
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión">
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  greeting: {
    fontSize: TITLE,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  welcome: {
    fontSize: BODY,
    lineHeight: 28,
    color: wellness.textSecondary,
    marginBottom: spacing.xl + 4,
  },
  cardGlass: {
    backgroundColor: wellness.cardGlass,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg + 2,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.lg,
    ...wellnessShadows.card,
  },
  cardTitle: {
    fontSize: LEAD,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.sm,
  },
  clave: {
    fontSize: 34,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  cardHint: { fontSize: LEAD, lineHeight: 24, color: wellness.textSecondary },
  infoCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.xl,
    ...wellnessShadows.cardPress,
  },
  infoLine: { fontSize: BODY, color: wellness.text, marginBottom: spacing.xs },
  infoBold: { fontWeight: '700', color: wellness.primaryDark },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    gap: spacing.md,
    ...wellnessShadows.card,
  },
  shortcutCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
    ...wellnessShadows.cardPress,
  },
  shortcutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTextCol: { flex: 1, gap: 4 },
  shortcutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.text,
  },
  shortcutSubtitle: {
    fontSize: LEAD,
    lineHeight: 22,
    color: wellness.textSecondary,
  },
  footerHint: {
    fontSize: LEAD,
    lineHeight: 24,
    color: wellness.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  logoutText: { fontSize: BODY, fontWeight: '700', color: wellness.primaryDark },
  body: { fontSize: BODY, color: wellness.textSecondary, marginBottom: spacing.md },
  linkBtn: { padding: spacing.md },
  link: { fontSize: BODY, fontWeight: '700', color: authPalette.link, textDecorationLine: 'underline' },
  pendingCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: spacing.sm,
  },
  pendingDescription: {
    fontSize: LEAD,
    lineHeight: 24,
    color: wellness.textSecondary,
    marginBottom: spacing.md,
  },
  pendingBtn: {
    alignSelf: 'flex-start',
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pendingBtnText: {
    color: '#ffffff',
    fontSize: BODY,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  progressMetric: {
    marginTop: spacing.xs,
    fontSize: 16,
    color: wellness.text,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#d8ead8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: wellness.primary,
    borderRadius: 999,
  },
  progressMessage: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: wellness.textSecondary,
    fontWeight: '600',
  },
});
