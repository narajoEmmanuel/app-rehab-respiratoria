import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRegistrationHeader } from '@/src/modules/auth/components/AuthRegistrationHeader';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

type AuthFlowChromeProps = {
  children: ReactNode;
  step?: { current: number; total?: number };
  onBack?: () => void;
  backAccessibilityLabel?: string;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
};

export function AuthWellnessBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#F5F7F3', '#F0FAF9', '#F5F7F3']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
    </View>
  );
}

export function AuthStepper({ current, total = 4 }: { current: number; total?: number }) {
  return (
    <View style={styles.stepperRow} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => {
        const stepIndex = i + 1;
        const active = stepIndex <= current;
        const isCurrent = stepIndex === current;
        return (
          <View key={stepIndex} style={styles.stepperSegmentWrap}>
            <View
              style={[
                styles.stepperSegment,
                active && styles.stepperSegmentActive,
                isCurrent && styles.stepperSegmentCurrent,
              ]}
            />
          </View>
        );
      })}
      <AppText variant="chip" style={styles.stepperLabel}>
        Paso {current} de {total}
      </AppText>
    </View>
  );
}

export function AuthFlowChrome({
  children,
  step,
  onBack,
  backAccessibilityLabel,
  scroll = true,
  contentStyle,
  footer,
}: AuthFlowChromeProps) {
  const useRegistrationHeader = Boolean(onBack ?? step);
  const body = (
    <>
      {!useRegistrationHeader && step ? (
        <AuthStepper current={step.current} total={step.total} />
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
      {footer}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuthWellnessBackdrop />
      {useRegistrationHeader ? (
        <AuthRegistrationHeader
          onBack={onBack}
          backAccessibilityLabel={backAccessibilityLabel}
          step={step}
        />
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            useRegistrationHeader && styles.scrollBelowHeader,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, useRegistrationHeader && styles.scrollBelowHeader]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

export function AuthTitleBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.titleBlock}>
      <AppText variant="titleLarge" style={styles.title}>{title}</AppText>
      <AppText variant="bodyLarge" style={styles.subtitle}>{subtitle}</AppText>
    </View>
  );
}

export function AuthCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <PressableAuthButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      variant="primary"
    />
  );
}

export function AuthOutlineButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableAuthButton label={label} onPress={onPress} disabled={disabled} variant="outline" />
  );
}

export function AuthSecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableAuthButton label={label} onPress={onPress} disabled={disabled} variant="secondary" />
  );
}

function PressableAuthButton({
  label,
  onPress,
  disabled,
  loading,
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant: 'primary' | 'outline' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btnBase,
        isPrimary && styles.btnPrimary,
        isOutline && styles.btnOutline,
        variant === 'secondary' && styles.btnSecondary,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && !loading && styles.btnPressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : authPalette.primary} />
      ) : (
        <AppText variant="button"
          style={[
            styles.btnText,
            isPrimary && styles.btnTextPrimary,
            (isOutline || variant === 'secondary') && styles.btnTextOutline,
          ]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

export function AuthBulletList({ items }: { items: readonly string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <AppText variant="bodyLarge" style={styles.bulletText}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: authPalette.screenBg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
  },
  blobTop: {
    width: 280,
    height: 280,
    top: -120,
    right: -80,
  },
  blobBottom: {
    width: 220,
    height: 220,
    bottom: -60,
    left: -70,
    backgroundColor: 'rgba(221, 232, 216, 0.65)',
  },
  scrollBelowHeader: {
    paddingTop: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepperSegmentWrap: {
    flex: 1,
  },
  stepperSegment: {
    height: 4,
    borderRadius: 2,
    backgroundColor: wellnessColors.border,
  },
  stepperSegmentActive: {
    backgroundColor: 'rgba(52, 171, 165, 0.35)',
  },
  stepperSegmentCurrent: {
    backgroundColor: wellness.primary,
  },
  stepperLabel: {
    marginLeft: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    minWidth: 92,
  },
  content: {
    flex: 1,
  },
  titleBlock: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: authPalette.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    color: authPalette.textMuted,
  },
  card: {
    backgroundColor: authPalette.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: authPalette.border,
    marginBottom: spacing.lg,
    ...wellnessShadows.card,
  },
  bulletList: {
    gap: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: wellness.primary,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: authPalette.text,
  },
  btnBase: {
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.sm,
  },
  btnPrimary: {
    backgroundColor: authPalette.primary,
    ...wellnessShadows.soft,
  },
  btnOutline: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: authPalette.primary,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginTop: spacing.xs,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  btnTextPrimary: {
    color: '#fff',
  },
  btnTextOutline: {
    color: authPalette.primary,
  },
});
