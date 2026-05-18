import type { SessionDataSource, SessionInputMode } from '@/src/modules/session/session-input-mode';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';

export type SessionClassificationUiLabel = 'Sensor' | 'Práctica' | 'Sin clasificar';

export type ResolvedSessionClassification = {
  inputMode: SessionInputMode | 'unclassified';
  dataSource: SessionDataSource | 'unclassified';
  isPracticeSession: boolean;
  isClassified: boolean;
};

export function resolveSessionClassification(record: SessionRecord): ResolvedSessionClassification {
  if (record.input_mode != null && record.data_source != null) {
    return {
      inputMode: record.input_mode,
      dataSource: record.data_source,
      isPracticeSession: record.is_practice_session === true,
      isClassified: true,
    };
  }

  return {
    inputMode: 'unclassified',
    dataSource: 'unclassified',
    isPracticeSession: false,
    isClassified: false,
  };
}

/** Sesiones terapéuticas con medición real; excluye práctica táctil explícita. */
export function isTherapeuticSessionRecord(record: SessionRecord): boolean {
  return record.is_practice_session !== true;
}

export function sessionClassificationUiLabel(record: SessionRecord): SessionClassificationUiLabel {
  const classification = resolveSessionClassification(record);
  if (!classification.isClassified) return 'Sin clasificar';
  return classification.isPracticeSession ? 'Práctica' : 'Sensor';
}

export function sessionClassificationSummaryTitle(record: SessionRecord): string | null {
  const classification = resolveSessionClassification(record);
  if (!classification.isClassified) return null;
  return classification.isPracticeSession ? 'Modo práctica táctil' : 'Sesión con sensor';
}

export function sessionClassificationSummaryNote(record: SessionRecord): string | null {
  const classification = resolveSessionClassification(record);
  if (!classification.isClassified) return null;
  if (classification.isPracticeSession) {
    return 'Esta sesión fue registrada como práctica sin sensor.';
  }
  return null;
}
