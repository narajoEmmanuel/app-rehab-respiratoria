/**
 * Purpose: Awake window card — time range inputs only (no landscape).
 * Module: notifications
 */

import { StyleSheet, Text, TextInput, View } from 'react-native';

import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import { ACTIVE_WINDOW_INVALID_MESSAGE } from '@/src/modules/notifications/notification-settings.types';
import { wellness, wellnessShadows } from '@/src/shared/theme/wellness-theme';

function formatTimeDraftInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

type TimeFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onCommit: () => void;
  disabled?: boolean;
};

function TimeField({ label, value, onChangeText, onCommit, disabled }: TimeFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, disabled && styles.fieldInputDisabled]}
        value={value}
        onChangeText={(text) => onChangeText(formatTimeDraftInput(text))}
        onBlur={onCommit}
        onSubmitEditing={onCommit}
        placeholder="HH:mm"
        keyboardType="number-pad"
        maxLength={5}
        editable={!disabled}
        accessibilityLabel={`${label} del horario despierto`}
        selectTextOnFocus
      />
    </View>
  );
}

export type AwakeWindowCardProps = {
  invalid?: boolean;
  dimmed?: boolean;
  editDisabled?: boolean;
  startDraft: string;
  endDraft: string;
  onChangeStartDraft: (value: string) => void;
  onChangeEndDraft: (value: string) => void;
  onCommitStart: () => void;
  onCommitEnd: () => void;
};

export function AwakeWindowCard({
  invalid,
  dimmed,
  editDisabled,
  startDraft,
  endDraft,
  onChangeStartDraft,
  onChangeEndDraft,
  onCommitStart,
  onCommitEnd,
}: AwakeWindowCardProps) {
  return (
    <View style={[styles.card, dimmed && styles.dimmed]}>
      <View style={styles.header}>
        <Text style={styles.title}>Horario despierto</Text>
        <Text style={styles.subtitle}>
          Configura el rango en el que recibirás recordatorios.
        </Text>
      </View>

      <View style={styles.fieldsRow}>
        <TimeField
          label="Inicio"
          value={startDraft}
          onChangeText={onChangeStartDraft}
          onCommit={onCommitStart}
          disabled={editDisabled}
        />
        <View style={styles.divider} />
        <TimeField
          label="Fin"
          value={endDraft}
          onChangeText={onChangeEndDraft}
          onCommit={onCommitEnd}
          disabled={editDisabled}
        />
      </View>

      {invalid ? <Text style={styles.error}>{ACTIVE_WINDOW_INVALID_MESSAGE}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: reminderUi.cardRadius,
    borderWidth: 1,
    borderColor: reminderUi.mintBorder,
    backgroundColor: wellness.card,
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    gap: 18,
    ...wellnessShadows.soft,
  },
  dimmed: {
    opacity: 0.55,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: reminderUi.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: reminderUi.textSecondary,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  field: {
    width: 148,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: reminderUi.mintLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: reminderUi.mintBorder,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    color: reminderUi.textSecondary,
  },
  fieldInput: {
    fontSize: 22,
    fontWeight: '800',
    color: reminderUi.textPrimary,
    fontVariant: ['tabular-nums'],
    padding: 0,
    minWidth: 52,
    textAlign: 'center',
  },
  fieldInputDisabled: {
    opacity: 0.5,
  },
  divider: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: reminderUi.mintBorder,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9A5248',
    textAlign: 'center',
  },
});
