import { Image, type ImageStyle, type StyleProp } from 'react-native';

const LOGO_ICON = require('../../../assets/images/respira-logo.png');

const SIZE_MAP = {
  sm: 48,
  md: 72,
  lg: 118,
} as const;

type RespiraBrandMarkProps = {
  variant?: 'icon' | 'full' | 'text';
  size?: keyof typeof SIZE_MAP;
  imageStyle?: StyleProp<ImageStyle>;
};

export function RespiraBrandMark({
  variant = 'icon',
  size = 'md',
  imageStyle,
}: RespiraBrandMarkProps) {
  const dimension = SIZE_MAP[size];
  const width = variant === 'text' ? dimension * 2.2 : dimension;
  const height = dimension;

  return (
    <Image
      source={LOGO_ICON}
      accessibilityIgnoresInvertColors
      style={[{ width, height, resizeMode: 'contain' }, imageStyle]}
    />
  );
}
