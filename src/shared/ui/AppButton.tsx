import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  iconName?: string;
  style?: StyleProp<ViewStyle>;
};

const fill: Record<AppButtonVariant, ViewStyle> = {
  primary: { backgroundColor: wellnessColors.primary },
  secondary: {
    backgroundColor: wellnessColors.card,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: wellnessColors.danger },
};

const textColor: Record<AppButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: wellnessColors.primaryDark,
  ghost: wellnessColors.primaryDark,
  danger: '#FFFFFF',
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  iconName,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        fill[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <IconSymbol
            name={iconName as any}
            size={18}
            color={disabled ? wellnessColors.textMuted : textColor[variant]}
          />
        </View>
      ) : null}
      <AppText
        variant="button"
        style={{ color: disabled ? wellnessColors.textMuted : textColor[variant] }}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: wellnessRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  iconWrap: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
});
