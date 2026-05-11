import { createContext, useContext, type ReactNode } from 'react';

import { useEsp32WebSocketSensor } from '@/src/modules/device/adapters/use-esp32-websocket-sensor';

export type SensorConnectionContextValue = ReturnType<typeof useEsp32WebSocketSensor>;

const SensorConnectionContext = createContext<SensorConnectionContextValue | null>(null);

/**
 * Mantiene una única instancia del cliente WebSocket y del estado asociado para toda la app.
 * Debe envolver el árbol donde existan pantallas que lean o controlen el sensor.
 */
export function SensorConnectionProvider({ children }: { children: ReactNode }) {
  const value = useEsp32WebSocketSensor();
  return <SensorConnectionContext.Provider value={value}>{children}</SensorConnectionContext.Provider>;
}

export function useSensorConnection(): SensorConnectionContextValue {
  const ctx = useContext(SensorConnectionContext);
  if (!ctx) {
    throw new Error('useSensorConnection debe usarse dentro de SensorConnectionProvider');
  }
  return ctx;
}
