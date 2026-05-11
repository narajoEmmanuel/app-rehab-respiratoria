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

/** Subconjunto del rango recomendado para chips. */
export const RECOMMENDED_VOLUME_CHIPS_ML = [500, 1000, 1500, 2000, 2500, 3000] as const;

/** Subconjunto del rango extendido para chips. */
export const EXTENDED_VOLUME_CHIPS_ML = [3500, 4000, 4500, 5000] as const;
