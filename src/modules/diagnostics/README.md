# Módulo `diagnostics` (evaluación inicial / VIM)

## Propósito

Implementa la **evaluación inicial** del paciente: estimación del volumen inspiratorio máximo de apoyo (**VIM**) mediante **tres intentos oficiales con sensor**, cálculo de consistencia y generación de **objetivos por nivel** (`patient_levels`). El VIM personaliza las metas de terapia gamificada; **no constituye diagnóstico clínico** ni prescripción terapéutica.

RESPIRA+ es un **prototipo académico** orientado a **pacientes adultos postoperatorios** bajo indicación profesional (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

```
Consentimiento activo → Readiness sensor → 3 intentos VIM + descansos
        → persistOfficialDiagnosticResult → generatePatientLevels → Terapia (nivel 1 activo)
```

| Entrada | Detalle |
|---------|---------|
| Inicio / Terapia | CTA si `hasDiagnostic()` es falso |
| Perfil | Consulta o re-evaluación |
| Sensor | Flujo oficial vía `navigateToInitialEvaluation` (`inputMode: sensor`) |

| Salida | Detalle |
|--------|---------|
| `@rehab/diagnostics_v1` | `DiagnosticRecord` con VIM y intentos |
| `@rehab/patient_levels_v1` | Targets por nivel; level-1 `active`, resto `locked` |
| Terapia | Desbloqueo de pestaña Terapia para sesión oficial |

**Modo local con sensor:** flujo documentado y recomendado.

**Modo touch / web / demo:** los tipos permiten touch con flag de entorno; **no** es el flujo principal de navegación ni equivalente clínico al VIM medido.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Examen | `screens/DiagnosticExamScreen.tsx` ← `app/diagnostico.tsx` |
| Resumen post-examen | `screens/DiagnosticSummaryScreen.tsx` ← `app/diagnostico-resumen.tsx` |
| Resumen histórico | `screens/InitialEvaluationSummaryScreen.tsx` ← `app/evaluacion-resumen.tsx` |
| Servicio | `diagnostic-service.ts` — VIM, `generatePatientLevels`, `hasDiagnostic` |
| Repositorio | `diagnostic-repository.ts` |
| Sesión eval | `diagnostic-evaluation-session-service.ts` |
| Navegación | `navigate-to-initial-evaluation.ts` |
| Readiness | `use-initial-evaluation-readiness.ts` |
| Volumen sensor | `use-diagnostic-sensor-volume.ts` |
| Validación VIM | `diagnostic-vim-validation.ts` |

Componentes UI: `InitialEvaluationWelcomeView`, `InitialEvaluationCountdownView`, `EvaluationAttemptsCard`, `EvaluationComparisonCard`, `EvaluationLevelTargetsCard`.

---

## Datos persistidos

| Entidad | Campos clave |
|---------|--------------|
| `DiagnosticRecord` | `max_inspiratory_volume`, `attempts[]`, `consistency_summary` |
| `PatientLevelRecord` | `target_volume`, `level_status`, factores VIM |

---

## Límites del módulo

- Requiere calibración activa y señal de sensor viva para el flujo oficial.
- No emite diagnóstico de función pulmonar ni sustituye espirometría certificada.
- Re-evaluación actualiza targets según servicio; la decisión clínica corresponde al profesional.
- Rutas de resumen duplicadas (`diagnostico-resumen` vs `evaluacion-resumen`) — nomenclatura pendiente de unificación documental.

---

## Documentación canónica

- [Evaluación inicial (feature)](../../../docs/03-features/evaluacion-inicial.md)
- [Niveles y progresión](../../../docs/03-features/niveles-progresion.md) · [Módulo levels](../levels/README.md)
- [Dispositivo y sensor](../device/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Validación académica](../../../docs/09-academic-validation/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Evaluación inicial — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/evaluacion-inicial.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.
