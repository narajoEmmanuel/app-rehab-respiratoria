import * as Haptics from 'expo-haptics';

import { useRouter } from 'expo-router';

import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';



import { spacing } from '@/src/shared/theme/spacing';

import { wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';



export type TechnicalSummaryLinkProps = {

  label?: string;

  style?: StyleProp<ViewStyle>;

};



function hapticLight() {

  if (Platform.OS === 'ios') {

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  }

}



/** Acción secundaria compacta al resumen técnico de calibración. */

export function TechnicalSummaryLink({

  label = 'Resumen técnico',

  style,

}: TechnicalSummaryLinkProps) {

  const router = useRouter();



  return (

    <View style={[styles.wrap, style]}>

      <Pressable

        onPress={() => {

          hapticLight();

          router.push('/calibration-technical-summary');

        }}

        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}

        accessibilityRole="button"

        accessibilityLabel={label}>

        <IconSymbol name="doc.text.fill" size={13} color={wellnessColors.primaryDark} />

        <Text style={styles.chipText}>{label}</Text>

      </Pressable>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    alignSelf: 'flex-end',

  },

  chip: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.xs,

    paddingVertical: 6,

    paddingHorizontal: 10,

    borderRadius: wellnessRadii.pill,

    borderWidth: 1,

    borderColor: 'rgba(52, 171, 165, 0.22)',

    backgroundColor: 'rgba(52, 171, 165, 0.06)',

  },

  chipPressed: {

    opacity: 0.82,

    backgroundColor: 'rgba(52, 171, 165, 0.12)',

  },

  chipText: {

    fontSize: 12,

    fontWeight: '600',

    color: wellnessColors.primaryDark,

    letterSpacing: -0.1,

  },

});


