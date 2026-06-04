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
  | 'presenting'
  | 'wave'
  | 'wink'
  | 'error'
  | 'astronaut'
  | 'celebrate'
  | 'happy'
  | 'neutral';

export type RespiraBunnyImageProps = {
  pose?: BunnyImagePose;
  /** Width and height in px (square frame, resizeMode contain). */
  size?: number;
  opacity?: number;
  style?: StyleProp<ImageStyle>;
};

const bunnyPresenting = require('../../../assets/mascot/bunny-presenting.png');
const bunnyWave = require('../../../assets/mascot/bunny-wave.png');
const bunnyWink = require('../../../assets/mascot/bunny-wink.png');
const bunnyError = require('../../../assets/mascot/bunny-error.png');
const bunnyAstronaut = require('../../../assets/mascot/bunny-astronaut.png');
const bunnyCelebrate = require('../../../assets/mascot/bunny-celebrate.png');
const bunnyHappy = require('../../../assets/mascot/bunny-happy.png');
const bunnyNeutral = require('../../../assets/mascot/bunny-neutral.png');

/** Fallback when a pose key is unknown — calm default for guide UI. */
const bunnyImageFallback: ImageSourcePropType = bunnyNeutral;

const bunnyImageMap: Record<BunnyImagePose, ImageSourcePropType> = {
  presenting: bunnyPresenting,
  wave: bunnyWave,
  wink: bunnyWink,
  error: bunnyError,
  astronaut: bunnyAstronaut,
  celebrate: bunnyCelebrate,
  happy: bunnyHappy,
  neutral: bunnyNeutral,
};

const BUNNY_IMAGE_POSE_SET = new Set<string>(Object.keys(bunnyImageMap));

export function resolveBunnyImageSource(pose: BunnyImagePose | string): ImageSourcePropType {
  if (BUNNY_IMAGE_POSE_SET.has(pose)) {
    return bunnyImageMap[pose as BunnyImagePose];
  }
  return bunnyImageFallback;
}

/**
 * Illustrated bunny for onboarding, modals, coach bubbles and celebrations.
 * Not for runner gameplay — use RespiraBunny there.
 */
export function RespiraBunnyImage({
  pose = 'neutral',
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
