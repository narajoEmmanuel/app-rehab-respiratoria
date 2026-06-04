/**
 * Purpose: Persisted profile preference for touch practice input (Perfil only).
 * Module: session/hooks
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import {
  getProfilePreferences,
  updateProfilePreferences,
} from '@/src/modules/patient/storage/profile-preferences-repository';
import { isTouchPracticeModeEnabled } from '@/src/modules/session/session-input-mode';

export type TouchPracticePreferenceContextValue = {
  hydrated: boolean;
  touchPracticeFeatureEnabled: boolean;
  profileTouchPracticeEnabled: boolean;
  setProfileTouchPracticeEnabled: (enabled: boolean) => Promise<void>;
  reload: () => Promise<void>;
};

const TouchPracticePreferenceContext = createContext<TouchPracticePreferenceContextValue | null>(
  null,
);

export function TouchPracticePreferenceProvider({ children }: { children: ReactNode }) {
  const { patient } = usePatientSession();
  const [hydrated, setHydrated] = useState(false);
  const [profileTouchPracticeEnabled, setProfileTouchPracticeEnabledState] = useState(false);

  const touchPracticeFeatureEnabled = isTouchPracticeModeEnabled();

  const reload = useCallback(async () => {
    if (!patient) {
      setProfileTouchPracticeEnabledState(false);
      setHydrated(true);
      return;
    }
    const prefs = await getProfilePreferences(patient.paciente_id);
    setProfileTouchPracticeEnabledState(prefs.allowTouchPracticeInput);
    setHydrated(true);
  }, [patient]);

  useEffect(() => {
    setHydrated(false);
    void reload();
  }, [reload]);

  const setProfileTouchPracticeEnabled = useCallback(
    async (enabled: boolean) => {
      if (!patient) return;
      setProfileTouchPracticeEnabledState(enabled);
      await updateProfilePreferences(patient.paciente_id, { allowTouchPracticeInput: enabled });
    },
    [patient],
  );

  const value = useMemo(
    () => ({
      hydrated,
      touchPracticeFeatureEnabled,
      profileTouchPracticeEnabled,
      setProfileTouchPracticeEnabled,
      reload,
    }),
    [
      hydrated,
      touchPracticeFeatureEnabled,
      profileTouchPracticeEnabled,
      reload,
      setProfileTouchPracticeEnabled,
    ],
  );

  return (
    <TouchPracticePreferenceContext.Provider value={value}>
      {children}
    </TouchPracticePreferenceContext.Provider>
  );
}

export function useTouchPracticePreference(): TouchPracticePreferenceContextValue {
  const ctx = useContext(TouchPracticePreferenceContext);
  if (!ctx) {
    throw new Error(
      'useTouchPracticePreference debe usarse dentro de TouchPracticePreferenceProvider',
    );
  }
  return ctx;
}
