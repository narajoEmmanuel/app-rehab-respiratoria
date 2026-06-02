/**
 * Purpose: SF Symbol name mapped to Material Icons on Android/web.
 * Module: shared/ui
 * Dependencies: @expo/vector-icons/MaterialIcons, expo-symbols
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  calendar: 'calendar-today',
  'square.grid.2x2.fill': 'apps',
  'gearshape.fill': 'settings',
  'clock.fill': 'history',
  'person.crop.circle': 'person',
  'dot.radiowaves.left.and.right': 'sensors',
  'checkmark.circle.fill': 'check-circle',
  'lungs.fill': 'air',
  'doc.text.fill': 'description',
  'camera.fill': 'photo-camera',
  'photo.fill': 'photo-library',
  'eye.fill': 'visibility',
  'trash.fill': 'delete',
  'xmark': 'close',
  'exclamationmark.triangle.fill': 'warning',
  'chart.bar.fill': 'bar-chart',
  'square.and.arrow.up': 'share',
  'arrow.down.doc.fill': 'file-download',
  'info.circle.fill': 'info',
  'waveform.path.ecg': 'monitor-heart',
  'target': 'track-changes',
  'timer': 'timer',
  'checkmark.seal.fill': 'verified',
  'plus.circle.fill': 'add-circle',
  'lock.fill': 'lock',
  'star.fill': 'star',
  'shield.fill': 'shield',
  'repeat': 'repeat',
  'xmark.circle.fill': 'cancel',
  'arrow.right.circle.fill': 'arrow-forward',
} as const;

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
