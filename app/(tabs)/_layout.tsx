/**
 * Purpose: Bottom tab navigator — flat bar (Inicio, Terapia, Historial); Plan hidden from bar.
 * Module: app routing
 * Dependencies: expo-router, shared theme & ui
 * Notes: Legacy tab routes stay hidden with href: null. Consent gate uses tabPress listeners
 *        (no custom tabBarButton for blocking). HapticTab is only for optional haptics.
 */
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import { LOCAL_PROFILE_HREF } from '@/src/modules/auth/local-profile-hrefs';
import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { useConsentActive } from '@/src/modules/legal/use-consent-active';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';
import { HapticTab } from '@/src/shared/ui/haptic-tab';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

const TAB_ACTIVE = wellnessColors.primary;
const TAB_INACTIVE = wellnessColors.textMuted;
const TAB_BAR_TOP_BORDER = wellnessColors.border;

const TAB_ICON_SIZE = 22;

type TabIconName = 'house.fill' | 'square.grid.2x2.fill' | 'clock.fill';

function tabBarIconFor(name: TabIconName) {
  return function TabBarIcon({ color }: { color: string; focused: boolean; size: number }) {
    return <IconSymbol name={name} size={TAB_ICON_SIZE} color={color} />;
  };
}

export default function TabLayout() {
  const router = useRouter();
  const { patient, hydrated } = usePatientSession();
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

  if (hydrated && !isCloudAuthEnabled() && patient == null) {
    return <Redirect href={LOCAL_PROFILE_HREF} />;
  }

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
        name="sesion"
        options={{
          title: 'Sesión',
          href: null,
          tabBarStyle: { display: 'none' },
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
    paddingTop: Platform.OS === 'ios' ? 6 : 8,
    paddingBottom: Platform.OS === 'ios' ? 2 : 6,
    ...(Platform.OS === 'android' ? { height: 60 } : {}),
  },
  tabItem: {
    paddingTop: 2,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: 2,
  },
});
