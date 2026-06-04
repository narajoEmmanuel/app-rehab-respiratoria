/**
 * Eliminación local de datos del paciente (no toca calibración ni modelos del espirómetro).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGAL_STORAGE_KEY } from '@/src/modules/legal/constants';
import type { AcceptedConsentRecord } from '@/src/modules/legal/types';
import {
  readAllDiagnostics,
  readAllPatientLevels,
  writeAllDiagnostics,
  writeAllPatientLevels,
} from '@/src/modules/diagnostics/diagnostic-repository';
import { clearLevelsProgress } from '@/src/modules/levels/storage/levels-progress-storage';
import { cancelScheduledNotificationIds } from '@/src/modules/notifications/notification-scheduler';
import {
  clearNotificationSettings,
  loadNotificationSettings,
} from '@/src/modules/notifications/notification-settings.storage';
import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import { bumpPatientIdSequenceFloor } from '@/src/modules/patient/patient-id-allocation';
import { assertPatientFullyRemoved } from '@/src/modules/patient/patient-delete-verification';
import {
  clearCurrentClave,
  normalizeClave,
  readAllPatients,
  readCurrentClave,
  readPatientById,
  writeAllPatients,
} from '@/src/modules/patient/patient-repository';
import { clearProfilePreferences } from '@/src/modules/patient/storage/profile-preferences-repository';
import { getCurrentPatient } from '@/src/modules/patient/patient-service';
import {
  readAllAttempts,
  readAllSessions,
  writeAllAttempts,
  writeAllSessions,
} from '@/src/modules/session/storage/session-progress-repository';

async function clearLocalConsentIfOwnedByPatient(patientId: number): Promise<void> {
  const raw = await AsyncStorage.getItem(LEGAL_STORAGE_KEY);
  if (raw == null || raw === '') return;
  try {
    const parsed = JSON.parse(raw) as AcceptedConsentRecord;
    if (String(parsed.userId) === String(patientId)) {
      await AsyncStorage.removeItem(LEGAL_STORAGE_KEY);
    }
  } catch {
    await AsyncStorage.removeItem(LEGAL_STORAGE_KEY);
  }
}

export async function deletePatientLocalData(patientId: number): Promise<void> {
  const patient = await readPatientById(patientId);
  if (!patient) {
    throw new Error('Paciente no encontrado.');
  }

  const patientIdStr = String(patientId);

  const notifSettings = await loadNotificationSettings(patientIdStr);
  if (notifSettings.scheduledNotificationIds.length > 0) {
    await cancelScheduledNotificationIds(notifSettings.scheduledNotificationIds);
  }
  await clearNotificationSettings(patientIdStr);
  await clearProfilePreferences(patientId);
  await clearLevelsProgress(patientId);

  const sessions = await readAllSessions();
  const sessionIdsToRemove = new Set(
    sessions.filter((s) => s.patient_id === patientId).map((s) => s.session_id),
  );
  const remainingSessions = sessions.filter((s) => s.patient_id !== patientId);
  const attempts = await readAllAttempts();
  const remainingAttempts = attempts.filter((a) => !sessionIdsToRemove.has(a.session_id));

  const diagnostics = await readAllDiagnostics();
  const remainingDiagnostics = diagnostics.filter((d) => d.patient_id !== patientId);
  const patientLevels = await readAllPatientLevels();
  const remainingLevels = patientLevels.filter((l) => l.patient_id !== patientId);
  const patients = await readAllPatients();
  const remainingPatients = patients.filter((p) => p.paciente_id !== patientId);

  await writeAllAttempts(remainingAttempts);
  await writeAllSessions(remainingSessions);
  await writeAllDiagnostics(remainingDiagnostics);
  await writeAllPatientLevels(remainingLevels);
  await writeAllPatients(remainingPatients);

  await clearLocalConsentIfOwnedByPatient(patientId);

  const currentClave = await readCurrentClave();
  if (currentClave && normalizeClave(currentClave) === normalizeClave(patient.clave)) {
    await clearCurrentClave();
  }

  await bumpPatientIdSequenceFloor(patientId);
}

export type DeletePatientLocalDataResult = {
  deletedPatientId: number;
  mode: 'local_first' | 'cloud_auth';
  shouldSignOut: true;
};

export async function deleteCurrentPatientLocalData(): Promise<DeletePatientLocalDataResult> {
  const patient = await getCurrentPatient();
  if (!patient) {
    throw new Error('No hay perfil local activo.');
  }

  const deletedPatientId = patient.paciente_id;
  await deletePatientLocalData(deletedPatientId);
  await clearCurrentClave();
  await assertPatientFullyRemoved(deletedPatientId);

  return {
    deletedPatientId,
    mode: isCloudAuthEnabled() ? 'cloud_auth' : 'local_first',
    shouldSignOut: true,
  };
}
