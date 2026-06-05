import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { wellnessTypography } from '@/src/shared/theme/wellness-theme';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/src/shared/theme/typography';

type FlatTypographyVariant =
  | 'display'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'caption'
  | 'button'
  | 'metric'
  | 'metricLarge'
  | 'metricMedium'
  | 'metricSmall'
  | 'label'
  | 'chip'
  | 'chipSmall'
  | 'tabLabel'
  | 'input'
  | 'link'
  | 'statusValue'
  | 'screenTitle'
  | 'screenSubtitle'
  | 'sectionTitle'
  | 'cardTitle'
  | 'body';

export type AppTextVariant = FlatTypographyVariant;

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
};

const variantStyles: Record<FlatTypographyVariant, TextStyle> = {
  display: wellnessTypography.display,
  titleLarge: wellnessTypography.titleLarge,
  titleMedium: wellnessTypography.titleMedium,
  titleSmall: wellnessTypography.titleSmall,
  bodyLarge: wellnessTypography.bodyLarge,
  bodyMedium: wellnessTypography.bodyMedium,
  bodySmall: wellnessTypography.bodySmall,
  caption: wellnessTypography.caption,
  button: wellnessTypography.button,
  metric: wellnessTypography.metric,
  metricLarge: wellnessTypography.metricLarge,
  metricMedium: wellnessTypography.metricMedium,
  metricSmall: wellnessTypography.metricSmall,
  label: wellnessTypography.label,
  chip: wellnessTypography.chip,
  chipSmall: wellnessTypography.chipSmall,
  tabLabel: wellnessTypography.tabLabel,
  input: wellnessTypography.input,
  link: wellnessTypography.link,
  statusValue: wellnessTypography.statusValue,
  screenTitle: wellnessTypography.screenTitle,
  screenSubtitle: wellnessTypography.screenSubtitle,
  sectionTitle: wellnessTypography.sectionTitle,
  cardTitle: wellnessTypography.cardTitle,
  body: wellnessTypography.body,
};

function fontFamilyForWeight(weight?: TextStyle['fontWeight']): string {
  const w = weight == null ? '400' : String(weight);
  if (w === '700' || w === 'bold' || w === '800') return fontBold;
  if (w === '600') return fontSemiBold;
  if (w === '500') return fontMedium;
  return fontRegular;
}

export function AppText({ variant = 'bodyMedium', style, children, ...rest }: AppTextProps) {
  const base = variantStyles[variant];
  return (
    <Text
      {...rest}
      style={[base, { fontFamily: fontFamilyForWeight(base.fontWeight) }, style]}>
      {children}
    </Text>
  );
}
