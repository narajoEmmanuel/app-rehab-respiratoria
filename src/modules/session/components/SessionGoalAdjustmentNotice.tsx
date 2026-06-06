/**
 * Purpose: Banner notifying the patient that the session target was adjusted.
 * Module: session
 */

import { StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string;
};

export function SessionGoalAdjustmentNotice({ message }: Props) {
  return (
    <View style={styles.adjustmentNote}>
      <Text style={styles.adjustmentNoteText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adjustmentNote: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  adjustmentNoteText: {
    color: '#9A7B1A',
    fontSize: 13,
    fontWeight: '600',
  },
});
