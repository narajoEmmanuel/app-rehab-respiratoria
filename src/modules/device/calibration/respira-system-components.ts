/**
 * Componentes fijos del sistema RESPIRA+ (ESP32 + VL53L0X).
 * No se capturan manualmente en cada calibración.
 */

export const RESPIRA_SYSTEM_COMPONENTS = {
  microcontroller:
    'ESP32 WROOM 32 WiFi + Bluetooth 4.2 DevKit V1',
  microcontrollerDisplay: 'ESP32 WROOM 32 DevKit V1',
  sensor: 'VL53L0X / GY-530 ToF',
  sensorDisplay: 'Sensor ToF VL53L0X / GY-530',
  firmwareReference: 'envio_datos_stream_button.ino',
  communication: 'WiFi local + WebSocket',
} as const;

export type RespiraSystemComponents = typeof RESPIRA_SYSTEM_COMPONENTS;

/** Campos CSV de componentes del sistema (valores fijos por exportación). */
export function respiraSystemComponentsCsvFields(): Record<string, string> {
  return {
    system_microcontroller: RESPIRA_SYSTEM_COMPONENTS.microcontroller,
    system_sensor: RESPIRA_SYSTEM_COMPONENTS.sensor,
    system_firmware_reference: RESPIRA_SYSTEM_COMPONENTS.firmwareReference,
    system_communication: RESPIRA_SYSTEM_COMPONENTS.communication,
  };
}
