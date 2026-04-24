/**
 * Purpose: Root stack layout and global providers for Expo Router.
 * Module: app routing
 * Dependencies: @react-navigation/native, expo-router, shared/utils
 * Notes: Keep screens registered here thin; domain code lives under src/.
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PatientSessionProvider } from '@/src/modules/patient/context/PatientSessionContext';
import { useColorScheme } from '@/src/shared/utils/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PatientSessionProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false, title: 'Acceso' }} />
          <Stack.Screen name="auth/registro" options={{ headerShown: false, title: 'Registro' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </PatientSessionProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
