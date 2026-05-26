/**
 * Purpose: Therapy level card — accent-tinted premium layout per level color.
 * Module: shared/ui
 * Dependencies: AppButton, AppCard, MetricTile, StatusPill, spacing, typography, wellness-theme
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MetricTile } from '@/src/shared/ui/MetricTile';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadius,
  wellnessShadows,
  wellnessTypography,
} from '@/src/shared/theme/wellness-theme';

export type TherapyLevelStatusChip =
  | 'completed'
  | 'in_progress'
  | 'available'
  | 'locked'
  | 'recommended';

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

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex: string, amount: number): string {
  const cleaned = hex.replace('#', '');
  const r = Math.max(0, parseInt(cleaned.substring(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(cleaned.substring(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(cleaned.substring(4, 6), 16) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function parseProgress(display: string): { current: number; total: number } {
  const parts = display.split('/');
  return {
    current: parseInt(parts[0], 10) || 0,
    total: parseInt(parts[1], 10) || 6,
  };
}

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

  const accentSoftBg = locked ? '#F7F7F7' : hexToRgba(accentColor, 0.02);
  const accentTintBg = locked ? '#F0F0F0' : hexToRgba(accentColor, 0.05);
  const accentBorder = locked ? '#E3E3E3' : hexToRgba(accentColor, 0.14);
  const accentMetricBg = hexToRgba(accentColor, 0.035);
  const accentDark = darkenHex(accentColor, 0.15);

  const perfectProgress = parseProgress(perfectSessionsDisplay);
  const perfectPercent =
    perfectProgress.total > 0
      ? Math.min(100, Math.round((perfectProgress.current / perfectProgress.total) * 100))
      : 0;

  const isHighlight = statusChip === 'recommended';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: accentSoftBg, borderColor: accentBorder },
        isHighlight && { borderColor: hexToRgba(accentColor, 0.28), borderWidth: 2 },
        locked && styles.cardLocked,
        pressed && !locked && !starting && styles.cardPressed,
        wellnessShadows.soft,
      ]}
      onPress={onPress}
      disabled={locked || starting}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked || starting }}>
      {/* Accent left stripe */}
      <View
        style={[
          styles.accentStripe,
          { backgroundColor: locked ? '#D4D4D4' : accentColor },
        ]}
      />

      <View style={styles.body}>
        {/* Header: badge + level label + status */}
        <View style={[styles.headerBg, { backgroundColor: accentTintBg }]}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: locked ? '#E0E0E0' : accentColor },
              ]}>
              <Text style={[styles.levelBadgeText, locked && styles.levelBadgeTextLocked]}>
                {levelNumber}
              </Text>
            </View>
            <View style={styles.headerMeta}>
              <Text style={[styles.levelLabel, !locked && { color: accentDark }]}>
                Nivel {levelNumber}
              </Text>
              <StatusPill label={config.label} tone={config.tone} size="sm" />
            </View>
          </View>
        </View>

        {/* Title — dominant */}
        <Text style={[styles.humanName, locked && styles.humanNameLocked]} numberOfLines={1}>
          {humanName}
        </Text>

        {/* Purpose */}
        <Text style={[styles.purpose, locked && styles.purposeLocked]} numberOfLines={2}>
          {purpose}
        </Text>

        {/* Metrics grid */}
        {!locked && (
          <View style={styles.metricsGrid}>
            <MetricTile
              label="Volumen objetivo"
              value={`${targetVolumeMl} mL`}
              size="compact"
              iconName="target"
              overrideAccent={accentDark}
              overrideBg={accentMetricBg}
            />
            <MetricTile
              label="Sostén"
              value={`${holdSeconds} s`}
              size="compact"
              iconName="timer"
              overrideAccent={accentDark}
              overrideBg={accentMetricBg}
            />
            <MetricTile
              label="Descanso"
              value={`${restSeconds} s`}
              size="compact"
              iconName="repeat"
              overrideAccent={accentDark}
              overrideBg={accentMetricBg}
            />
            <MetricTile
              label="Reps."
              value={String(repetitionsPerSession)}
              size="compact"
              iconName="target"
              overrideAccent={accentDark}
              overrideBg={accentMetricBg}
            />
          </View>
        )}

        {/* Progress bar + counts */}
        {!locked && (
          <View style={styles.progressSection}>
            <View style={styles.progressCounts}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Completadas hoy</Text>
                <Text style={[styles.progressValue, { color: accentDark }]}>
                  {completedSessionsDisplay}
                </Text>
              </View>
              <View style={[styles.progressDivider, { backgroundColor: accentBorder }]} />
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Dentro de meta</Text>
                <Text style={[styles.progressValue, { color: accentDark }]}>
                  {perfectSessionsDisplay}
                </Text>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: hexToRgba(accentColor, 0.10) }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: accentColor,
                    width: `${perfectPercent}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Helper text */}
        {helperText ? (
          <Text style={styles.helper} numberOfLines={2}>
            {helperText}
          </Text>
        ) : null}

        {/* Locked message or CTA */}
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
                <ActivityIndicator color={accentColor} size="small" />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  statusChip === 'completed'
                    ? {
                        backgroundColor: wellnessColors.card,
                        borderWidth: 1,
                        borderColor: accentBorder,
                      }
                    : { backgroundColor: accentColor },
                  pressed && styles.ctaButtonPressed,
                ]}
                onPress={onPress}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.ctaButtonText,
                    statusChip === 'completed' && { color: accentDark },
                  ]}>
                  {config.buttonLabel}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const STRIPE_WIDTH = 5;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: wellnessRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardLocked: {
    opacity: 0.85,
  },
  cardPressed: {
    opacity: 0.95,
  },
  accentStripe: {
    width: STRIPE_WIDTH,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: spacing.md,
  },
  headerBg: {
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderTopRightRadius: wellnessRadius.lg - 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  levelBadgeTextLocked: {
    color: wellnessColors.textMuted,
  },
  headerMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.2,
  },
  humanName: {
    ...wellnessTypography.cardTitle,
    fontSize: 20,
    fontWeight: '800',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
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
  progressSection: {
    marginBottom: spacing.sm,
  },
  progressCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  },
  progressDivider: {
    width: 1,
    height: 24,
    marginHorizontal: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
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
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: wellnessRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
