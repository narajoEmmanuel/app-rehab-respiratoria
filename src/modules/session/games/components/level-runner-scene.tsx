/**
 * Purpose: Themed parallax layers and goal obstacles for runner levels (Nivel 1: tractor).
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
  ocean: {
    skyGradient: ['#B8E4F5', '#7EC8E3', '#4A9BB8', '#2E6F8C'],
    sunGlow: 'rgba(120, 200, 230, 0.28)',
    sunDisc: 'rgba(200, 235, 255, 0.5)',
    sunDiscBorder: 'rgba(100, 170, 200, 0.35)',
    cloudPuff: 'rgba(255, 255, 255, 0.35)',
    restToast: 'Descansa · aguas tranquilas',
    introOverlay: 'rgba(140, 200, 225, 0.45)',
    sceneBorder: 'rgba(46, 111, 140, 0.22)',
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
/** Siluetas de fondo marino (rocas / arrecife lejano). */
export function OceanReefSilhouette({ width }: { width: number }) {
  return (
    <View style={[sceneStyles.oceanReefTile, { width }]}>
      <View style={[sceneStyles.oceanReefMound, { left: width * 0.04, width: width * 0.22, height: 42 }]}>
        <LinearGradient
          colors={['rgba(30, 90, 110, 0.35)', 'rgba(20, 65, 85, 0.55)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.oceanReefMoundTall, { left: width * 0.26, width: width * 0.3, height: 58 }]}>
        <LinearGradient
          colors={['rgba(25, 80, 100, 0.4)', 'rgba(15, 55, 75, 0.6)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.oceanReefMound, { left: width * 0.58, width: width * 0.2, height: 36 }]}>
        <LinearGradient
          colors={['rgba(35, 95, 115, 0.32)', 'rgba(22, 70, 90, 0.52)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={[sceneStyles.oceanReefMoundShort, { left: width * 0.78, width: width * 0.18, height: 28 }]}>
        <LinearGradient
          colors={['rgba(40, 100, 120, 0.28)', 'rgba(28, 75, 95, 0.48)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
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

/** Peces, burbujas y siluetas marinas decorativas (fondo fijo). */
export function OceanBackdropLife() {
  return (
    <View style={sceneStyles.oceanLifeRoot} pointerEvents="none">
      <View style={[sceneStyles.oceanFish, sceneStyles.oceanFishLeft]}>
        <View style={sceneStyles.oceanFishBody} />
        <View style={sceneStyles.oceanFishTail} />
      </View>
      <View style={[sceneStyles.oceanFish, sceneStyles.oceanFishMid]}>
        <View style={[sceneStyles.oceanFishBody, sceneStyles.oceanFishBodySmall]} />
        <View style={[sceneStyles.oceanFishTail, sceneStyles.oceanFishTailSmall]} />
      </View>
      <View style={[sceneStyles.oceanFish, sceneStyles.oceanFishRight]}>
        <View style={[sceneStyles.oceanFishBody, sceneStyles.oceanFishBodyOrange]} />
        <View style={sceneStyles.oceanFishTail} />
      </View>
      <View style={[sceneStyles.oceanBubble, { left: '18%', top: '22%' }]} />
      <View style={[sceneStyles.oceanBubble, sceneStyles.oceanBubbleMd, { left: '24%', top: '38%' }]} />
      <View style={[sceneStyles.oceanBubble, sceneStyles.oceanBubbleSm, { left: '72%', top: '28%' }]} />
      <View style={[sceneStyles.oceanBubble, sceneStyles.oceanBubbleMd, { left: '80%', top: '45%' }]} />
      <View style={[sceneStyles.oceanBubble, { left: '55%', top: '18%' }]} />
      <View style={sceneStyles.oceanSharkSilhouette} />
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
  oceanReefTile: {
    height: 88,
    position: 'relative',
  },
  oceanReefMound: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    overflow: 'hidden',
  },
  oceanReefMoundTall: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    overflow: 'hidden',
  },
  oceanReefMoundShort: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 55,
    borderTopRightRadius: 55,
    overflow: 'hidden',
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
  oceanFish: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  oceanFishLeft: {
    left: '12%',
    top: '32%',
    opacity: 0.55,
  },
  oceanFishMid: {
    left: '48%',
    top: '52%',
    opacity: 0.45,
  },
  oceanFishRight: {
    right: '14%',
    top: '40%',
    opacity: 0.5,
  },
  oceanFishBody: {
    width: 18,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(90, 160, 190, 0.7)',
  },
  oceanFishBodySmall: {
    width: 12,
    height: 7,
    borderRadius: 4,
  },
  oceanFishBodyOrange: {
    backgroundColor: 'rgba(230, 150, 90, 0.65)',
  },
  oceanFishTail: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(70, 140, 175, 0.65)',
    marginLeft: -2,
  },
  oceanFishTailSmall: {
    borderTopWidth: 3.5,
    borderBottomWidth: 3.5,
    borderLeftWidth: 5,
  },
  oceanBubble: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  oceanBubbleMd: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  oceanBubbleSm: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  oceanSharkSilhouette: {
    position: 'absolute',
    right: '8%',
    top: '12%',
    width: 48,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 70, 95, 0.18)',
    transform: [{ rotate: '-8deg' }],
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
});
