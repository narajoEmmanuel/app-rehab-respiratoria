/**
 * Constantes operativas para la calibración local del montaje
 * Besmed CIYO/TB-93500 (espirómetro volumétrico, 5000 mL) + VL53L0X.
 *
 * Notas de metrología:
 * - 500 mL NO representa el cero real del volumen del espirómetro.
 * - 500 mL es el límite inferior OPERATIVO porque el VL53L0X se vuelve
 *   inestable por debajo de ~30 mm y los puntos cercanos al sensor no son
 *   confiables; además, 0–500 mL aporta poca señal terapéutica.
 * - 0–500 mL se considera zona NO PRIORITARIA / baja confiabilidad,
 *   reservada para evaluaciones específicas posteriores.
 * - El rango RECOMENDADO clínico para el modelo es 500–3000 mL.
 * - El rango EXTENDIDO es 3500–5000 mL, opcional para pacientes con mayor capacidad.
 */

/** Distancia mínima fiable del VL53L0X en este montaje (mm). */
export const MIN_RELIABLE_SENSOR_DISTANCE_MM = 30;

/** Límite inferior operativo de volumen para registrar puntos nuevos (mL). */
export const MIN_OPERATIVE_VOLUME_ML = 500;

/** Rango recomendado: 500–3000 mL. */
export const RECOMMENDED_RANGE_ML = { min: 500, max: 3000 } as const;

/** Rango extendido: 3500–5000 mL (opcional). */
export const EXTENDED_RANGE_ML = { min: 3500, max: 5000 } as const;

/** Rango total del dispositivo (sin contar la zona no prioritaria 0–500). */
export const EXPECTED_MIN_VOLUME_ML = 500;
export const EXPECTED_RECOMMENDED_MAX_VOLUME_ML = 3000;
export const EXPECTED_MAX_VOLUME_ML = 5000;

/** Chips de selección rápida para volumen (mL). Excluye 0 mL por decisión de producto. */
export const OPERATIVE_VOLUME_CHIPS_ML = [
  500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
] as const;

/**
 * Volúmenes obligatorios del protocolo mínimo (mismo subconjunto que el rango recomendado 500–3000).
 * Deben estar presentes en la calibración con suficientes repeticiones para uso terapéutico.
 */
export const REQUIRED_RECOMMENDED_VOLUMES_ML = [
  500, 1000, 1500, 2000, 2500, 3000,
] as const;

/** Subconjunto del rango recomendado para chips (alineado con volúmenes obligatorios). */
export const RECOMMENDED_VOLUME_CHIPS_ML = REQUIRED_RECOMMENDED_VOLUMES_ML;

/** Subconjunto del rango extendido para chips. */
export const EXTENDED_VOLUME_CHIPS_ML = [3500, 4000, 4500, 5000] as const;

/**
 * Advertencia técnica: volúmenes con pocas repeticiones absolutas (cualquier nivel marcado).
 * El protocolo final para terapia exige `MIN_REPETITIONS_PER_REQUIRED_VOLUME` en cada volumen obligatorio.
 */
export const MIN_REPETITIONS_PER_VOLUME = 3;

/** Mínimo de mediciones válidas por cada volumen obligatorio para considerar listo para terapia. */
export const MIN_REPETITIONS_PER_REQUIRED_VOLUME = 5;

/** Total mínimo de puntos válidos en volúmenes obligatorios para listo para terapia. */
export const MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY = 30;

/** Variación máxima aceptable de la desviación estándar de distancia por punto (mm). */
export const MAX_ACCEPTABLE_STD_DISTANCE_MM = 5;

/** Relación máxima maxSlope/minSlope antes de marcar saltos bruscos en segmentos. */
export const MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO = 2.5;

/** Salto mínimo de distancia entre dos volúmenes consecutivos (mm). */
export const MIN_SEGMENT_DISTANCE_DELTA_MM = 1;

/** Paso de volumen de referencia para validación geométrica montaje vs espirómetro (mL). */
export const EXPECTED_VOLUME_STEP_ML = 500;

/**
 * Desplazamiento esperado del pistón por cada EXPECTED_VOLUME_STEP_ML en el montaje de referencia (mm).
 * Verificación física: ~1 cm ≈ 500 mL.
 */
export const EXPECTED_DISTANCE_STEP_PER_500ML_MM = 10;

/** Tolerancia estricta: Δ medido dentro de [10 − tol, 10 + tol] mm frente al esperado (magnitud). */
export const GEOMETRIC_STEP_OK_TOLERANCE_MM = 2;

/** Tolerancia de revisión: error absoluto hasta este valor (mm) fuera de ok pero no crítico aún. */
export const GEOMETRIC_STEP_REVIEW_TOLERANCE_MM = 4;

/**
 * Tramos consecutivos de 500 mL en el rango recomendado para comprobar escala geométrica (desde → hasta mL).
 */
export const REQUIRED_GEOMETRIC_SEGMENTS_ML = [
  [500, 1000],
  [1000, 1500],
  [1500, 2000],
  [2000, 2500],
  [2500, 3000],
] as const;

/**
 * A partir de este número de volúmenes distintos preferimos `piecewise_linear`
 * sobre `linear_regression` porque preserva mejor la curva real de calibración.
 */
export const PIECEWISE_PREFERRED_MIN_DISTINCT_VOLUMES = 4;
