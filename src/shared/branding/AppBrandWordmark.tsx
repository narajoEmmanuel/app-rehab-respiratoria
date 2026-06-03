import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { appBrand } from '@/src/shared/branding/app-brand';
import { fontBold, fontRegular } from '@/src/shared/theme/typography';
import { wellness } from '@/src/shared/theme/wellness-theme';

type AppBrandWordmarkProps = {
  size?: 'header' | 'hero';
  style?: StyleProp<TextStyle>;
};

/** Fallback textual cuando el asset del logo no carga. */
export function AppBrandWordmark({ size = 'header', style }: AppBrandWordmarkProps) {
  return (
    <Text
      style={[size === 'hero' ? styles.heroMark : styles.headerMark, style]}
      accessibilityRole="header"
      accessibilityLabel={appBrand.name}>
      <Text style={styles.brandWord}>Respira</Text>
      <Text style={styles.brandPlus}>+</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  headerMark: {
    includeFontPadding: false,
  },
  heroMark: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandWord: {
    fontFamily: fontBold,
    fontSize: 22,
    color: wellness.text,
    letterSpacing: -0.4,
  },
  brandPlus: {
    fontFamily: fontRegular,
    fontSize: 24,
    color: appBrand.primaryColor,
    letterSpacing: 0.5,
  },
});
