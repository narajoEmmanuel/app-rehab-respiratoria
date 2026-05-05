/**
 * Purpose: Bottom tab navigator — flat bar (Inicio, Terapia, Historial); Plan hidden from bar.
 * Module: app routing
 * Dependencies: expo-router, shared theme & ui
 * Notes: Legacy tab routes stay hidden with href: null. Consent gate uses tabPress listeners
 *        (no custom tabBarButton for blocking). HapticTab is only for optional haptics.
 */
import { Tabs, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { useConsentActive } from '@/src/modules/legal/use-consent-active';
import { wellness } from '@/src/shared/theme/wellness-theme';
import { HapticTab } from '@/src/shared/ui/haptic-tab';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

const TAB_ACTIVE = wellness.primary;
const TAB_INACTIVE = '#8E8E93';
const TAB_BAR_TOP_BORDER = '#E8E8E8';

const TAB_ICON_SIZE = 24;

type TabIconName = 'house.fill' | 'square.grid.2x2.fill' | 'clock.fill';

function tabBarIconFor(name: TabIconName) {
  return function TabBarIcon({ color }: { color: string; focused: boolean; size: number }) {
    return <IconSymbol name={name} size={TAB_ICON_SIZE} color={color} />;
  };
}

export default function TabLayout() {
  const router = useRouter();
  const { ready, active } = useConsentActive();

  const protectedTabListeners = useMemo(
    () => ({
      tabPress: (e: { preventDefault: () => void }) => {
        if (!ready) {
          e.preventDefault();
          return;
        }
        if (!active) {
          e.preventDefault();
          Alert.alert(
            'Consentimiento',
            'Para usar Terapia e Historial necesitas un consentimiento activo. Puedes revisarlo en Perfil o aceptar de nuevo los documentos.',
            [
              { text: 'Entendido', style: 'cancel' },
              {
                text: 'Revisar y aceptar',
                onPress: () => router.push(LEGAL_ACCEPT_HREF),
              },
            ],
          );
        }
      },
    }),
    [active, ready, router],
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: tabBarIconFor('house.fill'),
        }}
      />
      <Tabs.Screen
        name="terapia"
        listeners={protectedTabListeners}
        options={{
          title: 'Terapia',
          tabBarIcon: tabBarIconFor('square.grid.2x2.fill'),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          href: null,
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
        listeners={protectedTabListeners}
        options={{
          title: 'Historial',
          tabBarIcon: tabBarIconFor('clock.fill'),
        }}
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: TAB_BAR_TOP_BORDER,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    paddingTop: Platform.OS === 'ios' ? 4 : 6,
    ...(Platform.OS === 'android' ? { height: 56 } : {}),
  },
  tabItem: {
    paddingTop: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.02,
    marginBottom: Platform.OS === 'ios' ? 2 : 4,
  },
});
