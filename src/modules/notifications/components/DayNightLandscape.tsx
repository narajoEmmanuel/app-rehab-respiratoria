/**
 * Purpose: Premium dawn-to-dusk landscape — visual only (no inputs).
 * Module: notifications
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';

const VIEW_W = 360;
const VIEW_H = 220;

const SUN_CX = 56;
const MOON_CX = 304;
/** Shared vertical anchor so sun and moon sit on the same horizon line. */
const CELESTIAL_CY = 50;

const CELESTIAL_HALO_OUTER = 28;
const CELESTIAL_HALO_INNER = 22;
const SUN_BODY_R = 13;
const MOON_BODY_R = 12;
/** Nudge so the waning crescent (lit on the left) sits centered in the halo. */
const MOON_OPTICAL_OFFSET_X = 1.2;

function SunGraphic() {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x1: SUN_CX + Math.cos(rad) * 20,
      y1: CELESTIAL_CY + Math.sin(rad) * 20,
      x2: SUN_CX + Math.cos(rad) * 26,
      y2: CELESTIAL_CY + Math.sin(rad) * 26,
    };
  });

  return (
    <G>
      <Circle
        cx={SUN_CX}
        cy={CELESTIAL_CY}
        r={CELESTIAL_HALO_OUTER}
        fill="rgba(255, 214, 140, 0.2)"
      />
      <Circle
        cx={SUN_CX}
        cy={CELESTIAL_CY}
        r={CELESTIAL_HALO_INNER}
        fill="rgba(255, 228, 170, 0.32)"
      />
      {rays.map((ray, i) => (
        <Line
          key={`sun-ray-${i}`}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke="rgba(244, 183, 64, 0.42)"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      ))}
      <Circle cx={SUN_CX} cy={CELESTIAL_CY} r={SUN_BODY_R} fill={reminderUi.sun} opacity={0.95} />
      <Circle cx={SUN_CX - 2} cy={CELESTIAL_CY - 2} r={9} fill="rgba(255, 248, 230, 0.45)" />
    </G>
  );
}

/**
 * Waning crescent (cuarto menguante) — "C" opens to the right, lit arc on the left.
 * Sky-colored cut disc shifted right; matches reference silhouette.
 */
function MoonGraphic() {
  const r = MOON_BODY_R;
  const cutR = 11.4;
  const cutX = 6.5;

  return (
    <G transform={`translate(${MOON_CX + MOON_OPTICAL_OFFSET_X}, ${CELESTIAL_CY})`}>
      <Circle cx={0} cy={0} r={CELESTIAL_HALO_OUTER} fill={reminderUi.moonHalo} />
      <Circle cx={0} cy={0} r={CELESTIAL_HALO_INNER} fill={reminderUi.moonHaloInner} />
      <Circle cx={0} cy={0} r={r} fill={reminderUi.moon} />
      <Circle cx={cutX} cy={0} r={cutR} fill={reminderUi.moonCut} />
    </G>
  );
}

export type DayNightLandscapeProps = {
  scheduleMessage?: string;
  dimmed?: boolean;
};

export function DayNightLandscape({ scheduleMessage, dimmed }: DayNightLandscapeProps) {
  return (
    <View style={[styles.wrap, dimmed && styles.dimmed]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={styles.svgFill}>
        <Defs>
          <SvgLinearGradient id="skyJourney" x1="0%" y1="0%" x2="100%" y2="18%">
            <Stop offset="0%" stopColor={reminderUi.dawnBg} />
            <Stop offset="45%" stopColor={reminderUi.skyCenter} />
            <Stop offset="100%" stopColor={reminderUi.duskBg} />
          </SvgLinearGradient>
        </Defs>

        <Path d={`M 0 0 H ${VIEW_W} V ${VIEW_H} H 0 Z`} fill="url(#skyJourney)" />

        {/* Layer 1 — distant peaks */}
        <Path
          d="M 0 102 C 28 88, 58 94, 88 86 C 118 78, 148 90, 178 82 C 208 74, 238 88, 268 80 C 298 72, 328 86, 360 78 L 360 220 L 0 220 Z"
          fill={reminderUi.mountainFar}
          opacity={0.26}
        />
        {/* Layer 2 — mid-range silhouettes */}
        <Path
          d="M 0 116 C 44 104, 92 122, 136 110 C 180 98, 224 118, 268 106 C 302 98, 334 112, 360 104 L 360 220 L 0 220 Z"
          fill={reminderUi.mountainMid}
          opacity={0.34}
        />
        {/* Layer 3 — near rolling hills */}
        <Path
          d="M 0 136 C 64 124, 120 146, 176 132 C 232 118, 288 140, 344 128 C 356 126, 360 130, 360 130 L 360 220 L 0 220 Z"
          fill={reminderUi.hillNear}
          opacity={0.52}
        />
        {/* Layer 4 — foreground base for integrated text */}
        <Path
          d="M 0 156 C 88 146, 156 168, 224 154 C 280 144, 328 162, 360 156 L 360 220 L 0 220 Z"
          fill={reminderUi.hillFront}
          opacity={0.94}
        />

        <SunGraphic />
        <MoonGraphic />
      </Svg>

      {scheduleMessage ? (
        <View style={styles.scheduleTextWrap} pointerEvents="none">
          <Text style={styles.scheduleText}>{scheduleMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: reminderUi.landscapeHeight,
    overflow: 'hidden',
    backgroundColor: reminderUi.skyCenter,
  },
  svgFill: {
    ...StyleSheet.absoluteFillObject,
  },
  dimmed: {
    opacity: 0.52,
  },
  scheduleTextWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
