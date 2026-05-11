/**
 * Purpose: Root stack layout and global providers for Expo Router.
 * Module: app routing
 * Dependencies: @react-navigation/native, expo-router, shared/utils
 * Notes: Keep screens registered here thin; domain code lives under src/.
 */
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Text, TextInput, type TextInputProps, type TextProps } from 'react-native';
import 'react-native-reanimated';

import { AppModeProvider } from '@/src/modules/app-mode';
import { LevelsProgressProvider } from '@/src/modules/levels/state/use-levels-progress';
import { PatientSessionProvider } from '@/src/modules/patient/context/PatientSessionContext';
import { fontRegular } from '@/src/shared/theme/typography';
import { WebStartupSplash } from '@/src/shared/ui/WebStartupSplash';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  initialRouteName: 'index',
};

void SplashScreen.preventAutoHideAsync();
const SPLASH_MIN_DURATION_MS = 800;
const appStartTime = Date.now();

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: TextProps;
};

type TextInputComponentWithDefaults = typeof TextInput & {
  defaultProps?: TextInputProps;
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [isAppReady, setIsAppReady] = useState(false);
  const [showWebStartupSplash, setShowWebStartupSplash] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    const prepareApp = async () => {
      if (fontsLoaded) {
        const TextWithDefaults = Text as TextComponentWithDefaults;
        const TextInputWithDefaults = TextInput as TextInputComponentWithDefaults;
        TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
        TextWithDefaults.defaultProps.style = [{ fontFamily: fontRegular }, TextWithDefaults.defaultProps.style];
        TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps ?? {};
        TextInputWithDefaults.defaultProps.style = [
          { fontFamily: fontRegular },
          TextInputWithDefaults.defaultProps.style,
        ];
      } else if (fontError) {
        console.warn('Inter fonts could not be loaded. Rendering with fallback fonts.', fontError);
      }

      const elapsedMs = Date.now() - appStartTime;
      const targetMinDurationMs = Platform.OS === 'web' ? 0 : SPLASH_MIN_DURATION_MS;
      const remainingMs = Math.max(0, targetMinDurationMs - elapsedMs);
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
      }

      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Splash screen could not be hidden.', error);
      } finally {
        setIsAppReady(true);
      }
    };

    void prepareApp();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAppReady) return;
    const timer = setTimeout(() => {
      setShowWebStartupSplash(false);
    }, SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isAppReady]);

  if (!isAppReady) {
    return null;
  }

  if (Platform.OS === 'web' && showWebStartupSplash) {
    return <WebStartupSplash />;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <AppModeProvider>
        <PatientSessionProvider>
          <LevelsProgressProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false, title: 'Acceso' }} />
            <Stack.Screen name="auth/registro" options={{ headerShown: false, title: 'Registro' }} />
            <Stack.Screen name="legal/accept" options={{ headerShown: false, title: 'Consentimiento' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="data-export" options={{ headerShown: false, title: 'Datos y exportación' }} />
            <Stack.Screen name="notification-settings" options={{ headerShown: false, title: 'Recordatorios' }} />
            <Stack.Screen name="sensor-connection" options={{ headerShown: false }} />
            <Stack.Screen name="hardware-lab" options={{ headerShown: false, title: 'Hardware Lab' }} />
            <Stack.Screen name="diagnostico" options={{ headerShown: false }} />
            <Stack.Screen name="diagnostico-resumen" options={{ headerShown: false }} />
            <Stack.Screen name="esp32-raw-test" options={{ headerShown: false, title: 'ESP32 Raw WS Test' }} />
          </Stack>
          </LevelsProgressProvider>
        </PatientSessionProvider>
      </AppModeProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
