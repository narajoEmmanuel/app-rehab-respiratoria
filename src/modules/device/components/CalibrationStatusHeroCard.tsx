import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  wellnessColors,
  wellnessShadows,
  wellnessTypography,
} from '@/src/shared/theme/wellness-theme';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

const STATUS_ACTIVE = {
  ring: 'rgba(52, 171, 165, 0.22)',
  fill: '#E8F6F4',
  icon: wellnessColors.primaryDark,
} as const;

const STATUS_INACTIVE = {
  ring: 'rgba(185, 28, 28, 0.14)',
  fill: '#FDF3F3',
  icon: '#B4534A',
} as const;

const STATUS_RING_SIZE = 80;
const STATUS_ICON_SIZE = 44;

export type CalibrationStatusHeroCardProps = {
  active: boolean;
  title: string;
  /** Texto breve bajo el título cuando no hay calibración activa. */
  subtitle?: string | null;
  spirometerModel?: string | null;
  calibrationDateShort?: string | null;
  style?: StyleProp<ViewStyle>;
};

function StatusIcon({ active }: { active: boolean }) {
  const palette = active ? STATUS_ACTIVE : STATUS_INACTIVE;
  return (
    <View style={[styles.statusRing, { borderColor: palette.ring, backgroundColor: palette.fill }]}>
      <IconSymbol
        name={active ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
        size={STATUS_ICON_SIZE}
        color={palette.icon}
      />
    </View>
  );
}

function DeviceInfoBlock({
  spirometerModel,
  calibrationDateShort,
}: {
  spirometerModel: string;
  calibrationDateShort: string;
}) {
  return (
    <View style={styles.deviceBlock}>
      <View style={styles.deviceIconWrap}>
        <IconSymbol name="lungs.fill" size={20} color={wellnessColors.primaryDark} />
      </View>
      <View style={styles.deviceTextCol}>
        <Text style={styles.deviceModel} numberOfLines={2}>
          {spirometerModel}
        </Text>
        <View style={styles.dateRow}>
          <IconSymbol name="calendar" size={13} color={wellnessColors.textMuted} />
          <Text style={styles.deviceDate}>{calibrationDateShort}</Text>
        </View>
      </View>
    </View>
  );
}

/** Hero card de estado de calibración (activa / no disponible). */
export function CalibrationStatusHeroCard({
  active,
  title,
  subtitle,
  spirometerModel,
  calibrationDateShort,
  style,
}: CalibrationStatusHeroCardProps) {
  const showDevice =
    active && Boolean(spirometerModel) && Boolean(calibrationDateShort);

  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={['rgba(52, 171, 165, 0.07)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.cardGlow}
        pointerEvents="none"
      />
      <View style={styles.decorLine} pointerEvents="none" />

      <View style={styles.content}>
        <StatusIcon active={active} />
        <Text
          style={[
            styles.title,
            showDevice && styles.titleWithDevice,
            !active && subtitle ? styles.titleWithSubtitle : null,
          ]}>
          {title}
        </Text>
        {!active && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {showDevice ? (
          <DeviceInfoBlock
            spirometerModel={spirometerModel!}
            calibrationDateShort={calibrationDateShort!}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: wellnessColors.card,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    overflow: 'hidden',
    ...wellnessShadows.card,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    height: 88,
  },
  decorLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
  },
  content: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  statusRing: {
    width: STATUS_RING_SIZE,
    height: STATUS_RING_SIZE,
    borderRadius: STATUS_RING_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: wellnessTypography.cardTitle.fontWeight,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: wellnessColors.textPrimary,
  },
  titleWithDevice: {
    marginBottom: 12,
  },
  titleWithSubtitle: {
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: wellnessTypography.body.fontWeight,
    textAlign: 'center',
    color: wellnessColors.textSecondary,
    maxWidth: 300,
    paddingHorizontal: 4,
  },
  deviceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginTop: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: wellnessColors.primarySubtle,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.14)',
  },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: wellnessColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...wellnessShadows.soft,
  },
  deviceTextCol: {
    flex: 1,
    gap: 4,
  },
  deviceModel: {
    fontSize: 16,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.15,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deviceDate: {
    fontSize: 13,
    fontWeight: '400',
    color: wellnessColors.textSecondary,
  },
});
