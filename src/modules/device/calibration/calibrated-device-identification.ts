/**
 * Metadatos del espirómetro físico calibrado (modo técnico y exportación).
 */

export type CalibratedDeviceIdentification = {
  /** Etiqueta interna o nombre del dispositivo en inventario. */
  internalLabel: string;
  brand: string;
  model: string;
  nominalCapacityMl: number;
  serialNumber?: string;
  sensorModuleId?: string;
  calibrationOperator?: string;
  /** Fecha de calibración en formato ISO (YYYY-MM-DD). */
  calibrationDateIso: string;
  technicalNotes?: string;
};

export function formatCalibrationDateIso(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function createDefaultCalibratedDeviceIdentification(
  date: Date = new Date(),
): CalibratedDeviceIdentification {
  return {
    internalLabel: 'RESPIRA+ 3000 mL',
    brand: 'MediMetrics Medical Technologies',
    model: 'MV1811-3',
    nominalCapacityMl: 3000,
    calibrationDateIso: formatCalibrationDateIso(date),
  };
}

export function mergeCalibratedDeviceIdentification(
  partial?: Partial<CalibratedDeviceIdentification> | null,
): CalibratedDeviceIdentification {
  const defaults = createDefaultCalibratedDeviceIdentification();
  if (!partial) return defaults;
  return {
    ...defaults,
    ...partial,
    nominalCapacityMl:
      typeof partial.nominalCapacityMl === 'number' && Number.isFinite(partial.nominalCapacityMl)
        ? partial.nominalCapacityMl
        : defaults.nominalCapacityMl,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function coerceCalibratedDeviceIdentification(
  value: unknown,
): CalibratedDeviceIdentification | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.internalLabel !== 'string') return null;
  if (typeof value.brand !== 'string') return null;
  if (typeof value.model !== 'string') return null;
  if (typeof value.nominalCapacityMl !== 'number' || !Number.isFinite(value.nominalCapacityMl)) {
    return null;
  }
  if (typeof value.calibrationDateIso !== 'string') return null;
  return mergeCalibratedDeviceIdentification({
    internalLabel: value.internalLabel,
    brand: value.brand,
    model: value.model,
    nominalCapacityMl: value.nominalCapacityMl,
    serialNumber: typeof value.serialNumber === 'string' ? value.serialNumber : undefined,
    sensorModuleId: typeof value.sensorModuleId === 'string' ? value.sensorModuleId : undefined,
    calibrationOperator:
      typeof value.calibrationOperator === 'string' ? value.calibrationOperator : undefined,
    calibrationDateIso: value.calibrationDateIso,
    technicalNotes: typeof value.technicalNotes === 'string' ? value.technicalNotes : undefined,
  });
}
