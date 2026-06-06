/**
 * Purpose: Loading / no-patient placeholder for the home dashboard.
 * Module: home
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { appScreenBackground, wellnessColors } from '@/src/shared/theme/wellness-theme';

type Props = {
  onGoToLogin: () => void;
};

export function HomeLoadingState({ onGoToLogin }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <AppText variant="bodyLarge" style={styles.mutedBody}>
          Cargando tu información…
        </AppText>
        <Pressable
          style={styles.textLinkWrap}
          onPress={onGoToLogin}
          accessibilityRole="button">
          <AppText variant="link" style={styles.textLink}>
            Ir al acceso
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: appScreenBackground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  mutedBody: { color: wellnessColors.textSecondary, marginBottom: spacing.md },
  textLinkWrap: { padding: spacing.md },
  textLink: { fontSize: 16, color: authPalette.link, textDecorationLine: 'underline' },
});
