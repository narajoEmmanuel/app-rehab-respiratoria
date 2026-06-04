/**
 * Purpose: Standalone card wrapping the day/night landscape illustration.
 * Module: notifications
 */

import { StyleSheet, View } from 'react-native';

import { DayNightLandscape } from '@/src/modules/notifications/components/DayNightLandscape';
import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import { wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type DayNightVisualCardProps = {
  scheduleMessage?: string;
  dimmed?: boolean;
};

export function DayNightVisualCard({ scheduleMessage, dimmed }: DayNightVisualCardProps) {
  return (
    <View style={[styles.card, dimmed && styles.dimmed]}>
      <DayNightLandscape scheduleMessage={scheduleMessage} dimmed={dimmed} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: reminderUi.landscapeHeight,
    borderRadius: reminderUi.landscapeRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(220, 235, 231, 0.95)',
    backgroundColor: reminderUi.skyCenter,
    ...wellnessShadows.soft,
  },
  dimmed: {
    opacity: 0.55,
  },
});
