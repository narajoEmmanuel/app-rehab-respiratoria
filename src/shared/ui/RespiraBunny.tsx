/**
 * Purpose: Reusable RESPIRA+ bunny mascot (extracted from runner level gameplay).
 * Module: shared/ui
 * Dependencies: mascot-tokens
 * Notes: Intrinsic canvas 72×88 px. Gameplay scale stays on the parent (e.g. GAME_VISUAL_SCALE).
 */

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { respiraBunnyTokens } from '@/src/shared/theme/mascot-tokens';

export type RespiraBunnyVariant = 'default' | 'astronaut';
export type RespiraBunnyMood = 'default' | 'crashed';

export type RespiraBunnyProps = {
  variant?: RespiraBunnyVariant;
  mood?: RespiraBunnyMood;
  /** External scale multiplier; default 1 leaves intrinsic 72×88 layout unchanged. */
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Runner protagonist — same hierarchy and proportions as legacy RunnerRabbit.
 * Use variant/mood (not legacy crashed/astronaut booleans) for new screens.
 */
export function RespiraBunny({
  variant = 'default',
  mood = 'default',
  size = 1,
  opacity,
  style,
}: RespiraBunnyProps) {
  const astronaut = variant === 'astronaut';
  const crashed = mood === 'crashed';
  const t = respiraBunnyTokens;

  const fur = astronaut ? t.astronautFur : t.fur;
  const outline = astronaut ? t.astronautOutline : t.outline;
  const innerEar = astronaut ? t.astronautInnerEar : t.innerEar;

  return (
    <View
      style={[
        styles.root,
        opacity != null ? { opacity } : null,
        size !== 1 ? { transform: [{ scale: size }] } : null,
        style,
      ]}
      pointerEvents="none">
      <View style={styles.earsRow}>
        <View
          style={[
            styles.ear,
            { borderColor: outline, backgroundColor: fur },
            crashed && styles.earCrashed,
            astronaut && styles.earAstronaut,
          ]}>
          <View style={[styles.earInner, { backgroundColor: innerEar }]} />
        </View>
        <View
          style={[
            styles.ear,
            { borderColor: outline, backgroundColor: fur },
            crashed && styles.earCrashed,
            astronaut && styles.earAstronaut,
          ]}>
          <View style={[styles.earInner, { backgroundColor: innerEar }]} />
        </View>
      </View>
      <View style={[styles.torso, { borderColor: outline, backgroundColor: astronaut ? t.suitBlue : fur }]}>
        {astronaut ? (
          <View style={styles.suitStripe} />
        ) : (
          <View style={styles.belly} />
        )}
        {astronaut ? (
          <View style={[styles.helmet, { borderColor: outline }]}>
            <View style={[styles.helmetGlass, { backgroundColor: t.helmetGlass }]} />
            {crashed ? (
              <>
                <View style={styles.eyeCrashedLeft} />
                <View style={styles.eyeCrashedRight} />
              </>
            ) : (
              <View style={styles.eyeHelmet} />
            )}
          </View>
        ) : crashed ? (
          <>
            <View style={styles.eyeCrashedLeft} />
            <View style={styles.eyeCrashedRight} />
          </>
        ) : (
          <View style={styles.eye} />
        )}
        {!astronaut ? <View style={styles.nose} /> : null}
      </View>
      <View style={styles.feetRow}>
        <View
          style={[
            styles.foot,
            { borderColor: outline, backgroundColor: astronaut ? t.astronautFoot : undefined },
          ]}
        />
        <View
          style={[
            styles.foot,
            { borderColor: outline, backgroundColor: astronaut ? t.astronautFoot : undefined },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 72,
    height: 88,
    alignItems: 'center',
  },
  earsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: -10,
    zIndex: 2,
  },
  ear: {
    width: 12,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingTop: 5,
  },
  earInner: {
    width: 5,
    height: 14,
    borderRadius: 3,
  },
  torso: {
    width: 50,
    height: 56,
    borderRadius: 26,
    borderWidth: 1.5,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  belly: {
    position: 'absolute',
    width: 26,
    height: 32,
    borderRadius: 16,
    backgroundColor: respiraBunnyTokens.belly,
    bottom: 8,
    opacity: 0.95,
  },
  eye: {
    position: 'absolute',
    top: 18,
    right: 14,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: respiraBunnyTokens.eye,
  },
  eyeCrashedLeft: {
    position: 'absolute',
    top: 20,
    left: 12,
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: respiraBunnyTokens.eye,
    transform: [{ rotate: '18deg' }],
  },
  eyeCrashedRight: {
    position: 'absolute',
    top: 20,
    right: 12,
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: respiraBunnyTokens.eye,
    transform: [{ rotate: '-18deg' }],
  },
  earCrashed: {
    transform: [{ rotate: '-12deg' }],
  },
  earAstronaut: {
    height: 22,
    marginTop: -4,
  },
  suitStripe: {
    position: 'absolute',
    width: 8,
    height: 36,
    borderRadius: 4,
    backgroundColor: respiraBunnyTokens.suitStripe,
    bottom: 10,
  },
  helmet: {
    position: 'absolute',
    top: 4,
    width: 38,
    height: 34,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: respiraBunnyTokens.helmetShell,
  },
  helmetGlass: {
    width: 30,
    height: 26,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: respiraBunnyTokens.helmetGlassBorder,
  },
  eyeHelmet: {
    position: 'absolute',
    top: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: respiraBunnyTokens.eye,
  },
  nose: {
    position: 'absolute',
    top: 26,
    right: 10,
    width: 6,
    height: 5,
    borderRadius: 3,
    backgroundColor: respiraBunnyTokens.nose,
  },
  feetRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: -6,
  },
  foot: {
    width: 16,
    height: 9,
    borderRadius: 5,
    backgroundColor: respiraBunnyTokens.foot,
    borderWidth: 1,
  },
});
