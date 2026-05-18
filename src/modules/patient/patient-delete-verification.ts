/**
 * Comprobaciones post-eliminación: el paciente y sus datos asociados no deben quedar activos.
 */
import { readAllAttempts, readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import { hasLevelsProgress } from '@/src/modules/levels/storage/levels-progress-storage';
import { readPatientById } from '@/src/modules/patient/patient-repository';
import { getCurrentPatient } from '@/src/modules/patient/patient-service';

export type PatientDeletionVerification = {
  deletedPatientStillExists: boolean;
  currentPatientId: number | null;
  currentPatientMatchesDeleted: boolean;
  sessionsForDeletedPatient: number;
  attemptsForDeletedPatient: number;
  levelsProgressForDeletedPatient: boolean;
};

export async function verifyPatientFullyRemoved(
  deletedPatientId: number,
): Promise<PatientDeletionVerification> {
  const stillInList = await readPatientById(deletedPatientId);
  const current = await getCurrentPatient();
  const currentPatientId = current?.paciente_id ?? null;

  const sessions = await readAllSessions();
  const sessionsForDeleted = sessions.filter((s) => s.patient_id === deletedPatientId).length;

  const sessionIds = new Set(
    sessions.filter((s) => s.patient_id === deletedPatientId).map((s) => s.session_id),
  );
  const attempts = await readAllAttempts();
  const attemptsForDeleted = attempts.filter((a) => sessionIds.has(a.session_id)).length;

  const levelsProgressForDeleted = await hasLevelsProgress(deletedPatientId);

  return {
    deletedPatientStillExists: stillInList != null,
    currentPatientId,
    currentPatientMatchesDeleted: currentPatientId === deletedPatientId,
    sessionsForDeletedPatient: sessionsForDeleted,
    attemptsForDeletedPatient: attemptsForDeleted,
    levelsProgressForDeletedPatient: levelsProgressForDeleted,
  };
}

export async function assertPatientFullyRemoved(deletedPatientId: number): Promise<void> {
  const v = await verifyPatientFullyRemoved(deletedPatientId);
  if (v.deletedPatientStillExists) {
    throw new Error('El registro del paciente sigue en almacenamiento local.');
  }
  if (v.currentPatientMatchesDeleted) {
    throw new Error('La sesión activa sigue apuntando al paciente eliminado.');
  }
  if (v.sessionsForDeletedPatient > 0) {
    throw new Error('Quedan sesiones del paciente eliminado.');
  }
  if (v.attemptsForDeletedPatient > 0) {
    throw new Error('Quedan intentos del paciente eliminado.');
  }
  if (v.levelsProgressForDeletedPatient) {
    throw new Error('Queda progreso de niveles del paciente eliminado.');
  }
}
