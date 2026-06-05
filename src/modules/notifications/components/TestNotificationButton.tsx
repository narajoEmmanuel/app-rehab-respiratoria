/**
 * Purpose: CTA to send a random motivational test notification.
 * Module: notifications
 */

import { Pressable, StyleSheet } from 'react-native';

import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { wellness } from '@/src/shared/theme/wellness-theme';

export type TestNotificationButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function TestNotificationButton({ onPress, disabled }: TestNotificationButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Enviar notificación de prueba">
      <IconSymbol name="paperplane.fill" size={20} color={reminderUi.teal} />
      <AppText variant="button" style={styles.label}>
        Enviar notificación de prueba
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: reminderUi.teal,
    backgroundColor: wellness.card,
  },
  label: {
    color: reminderUi.teal,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
