/**
 * Purpose: Quick-access tile grid for therapy, history, sensor and profile on the home dashboard.
 * Module: home
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol, type IconSymbolName } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const ACCENT = wellnessColors.primary;

type QuickAccessItem = {
  label: string;
  icon: IconSymbolName;
  onPress: () => void;
};

type Props = {
  showSensor?: boolean;
  onTherapy: () => void;
  onHistory: () => void;
  onSensor: () => void;
  onProfile: () => void;
};

export function HomeQuickAccessGrid({
  showSensor = true,
  onTherapy,
  onHistory,
  onSensor,
  onProfile,
}: Props) {
  const items: QuickAccessItem[] = [
    { label: 'Terapia', icon: 'waveform.path.ecg', onPress: onTherapy },
    { label: 'Historial', icon: 'clock.fill', onPress: onHistory },
    ...(showSensor
      ? [{ label: 'Sensor', icon: 'dot.radiowaves.left.and.right' as IconSymbolName, onPress: onSensor }]
      : []),
    { label: 'Perfil', icon: 'person.crop.circle', onPress: onProfile },
  ];

  return (
    <View style={styles.quickAccessGrid}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={({ pressed }) => [styles.quickAccessTile, pressed && styles.quickAccessTilePressed]}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}>
          <View style={styles.quickAccessIconWrap}>
            <IconSymbol name={item.icon} size={18} color={ACCENT} />
          </View>
          <AppText variant="chip" style={styles.quickAccessLabel}>
            {item.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAccessTile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: wellnessColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
    ...wellnessShadows.soft,
  },
  quickAccessTilePressed: {
    opacity: 0.92,
  },
  quickAccessIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessLabel: {
    color: wellnessColors.textPrimary,
  },
});
