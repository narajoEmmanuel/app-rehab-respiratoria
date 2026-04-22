/**
 * Purpose: View with themed background color.
 * Module: shared/ui
 * Dependencies: react-native, shared/utils/use-theme-color
 */

import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/src/shared/utils/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
