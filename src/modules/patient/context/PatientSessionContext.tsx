/**
 * Purpose: In-memory session synced with local storage for the active patient.
 * Module: patient
 * Dependencies: React, patient-service
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCurrentPatient as loadCurrentPatientFromStorage,
  logoutPatient as clearSessionStorage,
  saveCurrentPatient as persistCurrentPatient,
} from '@/src/modules/patient/patient-service';
import {
  getProfilePreferences,
  updateProfilePreferences,
} from '@/src/modules/patient/storage/profile-preferences-repository';
import type { PatientRecord } from '@/src/modules/patient/types';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';

type PatientSessionContextValue = {
  patient: PatientRecord | null;
  hydrated: boolean;
  profileAvatarUri: string | null;
  setProfileAvatarUri: (uri: string | null) => Promise<void>;
  setSessionPatient: (p: PatientRecord) => Promise<void>;
  clearSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const PatientSessionContext = createContext<PatientSessionContextValue | undefined>(undefined);

async function loadProfileAvatarUri(p: PatientRecord | null): Promise<string | null> {
  if (!p) return null;
  const prefs = await getProfilePreferences(p.paciente_id);
  return prefs.avatarUri;
}

export function PatientSessionProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [profileAvatarUri, setProfileAvatarUriState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const p = await loadCurrentPatientFromStorage();
      setPatient(p);
      setProfileAvatarUriState(await loadProfileAvatarUri(p));
    } catch {
      setPatient(null);
      setProfileAvatarUriState(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let p: PatientRecord | null = null;
      try {
        p = await loadCurrentPatientFromStorage();
      } catch {
        p = null;
      }
      if (!cancelled) {
        setPatient(p);
        setProfileAvatarUriState(await loadProfileAvatarUri(p));
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setProfileAvatarUri = useCallback(async (uri: string | null) => {
    const activePatient = patient ?? (await loadCurrentPatientFromStorage());
    if (!activePatient) return;
    await updateProfilePreferences(activePatient.paciente_id, { avatarUri: uri });
    setProfileAvatarUriState(uri);
  }, [patient]);

  const setSessionPatient = useCallback(async (p: PatientRecord) => {
    try {
      await persistCurrentPatient(p);
      setPatient(p);
      setProfileAvatarUriState(await loadProfileAvatarUri(p));
    } catch (error) {
      console.error('[ERROR DETALLE] setSessionPatient', error);
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const clearSession = useCallback(async () => {
    await clearSessionStorage();
    setPatient(null);
    setProfileAvatarUriState(null);
  }, []);

  const value = useMemo(
    () => ({
      patient,
      hydrated,
      profileAvatarUri,
      setProfileAvatarUri,
      setSessionPatient,
      clearSession,
      refreshSession,
    }),
    [patient, hydrated, profileAvatarUri, setProfileAvatarUri, setSessionPatient, clearSession, refreshSession],
  );

  return (
    <PatientSessionContext.Provider value={value}>{children}</PatientSessionContext.Provider>
  );
}

export function usePatientSession(): PatientSessionContextValue {
  const ctx = useContext(PatientSessionContext);
  if (!ctx) {
    throw new Error('usePatientSession must be used within PatientSessionProvider');
  }
  return ctx;
}
