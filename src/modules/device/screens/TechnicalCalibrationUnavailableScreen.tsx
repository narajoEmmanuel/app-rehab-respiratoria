import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';

export type TechnicalCalibrationUnavailableScreenProps = {
  onClose?: () => void;
};

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function TechnicalCalibrationUnavailableScreen({
  onClose,
}: TechnicalCalibrationUnavailableScreenProps) {
  const router = useRouter();

  const onBack = () => {
    hapticLight();
    if (onClose) {
      onClose();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/sensor-connection');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar
        showBackButton
        showProfileButton={false}
        backFallbackHref="/sensor-connection"
        onPressBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Configuración técnica no disponible</Text>
          <Text style={styles.body}>
            La calibración RESPIRA+ validada está activa.
          </Text>
        </AppCard>

        <AppButton title="Volver" onPress={onBack} variant="primary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    paddingTop: spacing.md,
  },
  card: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    ...wellnessShadows.card,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
  },
});
