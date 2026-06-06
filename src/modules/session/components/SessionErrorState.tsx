/**
 * Purpose: Error or unavailable-level placeholder on the session screen.
 * Module: session
 */

import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  title: string;
  detail: string;
};

export function SessionErrorState({ title, detail }: Props) {
  return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: wellness.screenBg,
  },
  title: {
    color: wellness.text,
    fontSize: 26,
    fontWeight: '800',
  },
  detail: {
    marginTop: 10,
    color: wellness.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});
