/**
 * Purpose: Root stack layout and global providers for Expo Router.
 * Module: app routing
 * Dependencies: @react-navigation/native, expo-router, shared/utils
 * Notes: Keep screens registered here thin; domain code lives under src/.
 */
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PatientSessionProvider } from '@/src/modules/patient/context/PatientSessionContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <PatientSessionProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false, title: 'Acceso' }} />
          <Stack.Screen name="auth/registro" options={{ headerShown: false, title: 'Registro' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="sensor-connection" options={{ headerShown: false }} />
          <Stack.Screen name="diagnostico" options={{ headerShown: false }} />
          <Stack.Screen name="diagnostico-resumen" options={{ headerShown: false }} />
        </Stack>
      </PatientSessionProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
