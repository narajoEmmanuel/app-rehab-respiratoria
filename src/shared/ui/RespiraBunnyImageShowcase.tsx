/**
 * Purpose: Dev-only gallery to validate RespiraBunnyImage poses and sizing.
 * Module: shared/ui
 * Route: /dev/respira-bunny-image-showcase
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { wellness, wellnessTypography } from '@/src/shared/theme/wellness-theme';
import {
  RESPIRA_BUNNY_IMAGE_DEFAULT_SIZE,
  RespiraBunnyImage,
  type BunnyImagePose,
} from '@/src/shared/ui/RespiraBunnyImage';

const SHOWCASE_POSES: BunnyImagePose[] = ['wave', 'wink', 'celebrate', 'idle', 'astronaut', 'softAlert'];

const POSE_LABELS: Record<BunnyImagePose, string> = {
  idle: 'idle',
  wave: 'wave',
  wink: 'wink',
  celebrate: 'celebrate',
  softAlert: 'softAlert',
  astronaut: 'astronaut',
};

export function RespiraBunnyImageShowcase() {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.root}>
      <Text style={styles.title}>RespiraBunnyImage — showcase</Text>
      <Text style={styles.subtitle}>
        PNG mascot for pop-ups and onboarding. Gameplay uses RespiraBunny (programmatic).
      </Text>

      <View style={styles.grid}>
        {SHOWCASE_POSES.map((pose) => (
          <View key={pose} style={styles.card}>
            <Text style={styles.poseLabel}>{POSE_LABELS[pose]}</Text>
            <RespiraBunnyImage pose={pose} size={RESPIRA_BUNNY_IMAGE_DEFAULT_SIZE} />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Size scale</Text>
      <View style={styles.scaleRow}>
        <RespiraBunnyImage pose="wave" size={72} />
        <RespiraBunnyImage pose="wave" size={96} />
        <RespiraBunnyImage pose="wave" size={140} />
      </View>

      <Text style={styles.sectionTitle}>Opacity</Text>
      <View style={styles.scaleRow}>
        <RespiraBunnyImage pose="celebrate" size={100} opacity={1} />
        <RespiraBunnyImage pose="celebrate" size={100} opacity={0.55} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    gap: 16,
  },
  title: {
    ...wellnessTypography.sectionTitle,
    color: wellness.text,
  },
  subtitle: {
    ...wellnessTypography.body,
    color: wellness.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    minWidth: 140,
    padding: 12,
    borderRadius: 16,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
    alignItems: 'center',
    gap: 8,
  },
  poseLabel: {
    ...wellnessTypography.caption,
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    ...wellnessTypography.cardTitle,
    color: wellness.text,
    marginTop: 8,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    paddingVertical: 8,
  },
});
