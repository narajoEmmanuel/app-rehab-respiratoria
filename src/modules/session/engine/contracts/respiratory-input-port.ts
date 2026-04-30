/**
 * Purpose: Input contract for respiratory gameplay signals.
 * Module: session/engine
 * Dependencies: none
 * Notes: Allows swapping touch simulation with live sensor data from WebSocket (WiFi local).
 */

export type RespiratoryInputSource = 'touch' | 'websocket';

export type RespiratoryInputPort = {
  source: RespiratoryInputSource;
  onInhaleStart: () => void;
  onInhaleEnd: () => void;
};
