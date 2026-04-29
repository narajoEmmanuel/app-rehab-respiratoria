/**
 * Purpose: Patient home — wellness layout, patient info, shortcuts to Niveles & Calendario.
 * Module: home
 * Dependencies: expo-router, patient session, shared wellness theme
 */

import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
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

  const bottomPad = insets.bottom + wellnessFloatingTabBarInset;

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

        <Text style={styles.sectionLabel}>Accesos rápidos</Text>

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
          accessibilityLabel="Ir a niveles desbloqueados">
          <View style={styles.shortcutIconWrap}>
            <IconSymbol name="square.grid.2x2.fill" size={28} color={wellness.primaryDark} />
          </View>
          <View style={styles.shortcutTextCol}>
            <Text style={styles.shortcutTitle}>Niveles desbloqueados</Text>
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
          También puedes usar el menú inferior para ir a Home, Niveles o Calendario.
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
    paddingTop: spacing.xl + 4,
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
});
