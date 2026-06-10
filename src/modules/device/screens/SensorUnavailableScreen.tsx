/**
 * Fallback when sensor routes are opened in web_touch or with sensor disabled.
 * Minimal UI — does not attempt WebSocket connection.
 */

import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppText } from '@/src/shared/ui/AppText';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';

type Props = {
  backFallbackHref?: Href;
};

export function SensorUnavailableScreen({ backFallbackHref = '/(tabs)' }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backFallbackHref);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar
        showBackButton
        showProfileButton={false}
        backFallbackHref={backFallbackHref}
        onPressBack={handleBack}
      />
      <View style={styles.content}>
        <AppText variant="titleMedium" style={styles.title}>
          Sensor no disponible en este modo
        </AppText>
        <AppText variant="body" style={styles.body}>
          Esta versión no incluye conexión con el espirómetro ESP32. Puedes seguir usando el resto de
          la app con normalidad.
        </AppText>
        <AppButton title="Volver" onPress={handleBack} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellnessColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: wellnessColors.textPrimary,
  },
  body: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
});
