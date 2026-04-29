/**
 * Purpose: Input contract for respiratory gameplay signals.
 * Module: session/engine
 * Dependencies: none
 * Notes: Allows swapping touch simulation with BLE sensor data.
 */

export type RespiratoryInputSource = 'touch' | 'bluetooth';

export type RespiratoryInputPort = {
  source: RespiratoryInputSource;
  onInhaleStart: () => void;
  onInhaleEnd: () => void;
};
