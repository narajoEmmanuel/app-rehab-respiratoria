import { useEffect } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageErrorEventData,
  type ImageProps,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appBrand } from '@/src/shared/branding/app-brand';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export type AppBrandLogoVariant = 'header' | 'hero';

type AppBrandLogoProps = {
  variant?: AppBrandLogoVariant;
  style?: StyleProp<ViewStyle>;
  onError?: (event: NativeSyntheticEvent<ImageErrorEventData>) => void;
  onLoad?: ImageProps['onLoad'];
};

const VARIANTS: Record<
  AppBrandLogoVariant,
  {
    container: ViewStyle;
    image: { width: number; height: number };
  }
> = {
  header: {
    container: {
      width: 56,
      height: 38,
      borderRadius: wellnessRadii.full,
      paddingHorizontal: 1,
      paddingVertical: 0,
    },
    image: { width: 50, height: 32 },
  },
  hero: {
    container: {
      width: 128,
      height: 72,
      borderRadius: 22,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    image: { width: 112, height: 56 },
  },
};

/** Logo oficial RESPIRA+ — mismo asset y props de Image que AppTopBar. */
export function AppBrandLogo({
  variant = 'header',
  style,
  onError,
  onLoad,
}: AppBrandLogoProps) {
  const spec = VARIANTS[variant];

  useEffect(() => {
    if (__DEV__) {
      console.log('[AppBrandLogo] source', appBrand.logo, 'variant', variant);
    }
  }, [variant]);

  const handleError = (event: NativeSyntheticEvent<ImageErrorEventData>) => {
    if (__DEV__) {
      console.log('[AppBrandLogo] onError', event.nativeEvent.error);
    }
    onError?.(event);
  };

  return (
    <View
      style={[styles.badge, spec.container, style]}
      accessibilityRole="image"
      accessibilityLabel={appBrand.name}>
      <Image
        source={appBrand.logo}
        style={spec.image}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        onError={handleError}
        onLoad={onLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexShrink: 0,
    backgroundColor: wellness.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ...(Platform.OS === 'android'
      ? {
          elevation: 2,
        }
      : {
          shadowColor: '#4F6F52',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }),
  },
});
