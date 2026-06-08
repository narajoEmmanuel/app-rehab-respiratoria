# RESPIRA+ — Guards de sensor para web_touch (Fase 2)

**Rama:** `feat/web-touch-sensor-guards`  
**Depende de:** [runtime-env-modes.md](./runtime-env-modes.md) · [web-touch-supabase-readiness-audit.md](./web-touch-supabase-readiness-audit.md)

Fase 2 agrega guards mínimos para que `web_touch` no intente conectar el ESP32, sin alterar el comportamiento de `local_sensor`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/config/sensor-runtime-guards.ts` | **Nuevo** — helper `isSensorRuntimeEnabled()` |
| `src/modules/device/screens/SensorUnavailableScreen.tsx` | **Nuevo** — fallback controlado en rutas sensor |
| `src/modules/device/adapters/use-esp32-websocket-sensor.ts` | No crea cliente WS ni ejecuta `connect`/`startMock` si sensor deshabilitado |
| `src/modules/device/sensor-real-connection.ts` | Transporte real = `false` cuando sensor deshabilitado |
| `src/modules/device/volume-estimation/therapy-readiness-service.ts` | Alertas sin botones a rutas sensor en web_touch |
| `src/modules/session/hooks/resolve-therapy-session-launch.ts` | Nunca retorna `'sensor'` si `isSensorRuntimeEnabled()` es `false`; fallback seguro `'touch_practice'` |
| `src/modules/session/hooks/use-therapy-session-launcher.ts` | Bloquea lanzamiento sensor con mensaje controlado |
| `src/modules/session/screens/SessionScreen.tsx` | Evita gate de readiness sensor en web_touch |
| `src/modules/diagnostics/use-initial-evaluation-readiness.ts` | Sin polling de calibración/señal si sensor off |
| `src/modules/diagnostics/screens/DiagnosticExamScreen.tsx` | Oculta CTA «Revisar sensor» en web_touch |
| `src/modules/diagnostics/components/InitialEvaluationWelcomeView.tsx` | `onGoToSensor` opcional |
| `src/modules/home/screens/HomeScreen.tsx` | Oculta tarjeta sensor y acceso rápido |
| `src/modules/home/components/HomeQuickAccessGrid.tsx` | Prop `showSensor` |
| `app/sensor-connection.tsx` | Fallback `SensorUnavailableScreen` |
| `app/sensor-calibration.tsx` | Fallback `SensorUnavailableScreen` |
| `app/hardware-lab.tsx` | Fallback `SensorUnavailableScreen` |
| `app/esp32-raw-test.tsx` | Fallback `SensorUnavailableScreen` |

**No modificados (confirmado):** Supabase, calibración (`predefined-calibration-models.ts`, servicios), `persistSessionResult`, firmware, `.env` real, `parse-sensor-message.ts`, `esp32-websocket-client.ts`.

---

## Guards agregados

### 1. `isSensorRuntimeEnabled()`

```typescript
runtimeEnv.enableSensor && !runtimeEnv.isWebTouch
```

Punto único de verdad para Fase 2. Sin `EXPO_PUBLIC_APP_ENV` definido → `local_sensor` → sensor **habilitado** (comportamiento actual).

### 2. Capa de transporte (`use-esp32-websocket-sensor.ts`)

- No instancia `Esp32WebSocketClient` si sensor deshabilitado.
- `connect()` y `startMock()` retornan sin efecto.
- Estado permanece en `idle`; no hay errores WS en consola por intentos automáticos.

### 3. Transporte real (`isRealSensorTransportConnected`)

- Siempre `false` en web_touch → touch practice gate no queda bloqueado por un falso «sensor conectado».

### 4. Terapia (`resolveTherapySessionLaunchInputMode`, `useTherapySessionLauncher`, `SessionScreen`)

**Regla de seguridad en `resolveTherapySessionLaunchInputMode`:** si `isSensorRuntimeEnabled()` es `false`, la función **nunca** retorna `'sensor'`. El fallback es siempre `'touch_practice'` (modo seguro para `web_touch`), incluso cuando `effectiveTouchPracticeEnabled` es `false`.

Orden de decisión:

```typescript
if (!sensorRuntimeEnabled) return 'touch_practice';
if (sensorTransportConnected) return 'sensor';
if (effectiveTouchPracticeEnabled) return 'touch_practice';
return 'sensor';
```

- No ejecuta `evaluateLevelSensorReadiness` ni alertas con rutas a `/sensor-connection` en web_touch.
- Mensaje controlado en launcher/sesión si el flujo táctil aún no está habilitado en Perfil (sin errores técnicos ESP32).
- Touch practice **no se auto-habilita** en Perfil; `resolveTherapySessionLaunchInputMode` solo evita que el modo de lanzamiento sea `'sensor'` cuando el runtime del sensor está deshabilitado.

### 5. Evaluación inicial

- Sin polling de sensor/calibración en web_touch.
- Mensaje pendiente documentado; botón «Revisar sensor» oculto.
- **Evaluación táctil funcional:** pendiente Fase 3+.

### 6. UI y rutas

- Home: sin tarjeta de dispositivo ni tile «Sensor».
- Rutas sensor/calibración/lab/raw-test: `SensorUnavailableScreen` con navegación de regreso.

### 7. Alertas de readiness (`showTherapyReadinessAlert`)

- Suprime botones que navegan a `/sensor-connection` o `/sensor-calibration` cuando sensor off.

---

## Cómo se protege `local_sensor`

| Mecanismo | Efecto |
|-----------|--------|
| Default `APP_ENV` → `local_sensor` | Sin `.env` nuevo, `isSensorRuntimeEnabled()` = `true` |
| Guards condicionales | Toda lógica sensor existente corre cuando `isSensorRuntimeEnabled()` |
| Sin cambios en `esp32-websocket-client.ts` | Handshake WS intacto |
| Sin cambios en calibración/readiness audit | Reglas clínicas de volumen intactas |
| Overrides explícitos | `EXPO_PUBLIC_ENABLE_SENSOR=true` en build nativo sigue activo salvo `web_touch` |

---

## Pendiente para `web_touch` (fases futuras)

| Ítem | Fase sugerida |
|------|---------------|
| Evaluación inicial con input táctil | Fase 3–4 |
| Progresión de niveles / unlock con touch | Fase 4+ |
| Unificar `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE` con `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` | Fase 3 |
| Terapia táctil como flujo principal web | Fase 4 |
| Supabase / `DATA_MODE=cloud` | Fase 5–6 |
| Ocultar rutas sensor del stack en `_layout.tsx` | Opcional; hoy fallback en ruta es suficiente |

---

## Cómo probar `local_sensor`

1. Sin `EXPO_PUBLIC_APP_ENV` o con `EXPO_PUBLIC_APP_ENV=local_sensor`.
2. `npx expo start` → iOS/Android.
3. Verificar:
   - Tarjeta sensor visible en Home.
   - `/sensor-connection` → pantalla completa de conexión ESP32.
   - Conectar ESP32 AP → WebSocket → volumen en vivo.
   - Terapia con sensor → readiness + sesión como antes.
   - Evaluación inicial → readiness sensor + CTA «Revisar sensor».

---

## Cómo probar `web_touch`

1. En `.env` local (no commitear):

```env
EXPO_PUBLIC_APP_ENV=web_touch
EXPO_PUBLIC_ENABLE_SENSOR=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=true
EXPO_PUBLIC_DATA_MODE=cloud
```

2. `npx expo start --web`.
3. Verificar:
   - Home sin tarjeta sensor ni tile «Sensor».
   - Navegar manualmente a `/sensor-connection` → «Sensor no disponible en este modo» + Volver.
   - Consola sin intentos WebSocket a `ws://192.168.4.1:81`.
   - Terapia → alerta controlada (no redirección a sensor).
   - Evaluación inicial → mensaje pendiente; sin «Revisar sensor».
   - Historial, export, perfil → navegación normal.

---

## Riesgos restantes

| Riesgo | Mitigación actual | Próximo paso |
|--------|-------------------|--------------|
| Deep link directo a `/diagnostico` con `inputMode=sensor` | Readiness bloqueada con mensaje pendiente | Default touch en navegación (Fase 3) |
| Touch practice requiere flags legacy + Perfil | No unificado aún | Bridge `runtimeEnv.enableTouchPractice` |
| `SensorConnectionProvider` sigue montado globalmente | Hook no crea WS si disabled | Stub provider opcional si hay overhead |
| Safari iPhone WS (si alguien fuerza sensor) | Guard en hook + rutas | QA Fase 7 |
| Alertas clínicas genéricas sin CTA sensor | Puede confundir en web | Copy específico web_touch (Fase 3) |
| Calibración predefinida sigue instalándose en AsyncStorage | No afecta web si no hay sensor UI | Sin acción en Fase 2 |

---

## Referencia rápida

```typescript
import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';

if (isSensorRuntimeEnabled()) {
  // flujo ESP32 permitido
}
```
