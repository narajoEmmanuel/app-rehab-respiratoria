# RESPIRA+ — Ajuste fino safe areas y navegación PWA (iPhone)

**Rama:** `fix/web-pwa-safe-area-navigation-polish`  
**URL afectada:** https://respiraplus.netlify.app  
**Modo:** `web_touch` (presentación académica, sin sensor, datos locales)

---

## 1. Causa probable del desplazamiento en login / crear perfil

En iPhone PWA (Safari standalone), al enfocar un `TextInput` ocurrían **tres factores combinados**:

| Factor | Efecto |
|--------|--------|
| Viewport sin `viewport-fit=cover` | `env(safe-area-inset-*)` en 0 o inconsistente; el navegador redimensiona el layout al abrir el teclado |
| `KeyboardAvoidingView` + `minHeight` forzado en `ScrollView` | En pantallas de registro el contenido ocupaba `windowHeight - insets`, recalculándose al cambiar el viewport visual con el teclado |
| Scroll del documento (`body`) | Sin `overflow: hidden` en `body`, Safari desplazaba **toda la página** hacia arriba para mostrar el input |

**No hay `autoFocus`** en los inputs de auth (verificado).

**Corrección aplicada (solo `Platform.OS === 'web'`):**

- `app/+html.tsx`: `viewport-fit=cover`, `interactive-widget=resizes-visual`, CSS base con `body { overflow: hidden }`.
- Auth (`LoginScreen`, `AuthCreateProfileView`, `RegistroScreen`): sin `KeyboardAvoidingView`; scroll interno con `automaticAdjustKeyboardInsets={false}`.
- `AuthCreateProfileView` / `AuthGeneratedKeyView`: sin `minHeight` forzado a altura de ventana en web.

Nativo iOS conserva `KeyboardAvoidingView` con `behavior="padding"`.

---

## 2. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/shared/layout/web-pwa-layout.ts` | **Nuevo** — constantes, helpers safe area y touch surface |
| `app/+html.tsx` | Viewport PWA, meta status bar, CSS base + anti-selección |
| `src/shared/ui/AppTopBar.tsx` | Padding superior extra en web |
| `app/(tabs)/_layout.tsx` | Tab bar bottom padding, iconos, touch target |
| `src/modules/auth/screens/LoginScreen.tsx` | Sin KAV en web; scroll estable |
| `src/modules/auth/components/AuthCreateProfileView.tsx` | Sin KAV / minHeight agresivo en web |
| `src/modules/auth/components/AuthGeneratedKeyView.tsx` | Sin minHeight agresivo en web |
| `src/modules/auth/screens/RegistroScreen.tsx` | Sin KAV en web |
| `src/modules/session/games/components/LevelOneGameView.tsx` | Capa touch sin selección de texto |
| `src/modules/session/games/components/TouchInputPressFeedback.tsx` | Estilo touch surface |
| `src/modules/session/screens/SessionScreen.tsx` | `gameWrap` anti-selección en modo touch |
| `src/modules/diagnostics/screens/DiagnosticExamScreen.tsx` | `Pressable` evaluación touch protegido |
| `docs/12-web-cloud-migration/web-pwa-safe-area-navigation-polish.md` | Este documento |

**No modificados:** Supabase, `schema.sql`, firmware, calibración, `parse-sensor-message.ts`, `esp32-websocket-client.ts`, flujo clínico, `.env`.

---

## 3. Cambios exactos — top bar (`AppTopBar`)

| Token / valor | Antes | Después (web) |
|---------------|-------|---------------|
| `WEB_PWA_TOP_OFFSET` | — | `6` px extra |
| `paddingTop` en `AppTopBar.wrap` | `6` (fijo) | `12` (`6 + 6`) solo en web |
| Safe area superior | Sin `viewport-fit=cover` | `viewport-fit=cover` en meta viewport |

Nativo: sin cambio en `paddingTop`.

---

## 4. Cambios exactos — bottom tab bar

| Propiedad | Antes (web) | Después (web) |
|-----------|-------------|---------------|
| `paddingBottom` | `6` fijo | `max(insets.bottom, 10) + 6` |
| `minHeight` | — | `58` |
| `tabBarItemStyle.minHeight` | — | `44` |

Nativo iOS/Android: sin cambio.

---

## 5. Cambios exactos — iconos del tab bar

| Estado | Antes | Después (web) |
|--------|-------|---------------|
| Inactivo | `22` | `25` |
| Activo | `22` | `26` |
| Nativo | `22` | `22` |

---

## 6. Modo touch — anti-selección de texto (iPhone PWA)

### Problema

En evaluación inicial y juego/niveles, mantener presionado activaba **selección de texto** y **callout de iOS**.

### Corrección

| Capa | Qué hace |
|------|----------|
| **CSS global** (`app/+html.tsx`) | `body { user-select: none }` · `input, textarea, [contenteditable]` restauran `user-select: text` |
| **`[data-touch-surface="true"]`** | Regla CSS + `touch-action: none` |
| **`web-pwa-layout.ts`** | `WEB_TOUCH_SURFACE_STYLE`, `webTouchSurfaceStyle()`, `webTouchSurfacePressableProps()` |
| **Pressable touch** | `onContextMenu`, `onDragStart`, `onSelectStart` → `preventDefault()` |

### Superficies

- `LevelOneGameView` — `gameTouchLayer`
- `DiagnosticExamScreen` — `Pressable` evaluación touch
- `SessionScreen` — `gameWrap` cuando `isTouchPractice`
- `TouchInputPressFeedback` — overlay visual

Login/crear perfil: inputs conservan `user-select: text` vía CSS global.

---

## 7. Resultado de `npm run lint`

Ver salida del run en esta sesión (debe ser exit code 0).

---

## 8. Resultado de `npx expo export -p web --output-dir dist`

Variables `EXPO_PUBLIC_*` de `web_touch` en la misma sesión de shell antes del export.

---

## 9. Confirmación `local_sensor` intacto

Todos los ajustes están detrás de `Platform.OS === 'web'` o `isWebPwaLayout()`.

---

## 10. Redeploy a Netlify

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
netlify deploy --prod --dir=dist --no-build
```

---

## Checklist iPhone PWA

- [ ] Crear perfil / login — sin desplazamiento agresivo del viewport
- [ ] Top bar — más aire bajo notch
- [ ] Bottom bar — iconos más tocables, no pegados al home indicator
- [ ] Evaluación touch — mantener presionado sin seleccionar texto
- [ ] Juego/niveles touch — mantener presionado sin callout iOS
- [ ] Inputs auth — editables con normalidad
