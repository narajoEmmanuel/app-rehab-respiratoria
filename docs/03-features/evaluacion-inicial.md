# Evaluación inicial

## Propósito

Estimar volumen inspiratorio máximo de apoyo (VIM) con 3 intentos oficiales con sensor, generar objetivos por nivel y habilitar terapia. **No es diagnóstico clínico.**

## Archivos principales

| Rol | Ruta |
|-----|------|
| Examen | `app/diagnostico.tsx` → `src/modules/diagnostics/screens/DiagnosticExamScreen.tsx` |
| Resumen post-examen | `app/diagnostico-resumen.tsx` → `DiagnosticSummaryScreen.tsx` |
| Resumen histórico | `app/evaluacion-resumen.tsx` → `InitialEvaluationSummaryScreen.tsx` |
| Servicio | `src/modules/diagnostics/diagnostic-service.ts` |
| Repositorio | `src/modules/diagnostics/diagnostic-repository.ts` |
| Sesión eval | `src/modules/diagnostics/diagnostic-evaluation-session-service.ts` |
| Nav | `src/modules/diagnostics/navigate-to-initial-evaluation.ts` |
| Readiness | `src/modules/diagnostics/use-initial-evaluation-readiness.ts` |
| Sensor volumen | `src/modules/diagnostics/use-diagnostic-sensor-volume.ts` |
| Validación VIM | `src/modules/diagnostics/diagnostic-vim-validation.ts` |

Componentes: `InitialEvaluationWelcomeView`, `InitialEvaluationCountdownView`, `EvaluationAttemptsCard`, `EvaluationComparisonCard`, `EvaluationLevelTargetsCard`.

## Rutas relacionadas

- `/diagnostico` — examen
- `/diagnostico-resumen?evaluationSessionId&inputMode` — tras completar
- `/evaluacion-resumen` — consulta desde Perfil

## Entradas del flujo

- CTA Inicio/Terapia sin `hasDiagnostic()`.
- Perfil → evaluación o re-evaluación.

## Salidas del flujo

- `persistOfficialDiagnosticResult` → `@rehab/diagnostics_v1`.
- `generatePatientLevels` → `@rehab/patient_levels_v1` (level-1 `active`, resto `locked`).
- Redirect típico → `/(tabs)/terapia`.

## Datos persistidos

| Entidad | Campos clave |
|---------|--------------|
| `DiagnosticRecord` | `max_inspiratory_volume`, `attempts[]`, `consistency_summary` |
| `PatientLevelRecord` | `target_volume`, `level_status`, factores VIM |

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Paciente activo | Filtra por `patient_id` |
| Consent | Rutas `/diagnostico`, `/diagnostico-resumen`, `/evaluacion-resumen` envueltas en `ConsentStackGuard` → `/legal/accept` si inactivo; CTA vía `navigateToInitialEvaluation` verifica `isConsentActive()` |
| Sensor | Flujo oficial vía `navigateToInitialEvaluation` (`inputMode: sensor`) |
| Touch | Tipos permiten touch con flag; **no** es flujo principal documentado en nav |

## Riesgos clínicos o técnicos

- Presentar VIM como diagnóstico — prohibido en copy (disclaimers en resumen).
- Requiere calibración + sensor live (`use-initial-evaluation-readiness`).
- `DiagnosticExamScreen` ~900 líneas — mantenimiento difícil.

## Pendientes

- Dos rutas “resumen” (`diagnostico-resumen` vs `evaluacion-resumen`) — nomenclatura confusa.
- README módulo `diagnostics/` no existe aún.

## Checklist manual mínimo

- [ ] Sin consent activo: CTA “Comenzar evaluación” y `/diagnostico` redirigen a `/legal/accept`.
- [ ] Sin evaluación: Terapia bloqueada para jugar.
- [ ] 3 intentos + descansos registrados.
- [ ] VIM y targets visibles en resumen con disclaimer médico.
- [ ] Tras guardar: `hasDiagnostic()` true y level-1 activo.
- [ ] Re-evaluación actualiza targets (según servicio).

## Docs relacionados

- [Terapia](../02-tabs/terapia.md)
- [Niveles y progresión](./niveles-progresion.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
