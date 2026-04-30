/**
 * Purpose: Bottom tab navigator — floating wellness capsule with four primary tabs.
 * Module: app routing
 * Dependencies: expo-router, safe-area, shared theme & ui
 * Notes: Legacy tab routes stay hidden with href: null to preserve existing navigation.
 *        Tab bar always uses the light capsule (app forces light UI).
 */
import { Tabs } from 'expo-router';
import React from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { HapticTab } from '@/src/shared/ui/haptic-tab';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

const TAB_ACCENT = '#34aba5';
const TAB_ACCENT_SOFT = 'rgba(52, 171, 165, 0.14)';
const TAB_ACCENT_BORDER = 'rgba(52, 171, 165, 0.4)';
const TAB_INACTIVE_ICON = '#8A958F';

/** Fixed slot so active bubble does not shift siblings; bubble fills slot when focused. */
const ICON_SLOT = 54;
const BUBBLE_SIZE_ACTIVE = 54;
const BUBBLE_SIZE_INACTIVE = 48;
const ICON_SIZE_ACTIVE = 28;
const ICON_SIZE_INACTIVE = 24;

const tabBubbleStyles = StyleSheet.create({
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleActive: {
    width: BUBBLE_SIZE_ACTIVE,
    height: BUBBLE_SIZE_ACTIVE,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    transform: [],
    backgroundColor: TAB_ACCENT_SOFT,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: TAB_ACCENT_BORDER,
  },
  bubbleInactive: {
    width: BUBBLE_SIZE_INACTIVE,
    height: BUBBLE_SIZE_INACTIVE,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

type TabIconName = 'house.fill' | 'square.grid.2x2.fill' | 'calendar' | 'clock.fill';

function tabBarIconFor(name: TabIconName) {
  return function TabBarIcon({ focused }: { focused: boolean; color: string; size: number }) {
    return (
      <View style={tabBubbleStyles.iconSlot}>
        <View style={focused ? tabBubbleStyles.bubbleActive : tabBubbleStyles.bubbleInactive}>
          <IconSymbol
            size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE_INACTIVE}
            name={name}
            color={focused ? TAB_ACCENT : TAB_INACTIVE_ICON}
          />
        </View>
      </View>
    );
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { patient } = usePatientSession();
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = React.useState(false);

  const floatingBottom = Math.max(insets.bottom, 12) + 6;
  const horizontalInset = 36;

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
        tabBarActiveTintColor: TAB_ACCENT,
        tabBarInactiveTintColor: TAB_INACTIVE_ICON,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.12,
          marginTop: Platform.OS === 'ios' ? -2 : 0,
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 0,
          justifyContent: 'flex-end',
        },
        tabBarStyle: {
          position: 'absolute',
          left: 6,
          right: 6,
          bottom: 16,
          height: 76,
          paddingHorizontal: 10,
          paddingTop: 16,
          paddingBottom: 8,
          borderRadius: 40,
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderWidth: 1,
          borderColor: 'rgba(52,171,165,0.18)',
          ...wellnessShadows.tabBar,
        },
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
        options={{
          title: 'Terapia',
          tabBarIcon: tabBarIconFor('square.grid.2x2.fill'),
        }}
        listeners={{ tabPress: blockWithoutDiagnostic }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: tabBarIconFor('calendar'),
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
          tabBarIcon: tabBarIconFor('clock.fill'),
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
