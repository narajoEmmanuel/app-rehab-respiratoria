/**
 * Fallback when sensor routes are opened in web_touch or with sensor disabled.
 * Minimal UI — does not attempt WebSocket connection.
 *
 * Nota: la ruta principal /sensor-connection en web_touch ya NO usa esta
 * pantalla (renderiza SensorConnectionScreen en modo readOnlyWebDemo).
 * Este fallback queda para rutas secundarias del sensor (calibración,
 * hardware lab, prueba raw) cuando el runtime del sensor está apagado.
 */

import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { runtimeEnv } from '@/src/config/runtime-env';
import { SensorWebTechnicalOverview } from '@/src/modules/device/components/SensorWebTechnicalOverview';
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
  const showTechnicalOverview = runtimeEnv.isWebTouch;

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="titleMedium" style={styles.title}>
          {showTechnicalOverview
            ? 'Visualización técnica del dispositivo'
            : 'Sensor no disponible en este modo'}
        </AppText>
        <AppText variant="body" style={styles.body}>
          {showTechnicalOverview
            ? 'La conexión real del sensor está desactivada en esta versión web. Puedes seguir usando el resto de la app con normalidad.'
            : 'Esta versión no incluye conexión con el espirómetro ESP32. Puedes seguir usando el resto de la app con normalidad.'}
        </AppText>

        {showTechnicalOverview ? (
          <View style={styles.techSection}>
            <SensorWebTechnicalOverview />
          </View>
        ) : null}

        <AppButton title="Volver" onPress={handleBack} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellnessColors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: wellnessColors.textPrimary,
  },
  body: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  techSection: {
    marginBottom: spacing.sm,
  },
});
