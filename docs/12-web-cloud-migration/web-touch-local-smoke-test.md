# RESPIRA+ — Smoke test local `web_touch` (Fase 4)

**Fecha:** 2026-06-08  
**Rama:** `test/web-touch-local-smoke`  
**Commit base:** `daf3fed` (tag `v1.2.14-touch-evaluation-review-levels`)  
**Ejecutor:** agente Cursor (build + revisión estática); flujos interactivos pendientes de QA manual en navegador.

---

## 1. Objetivo

Validar que RESPIRA+ arranca en modo `web_touch` local (`DATA_MODE=local`, Supabase desactivado) sin intentar conectar el ESP32 ni llamar a Supabase, y que los guards de Fases 1–3 permiten evaluación y terapia táctil.

**Restricciones respetadas:** no se modificó `runtime-env.ts`, firmware, calibración, `parse-sensor-message.ts`, `esp32-websocket-client.ts`, `schema.sql` ni diseño. Solo documentación + `.env` temporal restaurado al final.

---

## 2. Formas de ejecutar sin tocar `.env` de forma permanente

### Opción A — Respaldo + `.env` temporal (usada en esta sesión)

```powershell
Copy-Item .env .env.local-sensor-backup
# Editar .env con la configuración web_touch (ver §3)
npx expo start --web -c
# Al terminar:
Copy-Item .env.local-sensor-backup .env
```

### Opción B — Variables en la sesión de PowerShell (sin editar `.env`)

Expo carga `EXPO_PUBLIC_*` del entorno del proceso. En PowerShell:

```powershell
$env:EXPO_PUBLIC_APP_ENV="web_touch"
$env:EXPO_PUBLIC_ENABLE_SENSOR="false"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE="true"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE="true"
$env:EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW="true"
$env:EXPO_PUBLIC_ENABLE_SUPABASE="false"
$env:EXPO_PUBLIC_DATA_MODE="local"
$env:EXPO_PUBLIC_ENABLE_CLOUD_AUTH="false"
npx expo start --web -c
```

> Si `.env` define las mismas claves, Expo puede mezclar fuentes; para smoke aislado, Opción A o renombrar temporalmente `.env` es más predecible.

### Opción C — Puerto alternativo

Si el puerto 8081 está ocupado:

```powershell
npx expo start --web -c --port 8082
```

### Scripts npm existentes

| Script | Comando | Notas |
|--------|---------|-------|
| `npm run web` | `expo start --web` | Sin flags de caché ni `web_touch` |
| `npm start` | `expo start` | Genérico |

**No hay** script dedicado `web_touch` en `package.json`; conviene añadir uno en fase futura (p. ej. `web:touch-smoke`) si se repite este QA.

---

## 3. Configuración usada

```env
EXPO_PUBLIC_APP_ENV=web_touch
EXPO_PUBLIC_ENABLE_SENSOR=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=true
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true
EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true
EXPO_PUBLIC_ENABLE_SUPABASE=false
EXPO_PUBLIC_DATA_MODE=local
EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false
EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=false
EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=false
```

**Nota:** Sin `EXPO_PUBLIC_SUPABASE_URL` ni `EXPO_PUBLIC_SUPABASE_ANON_KEY` → `isSupabaseConfigured === false` → cliente Supabase `null`.

---

## 4. Resultado de arranque

| Paso | Resultado |
|------|-----------|
| `npm run lint` | **PASS** — exit code 0 |
| `npx expo start --web -c` (puerto 8081) | **FAIL** — puerto ocupado; modo no interactivo no aceptó prompt |
| `npx expo start --web -c --port 8082` | **PASS** — Metro bundler OK |
| Bundle web | **PASS** — 1683 módulos, sin error de compilación |
| HTTP `http://localhost:8082` | **PASS** — status 200 |

---

## 5. Checklist de smoke test

Leyenda: **pass** = verificado en esta sesión · **fail** = fallo confirmado · **not tested** = requiere QA manual en navegador.

| # | Criterio | Estado | Evidencia / notas |
|---|----------|--------|-------------------|
| 1 | La app abre en navegador | **pass** | Bundle web exitoso; HTTP 200 en `:8082`. UI completa no recorrida por agente. |
| 2 | No aparece acceso normal al sensor en Inicio | **pass** | `HomeScreen`: `sensorCard` y `showSensor` condicionados a `isSensorRuntimeEnabled()` → `false` en `web_touch`. |
| 3 | Rutas de sensor muestran fallback controlado, no WebSocket | **pass** | `app/sensor-connection.tsx`, `sensor-calibration.tsx`, `hardware-lab.tsx`, `esp32-raw-test.tsx` → `SensorUnavailableScreen`. Hook `useEsp32WebSocketSensor` sale temprano si `!sensorConnectionAllowed`. |
| 4 | Se puede crear o entrar con paciente | **not tested** | Flujo local-first (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`); sin cambios de código. Verificar login/clave en navegador. |
| 5 | Se pueden aceptar términos | **not tested** | `consent-service` usa Supabase solo si `isCloudAuthEnabled()` → `false`. |
| 6 | La evaluación inicial abre sin sensor | **pass** | `useInitialEvaluationReadiness` + `resolveDiagnosticLaunchInputMode`: en `web_touch` → `touch`, `canStart` sin polling sensor. |
| 7 | La evaluación inicial funciona con touch | **not tested** | Requiere press/hold en 3 intentos en navegador. |
| 8 | Resultado guardado como `touch`, `sensor_used=false` | **pass** (código) / **not tested** (persistencia) | `resolveDiagnosticLaunchInputMode` retorna `'touch'` (oficial, no `touch_practice`). `buildDiagnosticMeasurementMetadata('touch')` → `{ measurement_source: 'touch', sensor_used: false }`. `persistOfficialDiagnosticResult` rechaza solo `touch_practice`. |
| 9 | Niveles desbloqueados por review flag | **pass** | `REVIEW_UNLOCK_ALL_LEVELS` = `true` con flag en env; `isLevelEntryLockedForUi` retorna `false`. |
| 10 | Se puede entrar a terapia | **not tested** | Navegación a `/(tabs)/terapia` sin bloqueo sensor esperado. |
| 11 | La terapia funciona con touch | **pass** (código) / **not tested** (UI) | `resolveTherapySessionLaunchInputMode`: si `!isSensorRuntimeEnabled()` → `'touch_practice'`. |
| 12 | Historial no rompe | **not tested** | Lectura local AsyncStorage; sin dependencia Supabase con flags actuales. |
| 13 | Exportación no rompe | **pass** (código) / **not tested** (Safari) | `download-export-file.ts`: rama `Platform.OS === 'web'` con `triggerWebDownload` (anchor + Blob). Safari iPhone puede requerir gesto de usuario adicional — validar en dispositivo real. |
| 14 | Sin errores rojos de WebSocket ESP32 | **pass** (código) / **not tested** (consola) | `connect`/`autoConnect` en `use-esp32-websocket-sensor.ts` no ejecutan si `!sensorConnectionAllowed`. Revisar consola del navegador en QA manual. |
| 15 | Sin llamadas a Supabase | **pass** | Sin URL/anon key en env; `ENABLE_CLOUD_AUTH=false`; `enableSupabase=false`. Cliente no instanciado. |

---

## 6. Errores encontrados

| Severidad | Descripción | Bloqueante |
|-----------|-------------|------------|
| Baja | Puerto 8081 ocupado al ejecutar `npx expo start --web -c` sin `--port` | No — usar `--port 8082` o liberar 8081 |
| Info | Smoke interactivo (paciente, touch, export Safari) no ejecutado por agente | No para Fase 4 documental; sí para cerrar QA antes de Supabase |

**No se encontraron errores de compilación, lint ni bundling** con la configuración `web_touch` local.

---

## 7. Archivos que podrían requerir ajuste en fases futuras

| Archivo / área | Motivo |
|----------------|--------|
| `package.json` | Script `web:touch-smoke` con env documentado |
| `src/lib/supabase.ts` + repositorios cloud | Fase Supabase: `DATA_MODE=cloud`, auth |
| `src/modules/patient/`, `lib/cloud-data-store.ts` | Sync paciente/sesiones cuando `enableSupabase=true` |
| `src/modules/export/utils/download-export-file.ts` | QA Safari iOS (descarga vs share) |
| `src/modules/device/state/SensorConnectionProvider.tsx` | Stub provider opcional si hay overhead en web |
| `src/modules/device/volume-estimation/therapy-readiness-service.ts` | Copy específico web sin CTA sensor |
| `src/modules/session/session-input-mode.ts` | Unificar `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE` vs `_MODE` |
| `docs/12-web-cloud-migration/runtime-env-modes.md` | Actualizar cuando módulos consuman `runtimeEnv` de forma universal |

**No modificados en Fase 4 (por diseño):** `runtime-env.ts`, `esp32-websocket-client.ts`, `parse-sensor-message.ts`, calibración, firmware, `schema.sql`.

---

## 8. Confirmaciones de entorno

| Ítem | Estado |
|------|--------|
| `.env` real restaurado desde `.env.local-sensor-backup` | **Sí** — restaurado al final de la sesión (5 líneas originales) |
| `local_sensor` / backup intacto | **Sí** — `.env.local-sensor-backup` sin cambios |
| Código de app modificado | **No** |
| Supabase conectado | **No** |
| Sensor ESP32 usado | **No** |

Contenido restaurado en `.env`:

```env
EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true
EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=false
EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=false
EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true
```

---

## 9. Cómo repetir el QA manual (recomendado)

1. Restaurar configuración §3 en `.env` (o usar Opción B de §2).
2. `npx expo start --web -c --port 8082` (o liberar 8081).
3. Abrir `http://localhost:8082` en Chrome/Edge; repetir en Safari si el objetivo es iPhone.
4. Recorrer checklist §5 marcando pass/fail en consola (Network: sin `*.supabase.co`; Console: sin `ws://192.168.4.1`).
5. Tras evaluación touch: inspeccionar AsyncStorage / devtools → diagnóstico con `input_mode: 'touch'`, `sensor_used: false`.
6. Probar export CSV/JSON desde Perfil o pantalla de exportación.
7. Restaurar `.env` desde backup.

---

## 10. Conclusión

**Estado Fase 4:** **parcialmente listo**.

- **Listo para continuar hacia preparación Supabase** a nivel de **build, guards de sensor y lógica touch/evaluación** (revisión estática + arranque web).
- **No listo para activar Supabase en producción** sin:
  1. QA manual completo del checklist §5 (ítems 4–5, 7, 10–13 en navegador real).
  2. Fase 5+: repositorio dual local/cloud, auth y `EXPO_PUBLIC_ENABLE_SUPABASE=true` con credenciales reales.
  3. Validación export en Safari iPhone.
  4. Script o documentación de arranque reproducible (`web:touch-smoke`).

**Recomendación siguiente fase:** Fase 5 — capa de datos cloud (Supabase) detrás de `runtimeEnv.enableSupabase` y `DATA_MODE=cloud`, manteniendo `local_sensor` intacto; ejecutar este mismo checklist con `ENABLE_SUPABASE=true` en entorno de staging, no en el `.env` de campo.

---

## 11. Archivos creados o modificados en esta fase

| Archivo | Acción |
|---------|--------|
| `docs/12-web-cloud-migration/web-touch-local-smoke-test.md` | Creado |
| `.env` | Temporalmente web_touch → **restaurado** |
| `.env.local-sensor-backup` | Sin cambios (creado previamente por el usuario) |
