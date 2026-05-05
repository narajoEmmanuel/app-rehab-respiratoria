/**
 * Purpose: Read-only circular avatar for profile and dashboard headers.
 * Module: patient
 */

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

const ACCENT = '#34aba5';

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

type Props = {
  displayName: string;
  avatarUri: string | null;
  size?: number;
};

export function ProfileAvatarView({ displayName, avatarUri, size = 96 }: Props) {
  const initials = initialsFromName(displayName);
  const ringSize = size + 6;
  const borderRadius = ringSize / 2;

  return (
    <View
      style={[
        styles.avatarRing,
        { width: ringSize, height: ringSize, borderRadius },
      ]}>
      <View
        style={[
          styles.avatarInner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.image} contentFit="cover" transition={120} />
        ) : (
          <View style={styles.placeholder} accessibilityLabel={`Iniciales: ${initials}`}>
            <Text style={[styles.initials, { fontSize: Math.max(16, Math.round(size / 3)) }]}>{initials}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarInner: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    color: ACCENT,
  },
});
