/**
 * Purpose: Touch adapter implementing respiratory input semantics.
 * Module: session/engine/touch
 * Dependencies: react, session/engine/contracts
 * Notes: Hold press == inhale; release == exhale.
 */
import { useMemo } from 'react';

import type { RespiratoryInputPort } from '@/src/modules/session/engine/contracts/respiratory-input-port';

type UseTouchInputAdapterParams = {
  onInhaleStart: () => void;
  onInhaleEnd: () => void;
};

export function useTouchInputAdapter({
  onInhaleStart,
  onInhaleEnd,
}: UseTouchInputAdapterParams): RespiratoryInputPort {
  return useMemo(
    () => ({
      source: 'touch',
      onInhaleStart,
      onInhaleEnd,
    }),
    [onInhaleEnd, onInhaleStart]
  );
}
