/**
 * Purpose: Dev-only gallery to validate RespiraBunnyImage poses and sizing.
 * Module: shared/ui
 * Route: /dev/respira-bunny-image-showcase
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RespiraWelcomeOnboarding } from '@/src/modules/onboarding/components/RespiraWelcomeOnboarding';
import { RunnerBunnyCoachBubble } from '@/src/modules/session/games/components/RunnerBunnyCoachBubble';
import { wellness, wellnessTypography } from '@/src/shared/theme/wellness-theme';
import { RespiraBunnyImage, type BunnyImagePose } from '@/src/shared/ui/RespiraBunnyImage';

const SHOWCASE_SIZE = 120;

const PRIMARY_POSES: BunnyImagePose[] = [
  'presenting',
  'wave',
  'wink',
  'celebrate',
  'happy',
  'neutral',
];

const SPECIAL_POSES: BunnyImagePose[] = ['astronaut'];

const LIMITED_POSES: BunnyImagePose[] = ['error'];

const POSE_LABELS: Record<BunnyImagePose, string> = {
  presenting: 'presenting — tutoriales',
  wave: 'wave — bienvenida',
  wink: 'wink — consejos',
  celebrate: 'celebrate — logros',
  happy: 'happy — progreso positivo',
  neutral: 'neutral — default / calmado',
  astronaut: 'astronaut — nivel espacial',
  error: 'error — solo técnico',
};

function PoseGrid({ poses, dashed }: { poses: BunnyImagePose[]; dashed?: boolean }) {
  return (
    <View style={styles.grid}>
      {poses.map((pose) => (
        <View key={pose} style={[styles.card, dashed && styles.cardLimited]}>
          <Text style={styles.poseLabel}>{POSE_LABELS[pose]}</Text>
          <RespiraBunnyImage pose={pose} size={SHOWCASE_SIZE} />
        </View>
      ))}
    </View>
  );
}

export function RespiraBunnyImageShowcase() {
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.root}>
      <RespiraWelcomeOnboarding
        visible={welcomeVisible}
        onContinue={() => setWelcomeVisible(false)}
      />
      <Text style={styles.title}>RespiraBunnyImage — showcase</Text>
      <Text style={styles.subtitle}>
        PNG mascot for pop-ups and onboarding. Gameplay uses RespiraBunny (programmatic). Default
        pose: neutral.
      </Text>

      <Text style={styles.sectionTitle}>Welcome onboarding (Fase 1)</Text>
      <Pressable
        style={styles.devOpenBtn}
        onPress={() => setWelcomeVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir modal de bienvenida">
        <Text style={styles.devOpenBtnText}>Abrir RespiraWelcomeOnboarding</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Uso principal</Text>
      <PoseGrid poses={PRIMARY_POSES} />

      <Text style={styles.sectionTitle}>Uso especial</Text>
      <PoseGrid poses={SPECIAL_POSES} />

      <Text style={styles.sectionTitle}>Uso limitado</Text>
      <PoseGrid poses={LIMITED_POSES} dashed />

      <Text style={styles.sectionTitle}>Default (sin prop pose)</Text>
      <View style={styles.card}>
        <Text style={styles.poseLabel}>neutral (implícito)</Text>
        <RespiraBunnyImage size={SHOWCASE_SIZE} />
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
  cardLimited: {
    borderStyle: 'dashed',
    opacity: 0.92,
  },
  poseLabel: {
    ...wellnessTypography.caption,
    color: wellness.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
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
  devOpenBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: wellness.primary,
  },
  devOpenBtnText: {
    ...wellnessTypography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
