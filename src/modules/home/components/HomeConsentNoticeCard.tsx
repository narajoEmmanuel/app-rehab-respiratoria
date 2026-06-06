/**
 * Purpose: Consent-pending notice card on the home dashboard footer.
 * Module: home
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

const ACCENT = wellnessColors.primary;

type Props = {
  onReviewPress: () => void;
};

export function HomeConsentNoticeCard({ onReviewPress }: Props) {
  return (
    <View style={styles.consentCard} accessibilityRole="alert">
      <AppText variant="titleSmall" style={styles.consentTitle}>
        Consentimiento pendiente
      </AppText>
      <AppText variant="bodyMedium" style={styles.consentBody}>
        Revisa y acepta los documentos para continuar con la terapia.
      </AppText>
      <Pressable
        style={styles.consentBtn}
        onPress={onReviewPress}
        accessibilityRole="button"
        accessibilityLabel="Revisar documentos legales">
        <AppText variant="button" style={styles.consentBtnText}>
          Revisar documentos
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  consentCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  consentTitle: {
    fontSize: 17,
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  consentBody: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  consentBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  consentBtnText: {
    color: '#FFFFFF',
  },
});
