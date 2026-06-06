import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/src/shared/theme/spacing';
import { fontBold, fontRegular } from '@/src/shared/theme/typography';
import { wellness, wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

/** Degradado hero: teal de marca con paso claro (#45BDB7, botones RESPIRA+). */
const EVAL_WELCOME_GRADIENT = [
  wellnessColors.primaryDark,
  wellness.primary,
  '#45BDB7',
] as const;

const EVAL_MINT_GLOW = '#B8F0E8';
const EVAL_MINT_WASH = wellnessColors.primarySubtle;

type InitialEvaluationWelcomeViewProps = {
  canStart: boolean;
  loading: boolean;
  statusMessage: string;
  spirometerLabel: string | null;
  onStart: () => void;
  onGoToSensor: () => void;
  onBack?: () => void;
};

export function InitialEvaluationWelcomeView({
  canStart,
  loading,
  statusMessage,
  spirometerLabel,
  onStart,
  onGoToSensor,
  onBack,
}: InitialEvaluationWelcomeViewProps) {
  const showSensorHint = !canStart && !loading;
  const buttonDisabled = !canStart || loading;
  const showReadyHint = canStart && !loading;
  const waitingForSignal = statusMessage.includes('Esperando señal del sensor');

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[...EVAL_WELCOME_GRADIENT]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.decorCircleTopRight} pointerEvents="none" />
      <View style={styles.decorCircleBottomLeft} pointerEvents="none" />
      <View style={styles.decorGlow} pointerEvents="none" />
      <View style={styles.decorWave} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Regresar">
            <IconSymbol name="chevron.left" size={22} color="rgba(255,255,255,0.92)" />
          </Pressable>
        ) : null}

        <View style={styles.heroSection}>
          <Animated.View
            entering={FadeInDown.duration(620).delay(60)}
            style={styles.heroContent}
            accessibilityRole="header"
            accessibilityLabel="Bienvenido a RESPIRA+">
            <AppText variant="titleLarge" style={styles.welcomeLine}>
              Bienvenido a
            </AppText>
            <AppText variant="titleLarge" style={styles.brandTitle}>
              <AppText variant="titleLarge" style={styles.brandWord}>
                RESPIRA
              </AppText>
              <AppText variant="titleLarge" style={styles.brandPlus}>
                +
              </AppText>
            </AppText>
            <AppText variant="bodyLarge" style={styles.heroTagline}>
              Vamos a conocer tu volumen de referencia.
            </AppText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(680).delay(140)} style={styles.contentCard}>
          <AppText variant="titleLarge" style={styles.cardTitle}>
            Evaluación inicial
          </AppText>
          <AppText variant="bodyLarge" style={styles.cardLead}>
            Personalizaremos tus niveles de terapia con base en tu resultado.
          </AppText>

          <View style={styles.safetyBox}>
            <AppText variant="chip" style={styles.safetyText}>
              Detente si presentas dolor, mareo, tos intensa, falta de aire marcada o malestar.
            </AppText>
          </View>

          {showReadyHint ? (
            <AppText variant="bodySmall" style={styles.readyHint}>
              Sensor listo.
              {spirometerLabel ? ` · ${spirometerLabel}` : ''}
            </AppText>
          ) : null}

          {showSensorHint ? (
            waitingForSignal ? (
              <View style={styles.sensorStatusBlock} accessibilityRole="alert">
                <AppText variant="bodySmall" style={styles.sensorStatusTitle}>
                  Esperando señal del sensor
                </AppText>
                <AppText variant="bodySmall" style={styles.sensorStatusSubtext}>
                  Conecta el espirómetro para continuar.
                </AppText>
              </View>
            ) : (
              <AppText variant="bodySmall" style={styles.statusMessage} accessibilityRole="alert">
                {statusMessage || 'Conecta y calibra el espirómetro para continuar.'}
              </AppText>
            )
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              buttonDisabled && styles.primaryBtnDisabled,
              pressed && !buttonDisabled && styles.primaryBtnPressed,
            ]}
            onPress={onStart}
            disabled={buttonDisabled}
            accessibilityRole="button"
            accessibilityLabel="Comenzar evaluación"
            accessibilityState={{ disabled: buttonDisabled }}>
            <AppText variant="titleMedium" style={styles.primaryBtnText}>
              {loading ? 'Verificando sensor…' : 'Comenzar evaluación'}
            </AppText>
          </Pressable>

          {showSensorHint ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={onGoToSensor}
              accessibilityRole="button"
              accessibilityLabel="Revisar sensor">
              <AppText variant="button" style={styles.secondaryBtnText}>
                Revisar sensor
              </AppText>
            </Pressable>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: wellness.primary,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: wellnessRadii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 232, 0.35)',
    marginBottom: spacing.sm,
  },
  backBtnPressed: {
    opacity: 0.82,
  },
  decorCircleTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  decorCircleBottomLeft: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${EVAL_MINT_GLOW}33`,
  },
  decorGlow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 280,
    height: 140,
    borderRadius: 140,
    backgroundColor: `${EVAL_MINT_WASH}2E`,
  },
  decorWave: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    right: -20,
    height: 120,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: 340,
  },
  welcomeLine: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },
  brandTitle: {
    fontSize: 54,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
    includeFontPadding: false,
  },
  brandWord: {
    fontFamily: fontBold,
    color: '#FFFFFF',
  },
  brandPlus: {
    fontFamily: fontRegular,
    color: EVAL_MINT_GLOW,
    letterSpacing: 1,
  },
  heroTagline: {
    marginTop: spacing.md,
    fontWeight: '600',
    color: 'rgba(240, 250, 249, 0.92)',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  contentCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#023632',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    marginTop: -spacing.xxl,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    fontSize: 24,
    color: wellness.text,
    letterSpacing: -0.3,
  },
  cardLead: {
    fontWeight: '600',
    color: wellness.text,
  },
  safetyBox: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(255, 193, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(210, 150, 50, 0.28)',
  },
  safetyText: {
    lineHeight: 19,
    fontWeight: '600',
    color: '#7A5A10',
  },
  readyHint: {
    fontWeight: '700',
    color: wellness.primaryDark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sensorStatusBlock: {
    marginTop: spacing.xs,
    gap: 2,
    alignItems: 'center',
  },
  sensorStatusTitle: {
    fontWeight: '700',
    color: wellness.primaryDark,
    textAlign: 'center',
  },
  sensorStatusSubtext: {
    fontWeight: '600',
    color: wellness.primaryDark,
    textAlign: 'center',
  },
  statusMessage: {
    fontWeight: '600',
    color: wellness.primaryDark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: '#45BDB7',
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  secondaryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryBtnPressed: {
    opacity: 0.7,
  },
  secondaryBtnText: {
    color: wellness.primaryDark,
  },
});
