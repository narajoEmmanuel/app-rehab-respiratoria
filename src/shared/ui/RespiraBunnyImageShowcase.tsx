/**
 * Purpose: Dev-only gallery to validate RespiraBunnyImage poses and sizing.
 * Module: shared/ui
 * Route: /dev/respira-bunny-image-showcase
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RunnerBunnyCoachBubble } from '@/src/modules/session/games/components/RunnerBunnyCoachBubble';
import { wellness, wellnessTypography } from '@/src/shared/theme/wellness-theme';
import { RespiraBunnyImage, type BunnyImagePose } from '@/src/shared/ui/RespiraBunnyImage';

/** Final PNGs — larger preview size (445×445 source, contain in frame). */
const FINAL_POSES: BunnyImagePose[] = ['wave', 'wink', 'celebrate'];
const FINAL_SHOWCASE_SIZE = 140;

/** Still using placeholder files in assets/mascot/. */
const PENDING_POSES: BunnyImagePose[] = ['idle', 'astronaut', 'softAlert'];
const PENDING_SHOWCASE_SIZE = 100;

const POSE_LABELS: Record<BunnyImagePose, string> = {
  idle: 'idle (placeholder)',
  wave: 'wave',
  wink: 'wink',
  celebrate: 'celebrate',
  softAlert: 'softAlert (placeholder)',
  astronaut: 'astronaut (placeholder)',
};

export function RespiraBunnyImageShowcase() {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.root}>
      <Text style={styles.title}>RespiraBunnyImage — showcase</Text>
      <Text style={styles.subtitle}>
        PNG mascot for pop-ups and onboarding. Gameplay uses RespiraBunny (programmatic).
      </Text>

      <Text style={styles.sectionTitle}>Ilustraciones finales</Text>
      <View style={styles.grid}>
        {FINAL_POSES.map((pose) => (
          <View key={pose} style={styles.card}>
            <Text style={styles.poseLabel}>{POSE_LABELS[pose]}</Text>
            <RespiraBunnyImage pose={pose} size={FINAL_SHOWCASE_SIZE} />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Pendientes (placeholder)</Text>
      <View style={styles.grid}>
        {PENDING_POSES.map((pose) => (
          <View key={pose} style={[styles.card, styles.cardPending]}>
            <Text style={styles.poseLabel}>{POSE_LABELS[pose]}</Text>
            <RespiraBunnyImage pose={pose} size={PENDING_SHOWCASE_SIZE} />
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

      <Text style={styles.sectionTitle}>RunnerBunnyCoachBubble</Text>
      <Text style={styles.subtitle}>
        Level 1 coach chip (not mounted in gameplay yet). Route: /dev/respira-bunny-image-showcase
      </Text>
      <View style={styles.coachStack}>
        <RunnerBunnyCoachBubble
          visible
          disableAutoHide
          pose="wink"
          tone="info"
          message="Cuando estés listo, inspira hacia la meta."
        />
        <RunnerBunnyCoachBubble
          visible
          disableAutoHide
          pose="celebrate"
          tone="success"
          message="Buen trabajo. Repetición registrada."
        />
        <RunnerBunnyCoachBubble
          visible
          disableAutoHide
          pose="wink"
          tone="rest"
          message="Exhala y deja que el cuerpo se relaje."
        />
        <RunnerBunnyCoachBubble
          visible
          disableAutoHide
          pose="wink"
          tone="encourage"
          message="Ajusta en la siguiente. Vas bien."
        />
        <RunnerBunnyCoachBubble
          visible={false}
          pose="wink"
          tone="info"
          message="(visible=false — no debe aparecer)"
        />
        <RunnerBunnyCoachBubble
          visible
          pose="wink"
          tone="info"
          size="regular"
          message="Tamaño regular — misma copy de ejemplo info."
        />
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
  cardPending: {
    opacity: 0.85,
    borderStyle: 'dashed',
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
  coachStack: {
    width: '100%',
    gap: 12,
    paddingVertical: 4,
  },
});
