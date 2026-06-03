import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appBrand } from '@/src/shared/branding/app-brand';
import { spacing } from '@/src/shared/theme/spacing';
import { fontBold, fontRegular } from '@/src/shared/theme/typography';
import { wellness, wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

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

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#055E59', '#078B83', '#34aba5']}
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
            accessibilityLabel={appBrand.name}>
            <Text style={styles.welcomeLine}>Bienvenido a</Text>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandWord}>RESPIRA</Text>
              <Text style={styles.brandPlus}>+</Text>
            </Text>
            <Text style={styles.heroTagline}>Vamos a conocer tu volumen de referencia.</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(680).delay(140)} style={styles.contentCard}>
          <Text style={styles.cardTitle}>Evaluación inicial</Text>
          <Text style={styles.cardLead}>
            Esta evaluación nos ayuda a personalizar tus niveles respiratorios con base en tu
            volumen de referencia.
          </Text>
          <Text style={styles.cardBody}>
            Siéntate con calma, conecta tu espirómetro y sigue las indicaciones en pantalla.
          </Text>

          <View style={styles.safetyBox}>
            <Text style={styles.safetyText}>
              Detente si presentas dolor, mareo, tos intensa, falta de aire importante o malestar.
            </Text>
          </View>

          {showReadyHint ? (
            <Text style={styles.readyHint}>
              Sensor listo para comenzar.
              {spirometerLabel ? ` · ${spirometerLabel}` : ''}
            </Text>
          ) : null}

          {showSensorHint ? (
            <Text style={styles.statusMessage} accessibilityRole="alert">
              {statusMessage || 'Conecta el sensor para realizar la evaluación inicial.'}
            </Text>
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
            <Text style={styles.primaryBtnText}>
              {loading ? 'Verificando sensor…' : 'Comenzar evaluación'}
            </Text>
          </Pressable>

          {showSensorHint ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={onGoToSensor}
              accessibilityRole="button"
              accessibilityLabel="Ir a Sensor y medición">
              <Text style={styles.secondaryBtnText}>Ir a Sensor y medición</Text>
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
    backgroundColor: '#078B83',
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
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircleBottomLeft: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(184, 240, 232, 0.12)',
  },
  decorGlow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 280,
    height: 140,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  decorWave: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    right: -20,
    height: 120,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
    color: '#B8F0E8',
    letterSpacing: 1,
  },
  heroTagline: {
    marginTop: spacing.md,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
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
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.3,
  },
  cardLead: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    color: wellness.text,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
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
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#7A5A10',
  },
  readyHint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: wellness.primaryDark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: wellness.primaryDark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: wellnessColors.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
    fontWeight: '800',
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
    fontSize: 16,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
});
