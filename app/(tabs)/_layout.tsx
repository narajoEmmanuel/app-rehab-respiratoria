/**
 * Purpose: Bottom tab navigator — wellness pill bar, only Home / Niveles / Calendario visible.
 * Module: app routing
 * Dependencies: expo-router, safe-area, shared theme & ui
 * Notes: Other routes stay in (tabs) with href: null so they remain reachable via router.push.
 */
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/src/shared/ui/haptic-tab';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { Colors } from '@/src/shared/theme/colors';
import { useColorScheme } from '@/src/shared/utils/use-color-scheme';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const scheme = colorScheme ?? 'light';
  const tabColors = Colors[scheme];
  const isLight = scheme === 'light';

  const floatingBottom = Math.max(insets.bottom, 10) + 10;
  const horizontal = 22;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabColors.tabIconSelected,
        tabBarInactiveTintColor: tabColors.tabIconDefault,
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
              paddingBottom: 10,
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
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="niveles"
        options={{
          title: 'Niveles',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="square.grid.2x2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="plan-semanal"
        options={{
          title: 'Plan',
          href: null,
        }}
      />
    </Tabs>
  );
}
