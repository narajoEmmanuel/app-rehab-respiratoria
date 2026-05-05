import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { ProfileAvatarView } from '@/src/modules/patient/components/ProfileAvatarView';
import { getProfilePreferences } from '@/src/modules/patient/storage/profile-preferences-repository';
import { appBrand } from '@/src/shared/branding/app-brand';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const PRIMARY = appBrand.primaryColor;
const SLOT_WIDTH = 56;

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

        <View style={styles.centerSlot} accessibilityRole="header">
          <View
            style={styles.leftBadge}
            accessibilityRole="image"
            accessibilityLabel={appBrand.name}>
            <Image
              source={appBrand.logo}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandBlock}>
            <Text style={styles.brandLine} accessibilityLabel="Respira+">
              <Text style={styles.brandWord}>Respira</Text>
              <Text style={styles.brandPlus}>+</Text>
            </Text>
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
                  displayName={patient.nombre_completo}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
  },
  leftSlot: {
    width: SLOT_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  leftBadge: {
    width: 56,
    height: 38,
    borderRadius: wellnessRadii.full,
    backgroundColor: wellness.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
    paddingVertical: 0,
    ...{
      shadowColor: '#4F6F52',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  /** Larger than before so the mark fills more of the pill without changing the outer badge size. */
  logoImg: {
    width: 50,
    height: 32,
  },
  brandBlock: {
    justifyContent: 'center',
  },
  brandLine: {
    includeFontPadding: false,
  },
  brandWord: {
    fontSize: 22,
    fontWeight: '700',
    color: wellness.text,
    letterSpacing: -0.4,
  },
  brandPlus: {
    fontSize: 24,
    fontWeight: '300',
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: wellnessRadii.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  slotPlaceholder: {
    width: 40,
    height: 40,
  },
  actionBtnPressed: { opacity: 0.88 },
});
