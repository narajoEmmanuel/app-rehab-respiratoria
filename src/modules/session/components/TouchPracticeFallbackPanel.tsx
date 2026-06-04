/**
 * Purpose: Optional touch practice entry when no sensor is connected.
 * Module: session/components
 */

import { StyleSheet, Switch, Text, View } from 'react-native';

import { wellness, wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

type TouchPracticeFallbackPanelProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
};

export function TouchPracticeFallbackPanel({
  enabled,
  onEnabledChange,
}: TouchPracticeFallbackPanelProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Terapia sin sensor conectado</Text>
        <Switch
          accessibilityLabel="Entrada por pantalla"
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ false: '#E5E7EB', true: 'rgba(52, 171, 165, 0.35)' }}
          thumbColor={enabled ? wellness.primary : '#F3F4F6'}
          ios_backgroundColor="#E5E7EB"
        />
      </View>
      <Text style={styles.body}>
        Puedes practicar la secuencia respiratoria usando la pantalla. Esta opción no utiliza
        medición real del sensor y no sustituye una sesión con dispositivo conectado.
      </Text>
      <Text style={styles.hint}>
        {enabled
          ? 'Al iniciar un nivel se usará la entrada por pantalla hasta que conectes el sensor.'
          : 'Activa la entrada por pantalla si necesitas practicar sin el dispositivo.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: wellnessRadius.lg,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: wellness.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: wellnessColors.primaryDark,
  },
});
