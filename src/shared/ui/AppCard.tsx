import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { wellnessColors, wellnessRadius, wellnessShadows } from '@/src/shared/theme/wellness-theme';

type AppCardVariant = 'default' | 'soft' | 'highlight';

type AppCardProps = {
  children: ReactNode;
  variant?: AppCardVariant;
  style?: StyleProp<ViewStyle>;
  pressable?: boolean;
  onPress?: () => void;
};

const variantStyles: Record<AppCardVariant, ViewStyle> = {
  default: {
    backgroundColor: wellnessColors.card,
    borderColor: wellnessColors.border,
    borderWidth: 1,
  },
  soft: {
    backgroundColor: wellnessColors.primarySubtle,
    borderColor: 'rgba(52, 171, 165, 0.15)',
    borderWidth: 1,
  },
  highlight: {
    backgroundColor: wellnessColors.card,
    borderColor: 'rgba(52, 171, 165, 0.40)',
    borderWidth: 2,
  },
};

export function AppCard({ children, variant = 'default', style, pressable, onPress }: AppCardProps) {
  const cardStyle: ViewStyle[] = [styles.base, variantStyles[variant], wellnessShadows.soft];

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed, style]}
        accessibilityRole="button">
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: wellnessRadius.lg,
    padding: 20,
  },
  pressed: {
    opacity: 0.95,
  },
});
