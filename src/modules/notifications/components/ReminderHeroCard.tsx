/**
 * Purpose: Hero card for active/paused therapy reminders.
 * Module: notifications
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import { formatIntervalLabel } from '@/src/modules/notifications/notification-settings.types';
import { wellness, wellnessShadows, wellnessTypography } from '@/src/shared/theme/wellness-theme';

export type ReminderHeroCardProps = {
  enabled: boolean;
  intervalHours: number;
  remindersToday: number;
  onToggle: (value: boolean) => void;
  toggleDisabled?: boolean;
};

export function ReminderHeroCard({
  enabled,
  intervalHours,
  remindersToday,
  onToggle,
  toggleDisabled,
}: ReminderHeroCardProps) {
  const intervalLabel = formatIntervalLabel(intervalHours);
  const badgeLabel =
    remindersToday === 1 ? '1 aviso hoy' : `${remindersToday} avisos hoy`;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={
          enabled
            ? ['#FFFFFF', reminderUi.mintLight, 'rgba(220, 240, 236, 0.9)']
            : ['#FFFFFF', '#F6F7F8']
        }
        locations={enabled ? [0, 0.5, 1] : [0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerRow}>
        <Text style={styles.cardLabel}>
          {enabled ? 'Recordatorios activos' : 'Recordatorios pausados'}
        </Text>
        <Switch
          accessibilityLabel="Activar recordatorios"
          value={enabled}
          onValueChange={onToggle}
          disabled={toggleDisabled}
          trackColor={{ false: '#E5E7EB', true: 'rgba(18, 163, 154, 0.35)' }}
          thumbColor={enabled ? reminderUi.teal : '#F3F4F6'}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      <View style={styles.body}>
        <View style={[styles.bellCircle, !enabled && styles.bellCircleMuted]}>
          <MaterialIcons
            name="notifications-none"
            size={30}
            color={enabled ? reminderUi.teal : reminderUi.textSecondary}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.heroMetric, !enabled && styles.heroMetricMuted]}>
            Cada {intervalLabel}
          </Text>
          <Text style={styles.heroSub}>Durante tu horario despierto</Text>
          <Text style={[styles.badgeText, !enabled && styles.badgeTextMuted]}>{badgeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: reminderUi.cardRadius,
    borderWidth: 1,
    borderColor: reminderUi.mintBorder,
    backgroundColor: wellness.card,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 8,
    overflow: 'hidden',
    ...wellnessShadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  cardLabel: {
    ...wellnessTypography.body,
    fontWeight: '600',
    color: reminderUi.textSecondary,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bellCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: reminderUi.bellCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellCircleMuted: {
    backgroundColor: '#F2F4F7',
  },
  copy: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  heroMetric: {
    ...wellnessTypography.metricLarge,
    color: reminderUi.teal,
  },
  heroMetricMuted: {
    color: reminderUi.textSecondary,
  },
  heroSub: {
    ...wellnessTypography.body,
    color: reminderUi.textSecondary,
    alignSelf: 'stretch',
  },
  badgeText: {
    ...wellnessTypography.body,
    fontWeight: '600',
    color: reminderUi.tealDark,
    alignSelf: 'stretch',
  },
  badgeTextMuted: {
    color: reminderUi.textSecondary,
  },
});
