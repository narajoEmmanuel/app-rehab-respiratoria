import type { SessionDataSource, SessionInputMode } from '@/src/modules/session/session-input-mode';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';

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

/** Sesiones terapéuticas con medición real por sensor; excluye práctica táctil y sin clasificar. */
export function isTherapeuticSessionRecord(record: SessionRecord): boolean {
  const c = resolveSessionClassification(record);
  return c.isClassified && !c.isPracticeSession && c.inputMode === 'sensor';
}

export function sessionClassificationUiLabel(record: SessionRecord): SessionClassificationUiLabel {
  const classification = resolveSessionClassification(record);
  if (!classification.isClassified) return 'Sin clasificar';
  return classification.isPracticeSession ? 'Práctica' : 'Sensor';
}

export function sessionClassificationMainTitle(record: SessionRecord): string {
  const classification = resolveSessionClassification(record);
  if (!classification.isClassified) return 'Sesión sin clasificar';
  return classification.isPracticeSession ? 'Modo práctica táctil' : 'Sesión con sensor';
}

/** @deprecated Prefer sessionClassificationMainTitle */
export function sessionClassificationSummaryTitle(record: SessionRecord): string | null {
  const title = sessionClassificationMainTitle(record);
  return title;
}

export function sessionClassificationSummaryNote(record: SessionRecord): string | null {
  const classification = resolveSessionClassification(record);
  if (!classification.isClassified) {
    return null;
  }
  if (classification.isPracticeSession) {
    return 'Práctica sin sensor';
  }
  return null;
}

export function isSensorMeasuredSession(record: SessionRecord): boolean {
  const c = resolveSessionClassification(record);
  return c.isClassified && !c.isPracticeSession && c.inputMode === 'sensor';
}

export function sessionSensorDataCardVisible(record: SessionRecord): boolean {
  return isSensorMeasuredSession(record);
}

export function formatExportOptionalNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return String(Math.round(value));
}

export function classificationExportFields(record: SessionRecord): {
  input_mode: string;
  data_source: string;
  is_practice_session: string;
  official_validation_source: string;
  max_sensor_estimated_volume_ml: string;
  max_sensor_u95_ml: string;
} {
  const c = resolveSessionClassification(record);
  if (!c.isClassified) {
    return {
      input_mode: 'unclassified',
      data_source: 'unclassified',
      is_practice_session: '',
      official_validation_source: '',
      max_sensor_estimated_volume_ml: '',
      max_sensor_u95_ml: '',
    };
  }
  return {
    input_mode: c.inputMode === 'unclassified' ? 'unclassified' : c.inputMode,
    data_source: c.dataSource === 'unclassified' ? 'unclassified' : c.dataSource,
    is_practice_session: c.isPracticeSession ? 'true' : 'false',
    official_validation_source: record.official_validation_source ?? c.dataSource,
    max_sensor_estimated_volume_ml: formatExportOptionalNumber(record.max_sensor_estimated_volume_ml),
    max_sensor_u95_ml: formatExportOptionalNumber(record.max_sensor_u95_ml),
  };
}

export function attemptClassificationExportFields(attempt: AttemptRecord): {
  input_mode: string;
  data_source: string;
  official_volume_ml: string;
  sensor_estimated_volume_ml: string;
  sensor_u95_ml: string;
  sensor_confidence_label: string;
  sensor_volume_reached_conservatively: string;
  sensor_attempt_status: string;
} {
  const inputMode = attempt.input_mode ?? '';
  const dataSource = attempt.data_source ?? '';
  return {
    input_mode: inputMode || 'unclassified',
    data_source: dataSource || 'unclassified',
    official_volume_ml: formatExportOptionalNumber(attempt.official_volume_ml),
    sensor_estimated_volume_ml: formatExportOptionalNumber(attempt.sensor_estimated_volume_ml),
    sensor_u95_ml: formatExportOptionalNumber(attempt.sensor_u95_ml),
    sensor_confidence_label: attempt.sensor_confidence_label ?? '',
    sensor_volume_reached_conservatively:
      attempt.sensor_volume_reached_conservatively === true
        ? 'true'
        : attempt.sensor_volume_reached_conservatively === false
          ? 'false'
          : '',
    sensor_attempt_status: attempt.sensor_attempt_status ?? '',
  };
}
