# Mapa de riesgos de regresión — RESPIRA+

Documento complementario a la [checklist QA manual](./full-app-manual-qa-checklist.md). Prioriza áreas de mayor riesgo tras la auditoría integral, documentación centralizada, migración `AppText`, refactors estructurales y correcciones recientes de consentimiento y recordatorios.

> RESPIRA+ **estima volumen inspirado**; **no mide presión inspiratoria**. **No diagnostica** ni **sustituye** al profesional de la salud.

**Rama de referencia (jun 2026):** commits recientes en `master` / `qa/full-app-validation-checklist` — ver `git log --oneline -15`.

---

## Resumen ejecutivo

| Prioridad | Área | Motivo |
|:---------:|------|--------|
| 1 | Consentimiento | Gates en tabs, stack y arranque; retiro y reaceptación |
| 2 | Sesión activa | Refactor 5D + HUD/juego + persistencia + unlock |
| 3 | Sensor / calibración | Readiness terapia y evaluación dependen de modelo activo |
| 4 | Perfil ↔ Notificaciones | Sync reciente Fase 4C.1 |
| 5 | Inicio / Terapia launch | Refactor 5A + `useTherapySessionLauncher` centralizado |
| 6 | Historial | Refactor 5C; agregados y clasificación sesión |
| 7 | Tipografía HUD/juego | Excepción 4O — riesgo de migración accidental |
| 8 | Exportación | Schema v2.4.0; consent gate |
| 9 | Evaluación inicial | VIM + generación niveles |
| 10 | Onboarding / Auth | Flujos periféricos pero bloquean primera experiencia |

---

## Áreas de riesgo detalladas

### 1. Consentimiento

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | PR #36 términos y condiciones; bloqueo evaluación sin consent; paridad local-first en `app/index.tsx`; guards `ConsentTabGuard`, `ConsentStackGuard` |
| **Qué probar primero** | Retiro consent → cold start → bloqueo Terapia/Historial/evaluación/sensor/export/notificaciones → reaceptación |
| **Severidad si falla** | **Crítica** — exposición de flujos clínicos sin consentimiento informado |
| **Archivos clave** | `src/modules/legal/consent-service.ts`, `ConsentTabGuard.tsx`, `ConsentStackGuard.tsx`, `app/index.tsx`, `app/legal/accept.tsx`, `navigate-to-initial-evaluation.ts` |
| **Rollback recomendado** | Revertir merge PR consentimiento o commit `815f2c2` / rama `ame_terminos2`; verificar `LEGAL_DOCUMENT_VERSION` y storage `@rehab/legal_consent_v1` |

---

### 2. Evaluación inicial

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | Gate consent en rutas diagnóstico; documentación en `docs/03-features/evaluacion-inicial.md` |
| **Qué probar primero** | Consent activo → readiness sensor → 3 intentos → VIM persistido → niveles generados → redirect Terapia |
| **Severidad si falla** | **Alta** — terapia sin objetivos personalizados o evaluación accesible sin gates |
| **Archivos clave** | `src/modules/diagnostics/diagnostic-service.ts`, `DiagnosticExamScreen.tsx`, `diagnostic-evaluation-session-service.ts`, `use-initial-evaluation-readiness.ts` |
| **Rollback recomendado** | Revertir cambios en guards de `/diagnostico` y `navigate-to-initial-evaluation.ts`; no tocar `@rehab/diagnostics_v1` en producción de prueba |

---

### 3. Sensor y calibración

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | Documentación auditoría sensor; modelo predefinido RESPIRA+ 3000 mL; readiness service |
| **Qué probar primero** | Conexión WS → volumen **estimado** en vivo → readiness OK → terapia oficial; sin sensor + touch flag |
| **Severidad si falla** | **Alta** — sesiones con volumen incorrecto o terapia sin validación de señal |
| **Archivos clave** | `SensorConnectionProvider.tsx`, `therapy-readiness-service.ts`, `volume-estimation-service.ts`, `predefined-calibration-service.ts`, `SensorCalibrationScreen.tsx`, `app/sensor-connection.tsx` |
| **Rollback recomendado** | Restaurar `predefined-calibration-models.ts` y flags en `.env`; desactivar `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION` para aislar flujo paciente |

---

### 4. Sesión activa

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | **Refactor 5D** (`8fe5d4d`): shell extraído a `session/components/`; launch centralizado (`8d9e7b5`) |
| **Qué probar primero** | Inicio sesión sensor → 10 intentos → pausa → guardado → resumen → historial; práctica táctil sin unlock |
| **Severidad si falla** | **Crítica** — pérdida de datos de sesión o reglas de validación rotas |
| **Archivos clave** | `SessionScreen.tsx`, `session/components/*`, `session-progress-service.ts`, `session-attempt-validation-service.ts`, `resolve-therapy-session-launch.ts`, `use-therapy-session-launcher.ts` |
| **Rollback recomendado** | Revertir `8fe5d4d` (refactor shell) manteniendo launch si estable, o revertir par `8fe5d4d` + `8d9e7b5` |

---

### 5. Resumen e historial

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | **Refactor 5C** (`b7d23c7`): `HistoryScreen` + componentes; migración `AppText` 4N; `SessionSuccessStreakCard` 4P |
| **Qué probar primero** | Tras sesión: resumen por `sessionId` → historial actualizado → modal día → racha → labels «estimado» |
| **Severidad si falla** | **Alta** — adherencia y feedback al paciente incorrectos |
| **Archivos clave** | `HistoryScreen.tsx`, `history/components/*`, `history-aggregates.ts`, `SummaryScreen.tsx`, `session-progress-repository.ts` |
| **Rollback recomendado** | Revertir merge `8be0243` / commit `b7d23c7`; verificar paridad en `history/components/` |

---

### 6. Notificaciones y perfil

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | Sync Perfil ↔ Notificaciones Fase 4C.1; migración `AppText` Perfil 4P; `readNotificationSettingsForDisplay` |
| **Qué probar primero** | Toggle en `/notification-settings` → volver Perfil → pill correcto; permiso denegado → «Sin permiso»; web → «Solo en app» |
| **Severidad si falla** | **Media–Alta** — adherencia terapéutica mal informada; no bloquea sesión |
| **Archivos clave** | `ProfileScreen.tsx`, `NotificationSettingsScreen.tsx`, `use-notification-settings.ts`, `notification-settings.storage.ts`, `notification-scheduler.ts` |
| **Rollback recomendado** | Revertir cambios en `ProfileScreen` foco/reload y helpers de display; conservar scheduler si estable |

---

### 7. Exportación

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | Schema clínico v2.4.0 documentado; clasificación sensor/práctica en export |
| **Qué probar primero** | Consent → export CSV + JSON → verificar versión 2.4.0 y campos volumen **estimado** |
| **Severidad si falla** | **Media** — impacto en revisión con profesional, no en sesión en vivo |
| **Archivos clave** | `clinical-export-service.ts`, `clinical-csv-exporter.ts`, `clinical-json-exporter.ts`, `DataExportScreen.tsx` |
| **Rollback recomendado** | Revertir cambios en formatters; mantener versión schema anotada en commit |

---

### 8. Onboarding y auth

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | Refactor Home 5A integra onboarding; documentación auth local-first |
| **Qué probar primero** | Paciente nuevo → onboarding una vez → legal → tabs; validaciones local-profile |
| **Severidad si falla** | **Media** — primera experiencia degradada |
| **Archivos clave** | `HomeScreen.tsx`, `RespiraWelcomeOnboarding.tsx`, `onboarding-storage`, `LocalProfileScreen`, `patient-service.ts`, `app/index.tsx` |
| **Rollback recomendado** | Revertir integración onboarding en Home si modal no aparece o reaparece; aislar `onboarding/` |

---

### 9. HUD / juego (tipografía)

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | Excepción Fase 4O revertida — HUD y juego mantienen `Text` nativo; shell sesión también `Text` en modales externos |
| **Qué probar primero** | Sesión activa: pesos bold HUD, sin texto cortado, sin regresión visual runner; modales pausa/resumen legibles |
| **Severidad si falla** | **Media** — UX sesión; **Alta** si HUD ilegible durante ejercicio |
| **Archivos clave** | `LevelOneGameView.tsx`, `level-runner-scene.tsx`, `SessionScreen.tsx`, `session/components/*`, `games/components/*` |
| **Rollback recomendado** | Revertir cualquier commit que migre HUD a `AppText`; consultar [text-migration-audit.md](../07-ui-design-system/text-migration-audit.md) categoría B |

---

### 10. Inicio y lanzamiento de terapia

| Aspecto | Detalle |
|---------|---------|
| **Qué se tocó recientemente** | **Refactor 5A** (`c9625da`); **launch centralizado** (`8d9e7b5`, `useTherapySessionLauncher`) |
| **Qué probar primero** | CTAs Inicio = Terapia en gates; card sensor; export; quick access; layouts `pre_eval` / `eval_no_sessions` / `has_sessions` |
| **Severidad si falla** | **Alta** — usuario no puede iniciar terapia o bypass gates |
| **Archivos clave** | `HomeScreen.tsx`, `home/components/*`, `use-therapy-session-launcher.ts`, `LevelsScreen.tsx` |
| **Rollback recomendado** | Revertir `698b1c2` merge Home refactor o commits `c9625da` + `8d9e7b5` en bloque |

---

## Matriz rápida: severidad × detección

| Área | Falla típica | Detección | Severidad |
|------|--------------|-----------|-----------|
| Consentimiento | Tab Terapia sin legal | 1 tap | Crítica |
| Sesión | No guarda al terminar | Tras 10 intentos | Crítica |
| Sensor | Volumen 0 con pistón movido | Conexión en vivo | Alta |
| Historial | Calendario vacío post-sesión | Tras sesión | Alta |
| Perfil | Recordatorios «Activas» pero pausados | Toggle + back | Media |
| HUD | Texto truncado | Sesión activa | Media |
| Export | JSON sin versión 2.4.0 | Abrir archivo | Media |
| Onboarding | Modal en bucle | Paciente nuevo | Baja |

---

## Orden sugerido de ejecución QA (día 1)

1. Preparación + smoke (§1–2 checklist)
2. Auth + consentimiento completo (§3–4)
3. Evaluación + sensor + sesión oficial (§6–7, §10)
4. Historial + resumen (§11–12)
5. Perfil + notificaciones sync (§13–14)
6. Export + onboarding (§15–16)
7. Pasada visual pantalla por pantalla (§17)
8. Regresiones críticas explícitas (§18)

---

## Referencias

- [Checklist QA manual completa](./full-app-manual-qa-checklist.md)
- [Auditoría documentación jun 2026](../00-overview/documentation-sync-report.md)
- [Auditoría Text post-migración](../07-ui-design-system/text-migration-audit.md)
- [Arquitectura — servicios críticos](../01-app-architecture/README.md)
