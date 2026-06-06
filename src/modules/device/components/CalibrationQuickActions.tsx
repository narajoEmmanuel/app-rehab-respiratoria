import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol, type IconSymbolName } from '@/src/shared/ui/icon-symbol';

export type CalibrationQuickActionsProps = {
  style?: StyleProp<ViewStyle>;
  /** Si false, solo se muestra «Agregar calibración» (p. ej. sin calibración activa). */
  showTechnicalSummary?: boolean;
};

const CARD_HEIGHT = 172;
const CARD_RADIUS = 25;
const FOOTER_SIZE = 40;

const PRIMARY_GRADIENT = ['#31B8AD', '#078B83'] as const;
const TEAL_ACCENT = '#0B8F86';
const TEAL_ACTION = '#12A39A';

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

type CalibrationActionCardProps = {
  label: string;
  icon: IconSymbolName;
  variant: 'primary' | 'secondary';
  onPress: () => void;
};

function CalibrationActionCard({ label, icon, variant, onPress }: CalibrationActionCardProps) {
  const isPrimary = variant === 'primary';

  const inner = (
    <View style={styles.actionCardInner}>
      <View style={[styles.iconBubble, isPrimary ? styles.iconBubblePrimary : styles.iconBubbleSecondary]}>
        <IconSymbol
          name={icon}
          size={isPrimary ? 22 : 24}
          color={isPrimary ? '#FFFFFF' : TEAL_ACCENT}
        />
      </View>
      <AppText
        variant="chip"
        style={[styles.actionLabel, isPrimary ? styles.actionLabelPrimary : styles.actionLabelSecondary]}>
        {label}
      </AppText>
      <View style={[styles.arrowCircle, isPrimary ? styles.arrowCirclePrimary : styles.arrowCircleSecondary]}>
        <IconSymbol
          name="arrow.right.circle.fill"
          size={18}
          color={isPrimary ? TEAL_ACCENT : '#FFFFFF'}
        />
      </View>
    </View>
  );

  if (isPrimary) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        <LinearGradient
          colors={[...PRIMARY_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardFill}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, styles.actionCardSecondary, pressed && styles.actionPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {inner}
    </Pressable>
  );
}

/** Módulo unificado de acciones de calibración (resumen técnico + agregar). */
export function CalibrationQuickActions({
  style,
  showTechnicalSummary = true,
}: CalibrationQuickActionsProps) {
  const router = useRouter();

  const onTechnicalSummary = () => {
    hapticLight();
    router.push('/calibration-technical-summary');
  };

  const onAddCalibration = () => {
    hapticLight();
    router.push({
      pathname: '/sensor-calibration',
      params: { openCapture: '1', fromTechnicalSummary: '1' },
    });
  };

  return (
    <View style={[styles.module, style]} accessibilityRole="none">
      <View style={styles.cardsRow}>
        {showTechnicalSummary ? (
          <CalibrationActionCard
            label="Ver resumen técnico"
            icon="doc.text.fill"
            variant="primary"
            onPress={onTechnicalSummary}
          />
        ) : null}
        <CalibrationActionCard
          label="Agregar calibración"
          icon="plus.circle.fill"
          variant={showTechnicalSummary ? 'secondary' : 'primary'}
          onPress={onAddCalibration}
        />
      </View>
    </View>
  );
}

const moduleShadow = Platform.select({
  ios: {
    shadowColor: '#4F6F52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  module: {
    backgroundColor: '#F4FAF8',
    borderRadius: 28,
    padding: 12,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.12)',
    ...moduleShadow,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    minWidth: 0,
  },
  actionCardSecondary: {
    backgroundColor: '#F8FCFA',
    borderWidth: 1,
    borderColor: '#E2EEEB',
  },
  actionCardFill: {
    flex: 1,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
  },
  actionCardInner: {
    flex: 1,
    height: CARD_HEIGHT,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubblePrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  iconBubbleSecondary: {
    backgroundColor: 'rgba(11, 143, 134, 0.1)',
  },
  actionLabel: {
    textAlign: 'center',
    letterSpacing: -0.15,
    lineHeight: 17,
    paddingHorizontal: 2,
  },
  actionLabelPrimary: {
    color: '#FFFFFF',
  },
  actionLabelSecondary: {
    color: '#101828',
  },
  arrowCircle: {
    width: FOOTER_SIZE,
    height: FOOTER_SIZE,
    borderRadius: FOOTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCirclePrimary: {
    backgroundColor: '#FFFFFF',
  },
  arrowCircleSecondary: {
    backgroundColor: TEAL_ACTION,
  },
});
