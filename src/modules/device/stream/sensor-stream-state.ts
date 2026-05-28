import type { SensorStreamState } from '@/src/modules/device/types/sensor-reading';

/** Sin datos nuevos durante este tiempo → transmisión pausada o en espera. */
export const SENSOR_STREAM_DATA_TIMEOUT_MS = 2000;

export const SENSOR_STREAM_STATE_LABELS: Record<SensorStreamState, string> = {
  idle: 'Sin conexión de datos',
  connected_waiting_stream:
    'Sensor conectado. Presiona el botón físico para iniciar transmisión.',
  receiving_data: 'Recibiendo datos del sensor',
  stream_paused: 'Transmisión pausada. Presiona el botón físico para continuar.',
};

export function isSensorStreamActivelyReceiving(state: SensorStreamState): boolean {
  return state === 'receiving_data';
}
