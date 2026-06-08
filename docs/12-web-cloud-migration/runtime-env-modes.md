# RESPIRA+ — Modos de runtime (`runtimeEnv`)

**Fase 1 de migración controlada** · Solo capa de configuración centralizada.  
**Archivo:** `src/config/runtime-env.ts`  
**Auditoría base:** [web-touch-supabase-readiness-audit.md](./web-touch-supabase-readiness-audit.md)

---

## 1. Qué es `local_sensor`

Modo de despliegue **actual de producción en campo**:

- App nativa (iOS/Android) con **sensor ESP32** vía WiFi local y WebSocket.
- Calibración, terapia, evaluación inicial y historial dependen del flujo sensor existente.
- Persistencia **local-first** (`AsyncStorage`, claves `@rehab/*` y `@respira_*`).
- Sin dependencia de internet para el flujo clínico principal.
- Supabase **desactivado** por defecto.

Este modo **no debe romperse** durante la migración web/cloud.

---

## 2. Qué es `web_touch`

Modo futuro para **app web en iPhone** (PWA / `expo start --web`):

- **Sin sensor ESP32**: rutas, providers y readiness de hardware desactivados.
- **Práctica táctil** como input principal (press/hold).
- Persistencia **cloud** (`DATA_MODE=cloud`) con Supabase en fases posteriores.
- Export vía descarga web; notificaciones degradadas («Solo en app»).

En Fase 1 solo existen los flags tipados; ningún módulo los consume aún.

---

## 3. Variables de entorno

| Variable | Valores | Propósito |
|----------|---------|-----------|
| `EXPO_PUBLIC_APP_ENV` | `local_sensor` · `web_touch` · `development` · `test` | Identificador del modo de despliegue |
| `EXPO_PUBLIC_ENABLE_SENSOR` | `true` · `false` | Habilita flujo ESP32 (override explícito) |
| `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE` | `true` · `false` | Habilita práctica táctil (override explícito) |
| `EXPO_PUBLIC_ENABLE_SUPABASE` | `true` · `false` | Habilita cliente Supabase (override explícito) |
| `EXPO_PUBLIC_DATA_MODE` | `local` · `cloud` | Fuente de verdad de datos |
| `EXPO_PUBLIC_SUPABASE_URL` | URL pública del proyecto | Solo cliente; requerida cuando Supabase esté activo |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública | Solo cliente; **nunca** `service_role` |

### Reglas de resolución

1. Si `EXPO_PUBLIC_APP_ENV` no está definido → **`local_sensor`** (comportamiento actual sin cambios).
2. Defaults por `APP_ENV`:

   | `APP_ENV` | Sensor | Touch | Supabase | `DATA_MODE` |
   |-----------|--------|-------|----------|-------------|
   | `local_sensor` | `true` | `false` | `false` | `local` |
   | `web_touch` | `false` | `true` | `true` | `cloud` |
   | `development` | `true` | `false` | `false` | `local` |
   | `test` | `false` | `false` | `false` | `local` |

3. Si `EXPO_PUBLIC_ENABLE_SENSOR`, `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE` o `EXPO_PUBLIC_ENABLE_SUPABASE` están **definidos explícitamente**, prevalecen sobre los defaults del `APP_ENV`.
4. Si `EXPO_PUBLIC_ENABLE_SUPABASE=false`, no se exigen `SUPABASE_URL` ni `SUPABASE_ANON_KEY`.
5. Si `EXPO_PUBLIC_ENABLE_SUPABASE=true` y faltan URL o anon key → **advertencia en consola**, sin romper la app (Fase 1).

### Compatibilidad con flags existentes

Durante la transición, los módulos siguen leyendo variables legacy (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH`, `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE`, etc.). En fases futuras se unificarán contra `runtimeEnv`.

---

## 4. Ejemplo: `local_sensor`

```env
EXPO_PUBLIC_APP_ENV=local_sensor
EXPO_PUBLIC_ENABLE_SENSOR=true
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=false
EXPO_PUBLIC_ENABLE_SUPABASE=false
EXPO_PUBLIC_DATA_MODE=local

# Flags legacy (siguen activos en el código actual)
EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=false
EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false
EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=false

# Supabase omitido o vacío — no requerido
```

---

## 5. Ejemplo: `web_touch`

```env
EXPO_PUBLIC_APP_ENV=web_touch
EXPO_PUBLIC_ENABLE_SENSOR=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=true
EXPO_PUBLIC_ENABLE_SUPABASE=true
EXPO_PUBLIC_DATA_MODE=cloud
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Flags legacy (transición)
EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true
EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false
EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=false
```

---

## 6. Módulos que deberán respetar estos flags (fases futuras)

| Módulo / área | Flag(s) relevante(s) | Cambio previsto |
|---------------|----------------------|-----------------|
| `device/` (WebSocket, calibración, pantallas sensor) | `enableSensor` | Ocultar rutas y providers en `web_touch` |
| `session/` (lanzamiento terapia, input mode) | `enableSensor`, `enableTouchPractice` | Priorizar touch cuando sensor off |
| `diagnostics/` (evaluación inicial) | `enableSensor`, `enableTouchPractice` | Flujo VIM adaptado a touch |
| `patient/`, `lib/cloud-data-store` | `enableSupabase`, `dataMode` | Repositorio dual local/cloud |
| `history/`, `summary/` | `dataMode` | Lectura desde Supabase en modo cloud |
| `export/` | `dataMode` | Snapshot cloud + download web |
| `notifications/` | `isWebTouch` | Degradar en web sin crash |
| `app/` (rutas Expo Router) | `enableSensor`, `isWebTouch` | Guards de navegación |
| `auth/` | `enableSupabase` | Auth cloud cuando esté listo |

**Archivos críticos `local_sensor` (no tocar sin revisión):** ver §2.7 de la auditoría — `esp32-websocket-client.ts`, `SensorConnectionProvider`, `predefined-calibration-models.ts`, `persistSessionResult`, etc.

---

## 7. Cambios que esta fase NO implementa

- No se importa `runtimeEnv` en sensor, terapia, evaluación, historial, export ni notificaciones.
- No se conecta Supabase ni se modifican repositorios cloud.
- No se cambian rutas, diseño, lógica clínica ni firmware ESP32.
- No se modifica `.env` real del desarrollador.
- No se eliminan flags legacy (`EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE`, etc.).

---

## Uso en fases futuras

```typescript
import { runtimeEnv } from '@/src/config/runtime-env';

if (runtimeEnv.enableSensor) {
  // mostrar flujo ESP32
}

if (runtimeEnv.enableTouchPractice) {
  // permitir input táctil
}

if (runtimeEnv.dataMode === 'cloud' && runtimeEnv.enableSupabase) {
  // leer/escribir vía Supabase (cuando exista la capa repositorio)
}
```

Propiedades exportadas:

- `runtimeEnv.appEnv`
- `runtimeEnv.isLocalSensor` / `runtimeEnv.isWebTouch`
- `runtimeEnv.enableSensor` / `runtimeEnv.enableTouchPractice` / `runtimeEnv.enableSupabase`
- `runtimeEnv.dataMode`
- `runtimeEnv.supabaseUrl` / `runtimeEnv.supabaseAnonKey`
