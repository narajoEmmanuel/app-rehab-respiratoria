/**
 * Purpose: Themed parallax layers and goal obstacles for runner levels (Nivel 1: tractor).
 * Module: session/games
 * Notes: Visual-only — obstacle props must stay aligned to passHeightPx / eval states.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { LevelGameTheme } from '@/src/modules/session/levels/level-gameplay-config';

export type SceneThemeTokens = {
  skyGradient: readonly [string, string, string, string];
  sunGlow: string;
  sunDisc: string;
  sunDiscBorder: string;
  cloudPuff: string;
  restToast: string;
  introOverlay: string;
  sceneBorder: string;
};

export const SCENE_THEME_TOKENS: Record<LevelGameTheme, SceneThemeTokens> = {
  forest: {
    skyGradient: ['#E8F4EC', '#D2E8DA', '#C4DFD0', '#B8D4C4'],
    sunGlow: 'rgba(255, 220, 140, 0.35)',
    sunDisc: '#FFE9A8',
    sunDiscBorder: 'rgba(200, 180, 120, 0.35)',
    cloudPuff: 'rgba(255,255,255,0.92)',
    restToast: 'Descansa · paisaje tranquilo',
    introOverlay: 'rgba(216, 235, 223, 0.42)',
    sceneBorder: 'rgba(79, 111, 82, 0.14)',
  },
  desert: {
    skyGradient: ['#FFF4E0', '#FAD9A8', '#E8B878', '#D4A060'],
    sunGlow: 'rgba(255, 160, 60, 0.42)',
    sunDisc: '#FFD54A',
    sunDiscBorder: 'rgba(220, 140, 40, 0.45)',
    cloudPuff: 'rgba(255, 248, 238, 0.75)',
    restToast: 'Descansa · brisa del desierto',
    introOverlay: 'rgba(252, 228, 190, 0.5)',
    sceneBorder: 'rgba(160, 110, 60, 0.2)',
  },
  snow: {
    skyGradient: ['#FAFEFF', '#EFF7FC', '#DCEEF8', '#C8E2F0'],
    sunGlow: 'rgba(200, 220, 240, 0.35)',
    sunDisc: '#F5FAFF',
    sunDiscBorder: 'rgba(170, 195, 220, 0.4)',
    cloudPuff: 'rgba(255, 255, 255, 0.95)',
    restToast: 'Descansa · aire invernal',
    introOverlay: 'rgba(232, 244, 252, 0.55)',
    sceneBorder: 'rgba(140, 175, 200, 0.22)',
  },
  ocean: {
    skyGradient: ['#8FD4EE', '#5EBAD8', '#3A96B8', '#1E6A8C'],
    sunGlow: 'rgba(120, 200, 230, 0.28)',
    sunDisc: 'rgba(200, 235, 255, 0.5)',
    sunDiscBorder: 'rgba(100, 170, 200, 0.35)',
    cloudPuff: 'rgba(255, 255, 255, 0.35)',
    restToast: 'Descansa · aguas tranquilas',
    introOverlay: 'rgba(80, 160, 195, 0.38)',
    sceneBorder: 'rgba(46, 111, 140, 0.22)',
  },
  space: {
    skyGradient: ['#0B1028', '#121838', '#1A2450', '#243060'],
    sunGlow: 'rgba(180, 140, 255, 0.22)',
    sunDisc: 'rgba(255, 230, 180, 0.55)',
    sunDiscBorder: 'rgba(200, 170, 120, 0.35)',
    cloudPuff: 'rgba(255, 255, 255, 0.15)',
    restToast: 'Descansa · gravedad cero',
    introOverlay: 'rgba(20, 30, 70, 0.45)',
    sceneBorder: 'rgba(100, 120, 200, 0.28)',
  },
};

/** Sol más visible para el cielo desértico (solo presentación). */
export function DesertSun() {
  return (
    <View style={sceneStyles.desertSunWrap} pointerEvents="none">
      <View style={sceneStyles.desertSunHaloOuter} />
      <View style={sceneStyles.desertSunHaloInner} />
      <LinearGradient
        colors={['#FFF8D8', '#FFD54A', '#F5A623']}
        style={sceneStyles.desertSunDisc}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.8, y: 1 }}
      />
    </View>
  );
}

export function DuneSilhouette({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.duneTile, { width }]}>
      <View style={[sceneStyles.duneFar, { left: width * 0.05, width: width * 0.26, height: 48 }]}>
        <LinearGradient
          colors={['rgba(212, 168, 96, 0.35)', 'rgba(180, 130, 70, 0.5)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.duneFarTall, { left: width * 0.28, width: width * 0.32, height: 64 }]}>
        <LinearGradient
          colors={['rgba(200, 150, 80, 0.4)', 'rgba(160, 110, 55, 0.55)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.duneFar, { left: width * 0.6, width: width * 0.22, height: 40 }]}>
        <LinearGradient
          colors={['rgba(220, 175, 100, 0.3)', 'rgba(175, 125, 65, 0.48)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.duneFarShort, { left: width * 0.8, width: width * 0.16, height: 32 }]}>
        <LinearGradient
          colors={['rgba(230, 190, 120, 0.28)', 'rgba(190, 140, 75, 0.42)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
    </View>
  );
}

export function DesertGroundSegment({ width }: { width: number }) {
  const grains = [0.08, 0.22, 0.38, 0.55, 0.7, 0.86];
  return (
    <View style={[sceneStyles.desertGroundTile, { width }]}>
      <LinearGradient
        colors={['#8B7355', '#6B5344', '#4A3D32']}
        style={sceneStyles.desertHorizonBand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <LinearGradient
        colors={['#C9A45C', '#9A7B4A', '#6B5344', '#4A3D32']}
        locations={[0, 0.22, 0.55, 1]}
        style={sceneStyles.desertSandCrest}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['#3A3028', '#2A221C', '#1A1612', '#12100E']}
        locations={[0, 0.35, 0.72, 1]}
        style={sceneStyles.desertSandBody}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255, 200, 120, 0.06)', 'transparent']}
        style={sceneStyles.desertShimmer}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
      {grains.map((left, index) => (
        <View
          key={`grain-${index}`}
          style={[
            sceneStyles.desertGrain,
            {
              left: width * left,
              top: 14 + (index % 3) * 8,
              opacity: 0.25 + (index % 4) * 0.08,
            },
          ]}
        />
      ))}
      <View style={[sceneStyles.desertDuneLine, { left: width * 0.2, width: width * 0.35 }]} />
      <View style={[sceneStyles.desertDuneLine, { left: width * 0.58, width: width * 0.28, opacity: 0.6 }]} />
    </View>
  );
}

/** Cactus fijo en el fondo del escenario (no parallax; no interfiere con conejo/meta). */
export function DesertBackdropCactus({ side = 'left' }: { side?: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <View
      style={[
        sceneStyles.backdropCactusWrap,
        isLeft ? sceneStyles.backdropCactusLeft : sceneStyles.backdropCactusRight,
      ]}
      pointerEvents="none">
      <LinearGradient
        colors={['rgba(74, 108, 72, 0.55)', 'rgba(55, 82, 54, 0.72)']}
        style={sceneStyles.backdropCactusStem}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={[sceneStyles.backdropCactusArm, isLeft ? sceneStyles.backdropArmLeft : sceneStyles.backdropArmRight]} />
      <View style={sceneStyles.backdropCactusArmUpper} />
    </View>
  );
}

export function DesertNearDecor({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.desertNearTile, { width }]}>
      <View style={[sceneStyles.nearDuneRoll, { left: width * 0.08, width: 44 }]} />
      <View style={[sceneStyles.cactusWrap, { left: width * 0.22 }]}>
        <LinearGradient
          colors={['#5A7A52', '#3D5A3C']}
          style={sceneStyles.cactusStem}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={sceneStyles.cactusArmLeft} />
      </View>
      <View style={[sceneStyles.cactusWrapSmall, { left: width * 0.48 }]}>
        <LinearGradient colors={['#4E6E48', '#355535']} style={sceneStyles.cactusStemSmall} />
      </View>
      <View style={[sceneStyles.nearDuneRoll, { left: width * 0.72, width: 52, opacity: 0.7 }]} />
    </View>
  );
}

export function SnowHillSilhouette({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.snowHillTile, { width }]}>
      <View style={[sceneStyles.snowHillMound, { left: width * 0.06, width: width * 0.28, height: 50 }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.75)', 'rgba(220, 235, 245, 0.9)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.snowHillMoundTall, { left: width * 0.3, width: width * 0.34, height: 66 }]}>
        <LinearGradient
          colors={['rgba(248, 252, 255, 0.8)', 'rgba(210, 228, 240, 0.92)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.snowHillMound, { left: width * 0.62, width: width * 0.24, height: 44 }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.7)', 'rgba(225, 238, 248, 0.88)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
    </View>
  );
}

export function SnowGroundSegment({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.snowGroundTile, { width }]}>
      <LinearGradient
        colors={['#FFFFFF', '#F2F8FC', '#E4EFF8']}
        style={sceneStyles.snowGroundTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['#E8F2FA', '#D6E6F2', '#C5D8E8']}
        locations={[0, 0.5, 1]}
        style={sceneStyles.snowGroundBody}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={[sceneStyles.snowDrift, { left: width * 0.18, width: width * 0.32 }]} />
      <View style={[sceneStyles.snowDrift, { left: width * 0.55, width: width * 0.26, opacity: 0.65 }]} />
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
        style={sceneStyles.snowGroundShine}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
    </View>
  );
}

export function SnowNearDecor({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.snowNearTile, { width }]}>
      <View style={[sceneStyles.snowBump, { left: width * 0.15 }]} />
      <View style={[sceneStyles.snowBumpSmall, { left: width * 0.42 }]} />
      <View style={[sceneStyles.snowBump, { left: width * 0.7, width: 38 }]} />
    </View>
  );
}

/** Bandas horizontales de profundidad (sin formas de montaña/cielo). */
export function OceanWaterDepthLayer({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.oceanDepthTile, { width }]}>
      <LinearGradient
        colors={['rgba(46, 130, 160, 0.22)', 'rgba(30, 95, 125, 0.14)', 'transparent']}
        style={sceneStyles.oceanDepthBandTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={[sceneStyles.oceanDepthBandMid, { width: width * 0.72 }]} />
      <View style={[sceneStyles.oceanDepthBandLow, { width: width * 0.55 }]} />
    </View>
  );
}

function OceanFishSprite({
  bodyWidth,
  bodyHeight,
  tailScale = 1,
  bodyColor,
  tailColor,
}: {
  bodyWidth: number;
  bodyHeight: number;
  tailScale?: number;
  bodyColor: string;
  tailColor: string;
}) {
  const tailW = Math.round(10 * tailScale);
  const tailH = Math.round(5 * tailScale);
  return (
    <View style={sceneStyles.oceanFishSpriteRow}>
      <View
        style={[
          sceneStyles.oceanFishBodyShape,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderRadius: bodyHeight / 2,
            backgroundColor: bodyColor,
          },
        ]}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: tailH,
          borderBottomWidth: tailH,
          borderLeftWidth: tailW,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: tailColor,
          marginLeft: -2,
        }}
      />
    </View>
  );
}

function AnimatedOceanFish({
  top,
  left,
  bodyWidth,
  bodyHeight,
  bodyColor,
  tailColor,
  swimRange,
  durationMs,
  facingRight = true,
}: {
  top: `${number}%` | number;
  left: `${number}%` | number;
  bodyWidth: number;
  bodyHeight: number;
  bodyColor: string;
  tailColor: string;
  swimRange: number;
  durationMs: number;
  facingRight?: boolean;
}) {
  const swim = useSharedValue(0);

  useEffect(() => {
    swim.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [durationMs, swim]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(swim.value, [0, 1], facingRight ? [0, swimRange] : [-swimRange, 0]) },
      { scaleX: facingRight ? 1 : -1 },
    ],
  }));

  return (
    <Animated.View style={[sceneStyles.oceanFishAnimated, { top, left }, style]} pointerEvents="none">
      <OceanFishSprite
        bodyWidth={bodyWidth}
        bodyHeight={bodyHeight}
        tailScale={bodyHeight / 10}
        bodyColor={bodyColor}
        tailColor={tailColor}
      />
    </Animated.View>
  );
}

function RisingOceanBubble({
  left,
  size,
  delayMs,
  durationMs,
  startTop,
}: {
  left: `${number}%` | number;
  size: number;
  delayMs: number;
  durationMs: number;
  startTop: `${number}%` | number;
}) {
  const rise = useSharedValue(0);

  useEffect(() => {
    rise.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false),
    );
  }, [delayMs, durationMs, rise]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(rise.value, [0, 1], [0, -130]) }],
    opacity: interpolate(rise.value, [0, 0.08, 0.75, 1], [0, 0.9, 0.85, 0]),
  }));

  return (
    <Animated.View
      style={[
        sceneStyles.oceanBubbleRising,
        {
          left,
          top: startTop,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

/** Peces, burbujas y algas — solo fondo marino (sin cielo). */
export function OceanBackdropLife() {
  return (
    <View style={sceneStyles.oceanLifeRoot} pointerEvents="none">
      <LinearGradient
        colors={['rgba(120, 210, 240, 0.18)', 'transparent', 'rgba(20, 80, 110, 0.12)']}
        style={sceneStyles.oceanCausticWash}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <AnimatedOceanFish
        top="28%"
        left="8%"
        bodyWidth={26}
        bodyHeight={14}
        bodyColor="rgba(90, 175, 210, 0.88)"
        tailColor="rgba(55, 130, 170, 0.85)"
        swimRange={36}
        durationMs={4200}
        facingRight
      />
      <AnimatedOceanFish
        top="44%"
        left="22%"
        bodyWidth={20}
        bodyHeight={11}
        bodyColor="rgba(255, 180, 100, 0.82)"
        tailColor="rgba(210, 130, 70, 0.8)"
        swimRange={28}
        durationMs={3600}
        facingRight={false}
      />
      <AnimatedOceanFish
        top="36%"
        left="48%"
        bodyWidth={22}
        bodyHeight={12}
        bodyColor="rgba(100, 190, 175, 0.85)"
        tailColor="rgba(60, 145, 130, 0.82)"
        swimRange={32}
        durationMs={4800}
        facingRight
      />
      <AnimatedOceanFish
        top="52%"
        left="62%"
        bodyWidth={18}
        bodyHeight={10}
        bodyColor="rgba(130, 200, 230, 0.8)"
        tailColor="rgba(70, 150, 190, 0.78)"
        swimRange={24}
        durationMs={3200}
        facingRight={false}
      />
      <AnimatedOceanFish
        top="24%"
        left="72%"
        bodyWidth={24}
        bodyHeight={13}
        bodyColor="rgba(240, 150, 110, 0.78)"
        tailColor="rgba(190, 100, 70, 0.75)"
        swimRange={30}
        durationMs={3900}
        facingRight
      />
      <AnimatedOceanFish
        top="58%"
        left="14%"
        bodyWidth={16}
        bodyHeight={9}
        bodyColor="rgba(170, 220, 245, 0.75)"
        tailColor="rgba(100, 170, 210, 0.72)"
        swimRange={20}
        durationMs={2800}
        facingRight
      />
      <AnimatedOceanFish
        top="32%"
        left="84%"
        bodyWidth={19}
        bodyHeight={10}
        bodyColor="rgba(85, 165, 200, 0.8)"
        tailColor="rgba(50, 120, 160, 0.78)"
        swimRange={22}
        durationMs={3400}
        facingRight={false}
      />

      <RisingOceanBubble left="12%" size={11} delayMs={0} durationMs={5200} startTop="68%" />
      <RisingOceanBubble left="20%" size={7} delayMs={800} durationMs={4600} startTop="72%" />
      <RisingOceanBubble left="31%" size={9} delayMs={400} durationMs={5000} startTop="65%" />
      <RisingOceanBubble left="42%" size={6} delayMs={1200} durationMs={4200} startTop="70%" />
      <RisingOceanBubble left="53%" size={10} delayMs={200} durationMs={5400} startTop="74%" />
      <RisingOceanBubble left="61%" size={8} delayMs={600} durationMs={4800} startTop="66%" />
      <RisingOceanBubble left="70%" size={12} delayMs={1000} durationMs={5600} startTop="69%" />
      <RisingOceanBubble left="78%" size={6} delayMs={300} durationMs={4400} startTop="73%" />
      <RisingOceanBubble left="86%" size={9} delayMs={1400} durationMs={5100} startTop="67%" />
      <RisingOceanBubble left="92%" size={7} delayMs={500} durationMs={4700} startTop="71%" />

      <View style={[sceneStyles.oceanKelpCluster, sceneStyles.oceanKelpLeft]}>
        <View style={sceneStyles.oceanKelpStrand} />
        <View style={[sceneStyles.oceanKelpStrand, sceneStyles.oceanKelpStrandAlt]} />
      </View>
      <View style={[sceneStyles.oceanKelpCluster, sceneStyles.oceanKelpRight]}>
        <View style={[sceneStyles.oceanKelpStrand, sceneStyles.oceanKelpStrandTall]} />
      </View>
    </View>
  );
}

export function OceanSandGroundSegment({ width }: { width: number }) {
  const grains = [0.1, 0.28, 0.45, 0.62, 0.78];
  return (
    <View style={[sceneStyles.oceanSandTile, { width }]}>
      <LinearGradient
        colors={['#6BB8C8', '#4A9BB0', '#357A92']}
        style={sceneStyles.oceanWaterBand}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['#E8D4A8', '#C9B07A', '#A89060', '#8A7550']}
        locations={[0, 0.25, 0.55, 1]}
        style={sceneStyles.oceanSandCrest}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['#B8A078', '#9A8668', '#7A6A52', '#5C5040']}
        locations={[0, 0.35, 0.72, 1]}
        style={sceneStyles.oceanSandBody}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.08)', 'transparent']}
        style={sceneStyles.oceanSandShine}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
      {grains.map((left, index) => (
        <View
          key={`sand-grain-${index}`}
          style={[
            sceneStyles.oceanSandGrain,
            {
              left: width * left,
              top: 16 + (index % 3) * 6,
              opacity: 0.2 + (index % 3) * 0.1,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function OceanNearDecor({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.oceanNearTile, { width }]}>
      <View style={[sceneStyles.oceanSeaweed, { left: width * 0.12 }]}>
        <LinearGradient colors={['#5A9E6A', '#3D7A52', '#2A5C3E']} style={sceneStyles.oceanSeaweedBlade} />
        <View style={[sceneStyles.oceanSeaweedBlade, sceneStyles.oceanSeaweedBladeOffset]} />
      </View>
      <View style={[sceneStyles.oceanSeaweedSmall, { left: width * 0.38 }]}>
        <LinearGradient colors={['#4E9462', '#356848']} style={sceneStyles.oceanSeaweedBladeSmall} />
      </View>
      <View style={[sceneStyles.oceanCoralBump, { left: width * 0.58 }]} />
      <View style={[sceneStyles.oceanSeaweed, { left: width * 0.76, transform: [{ scaleX: -1 }] }]}>
        <LinearGradient colors={['#62A872', '#428A5C', '#2E6244']} style={sceneStyles.oceanSeaweedBlade} />
      </View>
    </View>
  );
}

function TreasureChestFigure({
  height,
  width,
  isAlert,
}: {
  height: number;
  width: number;
  isAlert: boolean;
}) {
  const woodLight = isAlert ? '#8A6A48' : '#B8864A';
  const woodDark = isAlert ? '#5C4430' : '#7A5A32';
  const goldLight = isAlert ? '#C9A840' : '#FFD54A';
  const goldDark = isAlert ? '#9A7830' : '#E8B830';
  const chestW = Math.round(width * 0.82);
  const chestH = Math.round(height * 0.55);
  const lidH = Math.round(chestH * 0.38);
  const baseH = chestH - lidH;

  return (
    <View style={[sceneStyles.treasureFigure, { width, height }]}>
      <View style={[sceneStyles.treasureCoin, { left: width * 0.08, bottom: 4, opacity: 0.85 }]}>
        <LinearGradient colors={[goldLight, goldDark]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[sceneStyles.treasureCoin, sceneStyles.treasureCoinSm, { left: width * 0.2, bottom: 2 }]}>
        <LinearGradient colors={[goldLight, goldDark]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[sceneStyles.treasureCoin, { right: width * 0.1, bottom: 6, opacity: 0.9 }]}>
        <LinearGradient colors={[goldLight, goldDark]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[sceneStyles.treasureCoin, sceneStyles.treasureCoinSm, { right: width * 0.22, bottom: 1 }]}>
        <LinearGradient colors={[goldLight, goldDark]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[sceneStyles.treasureChestBase, { width: chestW, height: baseH }]}>
        <LinearGradient
          colors={[woodLight, woodDark]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 1 }}
        />
        <View style={sceneStyles.treasureChestBand} />
        <View style={[sceneStyles.treasureChestLock, { backgroundColor: goldDark, borderColor: goldLight }]} />
      </View>
      <View style={[sceneStyles.treasureChestLid, { width: chestW, height: lidH, bottom: baseH - 2 }]}>
        <LinearGradient
          colors={[woodLight, woodDark]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        />
        <View style={[sceneStyles.treasureChestLidCurve, { borderColor: woodDark }]} />
        <View style={[sceneStyles.treasureChestBand, { top: lidH * 0.55 }]} />
      </View>
      <View style={[sceneStyles.treasureCoinStack, { left: chestW * 0.35, bottom: baseH + lidH * 0.15 }]}>
        <View style={sceneStyles.treasureCoinStackPiece}>
          <LinearGradient colors={[goldLight, goldDark]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[sceneStyles.treasureCoinStackPiece, sceneStyles.treasureCoinStackOffset]}>
          <LinearGradient colors={[goldLight, goldDark]} style={StyleSheet.absoluteFill} />
        </View>
      </View>
    </View>
  );
}

export function InspirationMetaTreasureChest({
  passHeightPx,
  evaluating,
  cleared,
  touching,
  visualHeight,
  visualWidth,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
  visualHeight: number;
  visualWidth: number;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const bodyHeight = Math.min(passHeightPx + 42, visualHeight - 8);
  const figureScale = 1.12;

  return (
    <View
      style={[sceneStyles.treasureObstacleRoot, { width: visualWidth, height: visualHeight }]}
      pointerEvents="none">
      <View style={sceneStyles.treasureObstacleShadow} />
      <View style={[sceneStyles.treasureObstacleBody, { height: bodyHeight }]}>
        <View
          style={[
            sceneStyles.treasureFigureScaleWrap,
            {
              width: visualWidth,
              height: bodyHeight,
              transform: [
                { translateY: -Math.round(bodyHeight * (figureScale - 1) * 0.5) },
                { scale: figureScale },
              ],
            },
          ]}>
          <TreasureChestFigure height={bodyHeight} width={visualWidth} isAlert={isAlert} />
        </View>
      </View>
      {touching ? <View style={sceneStyles.treasureObstacleContactTint} /> : null}
    </View>
  );
}

const SPACE_STAR_POSITIONS: { top: `${number}%`; left: `${number}%`; size: number; opacity: number }[] = [
  { top: '8%', left: '6%', size: 2, opacity: 0.9 },
  { top: '14%', left: '18%', size: 3, opacity: 0.75 },
  { top: '22%', left: '32%', size: 2, opacity: 0.85 },
  { top: '10%', left: '44%', size: 2, opacity: 0.7 },
  { top: '18%', left: '58%', size: 3, opacity: 0.8 },
  { top: '12%', left: '72%', size: 2, opacity: 0.65 },
  { top: '26%', left: '84%', size: 2, opacity: 0.9 },
  { top: '34%', left: '12%', size: 2, opacity: 0.6 },
  { top: '30%', left: '48%', size: 2, opacity: 0.75 },
  { top: '38%', left: '66%', size: 3, opacity: 0.7 },
  { top: '42%', left: '28%', size: 2, opacity: 0.55 },
  { top: '46%', left: '90%', size: 2, opacity: 0.8 },
  { top: '52%', left: '8%', size: 2, opacity: 0.65 },
  { top: '56%', left: '52%', size: 2, opacity: 0.5 },
  { top: '48%', left: '78%', size: 2, opacity: 0.7 },
];

function SpacePlanet({
  top,
  left,
  size,
  colors,
}: {
  top: `${number}%` | number;
  left: `${number}%` | number;
  size: number;
  colors: [string, string];
}) {
  return (
    <View
      style={[
        sceneStyles.spacePlanet,
        {
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }} />
      <View style={[sceneStyles.spacePlanetRing, { width: size * 1.35, height: size * 0.28, borderRadius: size * 0.14 }]} />
    </View>
  );
}

function AnimatedSpaceRocket({
  top,
  startLeft,
  bodyColor,
  flameColor,
  travelRange,
  durationMs,
}: {
  top: `${number}%` | number;
  startLeft: `${number}%` | number;
  bodyColor: string;
  flameColor: string;
  travelRange: number;
  durationMs: number;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, durationMs]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drift.value, [0, 1], [0, travelRange]) }],
  }));

  return (
    <Animated.View style={[sceneStyles.spaceRocketWrap, { top, left: startLeft }, style]} pointerEvents="none">
      <View style={[sceneStyles.spaceRocketBody, { backgroundColor: bodyColor }]} />
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: 5,
          borderBottomWidth: 5,
          borderLeftWidth: 10,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: flameColor,
          marginLeft: -2,
          opacity: 0.85,
        }}
      />
    </Animated.View>
  );
}

/** Nebulosa y bandas de profundidad (sin montañas). */
export function SpaceDepthLayer({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.spaceDepthTile, { width }]}>
      <LinearGradient
        colors={['rgba(120, 80, 180, 0.18)', 'rgba(60, 40, 120, 0.1)', 'transparent']}
        style={sceneStyles.spaceDepthNebulaTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[sceneStyles.spaceDepthBandMid, { width: width * 0.68 }]} />
      <View style={[sceneStyles.spaceDepthBandLow, { width: width * 0.5 }]} />
    </View>
  );
}

/** Estrellas, planetas, cohetes y luna — fondo galáctico. */
export function SpaceBackdropLife() {
  return (
    <View style={sceneStyles.spaceLifeRoot} pointerEvents="none">
      <LinearGradient
        colors={['rgba(80, 60, 160, 0.12)', 'transparent', 'rgba(20, 40, 90, 0.15)']}
        style={sceneStyles.spaceNebulaWash}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      {SPACE_STAR_POSITIONS.map((star, index) => (
        <View
          key={`space-star-${index}`}
          style={[
            sceneStyles.spaceTwinkleStar,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}

      <SpacePlanet top="20%" left="10%" size={28} colors={['#E8A870', '#C06040']} />
      <SpacePlanet top="32%" left="68%" size={22} colors={['#88B8E8', '#4068A0']} />
      <SpacePlanet top="14%" left="78%" size={16} colors={['#C8A0E0', '#7050A0']} />

      <View style={sceneStyles.spaceMoon}>
        <LinearGradient colors={['#E8ECF4', '#B8C0D0']} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }} />
        <View style={sceneStyles.spaceMoonCraterA} />
        <View style={sceneStyles.spaceMoonCraterB} />
      </View>

      <AnimatedSpaceRocket
        top="24%"
        startLeft="36%"
        bodyColor="rgba(220, 230, 245, 0.9)"
        flameColor="rgba(255, 160, 80, 0.85)"
        travelRange={42}
        durationMs={5200}
      />
      <AnimatedSpaceRocket
        top="40%"
        startLeft="18%"
        bodyColor="rgba(200, 210, 230, 0.82)"
        flameColor="rgba(255, 130, 70, 0.8)"
        travelRange={-36}
        durationMs={4600}
      />
    </View>
  );
}

export function SpaceGroundSegment({ width }: { width: number }) {
  const craters = [0.14, 0.38, 0.62, 0.82];
  return (
    <View style={[sceneStyles.spaceGroundTile, { width }]}>
      <LinearGradient
        colors={['rgba(40, 50, 80, 0.35)', 'rgba(30, 38, 65, 0.2)']}
        style={sceneStyles.spaceGroundHorizon}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['#9A9AA8', '#787888', '#5A5A68', '#42424E']}
        locations={[0, 0.3, 0.65, 1]}
        style={sceneStyles.spaceGroundBody}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.06)', 'transparent']}
        style={sceneStyles.spaceGroundShine}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
      {craters.map((left, index) => (
        <View
          key={`crater-${index}`}
          style={[
            sceneStyles.spaceCrater,
            {
              left: width * left,
              width: 14 + (index % 2) * 6,
              height: 6 + (index % 2) * 2,
              opacity: 0.35 + (index % 2) * 0.1,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function SpaceNearDecor({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.spaceNearTile, { width }]}>
      <View style={[sceneStyles.spaceRock, { left: width * 0.1 }]} />
      <View style={[sceneStyles.spaceRock, sceneStyles.spaceRockSm, { left: width * 0.34 }]} />
      <View style={[sceneStyles.spaceSatellite, { left: width * 0.58 }]}>
        <View style={sceneStyles.spaceSatelliteBody} />
        <View style={sceneStyles.spaceSatellitePanelLeft} />
        <View style={sceneStyles.spaceSatellitePanelRight} />
      </View>
      <View style={[sceneStyles.spaceRock, { left: width * 0.82, opacity: 0.7 }]} />
    </View>
  );
}

function GoalRocketFigure({
  height,
  width,
  isAlert,
}: {
  height: number;
  width: number;
  isAlert: boolean;
}) {
  const bodyLight = isAlert ? '#A8B0C8' : '#E8ECF8';
  const bodyDark = isAlert ? '#6A7288' : '#9AA8C8';
  const noseLight = isAlert ? '#D0A060' : '#FF9860';
  const noseDark = isAlert ? '#A07040' : '#E06040';
  const finColor = isAlert ? '#7888A0' : '#B0BCD8';
  const flameOuter = isAlert ? 'rgba(255, 140, 60, 0.55)' : 'rgba(255, 160, 80, 0.85)';
  const flameInner = isAlert ? 'rgba(255, 200, 100, 0.45)' : 'rgba(255, 220, 140, 0.9)';

  const rocketH = Math.round(Math.min(height * 0.92, width * 1.35));
  const rocketW = Math.round(rocketH * 0.42);
  const noseH = Math.round(rocketH * 0.22);
  const bodyH = Math.round(rocketH * 0.52);
  const finH = Math.round(rocketH * 0.14);
  const flameH = Math.round(rocketH * 0.1);

  return (
    <View style={[sceneStyles.goalRocketFigure, { width, height: rocketH }]}>
      <View style={[sceneStyles.goalRocketFlameOuter, { width: rocketW * 0.5, height: flameH, borderRadius: flameH / 2, backgroundColor: flameOuter }]} />
      <View style={[sceneStyles.goalRocketFlameInner, { width: rocketW * 0.28, height: flameH * 0.72, borderRadius: flameH / 2, backgroundColor: flameInner }]} />
      <View style={[sceneStyles.goalRocketFin, sceneStyles.goalRocketFinLeft, { borderBottomColor: finColor, borderLeftWidth: rocketW * 0.28, borderRightWidth: 0, borderBottomWidth: finH }]} />
      <View style={[sceneStyles.goalRocketFin, sceneStyles.goalRocketFinRight, { borderBottomColor: finColor, borderRightWidth: rocketW * 0.28, borderLeftWidth: 0, borderBottomWidth: finH }]} />
      <View style={[sceneStyles.goalRocketBody, { width: rocketW, height: bodyH }]}>
        <LinearGradient colors={[bodyLight, bodyDark]} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} />
        <View style={sceneStyles.goalRocketStripe} />
        <View style={[sceneStyles.goalRocketWindow, { borderColor: isAlert ? '#88A0C0' : '#C8E0FF' }]}>
          <View style={[sceneStyles.goalRocketWindowGlass, { backgroundColor: isAlert ? 'rgba(140, 170, 200, 0.5)' : 'rgba(160, 210, 255, 0.65)' }]} />
        </View>
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: rocketW / 2,
          borderRightWidth: rocketW / 2,
          borderBottomWidth: noseH,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: noseDark,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: 0,
          height: 0,
          borderLeftWidth: rocketW * 0.38,
          borderRightWidth: rocketW * 0.38,
          borderBottomWidth: noseH * 0.88,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: noseLight,
        }}
      />
    </View>
  );
}

/** Cohete vertical como meta de inspiración (Nivel 5). */
export function InspirationMetaRocket({
  passHeightPx,
  evaluating,
  cleared,
  touching,
  visualHeight,
  visualWidth,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
  visualHeight: number;
  visualWidth: number;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const bodyHeight = Math.min(passHeightPx + 42, visualHeight - 8);
  const figureScale = 1.1;

  return (
    <View
      style={[sceneStyles.rocketObstacleRoot, { width: visualWidth, height: visualHeight }]}
      pointerEvents="none">
      <View style={sceneStyles.rocketObstacleShadow} />
      <View style={[sceneStyles.rocketObstacleBody, { height: bodyHeight }]}>
        <View
          style={[
            sceneStyles.rocketFigureScaleWrap,
            {
              width: visualWidth,
              height: bodyHeight,
              transform: [
                { translateY: -Math.round(bodyHeight * (figureScale - 1) * 0.5) },
                { scale: figureScale },
              ],
            },
          ]}>
          <GoalRocketFigure height={bodyHeight} width={visualWidth} isAlert={isAlert} />
        </View>
      </View>
      {cleared && evaluating ? (
        <View style={[sceneStyles.rocketClearedGlow, { bottom: bodyHeight * 0.35 }]} />
      ) : null}
      {touching ? <View style={sceneStyles.rocketObstacleContactTint} /> : null}
    </View>
  );
}

export function SnowBackdropPines() {
  return (
    <View style={sceneStyles.pineBackdropRoot} pointerEvents="none">
      <View style={sceneStyles.pineBackdropLeft}>
        <FrostedPineTree scale={1.2} />
        <View style={sceneStyles.pineBackdropGap} />
        <FrostedPineTree scale={1} />
        <View style={sceneStyles.pineBackdropGap} />
        <FrostedPineTree scale={0.82} />
        <View style={sceneStyles.pineBackdropGapWide} />
        <FrostedPineTree scale={0.68} />
      </View>
      <View style={sceneStyles.pineBackdropRight}>
        <FrostedPineTree scale={0.9} />
        <View style={sceneStyles.pineBackdropGap} />
        <FrostedPineTree scale={0.72} />
        <View style={sceneStyles.pineBackdropGapWide} />
        <FrostedPineTree scale={0.58} />
      </View>
    </View>
  );
}

function FrostedPineTree({ scale = 1 }: { scale?: number }) {
  const h = Math.round(62 * scale);
  const w = Math.round(34 * scale);
  return (
    <View style={[sceneStyles.pineTree, { width: w, height: h }]}>
      <View style={[sceneStyles.pineLayer, { width: w * 0.55, height: h * 0.22, top: 0 }]}>
        <View style={sceneStyles.pineFoliage} />
        <View style={sceneStyles.pineFrostCap} />
      </View>
      <View style={[sceneStyles.pineLayer, { width: w * 0.72, height: h * 0.26, top: h * 0.14 }]}>
        <View style={sceneStyles.pineFoliage} />
        <View style={sceneStyles.pineFrostCap} />
      </View>
      <View style={[sceneStyles.pineLayer, { width: w * 0.9, height: h * 0.3, top: h * 0.32 }]}>
        <View style={sceneStyles.pineFoliage} />
        <View style={sceneStyles.pineFrostCap} />
      </View>
      <View style={[sceneStyles.pineTrunk, { width: w * 0.18, height: h * 0.14, bottom: 0 }]} />
    </View>
  );
}

function SnowmanFigure({
  height,
  width,
  isAlert,
}: {
  height: number;
  width: number;
  isAlert: boolean;
}) {
  const snowTop = isAlert ? '#E8EEF4' : '#FFFFFF';
  const snowBottom = isAlert ? '#C8D4E0' : '#E8F2FA';
  const borderColor = isAlert ? 'rgba(140, 160, 180, 0.35)' : 'rgba(180, 200, 220, 0.28)';

  /** Esferas con diámetro único (ancho = alto) para que no se vean aplastadas. */
  const baseD = Math.round(Math.min(width * 0.9, height * 0.42));
  const midD = Math.round(Math.min(width * 0.7, height * 0.31));
  const headD = Math.round(Math.min(width * 0.52, height * 0.24));
  const hatBrimW = Math.round(headD * 1.2);
  const hatBrimH = Math.max(5, Math.round(height * 0.05));
  const hatTopW = Math.round(headD * 0.82);
  const hatTopH = Math.round(height * 0.12);

  const midBottom = Math.round(baseD * 0.56);
  const headBottom = midBottom + Math.round(midD * 0.56);
  const hatBottom = headBottom + Math.round(headD * 0.9);

  const sphereHighlight = 'rgba(255, 255, 255, 0.42)';

  const renderSphere = (diameter: number, bottom: number) => (
    <View
      style={[
        sceneStyles.obstacleSnowmanSphere,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderColor,
          bottom,
        },
      ]}>
      <LinearGradient
        colors={[snowTop, snowBottom]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View
        style={[
          sceneStyles.obstacleSnowmanSphereHighlight,
          {
            width: diameter * 0.34,
            height: diameter * 0.22,
            borderRadius: diameter * 0.17,
            top: diameter * 0.14,
            left: diameter * 0.18,
            backgroundColor: sphereHighlight,
          },
        ]}
      />
    </View>
  );

  return (
    <View style={[sceneStyles.snowmanFigure, { width, height }]}>
      {renderSphere(baseD, 0)}
      {renderSphere(midD, midBottom)}
      <View
        style={[
          sceneStyles.obstacleSnowmanSphere,
          sceneStyles.obstacleSnowmanHead,
          {
            width: headD,
            height: headD,
            borderRadius: headD / 2,
            borderColor,
            bottom: headBottom,
          },
        ]}>
        <LinearGradient
          colors={[snowTop, snowBottom]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        <View
          style={[
            sceneStyles.obstacleSnowmanSphereHighlight,
            {
              width: headD * 0.34,
              height: headD * 0.22,
              borderRadius: headD * 0.17,
              top: headD * 0.14,
              left: headD * 0.18,
              backgroundColor: sphereHighlight,
            },
          ]}
        />
        <View
          style={[
            sceneStyles.obstacleSnowmanEye,
            {
              left: headD * 0.24,
              top: headD * 0.36,
              width: headD * 0.11,
              height: headD * 0.11,
              borderRadius: headD * 0.055,
            },
          ]}
        />
        <View
          style={[
            sceneStyles.obstacleSnowmanEye,
            {
              right: headD * 0.24,
              top: headD * 0.36,
              width: headD * 0.11,
              height: headD * 0.11,
              borderRadius: headD * 0.055,
            },
          ]}
        />
        <View
          style={[
            sceneStyles.obstacleSnowmanNose,
            {
              width: headD * 0.2,
              height: headD * 0.12,
              top: headD * 0.5,
              borderRadius: headD * 0.08,
            },
          ]}
        />
      </View>
      <View
        style={[
          sceneStyles.obstacleSnowmanHatBrim,
          {
            width: hatBrimW,
            height: hatBrimH,
            bottom: hatBottom,
          },
        ]}
      />
      <View
        style={[
          sceneStyles.obstacleSnowmanHatTop,
          {
            width: hatTopW,
            height: hatTopH,
            bottom: hatBottom + Math.round(hatBrimH * 0.42),
            borderRadius: hatTopW * 0.15,
          },
        ]}
      />
    </View>
  );
}

export function InspirationMetaSnowman({
  passHeightPx,
  evaluating,
  cleared,
  touching,
  visualHeight,
  visualWidth,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
  visualHeight: number;
  visualWidth: number;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const bodyHeight = Math.min(passHeightPx + 40, visualHeight - 8);
  const figureScale = 1.2;

  return (
    <View style={[sceneStyles.snowmanObstacleRoot, { width: visualWidth, height: visualHeight }]} pointerEvents="none">
      <View style={sceneStyles.snowmanObstacleShadow} />
      <View style={[sceneStyles.snowmanObstacleBody, { height: bodyHeight }]}>
        <View
          style={[
            sceneStyles.snowmanFigureScaleWrap,
            {
              width: visualWidth,
              height: bodyHeight,
              transform: [
                { translateY: -Math.round(bodyHeight * (figureScale - 1) * 0.5) },
                { scale: figureScale },
              ],
            },
          ]}>
          <SnowmanFigure height={bodyHeight} width={visualWidth} isAlert={isAlert} />
        </View>
      </View>
      {touching ? <View style={sceneStyles.snowmanObstacleContactTint} /> : null}
    </View>
  );
}

const SNOWBALL_LAYERS = 5;

export function InspirationMetaSnowball({
  passHeightPx,
  evaluating,
  cleared,
  touching,
  visualHeight,
  visualWidth,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
  visualHeight: number;
  visualWidth: number;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const bodyHeight = Math.min(passHeightPx + 36, visualHeight - 8);
  const layerH = Math.max(8, Math.floor(bodyHeight / SNOWBALL_LAYERS));

  const snowLight = isAlert ? '#C8D4E0' : '#FFFFFF';
  const snowMid = isAlert ? '#A8B8C8' : '#F0F6FC';
  const snowShadow = isAlert ? '#8A9AA8' : '#D0DEE8';

  return (
    <View style={[sceneStyles.snowballRoot, { width: visualWidth, height: visualHeight }]} pointerEvents="none">
      <View style={sceneStyles.snowballGroundShadow} />
      <View style={[sceneStyles.snowballStack, { height: bodyHeight }]}>
        {Array.from({ length: SNOWBALL_LAYERS }, (_, i) => {
          const tier = i / (SNOWBALL_LAYERS - 1);
          const layerWidth = visualWidth * (0.42 + tier * 0.52);
          return (
            <View
              key={`snow-layer-${i}`}
              style={[
                sceneStyles.snowballLayer,
                {
                  width: layerWidth,
                  height: layerH,
                  marginTop: i === 0 ? 0 : -Math.round(layerH * 0.22),
                  borderRadius: layerWidth / 2,
                },
              ]}>
              <LinearGradient
                colors={[snowLight, snowMid, snowShadow]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.85, y: 1 }}
              />
              <View style={sceneStyles.snowballLayerShade} />
              <View style={sceneStyles.snowballLayerHighlight} />
              {i % 2 === 0 ? (
                <View style={[sceneStyles.snowballSpeck, { left: '28%', top: '35%' }]} />
              ) : null}
            </View>
          );
        })}
      </View>
      {touching ? <View style={sceneStyles.snowballContactTint} /> : null}
    </View>
  );
}

/** Tractor rojo unificado — meta de altura del Nivel 1 (solo visual). */
function TractorFigure({
  height,
  width,
  passMarkPx,
  isAlert,
}: {
  height: number;
  width: number;
  passMarkPx: number;
  isAlert: boolean;
}) {
  const outline = isAlert ? '#5C1818' : '#4A1414';
  const redLight = isAlert ? '#D84343' : '#F05555';
  const redMain = isAlert ? '#C62828' : '#E53935';
  const redDark = isAlert ? '#9E1F1F' : '#C62828';
  const redDeep = isAlert ? '#7A1818' : '#A31515';
  const glass = 'rgba(24, 28, 34, 0.78)';
  const glassBorder = 'rgba(18, 20, 26, 0.55)';
  const metal = isAlert ? '#4A5058' : '#5A626A';
  const tire = '#262A30';
  const rim = '#707880';
  const headlight = isAlert ? '#E8D8A8' : '#FFF6D8';

  const rearR = Math.round(height * 0.28);
  const frontR = Math.round(height * 0.19);
  const wheelLine = 0;
  const deckBottom = Math.round(rearR * 0.44);
  const deckH = Math.round(height * 0.34);
  const deckL = Math.round(width * 0.04);
  const deckW = Math.round(width * 0.92);
  const cabW = Math.round(width * 0.42);
  const cabH = Math.round(height * 0.4);
  const cabL = Math.round(width * 0.14);
  const cabB = deckBottom + Math.round(deckH * 0.52);
  const hoodW = Math.round(width * 0.48);
  const hoodH = Math.round(height * 0.26);
  const hoodL = cabL + Math.round(cabW * 0.52);
  const hoodB = deckBottom + Math.round(deckH * 0.38);
  const stackW = Math.round(width * 0.09);
  const stackBase = cabB + Math.round(cabH * 0.55);
  const stackH = Math.max(14, passMarkPx - stackBase);
  const stackR = cabL + Math.round(cabW * 0.78);

  return (
    <View style={[sceneStyles.tractorFigure, { width, height }]}>
      <View
        style={[
          sceneStyles.tractorWheel,
          {
            width: rearR,
            height: rearR,
            left: Math.round(width * 0.06),
            bottom: wheelLine,
            borderRadius: rearR / 2,
            borderColor: outline,
            backgroundColor: tire,
          },
        ]}>
        <View
          style={[
            sceneStyles.tractorWheelRim,
            {
              width: rearR * 0.44,
              height: rearR * 0.44,
              borderRadius: rearR * 0.22,
              backgroundColor: rim,
            },
          ]}
        />
        <View style={sceneStyles.tractorWheelHub} />
      </View>

      <View
        style={[
          sceneStyles.tractorWheel,
          {
            width: frontR,
            height: frontR,
            left: Math.round(width * 0.68),
            bottom: wheelLine + 1,
            borderRadius: frontR / 2,
            borderColor: outline,
            backgroundColor: tire,
          },
        ]}>
        <View
          style={[
            sceneStyles.tractorWheelRim,
            {
              width: frontR * 0.42,
              height: frontR * 0.42,
              borderRadius: frontR * 0.21,
              backgroundColor: rim,
            },
          ]}
        />
      </View>

      <View
        style={[
          sceneStyles.tractorDeck,
          {
            width: deckW,
            height: deckH,
            left: deckL,
            bottom: deckBottom,
            borderColor: outline,
          },
        ]}>
        <LinearGradient
          colors={[redLight, redMain, redDark]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        />
        <View style={sceneStyles.tractorDeckShade} />
        <View style={[sceneStyles.tractorDeckStripe, { backgroundColor: redDeep }]} />
      </View>

      <View
        style={[
          sceneStyles.tractorHood,
          {
            width: hoodW,
            height: hoodH,
            left: hoodL,
            bottom: hoodB,
            borderColor: outline,
          },
        ]}>
        <LinearGradient
          colors={[redMain, redDark, redDeep]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.95, y: 1 }}
        />
        <View style={[sceneStyles.tractorGrille, { borderColor: outline }]} />
        <View style={[sceneStyles.tractorHeadlight, { backgroundColor: headlight, borderColor: outline }]} />
        <View style={sceneStyles.tractorHoodHighlight} />
      </View>

      <View
        style={[
          sceneStyles.tractorCabin,
          {
            width: cabW,
            height: cabH,
            left: cabL,
            bottom: cabB,
            borderColor: outline,
          },
        ]}>
        <LinearGradient
          colors={[redLight, redMain, redDark]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.85, y: 1 }}
        />
        <View style={[sceneStyles.tractorCabinRoof, { backgroundColor: redDark, borderColor: outline }]} />
        <View
          style={[
            sceneStyles.tractorWindow,
            sceneStyles.tractorWindowLeft,
            { backgroundColor: glass, borderColor: glassBorder },
          ]}
        />
        <View
          style={[
            sceneStyles.tractorWindow,
            sceneStyles.tractorWindowRight,
            { backgroundColor: glass, borderColor: glassBorder },
          ]}
        />
        <View style={[sceneStyles.tractorDoorLine, { backgroundColor: redDeep }]} />
      </View>

      <View
        style={[
          sceneStyles.tractorExhaust,
          {
            width: stackW,
            height: stackH,
            left: stackR,
            bottom: stackBase,
            backgroundColor: metal,
            borderColor: outline,
          },
        ]}
      />
      <View
        style={[
          sceneStyles.tractorExhaustCap,
          {
            width: stackW + 5,
            height: 7,
            left: stackR - 2,
            bottom: passMarkPx - 3,
            backgroundColor: metal,
            borderColor: outline,
          },
        ]}
      />
    </View>
  );
}

export function InspirationMetaTractor({
  passHeightPx,
  evaluating,
  cleared,
  touching,
  visualHeight,
  visualWidth,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
  visualHeight: number;
  visualWidth: number;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const bodyHeight = Math.min(passHeightPx + 40, visualHeight - 8);
  const passMarkPx = Math.min(passHeightPx - 8, bodyHeight - 6);
  const figureScale = 1.14;

  return (
    <View style={[sceneStyles.tractorObstacleRoot, { width: visualWidth, height: visualHeight }]} pointerEvents="none">
      <View style={sceneStyles.tractorGroundShadow} />
      <View style={[sceneStyles.tractorObstacleBody, { height: bodyHeight }]}>
        <View
          style={[
            sceneStyles.tractorFigureScaleWrap,
            {
              width: visualWidth,
              height: bodyHeight,
              transform: [
                { translateY: -Math.round(bodyHeight * (figureScale - 1) * 0.5) },
                { scale: figureScale },
              ],
            },
          ]}>
          <TractorFigure
            height={bodyHeight}
            width={visualWidth}
            passMarkPx={passMarkPx}
            isAlert={isAlert}
          />
        </View>
      </View>
      {touching ? <View style={sceneStyles.tractorObstacleContactTint} /> : null}
    </View>
  );
}

const PYRAMID_COURSE_COUNT = 8;

export function InspirationMetaPyramid({
  passHeightPx,
  evaluating,
  cleared,
  touching,
  visualHeight,
  visualWidth,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
  visualHeight: number;
  visualWidth: number;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const bodyHeight = Math.min(passHeightPx + 38, visualHeight - 8);
  const courseH = Math.max(6, Math.floor(bodyHeight / PYRAMID_COURSE_COUNT));

  const stoneLight = isAlert ? '#A08050' : '#E8C878';
  const stoneMid = isAlert ? '#7A6040' : '#C9A050';
  const stoneDark = isAlert ? '#5C4830' : '#9A7838';
  const stoneDeep = isAlert ? '#443528' : '#7A5C28';

  return (
    <View style={[sceneStyles.pyramidRoot, { width: visualWidth, height: visualHeight }]} pointerEvents="none">
      <View style={sceneStyles.pyramidSandBase} />
      <View style={sceneStyles.pyramidGroundShadow} />

      <View style={[sceneStyles.pyramidStack, { height: bodyHeight }]}>
        <View
          style={[
            sceneStyles.pyramidApex,
            {
              borderBottomColor: stoneLight,
            },
          ]}
        />
        {Array.from({ length: PYRAMID_COURSE_COUNT }, (_, i) => {
          const tier = i / PYRAMID_COURSE_COUNT;
          const tierWidth = visualWidth * (0.38 + tier * 0.58);
          const isEven = i % 2 === 0;
          return (
            <View
              key={`course-${i}`}
              style={[
                sceneStyles.pyramidCourse,
                { width: tierWidth, height: courseH, marginTop: i === 0 ? 1 : 1 },
              ]}>
              <LinearGradient
                colors={
                  isEven
                    ? [stoneLight, stoneMid, stoneDark]
                    : [stoneMid, stoneDark, stoneDeep]
                }
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
              />
              <View style={sceneStyles.pyramidCourseShade} />
              <View style={sceneStyles.pyramidCourseHighlight} />
            </View>
          );
        })}
      </View>

      {touching ? <View style={sceneStyles.pyramidContactTint} /> : null}
    </View>
  );
}

const sceneStyles = StyleSheet.create({
  desertSunWrap: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desertSunHaloOuter: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 150, 50, 0.22)',
  },
  desertSunHaloInner: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 190, 80, 0.35)',
  },
  desertSunDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 150, 40, 0.5)',
  },
  duneTile: {
    height: 88,
    position: 'relative',
  },
  duneFar: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    overflow: 'hidden',
  },
  duneFarTall: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    overflow: 'hidden',
  },
  duneFarShort: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    overflow: 'hidden',
  },
  desertGroundTile: {
    height: 72,
    position: 'relative',
    overflow: 'hidden',
  },
  desertHorizonBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.5,
  },
  desertSandCrest: {
    height: 26,
    width: '100%',
  },
  desertSandBody: {
    flex: 1,
    width: '100%',
  },
  desertShimmer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 20,
  },
  desertGrain: {
    position: 'absolute',
    width: 3,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 220, 160, 0.35)',
  },
  desertDuneLine: {
    position: 'absolute',
    bottom: 18,
    height: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: 'rgba(255, 200, 120, 0.08)',
  },
  backdropCactusWrap: {
    position: 'absolute',
    bottom: 108,
    width: 22,
    height: 52,
    alignItems: 'center',
    opacity: 0.62,
    zIndex: 1,
  },
  backdropCactusLeft: {
    left: 10,
  },
  backdropCactusRight: {
    right: 14,
  },
  backdropCactusStem: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 46,
    borderRadius: 5,
  },
  backdropCactusArm: {
    position: 'absolute',
    width: 12,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(52, 78, 50, 0.75)',
  },
  backdropArmLeft: {
    top: 18,
    left: -4,
  },
  backdropArmRight: {
    top: 20,
    right: -4,
  },
  backdropCactusArmUpper: {
    position: 'absolute',
    top: 8,
    right: 2,
    width: 9,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(58, 86, 56, 0.65)',
  },
  desertNearTile: {
    height: 40,
    position: 'relative',
  },
  nearDuneRoll: {
    position: 'absolute',
    bottom: 0,
    height: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(90, 65, 40, 0.4)',
  },
  cactusWrap: {
    position: 'absolute',
    bottom: 0,
    width: 16,
    height: 26,
    alignItems: 'center',
  },
  cactusStem: {
    width: 9,
    height: 24,
    borderRadius: 5,
  },
  cactusArmLeft: {
    position: 'absolute',
    top: 10,
    left: -5,
    width: 11,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3D5A3C',
  },
  cactusWrapSmall: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 16,
    alignItems: 'center',
  },
  cactusStemSmall: {
    width: 6,
    height: 14,
    borderRadius: 3,
  },
  pyramidRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pyramidSandBase: {
    position: 'absolute',
    bottom: -2,
    width: '94%',
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(60, 45, 30, 0.35)',
  },
  pyramidGroundShadow: {
    position: 'absolute',
    bottom: 4,
    width: '86%',
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(25, 18, 10, 0.32)',
  },
  pyramidStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pyramidCourse: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  pyramidCourseShade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '22%',
    backgroundColor: 'rgba(40, 28, 16, 0.18)',
  },
  pyramidCourseHighlight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '40%',
    width: '18%',
    backgroundColor: 'rgba(255, 235, 190, 0.12)',
  },
  pyramidApex: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E8C878',
    marginTop: -1,
  },
  pyramidContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 45, 30, 0.16)',
    borderRadius: 8,
  },
  snowHillTile: {
    height: 88,
    position: 'relative',
  },
  snowHillMound: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    overflow: 'hidden',
  },
  snowHillMoundTall: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    overflow: 'hidden',
  },
  snowGroundTile: {
    height: 72,
    position: 'relative',
    overflow: 'hidden',
  },
  snowGroundTop: {
    height: 30,
    width: '100%',
  },
  snowGroundBody: {
    flex: 1,
    width: '100%',
  },
  snowDrift: {
    position: 'absolute',
    bottom: 14,
    height: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  snowGroundShine: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 18,
  },
  snowNearTile: {
    height: 40,
    position: 'relative',
  },
  snowBump: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  snowBumpSmall: {
    position: 'absolute',
    bottom: 0,
    width: 28,
    height: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: 'rgba(240, 248, 255, 0.7)',
  },
  pineBackdropRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  pineBackdropLeft: {
    position: 'absolute',
    left: 4,
    bottom: 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    opacity: 0.62,
    maxWidth: '38%',
  },
  pineBackdropRight: {
    position: 'absolute',
    right: 4,
    bottom: 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    opacity: 0.52,
    maxWidth: '32%',
  },
  pineBackdropGap: {
    width: 5,
  },
  pineBackdropGapWide: {
    width: 8,
  },
  pineTree: {
    position: 'relative',
    alignItems: 'center',
  },
  pineLayer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  pineFoliage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3D6B52',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  pineFrostCap: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pineTrunk: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#5C4A38',
    borderRadius: 2,
  },
  snowmanObstacleRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  snowmanObstacleShadow: {
    position: 'absolute',
    bottom: 2,
    width: '84%',
    height: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(120, 150, 175, 0.3)',
  },
  snowmanObstacleBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  snowmanFigureScaleWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  snowmanFigure: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  obstacleSnowmanSphere: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  obstacleSnowmanSphereHighlight: {
    position: 'absolute',
  },
  obstacleSnowmanHead: {
    alignItems: 'center',
  },
  obstacleSnowmanEye: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: '#3A4550',
  },
  obstacleSnowmanNose: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#E8A050',
  },
  obstacleSnowmanHatBrim: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#4A5568',
    borderRadius: 2,
  },
  obstacleSnowmanHatTop: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#3D4856',
  },
  snowmanObstacleContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 130, 160, 0.14)',
    borderRadius: 12,
  },
  snowballRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  snowballGroundShadow: {
    position: 'absolute',
    bottom: 2,
    width: '82%',
    height: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(120, 150, 175, 0.28)',
  },
  snowballStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  snowballLayer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200, 220, 235, 0.35)',
  },
  snowballLayerShade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '24%',
    backgroundColor: 'rgba(140, 165, 185, 0.14)',
  },
  snowballLayerHighlight: {
    position: 'absolute',
    right: '8%',
    top: '12%',
    width: '22%',
    height: '35%',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  snowballSpeck: {
    position: 'absolute',
    width: 5,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  snowballContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 130, 160, 0.14)',
    borderRadius: 12,
  },
  tractorObstacleRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tractorGroundShadow: {
    position: 'absolute',
    bottom: 4,
    width: '78%',
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(50, 35, 35, 0.14)',
  },
  tractorObstacleBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
    overflow: 'visible',
  },
  tractorFigureScaleWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tractorFigure: {
    position: 'relative',
    alignSelf: 'center',
    justifyContent: 'flex-end',
  },
  tractorWheel: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tractorWheelRim: {
    position: 'absolute',
  },
  tractorWheelHub: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1E2228',
  },
  tractorDeck: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: 2,
  },
  tractorDeckShade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '28%',
    backgroundColor: 'rgba(40, 12, 12, 0.18)',
  },
  tractorDeckStripe: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '42%',
    height: 4,
    borderRadius: 2,
    opacity: 0.55,
  },
  tractorHood: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: 3,
  },
  tractorHoodHighlight: {
    position: 'absolute',
    left: '18%',
    top: '14%',
    width: '35%',
    height: '30%',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tractorGrille: {
    position: 'absolute',
    left: 5,
    top: '26%',
    bottom: '26%',
    width: 9,
    borderRadius: 2,
    borderWidth: 1.5,
    backgroundColor: 'rgba(30, 30, 34, 0.5)',
  },
  tractorHeadlight: {
    position: 'absolute',
    right: 7,
    top: '30%',
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  tractorCabin: {
    position: 'absolute',
    borderRadius: 11,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: 4,
  },
  tractorWindow: {
    position: 'absolute',
    top: '24%',
    height: '46%',
    borderRadius: 4,
    borderWidth: 1.5,
  },
  tractorWindowLeft: {
    left: '11%',
    width: '33%',
  },
  tractorWindowRight: {
    right: '11%',
    width: '33%',
  },
  tractorDoorLine: {
    position: 'absolute',
    left: '48%',
    top: '28%',
    width: 2,
    height: '44%',
    borderRadius: 1,
    opacity: 0.35,
  },
  tractorCabinRoof: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: -5,
    height: 9,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 2,
  },
  tractorExhaust: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1.5,
    zIndex: 5,
  },
  tractorExhaustCap: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 1.5,
    zIndex: 6,
  },
  tractorObstacleContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 95, 80, 0.12)',
    borderRadius: 12,
  },
  oceanDepthTile: {
    height: 88,
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  oceanDepthBandTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  oceanDepthBandMid: {
    height: 14,
    marginBottom: 10,
    marginLeft: '8%',
    backgroundColor: 'rgba(40, 110, 140, 0.1)',
    borderRadius: 2,
  },
  oceanDepthBandLow: {
    height: 10,
    marginBottom: 6,
    marginLeft: '22%',
    backgroundColor: 'rgba(30, 90, 120, 0.08)',
    borderRadius: 2,
  },
  oceanSandTile: {
    height: 72,
    position: 'relative',
    overflow: 'hidden',
  },
  oceanWaterBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    opacity: 0.55,
  },
  oceanSandCrest: {
    height: 24,
    width: '100%',
  },
  oceanSandBody: {
    flex: 1,
    width: '100%',
  },
  oceanSandShine: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 18,
  },
  oceanSandGrain: {
    position: 'absolute',
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 240, 200, 0.35)',
  },
  oceanNearTile: {
    height: 40,
    position: 'relative',
  },
  oceanSeaweed: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 28,
    alignItems: 'center',
  },
  oceanSeaweedSmall: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 18,
    alignItems: 'center',
  },
  oceanSeaweedBlade: {
    width: 8,
    height: 22,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  oceanSeaweedBladeSmall: {
    width: 6,
    height: 14,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  oceanSeaweedBladeOffset: {
    position: 'absolute',
    left: 5,
    height: 18,
    top: 6,
    opacity: 0.85,
    backgroundColor: '#3D7A52',
    width: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  oceanCoralBump: {
    position: 'absolute',
    bottom: 0,
    width: 22,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(200, 120, 100, 0.45)',
  },
  oceanLifeRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  oceanCausticWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  oceanFishAnimated: {
    position: 'absolute',
  },
  oceanFishSpriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  oceanFishBodyShape: {
    opacity: 0.92,
  },
  oceanBubbleRising: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  oceanKelpCluster: {
    position: 'absolute',
    bottom: 100,
    width: 28,
    height: 56,
    opacity: 0.5,
  },
  oceanKelpLeft: {
    left: 6,
  },
  oceanKelpRight: {
    right: 8,
  },
  oceanKelpStrand: {
    position: 'absolute',
    left: 8,
    bottom: 0,
    width: 6,
    height: 48,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(45, 110, 85, 0.55)',
  },
  oceanKelpStrandAlt: {
    left: 16,
    height: 38,
    opacity: 0.75,
  },
  oceanKelpStrandTall: {
    height: 52,
    left: 10,
  },
  treasureObstacleRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  treasureObstacleShadow: {
    position: 'absolute',
    bottom: 0,
    left: '12%',
    right: '12%',
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 60, 80, 0.2)',
  },
  treasureObstacleBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  treasureFigureScaleWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  treasureFigure: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  treasureChestBase: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(60, 40, 25, 0.35)',
    alignSelf: 'center',
  },
  treasureChestLid: {
    position: 'absolute',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(60, 40, 25, 0.35)',
    alignSelf: 'center',
  },
  treasureChestLidCurve: {
    position: 'absolute',
    top: -4,
    left: '8%',
    right: '8%',
    height: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  treasureChestBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(50, 35, 22, 0.45)',
    top: '42%',
  },
  treasureChestLock: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    width: 12,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  treasureCoin: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(180, 140, 40, 0.5)',
    overflow: 'hidden',
  },
  treasureCoinSm: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  treasureCoinStack: {
    position: 'absolute',
    width: 20,
    height: 16,
  },
  treasureCoinStackPiece: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 50, 0.55)',
    overflow: 'hidden',
  },
  treasureCoinStackOffset: {
    left: 5,
    top: -4,
    opacity: 0.9,
  },
  treasureObstacleContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(80, 120, 150, 0.14)',
    borderRadius: 12,
  },
  spaceDepthTile: {
    height: 88,
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  spaceDepthNebulaTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  spaceDepthBandMid: {
    height: 12,
    marginBottom: 10,
    marginLeft: '10%',
    backgroundColor: 'rgba(80, 60, 140, 0.12)',
    borderRadius: 2,
  },
  spaceDepthBandLow: {
    height: 8,
    marginBottom: 6,
    marginLeft: '24%',
    backgroundColor: 'rgba(50, 70, 120, 0.1)',
    borderRadius: 2,
  },
  spaceLifeRoot: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  spaceNebulaWash: {
    ...StyleSheet.absoluteFillObject,
  },
  spaceTwinkleStar: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  spacePlanet: {
    position: 'absolute',
    overflow: 'hidden',
  },
  spacePlanetRing: {
    position: 'absolute',
    top: '42%',
    left: '-18%',
    borderWidth: 1,
    borderColor: 'rgba(200, 180, 220, 0.35)',
    backgroundColor: 'transparent',
    transform: [{ rotate: '-18deg' }],
  },
  spaceMoon: {
    position: 'absolute',
    top: '8%',
    right: '6%',
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    opacity: 0.88,
  },
  spaceMoonCraterA: {
    position: 'absolute',
    top: 10,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(140, 150, 170, 0.35)',
  },
  spaceMoonCraterB: {
    position: 'absolute',
    top: 18,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(120, 130, 150, 0.3)',
  },
  spaceRocketWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceRocketBody: {
    width: 18,
    height: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(180, 190, 210, 0.5)',
  },
  spaceGroundTile: {
    height: 72,
    position: 'relative',
    overflow: 'hidden',
  },
  spaceGroundHorizon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  spaceGroundBody: {
    flex: 1,
    width: '100%',
  },
  spaceGroundShine: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 16,
  },
  spaceCrater: {
    position: 'absolute',
    top: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(50, 50, 60, 0.45)',
  },
  spaceNearTile: {
    height: 40,
    position: 'relative',
  },
  spaceRock: {
    position: 'absolute',
    bottom: 0,
    width: 16,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#6A6A78',
    borderWidth: 1,
    borderColor: 'rgba(180, 180, 200, 0.25)',
  },
  spaceRockSm: {
    width: 10,
    height: 7,
    opacity: 0.75,
  },
  spaceSatellite: {
    position: 'absolute',
    bottom: 4,
    width: 28,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceSatelliteBody: {
    width: 10,
    height: 8,
    borderRadius: 3,
    backgroundColor: '#A8B0C8',
    borderWidth: 1,
    borderColor: 'rgba(200, 210, 230, 0.4)',
  },
  spaceSatellitePanelLeft: {
    position: 'absolute',
    left: 0,
    width: 8,
    height: 4,
    backgroundColor: 'rgba(100, 160, 220, 0.55)',
    borderRadius: 1,
  },
  spaceSatellitePanelRight: {
    position: 'absolute',
    right: 0,
    width: 8,
    height: 4,
    backgroundColor: 'rgba(100, 160, 220, 0.55)',
    borderRadius: 1,
  },
  goalRocketFigure: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  goalRocketFlameOuter: {
    position: 'absolute',
    bottom: 0,
  },
  goalRocketFlameInner: {
    position: 'absolute',
    bottom: 2,
  },
  goalRocketFin: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopWidth: 0,
  },
  goalRocketFinLeft: {
    left: '18%',
  },
  goalRocketFinRight: {
    right: '18%',
  },
  goalRocketBody: {
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(180, 195, 220, 0.45)',
  },
  goalRocketStripe: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    width: '56%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 80, 80, 0.75)',
  },
  goalRocketWindow: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    width: '42%',
    height: '28%',
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  goalRocketWindowGlass: {
    width: '88%',
    height: '88%',
    borderRadius: 999,
  },
  rocketObstacleRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rocketObstacleShadow: {
    position: 'absolute',
    bottom: 0,
    width: '70%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(20, 30, 60, 0.35)',
  },
  rocketObstacleBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rocketFigureScaleWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rocketClearedGlow: {
    position: 'absolute',
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(120, 200, 255, 0.35)',
  },
  rocketObstacleContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 120, 80, 0.14)',
    borderRadius: 12,
  },
});
