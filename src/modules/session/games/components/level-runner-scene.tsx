/**
 * Purpose: Themed parallax layers and goal obstacles for runner levels (forest uses inline hill).
 * Module: session/games
 * Notes: Visual-only — obstacle props must stay aligned to passHeightPx / eval states.
 */
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

/** Pinos con escarcha en segundo plano (laterales; no tapa conejo ni obstáculo). */
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

  const baseW = width * 0.9;
  const baseH = height * 0.36;
  const midW = width * 0.68;
  const midH = height * 0.26;
  const headW = width * 0.48;
  const headH = height * 0.2;
  const hatBrimW = width * 0.58;
  const hatBrimH = Math.max(4, height * 0.04);
  const hatTopW = width * 0.38;
  const hatTopH = height * 0.1;

  return (
    <View style={[sceneStyles.snowmanFigure, { width, height }]}>
      <View
        style={[
          sceneStyles.obstacleSnowmanBase,
          {
            width: baseW,
            height: baseH,
            borderRadius: baseW / 2,
            borderColor,
            bottom: 0,
          },
        ]}>
        <LinearGradient colors={[snowTop, snowBottom]} style={StyleSheet.absoluteFill} />
      </View>
      <View
        style={[
          sceneStyles.obstacleSnowmanMid,
          {
            width: midW,
            height: midH,
            borderRadius: midW / 2,
            borderColor,
            bottom: baseH * 0.82,
          },
        ]}>
        <LinearGradient colors={[snowTop, snowBottom]} style={StyleSheet.absoluteFill} />
      </View>
      <View
        style={[
          sceneStyles.obstacleSnowmanHead,
          {
            width: headW,
            height: headH,
            borderRadius: headW / 2,
            borderColor,
            bottom: baseH * 0.82 + midH * 0.78,
          },
        ]}>
        <LinearGradient colors={[snowTop, snowBottom]} style={StyleSheet.absoluteFill} />
        <View
          style={[
            sceneStyles.obstacleSnowmanEye,
            { left: headW * 0.22, top: headH * 0.35, width: headW * 0.12, height: headW * 0.12 },
          ]}
        />
        <View
          style={[
            sceneStyles.obstacleSnowmanEye,
            { right: headW * 0.22, top: headH * 0.35, width: headW * 0.12, height: headW * 0.12 },
          ]}
        />
        <View
          style={[
            sceneStyles.obstacleSnowmanNose,
            {
              width: headW * 0.22,
              height: headH * 0.18,
              top: headH * 0.48,
              borderRadius: headW * 0.1,
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
            bottom: baseH * 0.82 + midH * 0.78 + headH * 0.92,
          },
        ]}
      />
      <View
        style={[
          sceneStyles.obstacleSnowmanHatTop,
          {
            width: hatTopW,
            height: hatTopH,
            bottom: baseH * 0.82 + midH * 0.78 + headH + hatBrimH * 0.5,
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
  const bodyHeight = Math.min(passHeightPx + 38, visualHeight - 8);

  return (
    <View style={[sceneStyles.snowmanObstacleRoot, { width: visualWidth, height: visualHeight }]} pointerEvents="none">
      <View style={sceneStyles.snowmanObstacleShadow} />
      <View style={[sceneStyles.snowmanObstacleBody, { height: bodyHeight }]}>
        <SnowmanFigure height={bodyHeight} width={visualWidth * 0.92} isAlert={isAlert} />
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
  },
  snowmanFigure: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  obstacleSnowmanBase: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
  },
  obstacleSnowmanMid: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  obstacleSnowmanHead: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
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
});
