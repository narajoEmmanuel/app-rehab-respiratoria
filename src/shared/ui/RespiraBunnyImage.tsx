/**
 * Purpose: RESPIRA+ bunny mascot as transparent PNG (onboarding, pop-ups, celebrations).
 * Module: shared/ui
 * Dependencies: assets/mascot/*.png
 *
 * Architecture (dual mascot):
 * - RespiraBunny.tsx — programmatic View-based rabbit for level gameplay (do not use here).
 * - RespiraBunnyImage.tsx — illustrated poses for emotional / guide UI surfaces.
 */

import {
  Image,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

/** Default square canvas for layout; replace PNGs in assets/mascot/ without code changes. */
export const RESPIRA_BUNNY_IMAGE_DEFAULT_SIZE = 120;

export type BunnyImagePose =
  | 'idle'
  | 'wave'
  | 'wink'
  | 'celebrate'
  | 'softAlert'
  | 'astronaut';

export type RespiraBunnyImageProps = {
  pose?: BunnyImagePose;
  /** Width and height in px (square frame, resizeMode contain). */
  size?: number;
  opacity?: number;
  style?: StyleProp<ImageStyle>;
};

// Swap each require when final transparent PNGs land in assets/mascot/.
const bunnyIdle = require('../../../assets/mascot/bunny-idle.png');
const bunnyWave = require('../../../assets/mascot/bunny-wave.png');
const bunnyWink = require('../../../assets/mascot/bunny-wink.png');
const bunnyCelebrate = require('../../../assets/mascot/bunny-celebrate.png');
const bunnySoftAlert = require('../../../assets/mascot/bunny-soft-alert.png');
const bunnyAstronaut = require('../../../assets/mascot/bunny-astronaut.png');

/** Fallback when a pose key is unknown — wave reads well in coach / welcome contexts. */
const bunnyImageFallback: ImageSourcePropType = bunnyWave;

const bunnyImageMap: Record<BunnyImagePose, ImageSourcePropType> = {
  idle: bunnyIdle,
  wave: bunnyWave,
  wink: bunnyWink,
  celebrate: bunnyCelebrate,
  softAlert: bunnySoftAlert,
  astronaut: bunnyAstronaut,
};

export function resolveBunnyImageSource(pose: BunnyImagePose): ImageSourcePropType {
  return bunnyImageMap[pose] ?? bunnyImageFallback;
}

/**
 * Illustrated bunny for onboarding, modals, coach bubbles and celebrations.
 * Not for runner gameplay — use RespiraBunny there.
 */
export function RespiraBunnyImage({
  pose = 'idle',
  size = RESPIRA_BUNNY_IMAGE_DEFAULT_SIZE,
  opacity = 1,
  style,
}: RespiraBunnyImageProps) {
  const source = resolveBunnyImageSource(pose);

  return (
    <View pointerEvents="none">
      <Image
        source={source}
        resizeMode="contain"
        style={[{ width: size, height: size, opacity }, style]}
      />
    </View>
  );
}
