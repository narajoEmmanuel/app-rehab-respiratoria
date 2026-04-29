import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii } from '@/src/shared/theme/wellness-theme';

const PRIMARY = '#34aba5';

export function AppTopBar({
  title,
  onPressProfile,
}: {
  title: string;
  onPressProfile?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.leftBadge} accessibilityRole="text">
          <Text style={styles.leftBadgeText}>R+</Text>
        </View>

        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onPressProfile}
            disabled={!onPressProfile}
            accessibilityRole="button"
            accessibilityLabel="Perfil"
            style={({ pressed }) => [styles.avatarBtn, pressed && styles.actionBtnPressed]}
          >
            <IconSymbol name="person.crop.circle" size={18} color={PRIMARY} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(52, 171, 165, 0.22)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  leftBadge: {
    width: 40,
    height: 40,
    borderRadius: wellnessRadii.full,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1E1E1E' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 171, 165, 0.10)',
  },
  actionBtnPressed: { opacity: 0.85 },
});

