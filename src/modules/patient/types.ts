/**
 * Purpose: Patient entity and future local schema types for rehab data.
 * Module: patient
 * Dependencies: none
 * Notes: Tables planes_semanales, sesiones, etc. are prepared for SQLite or sync later.
 */

/** Paciente persistido localmente (equivalente a tabla `pacientes`). */
export type PatientRecord = {
  paciente_id: number;
  clave: string;
  nombre_completo: string;
  edad: number;
  current_level_id: 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5' | null;
  racha_actual: number;
  ultima_fecha_cumplida: string | null;
  fecha_creacion: string;
};

/** Fila futura: `planes_semanales`. */
export type PlanSemanalRecord = {
  plan_id: number;
  paciente_id: number;
  semana_inicio_iso: string;
  notas: string | null;
  creado_en: string;
};

/** Fila futura: `sesiones_programadas`. */
export type SesionProgramadaRecord = {
  sesion_programada_id: number;
  plan_id: number | null;
  paciente_id: number;
  fecha_iso: string;
  estado: 'pendiente' | 'completada' | 'cancelada';
};

/** Fila futura: `sesiones_realizadas`. */
export type SesionRealizadaRecord = {
  sesion_realizada_id: number;
  paciente_id: number;
  inicio_iso: string;
  fin_iso: string | null;
  nivel_id: string | null;
};

/** Fila futura: `intentos` (ej. mini-juegos o ejercicios). */
export type IntentoRecord = {
  intento_id: number;
  sesion_realizada_id: number;
  tipo: string;
  puntuacion: number | null;
  meta_json: string | null;
};

/** Fila futura: `progreso_diario`. */
export type ProgresoDiarioRecord = {
  progreso_id: number;
  paciente_id: number;
  fecha_iso: string;
  minutos_totales: number;
  cumplido: boolean;
};
