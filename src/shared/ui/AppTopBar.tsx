import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { appBrand } from '@/src/shared/branding/app-brand';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const PRIMARY = appBrand.primaryColor;

export function AppTopBar({ onPressProfile }: { onPressProfile?: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
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

        <View style={styles.brandBlock} accessibilityRole="header">
          <Text style={styles.brandLine} accessibilityLabel="Respira+">
            <Text style={styles.brandWord}>Respira</Text>
            <Text style={styles.brandPlus}>+</Text>
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onPressProfile}
            disabled={!onPressProfile}
            accessibilityRole="button"
            accessibilityLabel="Perfil"
            style={({ pressed }) => [styles.avatarBtn, pressed && styles.actionBtnPressed]}>
            <IconSymbol name="person.crop.circle" size={22} color={PRIMARY} />
          </Pressable>
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
    gap: spacing.md,
    minHeight: 44,
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: wellnessRadii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52, 171, 165, 0.2)',
  },
  actionBtnPressed: { opacity: 0.88 },
});
