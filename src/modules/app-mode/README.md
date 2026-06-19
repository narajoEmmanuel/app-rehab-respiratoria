# Módulo `app-mode` (flags y modo de aplicación)

Centraliza **flags de compilación** (`EXPO_PUBLIC_*`) y el **modo runtime** de aplicación (`online` vs `offline_sensor_test`). No contiene lógica clínica; define qué superficies de producto, cloud, debug y notificaciones están disponibles en cada build.

---

## Propósito

- Leer variables `EXPO_PUBLIC_*` en tiempo de build de Expo.
- Proveer `AppModeProvider` para modo hardware offline (desarrollo).
- Reexportar flags de calibración técnica desde `device/calibration/`.
- Gates de UI consumidos por otros módulos: cloud auth, sensor debug, hardware lab, práctica táctil, notificaciones globales.

**Provider:** `AppModeProvider` en `app/_layout.tsx`.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Flags env legacy | `app-mode-config.ts` |
| Contexto runtime | `app-mode-context.tsx` |
| Tipos | `app-mode-types.ts` |
| Barrel | `index.ts` |
| Runtime env tipado (Fase 1) | `src/config/runtime-env.ts` |
| Notificaciones globales | `src/config/runtime-flags.ts` |

Plantilla de entorno: `.env.example` en la raíz del repositorio.

---

## Flags principales (`.env.example`)

| Variable | Default en ejemplo | Efecto |
|----------|-------------------|--------|
| `EXPO_PUBLIC_ENABLE_CLOUD_AUTH` | `false` | `true` → flujo Supabase/login; `false` → **local-first** |
| `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` | `false` | `__DEV__` + true → modo `offline_sensor_test` y hardware lab ampliado |
| `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` | `false` | Práctica sin sensor (`session/session-input-mode.ts`) |
| `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG` | `false` | Enlaces debug WS, bloques verbose en Historial/Resumen |
| `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION` | `false` | Flujo calibración técnica (`isTechnicalCalibrationEnabled`) |
| `EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW` | `false` | `__DEV__` o demo: desbloqueo UI de niveles (`config/dev-level-flags.ts`) |
| `EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED` | `false` | `true` → permite programar recordatorios locales; `false` → **sin programación** y limpieza activa (véase [notifications/README.md](../notifications/README.md)) |

Opcionales para nube (solo si se reactiva auth):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Runtime env (`src/config/runtime-env.ts`)

Capa tipada para modos de despliegue. Variables documentadas en `.env.example` (comentadas) y en [runtime-env-modes.md](../../../docs/12-web-cloud-migration/runtime-env-modes.md):

| Variable | Valores | Propósito |
|----------|---------|-----------|
| `EXPO_PUBLIC_APP_ENV` | `local_sensor` · `web_touch` · `development` · `test` | Modo de despliegue (default implícito: `local_sensor`) |
| `EXPO_PUBLIC_ENABLE_SENSOR` | `true` · `false` | Override flujo ESP32 |
| `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE` | `true` · `false` | Override práctica táctil |
| `EXPO_PUBLIC_ENABLE_SUPABASE` | `true` · `false` | Override cliente Supabase |
| `EXPO_PUBLIC_DATA_MODE` | `local` · `cloud` | Fuente de verdad de datos |

> **Transición:** durante la migración web/cloud, varios módulos siguen leyendo flags legacy (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH`, `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE`, etc.) además de `runtime-env.ts`. Véase [12-web-cloud-migration](../../../docs/12-web-cloud-migration/README.md).

---

## Modos de despliegue resumidos

| Modo | Sensor ESP32 | Touch | Datos | Uso documentado |
|------|--------------|-------|-------|-----------------|
| `local_sensor` | Sí | No (default) | Local | Campo con hardware — **canónico** |
| `web_touch` | No | Sí | Local o cloud según config | Web / PWA / demo académica |
| `development` | Sí | No | Local | Desarrollo nativo |
| `test` | No | No | Local | Pruebas automatizadas |

---

## Local-first / cloud freeze

Con `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false` (default del prototipo):

- Paciente y consentimiento resueltos en local.
- Sin dependencia de internet para tabs principales ni sensor WiFi local.

Documentación de decisión de equipo: [README_CLOUD_FREEZE.md](../../../README_CLOUD_FREEZE.md).

---

## Modo offline sensor test

`AppMode`: `'online' | 'offline_sensor_test'`.

- Activable solo si `isOfflineSensorTestEnabled()` (`__DEV__` + env).
- `HardwareLabScreen` puede fijar modo al entrar.
- `ConsentStackGuard` omite check en este modo (desarrollo hardware).

---

## Modo práctica táctil

Flag `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` — consumido en `session/session-input-mode.ts` y `diagnostics/diagnostic-input-mode.ts`.

Requiere además preferencia en Perfil y ausencia de sensor real. **No** equivale a sesión oficial con volumen estimado por sensor.

---

## Riesgos al modificar flags

| Riesgo | Impacto |
|--------|---------|
| Activar cloud en build de campo sin QA | Flujos bloqueados sin internet |
| Dejar sensor debug en producción | Superficies internas expuestas |
| `UNLOCK_ALL_LEVELS` en release clínico | Progresión terapéutica falseada |
| `RESPIRA_NOTIFICATIONS_ENABLED=true` sin QA de deduplicación | Recordatorios locales activos; requiere checklist |
| Bypass consent en modo offline mal acotado | Acceso clínico sin aceptación legal |

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Modos de runtime (`runtimeEnv`)* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/12-web-cloud-migration/runtime-env-modes.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Congelación temporal de cloud y auth* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `README_CLOUD_FREEZE.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Módulo notifications* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `src/modules/notifications/`.
