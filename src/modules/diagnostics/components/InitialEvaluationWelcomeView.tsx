import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appBrand } from '@/src/shared/branding/app-brand';
import { spacing } from '@/src/shared/theme/spacing';
import { fontBold, fontRegular } from '@/src/shared/theme/typography';
import { wellness, wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type InitialEvaluationWelcomeViewProps = {
  canStart: boolean;
  loading: boolean;
  statusMessage: string;
  spirometerLabel: string | null;
  onStart: () => void;
  onGoToSensor: () => void;
};

export function InitialEvaluationWelcomeView({
  canStart,
  loading,
  statusMessage,
  spirometerLabel,
  onStart,
  onGoToSensor,
}: InitialEvaluationWelcomeViewProps) {
  const showSensorHint = !canStart && !loading;
  const buttonDisabled = !canStart || loading;

  return (
    <View style={styles.screen}>
      <View style={styles.heroWash} pointerEvents="none" />

      <View style={styles.brandWrap}>
        <View style={styles.brandBadge} accessibilityRole="header" accessibilityLabel={appBrand.name}>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandWord}>Respira</Text>
            <Text style={styles.brandPlus}>+</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Evaluación inicial</Text>
          <View style={styles.brandAccent}>
            <View style={styles.brandAccentDot} />
            <View style={styles.brandAccentLine} />
            <View style={styles.brandAccentDot} />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Evaluación inicial</Text>
        <Text style={styles.lead}>
          Vamos a conocer tu volumen de referencia para personalizar tus niveles.
        </Text>
        <Text style={styles.secondary}>
          Siéntate con calma, conecta tu espirómetro y realiza las inspiraciones cuando la app te
          lo indique.
        </Text>

        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>
            Detente si presentas dolor, mareo, tos intensa, falta de aire importante o malestar.
          </Text>
        </View>

        {spirometerLabel && canStart ? (
          <Text style={styles.readyHint}>Listo · {spirometerLabel}</Text>
        ) : null}

        {showSensorHint ? (
          <Text style={styles.statusMessage} accessibilityRole="alert">
            {statusMessage}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    backgroundColor: wellnessColors.primarySubtle,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  brandWord: {
    fontFamily: fontBold,
    color: '#078B83',
  },
  brandPlus: {
    fontFamily: fontRegular,
    color: wellnessColors.primary,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(31, 126, 122, 0.72)',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  brandAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  brandAccentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: wellnessColors.primary,
    opacity: 0.55,
  },
  brandAccentLine: {
    width: 28,
    height: 2,
    borderRadius: wellnessRadii.full,
    backgroundColor: 'rgba(52, 171, 165, 0.35)',
  },
  card: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    gap: spacing.sm,
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    zIndex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.3,
  },
  lead: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: wellness.text,
  },
  secondary: {
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
    fontSize: 13,
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
    backgroundColor: wellness.primary,
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
