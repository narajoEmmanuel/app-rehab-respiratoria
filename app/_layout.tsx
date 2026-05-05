/**
 * Purpose: Root stack layout and global providers for Expo Router.
 * Module: app routing
 * Dependencies: @react-navigation/native, expo-router, shared/utils
 * Notes: Keep screens registered here thin; domain code lives under src/.
 */
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput, type TextInputProps, type TextProps } from 'react-native';
import 'react-native-reanimated';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { PatientSessionProvider } from '@/src/modules/patient/context/PatientSessionContext';
import { fontRegular } from '@/src/shared/theme/typography';

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

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: TextProps;
};

type TextInputComponentWithDefaults = typeof TextInput & {
  defaultProps?: TextInputProps;
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    const TextWithDefaults = Text as TextComponentWithDefaults;
    const TextInputWithDefaults = TextInput as TextInputComponentWithDefaults;
    TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
    TextWithDefaults.defaultProps.style = [{ fontFamily: fontRegular }, TextWithDefaults.defaultProps.style];
    TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps ?? {};
    TextInputWithDefaults.defaultProps.style = [
      { fontFamily: fontRegular },
      TextInputWithDefaults.defaultProps.style,
    ];
    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <PatientSessionProvider>
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
          <Stack.Screen name="diagnostico" options={{ headerShown: false }} />
          <Stack.Screen name="diagnostico-resumen" options={{ headerShown: false }} />
        </Stack>
      </PatientSessionProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
