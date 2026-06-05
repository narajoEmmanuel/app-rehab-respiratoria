/**
 * Purpose: In-app reading screen for the RESPIRA+ legal documents (terms, consent, privacy, disclaimer).
 * Module: legal
 */

import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { openLegalDocument } from '@/src/modules/legal/open-legal-document';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

type DocumentSectionProps = {
  number: string;
  title: string;
  summary: string;
  highlights: readonly string[];
};

function DocumentSection({ number, title, summary, highlights }: DocumentSectionProps) {
  return (
    <AppCard style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNumberBadge}>
          <AppText variant="statusValue" style={styles.sectionNumberText}>
            {number}
          </AppText>
        </View>
        <AppText variant="titleSmall" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      <AppText variant="bodyMedium" style={styles.sectionSummary}>
        {summary}
      </AppText>
      <View style={styles.highlightsList}>
        {highlights.map((item) => (
          <View key={item} style={styles.highlightRow}>
            <View style={styles.bulletDot} />
            <AppText variant="bodySmall" style={styles.highlightText}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

const SECTIONS: readonly DocumentSectionProps[] = [
  {
    number: '1',
    title: 'Términos y condiciones de uso',
    summary:
      'Establece las reglas para usar RESPIRA+, incluyendo qué es el sistema, para qué sirve, qué está permitido y qué no, y las responsabilidades tanto del usuario como del equipo responsable.',
    highlights: [
      'RESPIRA+ es un prototipo académico de apoyo al monitoreo de ejercicios respiratorios.',
      'No es un dispositivo médico comercial ni sustituye atención profesional.',
      'El usuario se compromete a seguir las instrucciones y suspender el uso ante molestias.',
      'El equipo responsable protegerá la información y atenderá dudas.',
    ],
  },
  {
    number: '2',
    title: 'Consentimiento informado',
    summary:
      'Explica la invitación a participar en el uso o prueba del prototipo, el procedimiento, los datos que se registran, los beneficios esperados, los posibles riesgos y el derecho a retirarse en cualquier momento.',
    highlights: [
      'La participación es voluntaria y puedes retirarte sin consecuencias.',
      'Se registran datos de desempeño respiratorio (volumen, tiempo, repeticiones).',
      'No se garantiza mejoría clínica; los resultados dependen de múltiples factores.',
      'Si presentas molestias, debes suspender el uso y consultar a un profesional.',
    ],
  },
  {
    number: '3',
    title: 'Aviso de privacidad',
    summary:
      'Describe qué datos personales y sensibles se recolectan, para qué se utilizan, cómo se protegen y cuáles son tus derechos sobre ellos.',
    highlights: [
      'Los datos se usan para el funcionamiento del prototipo y evaluación académica.',
      'No se venden ni comparten con terceros sin autorización.',
      'Los reportes académicos usan información anonimizada.',
      'Puedes solicitar acceso, rectificación o eliminación de tus datos.',
    ],
  },
  {
    number: '4',
    title: 'Descargo clínico y limitaciones',
    summary:
      'Aclara las limitaciones técnicas y clínicas del sistema y que los indicadores son de apoyo, no mediciones clínicas definitivas.',
    highlights: [
      'Los resultados son orientativos; no son diagnóstico ni evaluación clínica.',
      'El sistema depende de la correcta colocación del sensor y calibración.',
      'Ante síntomas graves, suspende el uso y busca atención médica.',
      'RESPIRA+ no detecta crisis respiratorias ni sustituye pruebas de función pulmonar.',
    ],
  },
] as const;

export function LegalDocumentScreen() {
  const onOpenPdf = useCallback(() => {
    void (async () => {
      try {
        const result = await openLegalDocument();
        if (result === 'cancelled') {
          Alert.alert(
            'PDF no disponible',
            'Si tu dispositivo no puede abrir el PDF directamente, puedes compartirlo o guardarlo.',
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo abrir el documento.';
        Alert.alert('Documento', msg);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar showBackButton showProfileButton={false} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Documentos de RESPIRA+"
          subtitle="Estos documentos explican el uso de RESPIRA+, el consentimiento informado, el tratamiento de datos y las limitaciones del sistema."
        />

        <View style={styles.introCard}>
          <View style={styles.introIconRow}>
            <IconSymbol name="doc.text.fill" size={20} color={wellnessColors.primary} />
            <AppText variant="label" style={styles.introLabel}>
              Versión 1.0
            </AppText>
          </View>
          <AppText variant="bodyMedium" style={styles.introText}>
            Lee esta información antes de aceptar y continuar con la terapia. El documento completo
            está disponible en formato PDF.
          </AppText>
        </View>

        {SECTIONS.map((s) => (
          <DocumentSection key={s.number} {...s} />
        ))}

        <AppButton
          title="Abrir PDF completo"
          onPress={onOpenPdf}
          variant="secondary"
          iconName="doc.text.fill"
          style={styles.pdfBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellnessColors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  introCard: {
    backgroundColor: wellnessColors.primarySubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.15)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  introIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  introLabel: {
    fontSize: 13,
    color: wellnessColors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  introText: {
    color: wellnessColors.textSecondary,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    color: wellnessColors.primaryDark,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    color: wellnessColors.textPrimary,
    lineHeight: 22,
  },
  sectionSummary: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  highlightsList: {
    gap: spacing.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: wellnessColors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  highlightText: {
    flex: 1,
    color: wellnessColors.textPrimary,
  },
  pdfBtn: {
    marginTop: spacing.md,
  },
});
