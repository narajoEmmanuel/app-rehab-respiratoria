import { StyleSheet, View } from 'react-native';

import { webTouchSurfaceStyle } from '@/src/shared/layout/web-pwa-layout';

const CIRCLE_SIZE = 88;

type TouchInputPressFeedbackProps = {
  visible: boolean;
};

/** Indicador discreto de pulsación (sin texto); no captura toques. */
export function TouchInputPressFeedback({ visible }: TouchInputPressFeedbackProps) {
  if (!visible) return null;

  return (
    <View style={webTouchSurfaceStyle(styles.anchor)} pointerEvents="none">
      <View style={styles.circle} />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 11,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: '20%',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(110, 118, 122, 0.42)',
  },
});
