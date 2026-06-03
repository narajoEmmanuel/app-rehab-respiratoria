import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { ProfileAvatarView } from '@/src/modules/patient/components/ProfileAvatarView';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import { getProfilePreferences } from '@/src/modules/patient/storage/profile-preferences-repository';
import { appBrand } from '@/src/shared/branding/app-brand';
import { AppBrandLogo } from '@/src/shared/branding/AppBrandLogo';
import { AppBrandWordmark } from '@/src/shared/branding/AppBrandWordmark';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const PRIMARY = appBrand.primaryColor;
const SLOT_WIDTH = 56;
const HEADER_ROW_MIN_HEIGHT = Platform.OS === 'web' ? 40 : 42;
const HEADER_PADDING_TOP = 6;
const HEADER_PADDING_BOTTOM = Platform.OS === 'web' ? 8 : 10;

type AppTopBarProps = {
  onPressProfile?: () => void;
  showBackButton?: boolean;
  onPressBack?: () => void;
  backFallbackHref?: Href | string;
  showProfileButton?: boolean;
};

export function AppTopBar({
  onPressProfile,
  showBackButton = false,
  onPressBack,
  backFallbackHref = '/(tabs)/index',
  showProfileButton = true,
}: AppTopBarProps) {
  const { patient } = usePatientSession();
  const navigation = useNavigation();
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      void (async () => {
        if (!patient) {
          if (mounted) setAvatarUri(null);
          return;
        }
        const prefs = await getProfilePreferences(patient.paciente_id);
        if (mounted) setAvatarUri(prefs.avatarUri);
      })();
      return () => {
        mounted = false;
      };
    }, [patient]),
  );

  const handleBack = useCallback(() => {
    if (onPressBack) {
      onPressBack();
      return;
    }
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backFallbackHref as Href);
  }, [backFallbackHref, navigation, onPressBack, router]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.leftSlot}>
          {showBackButton ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Regresar"
              style={({ pressed }) => [styles.backBtn, pressed && styles.actionBtnPressed]}>
              <IconSymbol name="chevron.left" size={20} color={PRIMARY} />
            </Pressable>
          ) : (
            <View style={styles.slotPlaceholder} />
          )}
        </View>

        <View style={styles.centerSlot}>
          <View style={styles.brandCluster} accessibilityRole="header">
            <AppBrandLogo variant="header" />
            <View style={styles.brandBlock}>
              <AppBrandWordmark size="header" />
            </View>
          </View>
        </View>

        <View style={styles.rightSlot}>
          {showProfileButton ? (
            <Pressable
              onPress={onPressProfile}
              disabled={!onPressProfile}
              accessibilityRole="button"
              accessibilityLabel="Perfil"
              style={({ pressed }) => [styles.avatarBtn, pressed && styles.actionBtnPressed]}>
              {patient ? (
                <ProfileAvatarView
                  displayName={normalizePatientDisplayName(patient.nombre_completo)}
                  avatarUri={avatarUri}
                  size={36}
                />
              ) : (
                <IconSymbol name="person.crop.circle" size={22} color={PRIMARY} />
              )}
            </Pressable>
          ) : (
            <View style={styles.slotPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: HEADER_PADDING_BOTTOM,
    backgroundColor: wellness.screenBg,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(52, 171, 165, 0.12)',
    ...(Platform.OS === 'web'
      ? {
          minHeight: 56,
        }
      : null),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HEADER_ROW_MIN_HEIGHT,
  },
  leftSlot: {
    width: SLOT_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  rightSlot: {
    width: SLOT_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: wellnessRadii.full,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    backgroundColor: wellness.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: wellnessRadii.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  slotPlaceholder: {
    width: 36,
    height: 36,
  },
  actionBtnPressed: { opacity: 0.88 },
});
