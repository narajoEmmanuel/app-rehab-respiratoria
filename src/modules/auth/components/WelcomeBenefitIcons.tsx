/**
 * Íconos lineales de la pantalla de bienvenida (alineados a referencia visual RESPIRA+).
 */
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type WelcomeBenefitIconId = 'wellness' | 'insights' | 'privacy';

type WelcomeBenefitIconProps = {
  id: WelcomeBenefitIconId;
  size?: number;
  color?: string;
};

const STROKE = 1.85;

function WellnessShieldIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.75L5.5 5.5v5.25c0 4.35 2.78 8.4 6.5 9.75 3.72-1.35 6.5-5.4 6.5-9.75V5.5L12 2.75z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10.25} r={2.85} stroke={color} strokeWidth={STROKE} />
      <Line x1={12} y1={8.9} x2={12} y2={11.6} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={10.65} y1={10.25} x2={13.35} y2={10.25} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

function InsightsChartIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4.25}
        y={4.25}
        width={15.5}
        height={15.5}
        rx={2.5}
        stroke={color}
        strokeWidth={STROKE}
      />
      <Path
        d="M7.5 15.25L10.25 12.5L13 14L17 9.75"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PrivacyLockIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.25 10.5V8a3.75 3.75 0 117.5 0v2.5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Rect
        x={6.25}
        y={10.5}
        width={11.5}
        height={8.25}
        rx={2}
        stroke={color}
        strokeWidth={STROKE}
      />
      <Circle cx={12} cy={14} r={1.1} fill={color} />
    </Svg>
  );
}

export function WelcomeBenefitIcon({
  id,
  size = 26,
  color = '#1F7E7A',
}: WelcomeBenefitIconProps) {
  switch (id) {
    case 'wellness':
      return <WellnessShieldIcon size={size} color={color} />;
    case 'insights':
      return <InsightsChartIcon size={size} color={color} />;
    case 'privacy':
      return <PrivacyLockIcon size={size} color={color} />;
    default:
      return <WellnessShieldIcon size={size} color={color} />;
  }
}
