/**
 * Purpose: Therapy level card — premium layout with AppCard, StatusPill, MetricTile.
 * Module: shared/ui
 * Dependencies: AppCard, AppButton, StatusPill, MetricTile, InfoTile, spacing, typography
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessTypography } from '@/src/shared/theme/wellness-theme';

export type TherapyLevelStatusChip = 'completed' | 'in_progress' | 'available' | 'locked' | 'recommended';

type TherapyLevelCardProps = {
  levelNumber: number;
  humanName: string;
  purpose: string;
  accentColor: string;
  statusChip: TherapyLevelStatusChip;
  targetVolumeMl: number;
  requiredHoldMs: number;
  restMs: number;
  repetitionsPerSession: number;
  completedSessionsDisplay: string;
  perfectSessionsDisplay: string;
  helperText?: string;
  locked: boolean;
  starting?: boolean;
  onPress: () => void;
};

const STATUS_CONFIG: Record<
  TherapyLevelStatusChip,
  { label: string; tone: 'success' | 'warning' | 'info' | 'neutral'; buttonLabel: string }
> = {
  completed: { label: 'Completado', tone: 'success', buttonLabel: 'Revisar nivel' },
  in_progress: { label: 'En progreso', tone: 'warning', buttonLabel: 'Continuar nivel' },
  available: { label: 'Disponible', tone: 'info', buttonLabel: 'Iniciar nivel' },
  recommended: { label: 'Recomendado', tone: 'success', buttonLabel: 'Iniciar nivel' },
  locked: { label: 'Bloqueado', tone: 'neutral', buttonLabel: 'Pendiente' },
};

export function TherapyLevelCard({
  levelNumber,
  humanName,
  purpose,
  accentColor,
  statusChip,
  targetVolumeMl,
  requiredHoldMs,
  restMs,
  repetitionsPerSession,
  completedSessionsDisplay,
  perfectSessionsDisplay,
  helperText,
  locked,
  starting = false,
  onPress,
}: TherapyLevelCardProps) {
  const config = STATUS_CONFIG[statusChip];
  const holdSeconds = (requiredHoldMs / 1000).toFixed(0);
  const restSeconds = (restMs / 1000).toFixed(1).replace(/\.0$/, '');

  return (
    <AppCard
      variant={statusChip === 'recommended' ? 'highlight' : locked ? 'soft' : 'default'}
      style={[styles.card, locked && styles.cardLocked]}
      pressable={!locked && !starting}
      onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: locked ? '#E8E8E8' : accentColor }]}>
          <Text style={[styles.levelBadgeText, locked && styles.levelBadgeTextLocked]}>
            {levelNumber}
          </Text>
        </View>
        <View style={styles.headerText}>
          <View style={styles.headerTop}>
            <Text style={styles.levelLabel}>Nivel {levelNumber}</Text>
            <StatusPill label={config.label} tone={config.tone} size="sm" />
          </View>
          <Text style={[styles.humanName, locked && styles.humanNameLocked]} numberOfLines={1}>
            {humanName}
          </Text>
        </View>
      </View>

      <Text style={[styles.purpose, locked && styles.purposeLocked]} numberOfLines={2}>
        {purpose}
      </Text>

      {!locked && (
        <View style={styles.metricsGrid}>
          <MetricTile
            label="Volumen objetivo"
            value={`${targetVolumeMl} mL`}
            size="compact"
            iconName="target"
          />
          <MetricTile
            label="Sostén"
            value={`${holdSeconds} s`}
            size="compact"
            iconName="timer"
          />
          <MetricTile
            label="Descanso"
            value={`${restSeconds} s`}
            size="compact"
            iconName="repeat"
          />
          <MetricTile
            label="Repeticiones"
            value={String(repetitionsPerSession)}
            size="compact"
            iconName="target"
          />
        </View>
      )}

      {!locked && (
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Completadas hoy</Text>
            <Text style={styles.progressValue}>{completedSessionsDisplay}</Text>
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Perfectas</Text>
            <Text style={styles.progressValue}>{perfectSessionsDisplay}</Text>
          </View>
        </View>
      )}

      {helperText ? (
        <Text style={styles.helper} numberOfLines={2}>
          {helperText}
        </Text>
      ) : null}

      {locked ? (
        <View style={styles.lockedMessage}>
          <Text style={styles.lockedMessageText}>
            Completa el nivel anterior para desbloquear este nivel.
          </Text>
        </View>
      ) : (
        <View style={styles.buttonWrap}>
          {starting ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color={wellnessColors.primary} size="small" />
            </View>
          ) : (
            <AppButton
              title={config.buttonLabel}
              onPress={onPress}
              variant={statusChip === 'completed' ? 'secondary' : 'primary'}
            />
          )}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  cardLocked: {
    opacity: 0.88,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  levelBadgeTextLocked: {
    color: '#9CA3AF',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: 2,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.2,
  },
  humanName: {
    ...wellnessTypography.cardTitle,
    fontSize: 19,
    fontWeight: '800',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.2,
  },
  humanNameLocked: {
    color: wellnessColors.textMuted,
  },
  purpose: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  purposeLocked: {
    color: wellnessColors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: wellnessColors.primarySubtle,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing.sm,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    marginBottom: 2,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  progressDivider: {
    width: 1,
    height: 28,
    backgroundColor: wellnessColors.border,
    marginHorizontal: spacing.sm,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  lockedMessage: {
    backgroundColor: wellnessColors.neutralSoft,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: spacing.xs,
  },
  lockedMessageText: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonWrap: {
    marginTop: spacing.xs,
  },
  loadingButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
