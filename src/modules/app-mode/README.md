# Módulo `app-mode` (flags y modo de aplicación)

Centraliza **flags de compilación** (Expo public env) y el **modo runtime** `online` vs `offline_sensor_test`. No contiene lógica clínica; define qué superficies de producto, cloud y debug están disponibles en cada build.

---

## Propósito

- Leer variables `EXPO_PUBLIC_*` en tiempo de build.
- Proveer `AppModeProvider` para modo hardware offline (desarrollo).
- Reexportar flags de calibración técnica desde `device/calibration/`.
- Gates de UI: cloud auth, sensor debug, hardware lab, práctica táctil (vía otros módulos).

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Flags env | `app-mode-config.ts` |
| Contexto runtime | `app-mode-context.tsx` |
| Tipos | `app-mode-types.ts` |
| Barrel | `index.ts` |

**Provider:** `AppModeProvider` en `app/_layout.tsx`.

---

## Flags principales (`.env.example`)

| Variable | Default ejemplo | Efecto |
|----------|-----------------|--------|
| `EXPO_PUBLIC_ENABLE_CLOUD_AUTH` | `false` | `true` → flujo Supabase/login; `false` → **local-first** |
| `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` | `false` | `__DEV__` + true → modo `offline_sensor_test` y hardware lab ampliado |
| `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` | `false` | Práctica sin sensor (`session/session-input-mode.ts`) |
| `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG` | `false` | Enlaces debug WS, bloques verbose en Historial/Resumen |
| `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION` | `false` | Flujo calibración técnica (`isTechnicalCalibrationEnabled`) |
| `EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW` | `false` | `__DEV__`: desbloqueo UI de niveles (`config/dev-level-flags.ts`) |

Plantilla: `.env.example` en raíz del repo.

---

## Local-first / cloud freeze

Con `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false` (default del prototipo):

- Paciente y consentimiento resueltos en local.
- Sin dependencia de internet para tabs principales ni sensor WiFi local.

Documentación de decisión de equipo: [README_CLOUD_FREEZE.md](../../../README_CLOUD_FREEZE.md).

`docs/09-development-workflow/` **no existe** en el repo; usar README raíz, `.env.example` y este módulo.

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

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Activar cloud en build de campo sin QA | Flujos bloqueados sin internet |
| Dejar sensor debug en producción | Superficies internas expuestas |
| `UNLOCK_ALL_LEVELS` en release | Progresión terapéutica falseada |
| Bypass consent en modo offline mal acotado | Acceso clínico sin aceptación legal |

---

## Referencias

- [README_CLOUD_FREEZE.md](../../../README_CLOUD_FREEZE.md)
- [Arquitectura](../../../docs/01-app-architecture/README.md)
- [Device / sensor debug](../../../src/modules/device/README.md)
- [Sesión — input modes](../../../src/modules/session/session-input-mode.ts)
