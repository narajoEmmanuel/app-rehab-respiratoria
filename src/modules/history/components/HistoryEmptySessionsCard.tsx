/**
 * Purpose: Empty state when no sessions are registered yet on the history screen.
 * Module: history
 */

import { StyleSheet } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  onStartFirstSession: () => void;
};

export function HistoryEmptySessionsCard({ onStartFirstSession }: Props) {
  return (
    <AppCard style={styles.emptySessionsCard}>
      <AppText variant="titleSmall" style={styles.inlineEmptyTitle}>
        Aún no hay sesiones registradas
      </AppText>
      <AppText variant="bodyMedium" style={styles.inlineEmptyText}>
        Tu historial se activará cuando completes tu primera práctica.
      </AppText>
      <AppButton
        title="Comenzar primera sesión"
        onPress={onStartFirstSession}
        variant="primary"
        style={styles.emptySessionsCta}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  emptySessionsCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  emptySessionsCta: {
    marginTop: spacing.xs,
  },
  inlineEmptyTitle: {
    fontSize: 17,
    color: wellness.text,
  },
  inlineEmptyText: {
    color: wellness.textSecondary,
  },
});
