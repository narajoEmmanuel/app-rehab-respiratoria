/**
 * Cálculo de incertidumbre metrológica para el procedimiento de calibración local.
 * No modifica modelos de estimación ni terapia; solo reporta y alimenta criterios de listo.
 */
import {
  INCLUDE_RULE_IN_COMBINED_UNCERTAINTY,
  MIN_REPETITIONS_PER_REQUIRED_VOLUME,
  MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY,
  RULE_RESOLUTION_HALF_WIDTH_MM,
  SENSOR_ALIGNMENT_HALF_WIDTH_MM,
  SENSOR_RELATIVE_UNCERTAINTY,
  SENSOR_RESOLUTION_HALF_WIDTH_MM,
  SPIROMETER_MARK_HALF_WIDTH_ML,
  UNCERTAINTY_COVERAGE_FACTOR_K,
  UNCERTAINTY_MAX_ACCEPTABLE_U95_ML,
} from '@/src/modules/device/calibration/calibration-constants';
import type {
  CalibrationUncertaintyRecommendation,
  CalibrationUncertaintySummary,
  UncertaintyComponent,
  VolumeUncertaintyReport,
  VolumeUncertaintyStatus,
} from '@/src/modules/device/calibration/calibration-uncertainty-types';
import type {
  CalibrationProfile,
  VolumeCalibrationSummary,
  VolumeDistanceRelation,
} from '@/src/modules/device/calibration/calibration-types';
import { deriveReferenceVolumePerMmMl } from '@/src/modules/device/spirometer';
import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

const SQRT3 = Math.sqrt(3);

/** Incertidumbre estándar tipo B a partir de semiancho rectangular: a / √3. */
export function computeStandardUncertaintyFromRectangularHalfWidth(halfWidth: number): number {
  return halfWidth / SQRT3;
}

/** Desviación estándar muestral (n − 1). Retorna null si n < 2. */
export function computeSampleStandardDeviation(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let sumSq = 0;
  for (const v of values) {
    const d = v - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}

function segmentSensitivityMlPerMm(
  volumeToMl: number,
  distanceToMm: number,
  volumeFromMl: number,
  distanceFromMm: number,
): number | null {
  const deltaDistance = distanceToMm - distanceFromMm;
  if (Math.abs(deltaDistance) < 1e-9) return null;
  return Math.abs((volumeToMl - volumeFromMl) / deltaDistance);
}

/**
 * Sensibilidad local |ΔV/Δd| (mL/mm) a partir de summaries vecinos.
 * Puntos internos: promedio de pendiente anterior y posterior; extremos: tramo más cercano.
 */
export function computeLocalSensitivityMlPerMm(
  volumeMl: number,
  summaries: VolumeCalibrationSummary[],
  relation: VolumeDistanceRelation,
): number | null {
  if (relation === 'indeterminate' || summaries.length < 2) return null;

  const sorted = [...summaries].sort((a, b) => a.volumeMl - b.volumeMl);
  const idx = sorted.findIndex((s) => s.volumeMl === volumeMl);
  if (idx === -1) return null;

  if (idx === 0) {
    return segmentSensitivityMlPerMm(
      sorted[1].volumeMl,
      sorted[1].avgDistanceMm,
      sorted[0].volumeMl,
      sorted[0].avgDistanceMm,
    );
  }
  if (idx === sorted.length - 1) {
    const last = sorted.length - 1;
    return segmentSensitivityMlPerMm(
      sorted[last].volumeMl,
      sorted[last].avgDistanceMm,
      sorted[last - 1].volumeMl,
      sorted[last - 1].avgDistanceMm,
    );
  }

  const prevSlope = segmentSensitivityMlPerMm(
    sorted[idx].volumeMl,
    sorted[idx].avgDistanceMm,
    sorted[idx - 1].volumeMl,
    sorted[idx - 1].avgDistanceMm,
  );
  const nextSlope = segmentSensitivityMlPerMm(
    sorted[idx + 1].volumeMl,
    sorted[idx + 1].avgDistanceMm,
    sorted[idx].volumeMl,
    sorted[idx].avgDistanceMm,
  );
  if (prevSlope === null && nextSlope === null) return null;
  if (prevSlope === null) return nextSlope;
  if (nextSlope === null) return prevSlope;
  return (prevSlope + nextSlope) / 2;
}

function combineQuadrature(terms: (number | null)[]): number | null {
  let sumSq = 0;
  let hasTerm = false;
  for (const t of terms) {
    if (t === null) continue;
    hasTerm = true;
    sumSq += t * t;
  }
  if (!hasTerm) return null;
  return Math.sqrt(sumSq);
}

function buildVolumeUncertaintyReport(
  summary: VolumeCalibrationSummary,
  distancesMm: number[],
  profile: CalibrationProfile,
  referenceVolumePerMmMl: number | null,
): VolumeUncertaintyReport {
  const warnings: string[] = [];
  const n = summary.repetitions;
  const avgDistanceMm = summary.avgDistanceMm;

  const sdBetweenRepetitionsMm = computeSampleStandardDeviation(distancesMm);

  const uARepeatabilityDistanceMm =
    n >= 2 && sdBetweenRepetitionsMm !== null ? sdBetweenRepetitionsMm / Math.sqrt(n) : null;

  const uSensorDistanceMm =
    avgDistanceMm > 0 ? (SENSOR_RELATIVE_UNCERTAINTY * avgDistanceMm) / SQRT3 : null;

  const uResolutionDistanceMm = computeStandardUncertaintyFromRectangularHalfWidth(
    SENSOR_RESOLUTION_HALF_WIDTH_MM,
  );
  const uAlignmentDistanceMm = computeStandardUncertaintyFromRectangularHalfWidth(
    SENSOR_ALIGNMENT_HALF_WIDTH_MM,
  );

  const uCombinedDistanceMm = combineQuadrature([
    uARepeatabilityDistanceMm,
    uSensorDistanceMm,
    uResolutionDistanceMm,
    uAlignmentDistanceMm,
  ]);

  const localSensitivityMlPerMm = computeLocalSensitivityMlPerMm(
    summary.volumeMl,
    profile.summaries,
    profile.relation,
  );

  const uDistanceAsVolumeMl =
    uCombinedDistanceMm !== null && localSensitivityMlPerMm !== null
      ? uCombinedDistanceMm * localSensitivityMlPerMm
      : null;

  const uSpirometerMarkMl = computeStandardUncertaintyFromRectangularHalfWidth(
    SPIROMETER_MARK_HALF_WIDTH_ML,
  );

  const uRuleGeometryCheckMl =
    referenceVolumePerMmMl !== null
      ? referenceVolumePerMmMl *
        computeStandardUncertaintyFromRectangularHalfWidth(RULE_RESOLUTION_HALF_WIDTH_MM)
      : null;
  const uRuleVolumeMl = uRuleGeometryCheckMl;
  const includeRuleInCombinedUncertainty = INCLUDE_RULE_IN_COMBINED_UNCERTAINTY;

  const volumeUncertaintyTerms: (number | null)[] = [uDistanceAsVolumeMl, uSpirometerMarkMl];
  if (includeRuleInCombinedUncertainty && uRuleGeometryCheckMl !== null) {
    volumeUncertaintyTerms.push(uRuleGeometryCheckMl);
  }
  const uCombinedVolumeMl = combineQuadrature(volumeUncertaintyTerms);

  const expandedUncertaintyU95Ml =
    uCombinedVolumeMl !== null ? UNCERTAINTY_COVERAGE_FACTOR_K * uCombinedVolumeMl : null;

  if (n < 5) {
    warnings.push('Se requieren 5 mediciones válidas para este volumen.');
  }
  if (localSensitivityMlPerMm === null) {
    warnings.push('No se pudo estimar sensibilidad local.');
  }
  if (expandedUncertaintyU95Ml !== null && expandedUncertaintyU95Ml > UNCERTAINTY_MAX_ACCEPTABLE_U95_ML) {
    warnings.push('Incertidumbre elevada para este volumen.');
  }
  if (uCombinedDistanceMm === null) {
    warnings.push('Incertidumbre de distancia incompleta.');
  }

  let status: VolumeUncertaintyStatus;
  if (
    n === 0 ||
    localSensitivityMlPerMm === null ||
    uCombinedVolumeMl === null ||
    expandedUncertaintyU95Ml === null
  ) {
    status = 'insufficient_data';
  } else if (n >= 5 && expandedUncertaintyU95Ml !== null) {
    status = 'ok';
  } else {
    status = 'limited';
  }

  return {
    volumeMl: summary.volumeMl,
    repetitions: n,
    avgDistanceMm,
    sdBetweenRepetitionsMm,
    uARepeatabilityDistanceMm,
    uSensorDistanceMm,
    uResolutionDistanceMm,
    uAlignmentDistanceMm,
    uCombinedDistanceMm,
    localSensitivityMlPerMm,
    uDistanceAsVolumeMl,
    uSpirometerMarkMl,
    uRuleVolumeMl,
    uRuleGeometryCheckMl,
    includeRuleInCombinedUncertainty,
    uCombinedVolumeMl,
    expandedUncertaintyU95Ml,
    coverageFactorK: UNCERTAINTY_COVERAGE_FACTOR_K,
    status,
    warnings,
  };
}

function resolveSpirometerProfile(profile: CalibrationProfile): SpirometerProfile {
  return profile.spirometerProfileSnapshot;
}

function resolveRequiredVolumes(profile: CalibrationProfile): number[] {
  if (profile.requiredVolumesMl?.length) {
    return profile.requiredVolumesMl;
  }
  return resolveSpirometerProfile(profile).requiredVolumesMl;
}

/** Reporte de incertidumbre por cada volumen presente en el perfil. */
export function computeVolumeUncertaintyReports(profile: CalibrationProfile): VolumeUncertaintyReport[] {
  const spirometerProfile = resolveSpirometerProfile(profile);
  const referenceVolumePerMmMl = deriveReferenceVolumePerMmMl(spirometerProfile);

  const byVolume = new Map<number, number[]>();
  for (const p of profile.points) {
    if (!byVolume.has(p.volumeMl)) byVolume.set(p.volumeMl, []);
    byVolume.get(p.volumeMl)?.push(p.distanceMm);
  }

  return [...profile.summaries]
    .sort((a, b) => a.volumeMl - b.volumeMl)
    .map((summary) =>
      buildVolumeUncertaintyReport(
        summary,
        byVolume.get(summary.volumeMl) ?? [],
        profile,
        referenceVolumePerMmMl,
      ),
    );
}

function buildBaseComponents(referenceVolumePerMmMl: number | null): UncertaintyComponent[] {
  const uRuleGeometryCheckMl =
    referenceVolumePerMmMl !== null
      ? referenceVolumePerMmMl *
        computeStandardUncertaintyFromRectangularHalfWidth(RULE_RESOLUTION_HALF_WIDTH_MM)
      : null;

  return [
    {
      label: 'Resolución sensor',
      value: SENSOR_RESOLUTION_HALF_WIDTH_MM,
      unit: 'mm',
      description: `Semiancho ±${SENSOR_RESOLUTION_HALF_WIDTH_MM} mm → u = a/√3`,
    },
    {
      label: 'Incertidumbre relativa sensor',
      value: SENSOR_RELATIVE_UNCERTAINTY * 100,
      unit: 'mm',
      description:
        '3 % conservador (supuesto técnico ajustable según modo real del VL53L0X); u = (Urel·d)/√3',
    },
    {
      label: 'Alineación / montaje',
      value: SENSOR_ALIGNMENT_HALF_WIDTH_MM,
      unit: 'mm',
      description: 'Montaje, alineación, concavidad del pistón y acoplamiento; u = a/√3',
    },
    {
      label: 'Lectura marca espirómetro',
      value: SPIROMETER_MARK_HALF_WIDTH_ML,
      unit: 'mL',
      description:
        'Referencia primaria de volumen en calibración; semiancho rectangular → u = a/√3',
      includedInCombinedUncertainty: true,
    },
    {
      label: 'Regla física, verificación geométrica',
      value: uRuleGeometryCheckMl,
      unit: 'mL',
      description:
        referenceVolumePerMmMl === null
          ? 'No disponible: el perfil de espirómetro no tiene escala geométrica medida (distancia entre marcas).'
          : 'Usada para verificar la coherencia del desplazamiento físico del pistón. No se incluye por defecto en la incertidumbre combinada del volumen, porque la referencia primaria es la escala del espirómetro.',
      includedInCombinedUncertainty: INCLUDE_RULE_IN_COMBINED_UNCERTAINTY,
    },
    {
      label: 'Factor de cobertura k',
      value: UNCERTAINTY_COVERAGE_FACTOR_K,
      unit: 'mL',
      description: 'U95 = k · uc; k = 2 (~95 % de cobertura)',
    },
  ];
}

function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Resumen global de incertidumbre y supuestos metrológicos base. */
export function computeCalibrationUncertaintySummary(
  profile: CalibrationProfile,
): CalibrationUncertaintySummary {
  const spirometerProfile = resolveSpirometerProfile(profile);
  const requiredVolumes = resolveRequiredVolumes(profile);
  const referenceVolumePerMmMl = deriveReferenceVolumePerMmMl(spirometerProfile);

  const reports = computeVolumeUncertaintyReports(profile);
  const u95Values = reports
    .map((r) => r.expandedUncertaintyU95Ml)
    .filter((v): v is number => v !== null);

  const averageU95Ml = meanOf(u95Values);
  const minU95Ml = u95Values.length > 0 ? Math.min(...u95Values) : null;
  const maxU95Ml = u95Values.length > 0 ? Math.max(...u95Values) : null;
  const volumeWithMaxU95Ml =
    maxU95Ml === null
      ? null
      : (reports.find((r) => r.expandedUncertaintyU95Ml === maxU95Ml)?.volumeMl ?? null);

  const warnings: string[] = [];
  if (reports.some((r) => r.status === 'insufficient_data')) {
    warnings.push('Hay volúmenes con datos insuficientes para estimar incertidumbre.');
  }
  if (maxU95Ml !== null && maxU95Ml > UNCERTAINTY_MAX_ACCEPTABLE_U95_ML) {
    warnings.push(
      `La incertidumbre máxima (U95 = ${maxU95Ml.toFixed(0)} mL) supera ${UNCERTAINTY_MAX_ACCEPTABLE_U95_ML} mL.`,
    );
  }

  const missingRequired = requiredVolumes.filter(
    (v) => !profile.summaries.some((s) => s.volumeMl === v),
  );
  if (missingRequired.length > 0) {
    warnings.push(`Faltan volúmenes obligatorios: ${missingRequired.join(', ')} mL.`);
  }

  const totalRequiredPoints = profile.points.filter((p) => requiredVolumes.includes(p.volumeMl)).length;
  const meetsProtocol =
    missingRequired.length === 0 &&
    requiredVolumes.every(
      (v) =>
        (profile.summaries.find((s) => s.volumeMl === v)?.repetitions ?? 0) >=
        MIN_REPETITIONS_PER_REQUIRED_VOLUME,
    ) &&
    totalRequiredPoints >= MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY;
  if (!meetsProtocol) {
    warnings.push('No se cumple el protocolo mínimo de calibración para un reporte completo.');
  }

  if (!INCLUDE_RULE_IN_COMBINED_UNCERTAINTY) {
    warnings.push(
      'La regla no se incluye en uc del volumen: solo verificación geométrica del montaje (referencia primaria: escala del espirómetro).',
    );
  }
  if (referenceVolumePerMmMl === null) {
    warnings.push(
      'La regla física no está disponible en este perfil de espirómetro (validación geométrica no configurada).',
    );
  }

  return {
    averageU95Ml,
    maxU95Ml,
    volumeWithMaxU95Ml,
    minU95Ml,
    reports,
    components: buildBaseComponents(referenceVolumePerMmMl),
    includeRuleInCombinedUncertainty: INCLUDE_RULE_IN_COMBINED_UNCERTAINTY,
    warnings,
  };
}

/** Paso de distancia esperado por tramo de volumen del perfil (mm), o null si no está configurado. */
export function getExpectedGeometricDistanceStepMm(
  profile: SpirometerProfile,
): number | null {
  return profile.expectedDistanceStepMm;
}

export function buildUncertaintyRecommendation(
  summary: CalibrationUncertaintySummary,
): CalibrationUncertaintyRecommendation {
  const hasAcceptableUncertainty =
    summary.maxU95Ml !== null && summary.maxU95Ml <= UNCERTAINTY_MAX_ACCEPTABLE_U95_ML;
  return {
    averageU95Ml: summary.averageU95Ml,
    maxU95Ml: summary.maxU95Ml,
    volumeWithMaxU95Ml: summary.volumeWithMaxU95Ml,
    hasAcceptableUncertainty,
  };
}
