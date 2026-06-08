# RESPIRA+ — Evaluación táctil y niveles de revisión (Fase 3)

**Rama:** `feat/touch-evaluation-review-levels`  
**Depende de:** [runtime-env-modes.md](./runtime-env-modes.md) · [web-touch-sensor-guards.md](./web-touch-sensor-guards.md)

Fase 3 habilita evaluación inicial con input táctil (sensor como prioridad en `local_sensor`) y desbloqueo UI de niveles por flag de revisión en cualquier build.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/modules/diagnostics/diagnostic-measurement-metadata.ts` | **Nuevo** — `measurement_source`, `sensor_used`, helpers touch |
| `src/modules/diagnostics/resolve-diagnostic-launch.ts` | **Nuevo** — resolución sensor vs touch (paridad con terapia) |
| `src/modules/diagnostics/diagnostic-input-mode.ts` | Modo `touch`, param `auto`, bridge flags |
| `src/modules/diagnostics/use-initial-evaluation-readiness.ts` | Sensor prioritario + fallback táctil |
| `src/modules/diagnostics/navigate-to-initial-evaluation.ts` | Navega con `inputMode=auto` |
| `src/modules/diagnostics/screens/DiagnosticExamScreen.tsx` | Resuelve modo, touch UI, metadata en intentos |
| `src/modules/diagnostics/screens/DiagnosticSummaryScreen.tsx` | `touch` guardable; `touch_practice` solo práctica |
| `src/modules/diagnostics/components/InitialEvaluationWelcomeView.tsx` | Prop `isTouchMode` — oculta hints de sensor |
| `src/modules/diagnostics/diagnostic-evaluation-session-service.ts` | Metadata por intento; validación touch |
| `src/modules/diagnostics/diagnostic-service.ts` | Persiste metadata; guard defensivo contra `touch_practice` |
| `src/modules/diagnostics/types.ts` | Campos opcionales `measurement_source`, `sensor_used` |
| `src/modules/session/session-input-mode.ts` | `isTouchPracticeModeEnabled()` lee `runtimeEnv.enableTouchPractice` |
| `src/config/dev-level-flags.ts` | `REVIEW_UNLOCK_ALL_LEVELS` sin restricción `__DEV__` |

**No modificados (confirmado):** Supabase, `schema.sql`, firmware, calibración, `predefined-calibration-models.ts`, `parse-sensor-message.ts`, `esp32-websocket-client.ts`, `persistSessionResult`.

---

## Evaluación inicial con sensor

1. `EXPO_PUBLIC_APP_ENV=local_sensor` (o default) → `isSensorRuntimeEnabled()` = `true`.
2. Navegación estándar → `/diagnostico?inputMode=auto`.
3. `useInitialEvaluationReadiness` hace polling de calibración + señal viva.
4. Si sensor listo → `resolvedInputMode = 'sensor'`.
5. Volumen en vivo vía `useDiagnosticSensorVolume` (ESP32 / mock).
6. Intentos guardados con `input_mode: 'sensor'`, `measurement_source: 'sensor_model'`, `sensor_used: true`.
7. UI muestra «Sensor listo» y CTA «Revisar sensor» si falta conexión.

**Prioridad:** mientras el sensor esté listo, nunca se sustituye por touch automáticamente.

---

## Evaluación inicial con touch

### Cuándo se activa

`resolveDiagnosticLaunchInputMode` (misma filosofía que terapia):

| Condición | Modo |
|-----------|------|
| Sensor runtime ON y readiness OK | `sensor` |
| `web_touch` o sensor runtime OFF + touch habilitado | `touch` |
| `local_sensor` sin sensor + perfil touch ON + flag | `touch_practice` |
| Touch no habilitado | Bloqueado (mensaje de sensor o touch deshabilitado) |

Touch habilitado si `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true` **o** `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=true` / default `web_touch`.

En `local_sensor`, el fallback táctil respeta la preferencia de **Perfil** (`allowTouchPracticeInput`). En `web_touch` no se exige perfil (no hay sensor alternativo).

### Diferencias sensor vs touch

| Aspecto | Sensor | Touch (`touch`) | Touch práctica (`touch_practice`) |
|---------|--------|-----------------|-----------------------------------|
| Input | ESP32 / calibración | Press/hold simulado | Press/hold simulado |
| Guardado oficial | Sí | Sí (web_touch) | No — solo práctica |
| `had_live_signal` requerido | Sí | No | No |
| High performance vs calibración | Sí | No | No |
| CTA «Revisar sensor» | Sí | No | No |
| Texto resumen | Oficial | Oficial | «Práctica completada» |

---

## Metadata de medición touch

En cada `DiagnosticAttemptRecord` y en `DiagnosticRecord` persistido:

```typescript
{
  input_mode: 'touch' | 'touch_practice',
  measurement_source: 'touch',
  sensor_used: false,
}
```

Sensor oficial:

```typescript
{
  input_mode: 'sensor',
  measurement_source: 'sensor_model',
  sensor_used: true,
}
```

Los valores touch **no** se presentan como lectura ESP32 (`useDiagnosticSensorVolume` deshabilitado; meta UI «Mantén presionado en el globo»).

### Guardado oficial: `touch` (web) vs `touch_practice` (local)

| Modo | ¿Guarda evaluación oficial? | Metadata al guardar |
|------|----------------------------|---------------------|
| `touch` (`web_touch`) | **Sí** — VIM, niveles y metas | `measurement_source: 'touch'`, `sensor_used: false` |
| `touch_practice` (`local_sensor`) | **No** — solo práctica | No llega a persistencia oficial |

**Doble protección para `touch_practice` local:**

1. **UI** — `DiagnosticSummaryScreen` no renderiza «Continuar a terapia» (`onContinueOfficial`) cuando `isDiagnosticPracticeOnly(inputMode)` es `true`; solo «Volver al inicio» borra la sesión temporal.
2. **Servicio** — `persistOfficialDiagnosticResult` en `diagnostic-service.ts` rechaza la operación **antes** de `createDiagnostic`, `generatePatientLevels`, `applyDiagnosticVimToPatientLevels` o `updatePatientCurrentLevel` si `payload.inputMode === 'touch_practice'`, lanzando `Error('PRACTICE_DIAGNOSTIC_NOT_PERSISTABLE')`.

Así, aunque un caller futuro invoque el servicio por error, no se escribe VIM oficial ni se alteran `patient_levels` ni el perfil del paciente.

---

## Desbloqueo de niveles por revisión

### Flag

```env
EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true
```

### Comportamiento

- `REVIEW_UNLOCK_ALL_LEVELS` en `src/config/dev-level-flags.ts` — **sin** requerir `__DEV__`.
- `isLevelEntryLockedForUi()` retorna `false` para todos los niveles (excepto lógica `comingSoon` también anulada).
- **No altera** `patient_levels`, progresión persistida ni `checkAndUnlockNextLevel`.
- Funciona en `local_sensor` y `web_touch`.
- Con flag `false` o ausente → progresión clínica actual intacta.

### Desactivar

```env
EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=false
```

(o omitir la variable)

---

## Cómo probar `local_sensor`

```env
EXPO_PUBLIC_APP_ENV=local_sensor
EXPO_PUBLIC_ENABLE_SENSOR=true
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=false
```

1. Con ESP32 conectado y calibrado → evaluación inicial usa sensor; botón activo con «Sensor listo».
2. Sin sensor, con `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true` y touch ON en Perfil → evaluación con `touch_practice` (no guarda oficial).
3. `EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true` → todos los niveles jugables en Terapia; progresión en storage sin cambios.

---

## Cómo probar `web_touch`

```env
EXPO_PUBLIC_APP_ENV=web_touch
EXPO_PUBLIC_ENABLE_SENSOR=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=true
```

1. `npx expo start --web`
2. Evaluación inicial → botón «Comenzar evaluación» activo sin sensor.
3. Completar 3 intentos táctiles → resumen oficial → «Continuar a terapia» guarda VIM y niveles.
4. Verificar en storage: `input_mode: 'touch'`, `sensor_used: false`.
5. `EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true` → niveles desbloqueados en UI.

---

## Pendiente para Supabase

| Ítem | Notas |
|------|-------|
| Sincronizar `measurement_source` / `sensor_used` a cloud | Campos locales listos; sin cliente Supabase |
| Evaluaciones touch en backend | Validar política clínica antes de sync |
| Auth + `DATA_MODE=cloud` | Fase 5–6 |
| Unificar flags touch legacy | Parcialmente hecho en Fase 3 |

---

## Riesgos restantes

| Riesgo | Mitigación |
|--------|------------|
| VIM touch en web no equivale a espirometría | Metadata explícita; no presentar como ESP32 |
| `touch_practice` en local sin perfil sigue bloqueado | Por diseño clínico |
| Review unlock solo UI | Documentado; no falsear progresión en DB |
| Deep link `inputMode=sensor` en web_touch | Readiness redirige a touch si flag ON |
| Flag review en producción accidental | Usar solo en builds de demo/QA |

---

## Referencia rápida

```typescript
import { resolveDiagnosticLaunchInputMode } from '@/src/modules/diagnostics/resolve-diagnostic-launch';
import { REVIEW_UNLOCK_ALL_LEVELS } from '@/src/config/dev-level-flags';
```
