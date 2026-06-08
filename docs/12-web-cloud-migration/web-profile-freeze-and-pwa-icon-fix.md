# RESPIRA+ — Fix congelamiento Perfil en web_touch + ícono PWA

**Rama:** `fix/web-profile-freeze-and-pwa-icon`  
**URL afectada:** https://respiraplus.netlify.app  
**Modo:** `web_touch` (presentación académica, sin sensor, datos locales)

---

## 1. Causa exacta del freeze en Perfil

### Síntoma

En Netlify (y en build estático local), al abrir **Perfil** (`/profile` vía avatar en `AppTopBar` o tab legacy `/(tabs)/perfil` → redirect) la app **se congelaba** y, tras el intento, otras pestañas dejaban de responder.

### Punto de fallo

**Loop de re-ejecución en `useFocusEffect` de `ProfileScreen`**, disparado por dependencias inestables del objeto `patient`.

| Paso | Qué ocurría |
|------|-------------|
| 1 | Usuario navega a `/profile` → `ProfileScreen` gana foco |
| 2 | `useFocusEffect` ejecuta `refreshSession()` |
| 3 | `refreshSession()` llama `setPatient(p)` con un **nuevo objeto** leído de AsyncStorage (misma data, distinta referencia) |
| 4 | `patient` cambia → el callback de `useFocusEffect` se recrea (estaba en deps: `[patient, …]`) |
| 5 | React Navigation vuelve a ejecutar el efecto **mientras la pantalla sigue enfocada** |
| 6 | Vuelta al paso 2 → **loop infinito** de lecturas AsyncStorage + `setState` + re-render |

Efecto colateral: `useTouchPracticePreference` también dependía del objeto `patient` completo (`reload` en deps de `[patient]`), lo que recreaba `reloadTouchPracticePreference` en cada ciclo y amplificaba el trabajo en el hilo principal.

### Cuándo ocurría el freeze

- **Al montar / enfocar** la ruta `/profile`, **dentro del hook** `useFocusEffect`.
- **No** antes de navegar (Terapia/Inicio seguían respondiendo hasta abrir Perfil).
- **No** por sensor ni Supabase: Perfil solo usa storage local, consentimiento y guards de notificaciones (`supportsNativeLocalNotifications()` → `web_only` en web).
- **No** era un error JS no capturado visible; era saturación por **loop infinito de estado**.

### Confirmaciones de diagnóstico

| Pregunta | Respuesta |
|----------|-----------|
| ¿Perfil intenta usar sensor en web_touch? | **No** — no importa WS ni calibración en esta pantalla |
| ¿Perfil intenta usar Supabase? | **No** — `EXPO_PUBLIC_ENABLE_SUPABASE=false`, `DATA_MODE=local` |
| ¿Loop infinito de estado/navegación? | **Sí** — `useFocusEffect` + `patient` en deps + `refreshSession()` |
| ¿`local_sensor` afectado? | **No** — cambios acotados a estabilizar sesión y focus effect |

---

## 2. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/modules/patient/screens/ProfileScreen.tsx` | `useFocusEffect` sin dep `patient`; datos vía `getCurrentPatient()` tras `refreshSession` |
| `src/modules/patient/context/PatientSessionContext.tsx` | `refreshSession` evita `setPatient` si el registro no cambió (`isSamePatientRecord`) |
| `src/modules/session/hooks/use-touch-practice-preference.tsx` | `reload` / setter dependen de `patientId`, no del objeto `patient` |
| `app.json` | `web.favicon` → `./assets/images/respira-logo.png` |
| `app/+html.tsx` | **Nuevo** — `link rel="icon"`, `apple-touch-icon`, `manifest`, meta PWA |
| `public/favicon.png` | Copia de `assets/images/respira-logo.png` |
| `public/apple-touch-icon.png` | Copia de `assets/images/respira-logo.png` |
| `public/icon-192.png` | Copia de `assets/images/respira-logo.png` |
| `public/icon-512.png` | Copia de `assets/images/respira-logo.png` |
| `public/manifest.json` | **Nuevo** — manifest PWA con nombre corto `RESPIRA+` |
| `docs/12-web-cloud-migration/web-profile-freeze-and-pwa-icon-fix.md` | Este documento |

**No modificados:** Supabase, `schema.sql`, firmware, calibración, `parse-sensor-message.ts`, `esp32-websocket-client.ts`, diseño visual de Perfil.

---

## 3. Corrección — Perfil sin congelar web_touch

### A. `ProfileScreen.tsx`

- Eliminado `patient` de las dependencias de `useFocusEffect`.
- Tras `refreshSession()` y `refreshConsent()`, se obtiene el paciente activo con `getCurrentPatient()` (snapshot estable para esa ejecución del efecto).
- El efecto solo se re-ejecuta al **ganar/perder foco** de la pantalla, no en cada `setPatient`.

### B. `PatientSessionContext.tsx`

- `refreshSession` compara el paciente previo con el leído de storage; si los campos relevantes son iguales, **conserva la referencia** anterior y evita re-renders en cadena.

### C. `use-touch-practice-preference.tsx`

- `reload` y `setProfileTouchPracticeEnabled` usan `patient?.paciente_id` (estable) en lugar del objeto `patient`.

### Degradación segura en web_touch (sin cambios nuevos)

- Recordatorios: `supportsNativeLocalNotifications()` → `false` en web → estado `web_only` en UI (ya existente).
- Avatar: `ProfileAvatarPicker` ya soporta web con `base64` / data URI.
- Haptics en web: no bloquean (expo-haptics no-op en navegador).

---

## 4. Corrección — ícono de acceso directo (PWA / iPhone)

### Fuente visual

Todas las variantes derivan de **`assets/images/respira-logo.png`** (único logo autorizado).

### Configuración

| Elemento | Ubicación / valor |
|----------|-------------------|
| Favicon Expo | `app.json` → `expo.web.favicon` = `respira-logo.png` |
| Favicon servido | `public/favicon.png` → copiado a raíz de `dist/` en export |
| Apple Touch Icon | `public/apple-touch-icon.png` + `<link rel="apple-touch-icon">` en `app/+html.tsx` |
| Manifest | `public/manifest.json` + `<link rel="manifest">` |
| Theme color | `#34ABA5` (teal RESPIRA+) |
| Título acceso directo iOS | `RESPIRA+` (`apple-mobile-web-app-title`) |
| Iconos manifest | `/icon-192.png`, `/icon-512.png` (misma fuente `respira-logo.png`) |

No se agregó tarjeta de instalación en la UI (restricción del release).

---

## 5. Resultado de `npm run lint`

```
> app-rehab-respiratoria@1.0.0 lint
> expo lint

(exit code 0 — sin errores ni warnings)
```

---

## 6. Prueba web dev (`web_touch`)

```powershell
$env:EXPO_PUBLIC_APP_ENV="web_touch"
$env:EXPO_PUBLIC_ENABLE_SENSOR="false"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE="true"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE="true"
$env:EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW="true"
$env:EXPO_PUBLIC_ENABLE_SUPABASE="false"
$env:EXPO_PUBLIC_DATA_MODE="local"
$env:EXPO_PUBLIC_ENABLE_CLOUD_AUTH="false"
npx expo start --web -c --port 8084
```

**Verificación manual esperada en navegador:** Inicio → avatar → Perfil carga scroll completo sin congelar; volver a Terapia/Historial sigue respondiendo.

---

## 7. Prueba web estática (`serve`)

```powershell
# Mismas EXPO_PUBLIC_* que arriba, luego:
npx expo export -p web --output-dir dist
npx serve dist -l 8083
```

**Resultado export esperado:**

- Rutas estáticas generadas (incluye `/profile`, `/(tabs)/perfil`).
- Assets PWA en `dist/`: `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.json`.
- HTML estático incluye meta PWA (`apple-touch-icon`, `manifest.json`, `RESPIRA+`).

---

## 8. Confirmación `local_sensor` intacto

| Escenario | ¿Afectado? |
|-----------|------------|
| `APP_ENV=local_sensor`, sensor + terapia | **No** — guards y WS sin cambios |
| `refreshSession` en otras pantallas | **Mejorado** — menos re-renders espurios |
| Toggle táctil en Perfil (nativo) | **No** — misma lógica, deps más estables |
| Calibración / `parse-sensor-message` / `esp32-websocket-client` | **No tocados** |

---

## 9. Redeploy a Netlify (`--no-build`)

Desde la raíz del repo, con variables `EXPO_PUBLIC_*` de web_touch en la shell **antes** del export:

```powershell
$env:EXPO_PUBLIC_APP_ENV="web_touch"
$env:EXPO_PUBLIC_ENABLE_SENSOR="false"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE="true"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE="true"
$env:EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW="true"
$env:EXPO_PUBLIC_ENABLE_SUPABASE="false"
$env:EXPO_PUBLIC_DATA_MODE="local"
$env:EXPO_PUBLIC_ENABLE_CLOUD_AUTH="false"

npx expo export -p web --output-dir dist
npx netlify deploy --prod --dir=dist --no-build
```

> `--no-build` publica el `dist/` ya exportado localmente sin ejecutar el comando de build del panel Netlify. Las `EXPO_PUBLIC_*` deben estar definidas **en la misma sesión** que corre `expo export`, porque se incrustan en el bundle en tiempo de compilación.

---

## Referencias

- [web-touch-game-screen-freeze-fix.md](./web-touch-game-screen-freeze-fix.md)
- [web-preview-public-link.md](./web-preview-public-link.md)
- [02-tabs/perfil-configuracion.md](../02-tabs/perfil-configuracion.md)
