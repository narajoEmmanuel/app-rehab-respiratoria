/**
 * Purpose: React hook to load consent active state (refreshes on screen focus).
 * Module: legal
 */

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { isConsentActive } from '@/src/modules/legal/consent-service';

export type ConsentActiveState = {
  ready: boolean;
  active: boolean;
  refresh: () => void;
};

export function useConsentActive(): ConsentActiveState {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);

  const refresh = useCallback(() => {
    void (async () => {
      const ok = await isConsentActive();
      setActive(ok);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { ready, active, refresh };
}
