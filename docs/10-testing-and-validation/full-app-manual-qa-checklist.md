# Checklist QA manual RESPIRA+

Guía de validación manual integral para revisar la app tras auditoría, documentación centralizada, migración tipográfica (`AppText`), excepción HUD/juego, refactors estructurales (Inicio, Historial, Sesión), correcciones de consentimiento y sincronización de recordatorios en Perfil.

> **Alcance clínico:** RESPIRA+ **estima volumen inspirado** (mL) a partir de distancia y calibración. **No mide presión inspiratoria** (PIP, MIP, cmH₂O). **No diagnostica** condiciones respiratorias ni **sustituye** indicación, supervisión ni valoración de un profesional de la salud.

**Referencias:** [Overview](../00-overview/README.md) · [Arquitectura](../01-app-architecture/README.md) · [Seguridad clínica](../08-clinical-safety/README.md) · [Mapa de riesgos](./regression-risk-map.md)

---

## 1. Preparación

Completar antes de iniciar la batería de pruebas.

| Ítem | Valor / notas |
|------|----------------|
| **Rama / commit / tag** | Ej.: `qa/full-app-validation-checklist` @ `git rev-parse --short HEAD` |
| **Entorno** | Web (`npx expo start --web -c`) · Android · iOS (marcar los probados) |
| **Flags activos** | Copiar de `.env`: `EXPO_PUBLIC_ENABLE_CLOUD_AUTH`, `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST`, `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG`, `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION`, `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE`, `EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW` |
| **Paciente de prueba** | Nombre, edad, `patientId` local |
| **Sensor disponible** | Sí / No — ESP32 AP `RESPIRA_ESP32`, WS `ws://192.168.4.1:81` |
| **Práctica táctil** | Flag env + preferencia Perfil activa / inactiva |
| **Reset onboarding** | Borrar clave `@rehab/onboarding_welcome_seen_v1_u{id}` o paciente nuevo |
| **Reset consentimiento** | Retiro desde Perfil o borrar `@rehab/legal_consent_v1` (solo entorno de prueba) |
| **Lint previo** | `npm run lint` sin errores |
| **Consola limpia** | DevTools / Metro sin errores rojos al arranque |

---

## 2. Smoke test inicial

- [ ] La app abre desde cold start (`app/index.tsx` → gate local-first por defecto).
- [ ] No hay errores críticos en consola Metro / navegador / Logcat.
- [ ] Navegación base funciona: tabs visibles (`Inicio`, `Terapia`, `Historial`; `Sesión` y `Resumen` ocultas en barra).
- [ ] Tabs cargan sin pantalla en blanco prolongada.
- [ ] `npm run lint` termina limpio en la rama validada.
- [ ] `npx tsc --noEmit` sin errores (opcional pero recomendado).

---

## 3. Auth / perfil local

**Rutas:** `/auth/local-profile` · `/auth/login` (cloud, congelado por defecto)

| Caso | Pasos | Esperado |
|------|-------|----------|
| Sin paciente activo | Cold start sin perfil | Redirección a `/auth/local-profile` |
| Crear paciente local | Nombre + edad válidos + clave | Perfil persistido; redirección a `/legal/accept` si no hay consent |
| Login por clave | Paciente existente, clave correcta | Acceso a `/(tabs)/index` tras consent |
| Validaciones | Nombre vacío, edad fuera de rango | Mensajes de error; no persiste |
| Redirección legal | Tras alta sin consent activo | `/legal/accept` antes de tabs clínicas |
| Regreso a tabs | Tras consent aceptado | `/(tabs)/index` accesible |

**Archivos clave:** `src/modules/auth/`, `src/modules/patient/patient-service.ts`, `app/auth/local-profile.tsx`

---

## 4. Consentimiento legal

**Rutas:** `/legal/accept` · `/legal/document`  
**Servicio:** `src/modules/legal/consent-service.ts` · **Versión documento:** `LEGAL_DOCUMENT_VERSION = '1.0'`

| Caso | Pasos | Esperado |
|------|-------|----------|
| Aceptación completa | Marcar 7 declaraciones + master | `acceptConsent` persiste; tabs protegidas accesibles |
| Bloqueo si faltan checks | Intentar aceptar incompleto | Botón deshabilitado o error |
| Documento legal abre | Desde accept o Perfil → `/legal/document` | PDF `assets/legal/terminos-uso-etico.pdf` visible |
| Retiro de consentimiento | Perfil → retirar consent | `consentStatus: withdrawn` |
| Cold start sin consentimiento | Reiniciar app tras retiro (local-first) | `app/index.tsx` redirige a `/legal/accept` |
| Bloqueo terapia | Pulsar tab Terapia sin consent | `ConsentTabGuard` → `/legal/accept` |
| Bloqueo historial | Pulsar tab Historial sin consent | Idem |
| Bloqueo evaluación | CTA evaluación o `/diagnostico` | `ConsentStackGuard` → `/legal/accept` |
| Bloqueo sensor / export / notificaciones | Rutas stack protegidas | Redirección legal |
| Reaceptación | Aceptar de nuevo tras retiro | Flujos clínicos restaurados |

**Nota cloud:** `needsConsent()` vs `isConsentActive()` — retiro con misma versión puede no redirigir en arranque cloud; **requiere revisión manual** si `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`.

---

## 5. Inicio

**Ruta:** `/(tabs)/index` → `HomeScreen` (`src/modules/home/screens/HomeScreen.tsx`)

| Caso | Verificar |
|------|-----------|
| Saludo | Nombre paciente visible |
| Onboarding | Modal `RespiraWelcomeOnboarding` solo primera visita por paciente |
| CTA evaluación | Sin `hasDiagnostic()` → navega a `/diagnostico` (con consent) |
| CTA terapia | Con evaluación → gates sensor/touch → `/(tabs)/sesion` |
| Sensor / calibración | Card dispositivo: estado conexión, volumen **estimado** 0–3000 mL |
| Última sesión | Métricas recientes; labels «estimado» donde aplique |
| Exportación | Card → `/data-export` (requiere consent) |
| Accesos rápidos | Terapia, Historial, Sensor, Perfil |
| Consentimiento pendiente | CTA evaluación no bypass legal |
| Sin paciente | Redirect fuera de Inicio (tab layout) |

**Refactor Fase 5A:** componentes en `src/modules/home/components/` — validar paridad visual y funcional.

---

## 6. Evaluación inicial / Diagnóstico

**Rutas:** `/diagnostico` · `/diagnostico-resumen` · `/evaluacion-resumen`  
**Módulo:** `src/modules/diagnostics/`

| Caso | Verificar |
|------|-----------|
| Gate consentimiento | Sin consent → `/legal/accept` |
| Gate sensor / calibración | Readiness evaluación (`use-initial-evaluation-readiness`) |
| 3 intentos | Flujo completo con sensor oficial |
| VIM como referencia personal | `max_inspiratory_volume` persistido — **no diagnóstico clínico** |
| Resumen diagnóstico | `/diagnostico-resumen` con targets por nivel |
| Generación de niveles | `@rehab/patient_levels_v1`; nivel 1 `active`, resto `locked` |
| Copy clínico | No promete diagnóstico; volumen **estimado** |
| Reconsulta | Perfil → `/evaluacion-resumen` |

---

## 7. Sensor y calibración básica

**Rutas:** `/sensor-connection` · `/sensor-calibration` (UI paciente vs técnica según flag)  
**Módulo:** `src/modules/device/`

| Caso | Verificar |
|------|-----------|
| Conexión ESP32 | AP `RESPIRA_ESP32`; WebSocket conecta |
| Estados | Desconectado / conectando / conectado en UI |
| Debug distancia | Con `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=true`: `distanceMm`, `rawDistanceMm` si se muestran |
| Volumen estimado | Termómetro / preview 0–3000 mL; **no presión inspiratoria** |
| Calibración RESPIRA+ 3000 mL | Modelo predefinido instalado (`ensureRespira3000PredefinedCalibrationInstalled`) |
| Readiness terapia | `useTherapyReadinessGate` / `evaluateTherapyReadinessOnDemand` OK |
| Modo sin sensor | Con touch habilitado: práctica táctil como alternativa; no sesión oficial equivalente |

---

## 8. Calibración técnica avanzada

**Requisito:** `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`  
**Pantalla:** `SensorCalibrationScreen` · resumen `/calibration-technical-summary`

| Caso | Verificar |
|------|-----------|
| Flag técnico | UI multi-volumen visible solo con flag |
| Captura técnica | 6 volúmenes: 500–3000 mL |
| Muestras por volumen | 5 mediciones por punto |
| Repetibilidad | Std y flags por volumen |
| Modelo lineal | Regresión y selección de modelo activo |
| R² / MAE / RMSE | Métricas visibles en resumen técnico |
| CSV técnico | Export schema 2.4.0 (`calibration-technical-csv-exporter.ts`) |
| Resumen técnico | `/calibration-technical-summary` |
| Aislamiento paciente | Calibración técnica **no sustituye** modelo predefinido del flujo paciente |

---

## 9. Terapia / Niveles

**Ruta:** `/(tabs)/terapia` → `LevelsScreen` (`src/modules/levels/`)

| Caso | Verificar |
|------|-----------|
| Niveles visibles | Lista según `@rehab/patient_levels_v1` |
| Nivel activo | Destacado; CTA iniciar sesión |
| Niveles bloqueados | UI locked; no inicia sesión |
| CTA evaluación | Sin evaluación → redirect evaluación |
| Inicio sesión oficial | Sensor + readiness → `inputMode=sensor` |
| Práctica táctil | Flag + pref Perfil → `inputMode=touch_practice` |
| Reglas desbloqueo | 6 sesiones **perfectas** acumuladas con sensor en nivel activo |
| Práctica no desbloquea | `persistSessionResult` omite unlock si `isPracticeSession` |
| Dev flag review | `EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW` solo UI dev; no altera progresión persistida |

**Launch compartido:** `useTherapySessionLauncher` + `resolve-therapy-session-launch.ts` (Inicio + Terapia).

---

## 10. Sesión activa / juego

**Ruta:** `/(tabs)/sesion?levelId&inputMode&sessionRunId` → `SessionScreen`  
**Refactor Fase 5D:** shell en `src/modules/session/components/`

| Caso | Verificar |
|------|-----------|
| HUD bold preservado | `Text` nativo en juego/HUD (excepción Fase 4O) — pesos y tamaños intactos |
| Texto no cortado | HUD compacto, modales, overlays |
| Sensor oficial | Validación conservadora `lowerBoundMl >= target` |
| Práctica táctil | `touch_practice`; `is_practice_session: true` |
| Pausa / reanudar | `SessionPauseModal` |
| Salir / cancelar | Confirmación; estado coherente |
| Overlay guardado | `SessionSavingOverlay` durante persistencia |
| Modal resumen | `SessionSummaryModal` — «Vol. máx. / prom. **estimado**» |
| Navegación resumen | → `/(tabs)/resumen?sessionId=` |
| Persistencia | `@rehab/sessions_v1`, `@rehab/attempts_v1` |
| Intento válido / inválido | Reglas nivel 1 + sensor-evaluation |
| Volumen estimado | Labels correctos; sin «presión inspiratoria» |
| Estética juego | **No modificar** layout/animaciones del runner (`games/`) |

**Componentes shell:** `SessionLoadingState`, `SessionErrorState`, `SessionGoalAdjustmentNotice`, `SessionPauseModal`, `SessionSummaryModal`, `SessionSavingOverlay`.

---

## 11. Resumen de sesión

**Ruta:** `/(tabs)/resumen?sessionId=` → `SummaryScreen` (`src/modules/summary/`)

| Caso | Verificar |
|------|-----------|
| Carga por sessionId | Métricas de sesión correcta |
| Volumen estimado | Máx / promedio con qualifier «estimado» |
| Repeticiones | Válidas / inválidas |
| Cumplimiento | Porcentaje coherente con intentos |
| Botones | Volver · Ver historial |
| sessionId inválido | Estado error o vacío controlado |
| Sin sessionId | Comportamiento definido (redirect o vacío) |

---

## 12. Historial

**Ruta:** `/(tabs)/historial` → `HistoryScreen` (`src/modules/history/`)  
**Refactor Fase 5C:** componentes en `src/modules/history/components/`

| Caso | Verificar |
|------|-----------|
| Racha | Hero streak (`session-success-streak`) |
| Calendario | Días con actividad |
| Leyenda | perfect / good / incomplete / interrupted / practice |
| Sesiones oficiales | Etiqueta **Sensor** |
| Práctica táctil | Etiqueta **Práctica sin sensor** |
| Modal de día | Detalle sesiones; volumen **estimado** |
| Última sesión | Coherente con storage |
| Estado vacío | Copy apropiado sin sesiones |
| Exportación | Acceso desde Inicio, no Historial |
| Conteos consistentes | Agregados = suma de sesiones por día |

---

## 13. Perfil / Configuración

**Ruta:** `/profile` → `ProfileScreen` (`src/modules/patient/`)

| Caso | Verificar |
|------|-----------|
| Datos paciente | Nombre, edad, stats |
| Avatar | `ProfileAvatarPicker` persiste |
| Evaluación inicial | Link a `/evaluacion-resumen` o re-evaluación |
| Recordatorios de terapia | `StatusPill`: Activas / Pausadas / Sin permiso / Requiere revisión / Solo en app |
| Sync Notificaciones ↔ Perfil | Activar/desactivar en `/notification-settings`; volver a Perfil → estado actualizado (`useIsFocused` + `readNotificationSettingsForDisplay`) |
| Práctica táctil | Toggle si flag env activo |
| Enlaces legales | Documento + re-aceptación |
| Retirar consentimiento | Flujo §4 |
| Borrar perfil | Solo entorno de prueba; `patient-delete-service` |

---

## 14. Notificaciones

**Ruta:** `/notification-settings` → `NotificationSettingsScreen`

| Caso | Verificar |
|------|-----------|
| Permisos | Solicitud SO; estado reflejado en Perfil |
| Activar / pausar | `enabled` persiste por paciente |
| Ventana activa | Horario vigilia reprograma schedule |
| Siguiente aviso | `NextReminderCard` coherente |
| Timeline | `TodayReminderTimeline` del día |
| Prueba notificación | `TestNotificationButton` en dispositivo nativo |
| No repetir consecutivo | Mensaje distinto al anterior si hay variantes |
| Web | Perfil muestra **Solo en app**; sin expectativa de push web |
| Perfil sincronizado | Mismo estado tras cambios (Fase 4C.1) |

---

## 15. Exportación de datos

**Ruta:** `/data-export` → `DataExportScreen` (`src/modules/export/`)

| Caso | Verificar |
|------|-----------|
| CSV clínico | Descarga/compartir OK |
| JSON clínico | Estructura válida |
| Consentimiento requerido | Sin consent → redirect legal |
| Sin sesión activa | Export de datos históricos igualmente |
| Contenido v2.4.0 | `CLINICAL_EXPORT_FORMAT_VERSION = '2.4.0'` |
| Calibración técnica | Bloque opcional solo si flag técnico |
| Privacidad | Solo datos del paciente activo; copy de uso con profesional |
| Volumen en export | Campos como **estimado**; sin presión inspiratoria |

---

## 16. Onboarding

**Componente:** `RespiraWelcomeOnboarding` · clave `@rehab/onboarding_welcome_seen_v1_u{id}`

| Caso | Verificar |
|------|-----------|
| Una sola vez por paciente | Tras marcar visto, no reaparece |
| Cerrar | Continuar cierra modal |
| No reaparece indebidamente | Tras navegar tabs y volver |
| Reset manual | Nueva clave o paciente nuevo muestra de nuevo |

---

## 17. Revisión visual por pantalla

Para **cada pantalla**, marcar: textos no cortados · chips legibles · jerarquía clara · espaciado correcto · `AppText` correcto **excepto** HUD/juego · estilo del juego preservado.

| Pantalla | Ruta | AppText | Notas |
|----------|------|---------|-------|
| Gate arranque | `/` | N/A | Splash / redirect |
| Perfil local | `/auth/local-profile` | Sí | Formulario |
| Login cloud | `/auth/login` | Sí | Si cloud activo |
| Inicio | `/(tabs)/index` | Sí (4M) | Componentes `home/components/` |
| Terapia | `/(tabs)/terapia` | Sí | Niveles y CTAs |
| Sesión / juego | `/(tabs)/sesion` | **No HUD** | `Text` nativo Fase 4O |
| Historial | `/(tabs)/historial` | Sí (4N) | Calendario + modal |
| Resumen | `/(tabs)/resumen` | Sí | Post-sesión |
| Perfil | `/profile` | Sí (4P) | StatusPill recordatorios |
| Consentimiento | `/legal/accept` | Sí | 7 checks |
| Documento legal | `/legal/document` | Sí | PDF viewer |
| Evaluación | `/diagnostico` | Sí | 3 intentos |
| Resumen eval | `/diagnostico-resumen` | Sí | Targets nivel |
| Eval histórica | `/evaluacion-resumen` | Sí | Desde Perfil |
| Conexión sensor | `/sensor-connection` | Sí | Termómetro volumen |
| Calibración | `/sensor-calibration` | Sí / debug | Según flag |
| Resumen técnico cal | `/calibration-technical-summary` | Sí | Solo técnico |
| Exportación | `/data-export` | Sí | Card Inicio |
| Notificaciones | `/notification-settings` | Sí (4C) | Tokens reminder |
| Hardware lab | `/hardware-lab` | Debug | Solo dev |
| ESP32 raw test | `/esp32-raw-test` | Debug | Solo dev |

---

## 18. Regresiones críticas a buscar

Priorizar cualquier hallazgo de esta lista como **severidad alta**:

| Regresión | Síntoma | Área |
|-----------|---------|------|
| Consentimiento ignorado | Terapia/Historial/evaluación sin consent | Legal |
| Evaluación sin consentimiento | `/diagnostico` accesible tras retiro | Legal |
| Terapia sin readiness | Sesión sensor sin calibración/conexión | Device |
| Sesión no persiste | Tras completar, historial vacío | Session |
| Historial no actualiza | Tras sesión, calendario sin cambio | History |
| Perfil no refleja recordatorios | Estado desincronizado tras Notificaciones | Patient / Notifications |
| HUD texto cortado | Labels truncados en sesión activa | Session / Games |
| Volumen sin «estimado» | Cards o reportes omiten qualifier | UI clínica |
| Presión inspiratoria | Copy menciona PIP/MIP/cmH₂O como medida | Copy / export |
| Práctica desbloquea niveles | Unlock tras sesión touch | Session progress |
| AppText en HUD | Tipografía del juego alterada | Typography 4O |

---

## 19. Resultado de QA

Registrar cada caso probado. Duplicar filas según necesidad.

| Caso | Estado | Evidencia | Notas | Severidad | Issue / commit |
|------|--------|-----------|-------|-----------|----------------|
| Smoke — app abre | pendiente / pasa / falla | | | | |
| Consent — retiro cold start | pendiente / pasa / falla | | | | |
| Evaluación — 3 intentos VIM | pendiente / pasa / falla | | | | |
| Sesión sensor — persistencia | pendiente / pasa / falla | | | | |
| Historial — post sesión | pendiente / pasa / falla | | | | |
| Perfil ↔ Notificaciones sync | pendiente / pasa / falla | | | | |
| Export JSON v2.4.0 | pendiente / pasa / falla | | | | |
| HUD — bold preservado | pendiente / pasa / falla | | | | |
| Inicio — refactor 5A paridad | pendiente / pasa / falla | | | | |
| Historial — refactor 5C paridad | pendiente / pasa / falla | | | | |
| Sesión — refactor 5D paridad | pendiente / pasa / falla | | | | |
| *(añadir filas)* | | | | | |

**Severidad sugerida:** crítica (bloquea uso clínico/dev) · alta (flujo principal roto) · media (UX/copy) · baja (cosmético).

---

## 20. Criterios de cierre

La rama/tag queda **aprobada para release candidato de QA** cuando:

- [ ] `npm run lint` limpio.
- [ ] `git diff --check` sin conflictos de whitespace (rama de trabajo limpia respecto a objetivo).
- [ ] Flujos críticos pasan: consent → evaluación → sensor → sesión → historial → export.
- [ ] No hay bugs **severos** abiertos sin issue trazado.
- [ ] Documentación actualizada (`docs/`, READMEs enlazan esta checklist).
- [ ] Tag de release creado (ej. `qa-validated-YYYY-MM-DD`) con commit hash anotado en §1.

---

## Documentación relacionada

- [Mapa de riesgos de regresión](./regression-risk-map.md)
- [Consentimiento](../03-features/terminos-consentimiento.md)
- [Sesión de terapia](../03-features/sesion-terapia.md)
- [Migración tipográfica](../07-ui-design-system/text-migration-audit.md)
- [Export schema v2.4.0](../06-data-and-storage/export-schema-v2.4.0.md)
- [Reporte sync documentación](../00-overview/documentation-sync-report.md)
