/**
 * Purpose: Bottom tab navigator — wellness pill bar with five primary tabs.
 * Module: app routing
 * Dependencies: expo-router, safe-area, shared theme & ui
 * Notes: Legacy tab routes stay hidden with href: null to preserve existing navigation.
 */
import { Tabs } from 'expo-router';
import React from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { HapticTab } from '@/src/shared/ui/haptic-tab';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { Colors } from '@/src/shared/theme/colors';
import { useColorScheme } from '@/src/shared/utils/use-color-scheme';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { patient } = usePatientSession();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = React.useState(false);
  const scheme = colorScheme ?? 'light';
  const tabColors = Colors[scheme];
  const isLight = scheme === 'light';

  const floatingBottom = Math.max(insets.bottom, 10) + 14;
  const horizontal = 22;

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      if (!patient) {
        if (active) setHasCompletedDiagnostic(false);
        return;
      }
      const exists = await hasDiagnostic(patient.paciente_id);
      if (active) setHasCompletedDiagnostic(exists);
    };
    void load();
    return () => {
      active = false;
    };
  }, [patient]);

  const blockWithoutDiagnostic = (e: { preventDefault: () => void }) => {
    if (!hasCompletedDiagnostic) {
      e.preventDefault();
      Alert.alert('Atención', 'Primero realiza tu diagnóstico para desbloquear tu terapia');
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#34aba5',
        tabBarInactiveTintColor: isLight ? '#98A19D' : tabColors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: Platform.OS === 'ios' ? 0 : 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          borderRadius: wellnessRadii.pill,
        },
        tabBarStyle: isLight
          ? {
              position: 'absolute',
              left: horizontal,
              right: horizontal,
              bottom: floatingBottom,
              height: 64,
              paddingHorizontal: 6,
              paddingTop: 6,
              paddingBottom: 12,
              borderRadius: wellnessRadii.pill,
              backgroundColor: wellness.tabBarBg,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: wellness.tabBarBorder,
              ...wellnessShadows.tabBar,
            }
          : {
              backgroundColor: tabColors.background,
              borderTopColor: wellness.tabBarBorder,
              elevation: 0,
            },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="terapia"
        options={{
          title: 'Terapia',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="square.grid.2x2.fill" color={color} />
          ),
        }}
        listeners={{ tabPress: blockWithoutDiagnostic }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
        listeners={{ tabPress: blockWithoutDiagnostic }}
      />
      <Tabs.Screen
        name="sesion"
        options={{
          title: 'Sesión',
          href: null,
        }}
      />
      <Tabs.Screen
        name="resumen"
        options={{
          title: 'Resumen',
          href: null,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="clock.fill" color={color} />,
        }}
        listeners={{ tabPress: blockWithoutDiagnostic }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="niveles"
        options={{
          title: 'Niveles',
          href: null,
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          href: null,
        }}
      />
      <Tabs.Screen
        name="plan-semanal"
        options={{
          title: 'Plan semanal',
          href: null,
        }}
      />
    </Tabs>
  );
}
