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
import type { PatientRecord } from '@/src/modules/patient/types';

type PatientSessionContextValue = {
  patient: PatientRecord | null;
  hydrated: boolean;
  setSessionPatient: (p: PatientRecord) => Promise<void>;
  clearSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const PatientSessionContext = createContext<PatientSessionContextValue | undefined>(undefined);

export function PatientSessionProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refreshSession = useCallback(async () => {
    const p = await loadCurrentPatientFromStorage();
    setPatient(p);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadCurrentPatientFromStorage();
      if (!cancelled) {
        setPatient(p);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSessionPatient = useCallback(async (p: PatientRecord) => {
    await persistCurrentPatient(p);
    setPatient(p);
  }, []);

  const clearSession = useCallback(async () => {
    await clearSessionStorage();
    setPatient(null);
  }, []);

  const value = useMemo(
    () => ({
      patient,
      hydrated,
      setSessionPatient,
      clearSession,
      refreshSession,
    }),
    [patient, hydrated, setSessionPatient, clearSession, refreshSession],
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
