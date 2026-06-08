# RESPIRA+ — Web Preview público (presentación académica)

**Fecha:** 2026-06-08  
**Rama:** `feat/web-preview-public-link`  
**Tipo de release:** *presentation preview* — demostración académica, **no** para pacientes reales ni público general.

---

## 1. Qué es esta versión

| Aspecto | Valor |
|---------|--------|
| Modo runtime | `web_touch` |
| Datos | **Solo locales** en el navegador (`DATA_MODE=local`, AsyncStorage web) |
| Supabase | **Desactivado** (`EXPO_PUBLIC_ENABLE_SUPABASE=false`, sin URL/keys) |
| Sensor ESP32 | **Desactivado** (guards Fase 2; sin WebSocket) |
| Input clínico | Práctica táctil (press/hold) |
| Niveles | Desbloqueados en UI para demo (`EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true`) |
| Etiqueta en UI | **Ninguna** — la app se ve igual que en producción; esta clasificación es solo documentación interna |
| `local_sensor` | **Intacto** — builds nativos sin `EXPO_PUBLIC_APP_ENV=web_touch` siguen igual |

Los datos de la demo **no se sincronizan** a la nube. Cada visitante usa su propio almacenamiento local del navegador. Supabase se integrará en una fase posterior.

---

## 2. Revisión de configuración web (`app.json`)

No existe `app.config.ts` ni `app.config.js`. Toda la config Expo está en `app.json`.

### Estado actual (suficiente para export/deploy)

```json
"web": {
  "output": "static",
  "favicon": "./assets/images/favicon.png"
}
```

| Campo | Valor | ¿Correcto? | Notas |
|-------|-------|------------|-------|
| `expo.web.output` | `"static"` | **Sí** | Genera HTML estático por ruta en `dist/` vía `npx expo export -p web`. Requerido para hosting estático (Netlify, Vercel, Cloudflare Pages, etc.). |
| `expo.web.favicon` | `./assets/images/favicon.png` | **Sí** | Icono en pestaña del navegador. |
| `expo.plugins` → `expo-router` | presente | **Sí** | Static rendering habilitado con `output: "static"`. |
| `bundler` explícito | omitido | **OK** | Expo SDK 54 usa Metro por defecto en web. No hace falta duplicar en config. |

**Conclusión:** no se requirió modificar `app.json`, `app.config.*` ni `package.json` para esta release preview. El export de prueba generó **31 rutas estáticas** en `dist/` sin errores.

---

## 3. Variables de entorno (build + dev)

`EXPO_PUBLIC_*` se **incrustan en el bundle en tiempo de build**. Para preview y export deben estar definidas **antes** de `expo start` o `expo export`.

```env
EXPO_PUBLIC_APP_ENV=web_touch
EXPO_PUBLIC_ENABLE_SENSOR=false
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE=true
EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true
EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true
EXPO_PUBLIC_ENABLE_SUPABASE=false
EXPO_PUBLIC_DATA_MODE=local
EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false
```

Opcional (recomendado explícito en export de producción):

```env
EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=false
EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=false
```

**No** incluir `EXPO_PUBLIC_SUPABASE_URL` ni `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el entorno de build preview.

---

## 4. PowerShell — variables temporales (sin tocar `.env`)

```powershell
$env:EXPO_PUBLIC_APP_ENV="web_touch"
$env:EXPO_PUBLIC_ENABLE_SENSOR="false"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE="true"
$env:EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE="true"
$env:EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW="true"
$env:EXPO_PUBLIC_ENABLE_SUPABASE="false"
$env:EXPO_PUBLIC_DATA_MODE="local"
$env:EXPO_PUBLIC_ENABLE_CLOUD_AUTH="false"
$env:EXPO_PUBLIC_ENABLE_SENSOR_DEBUG="false"
$env:EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST="false"
```

> Si `.env` define la misma clave, puede haber mezcla de fuentes. Para preview predecible, usar solo variables de sesión **o** renombrar temporalmente `.env`. **No** commitear `.env` ni modificar el `.env` real de campo de forma permanente.

---

## 5. Comandos recomendados

### 5.1 Probar localmente (`web_touch`)

Tras cargar las variables de §4:

```powershell
npx expo start --web -c --port 8082
```

Abrir: **http://localhost:8082** (usar `--port 8082` si 8081 está ocupado).

### 5.2 Exportar web estático

Tras cargar las variables de §4:

```powershell
npx expo export -p web --output-dir dist
```

Salida: carpeta `dist/` (ignorada por git). Incluye `index.html`, HTML por ruta y `_expo/static/js/web/entry-*.js`.

**Probar el export localmente** (sin Metro):

```powershell
npx serve dist
```

O con cualquier servidor estático apuntando a `dist/`.

### 5.3 Desplegar y obtener link público

Elige **un** proveedor. Todos sirven la carpeta `dist/` tal cual.

#### Opción A — Netlify (recomendada para demo rápida)

```powershell
# Una vez: npm i -g netlify-cli  &&  netlify login
npx expo export -p web --output-dir dist   # con env §4 ya cargadas
netlify deploy --dir=dist --prod
```

Netlify imprime la URL pública (ej. `https://respira-demo.netlify.app`).

#### Opción B — Vercel

```powershell
# Una vez: npm i -g vercel  &&  vercel login
npx expo export -p web --output-dir dist
vercel dist --prod
```

#### Opción C — Cloudflare Pages

```powershell
npx expo export -p web --output-dir dist
npx wrangler pages deploy dist --project-name=respira-preview
```

#### Variables en el panel del host (CI/CD)

Si el deploy es desde GitHub Actions o dashboard del proveedor, configurar las mismas `EXPO_PUBLIC_*` de §3 **antes** del paso `npx expo export -p web`. Sin eso, el build público podría caer en `local_sensor` (default).

---

## 6. Scripts npm propuestos (opcionales)

No se añadieron a `package.json` porque los comandos directos son suficientes y el export ya fue validado. Si se repite el flujo, candidatos:

```json
"web:touch": "expo start --web",
"web:touch:export": "expo export -p web --output-dir dist",
"web:touch:deploy": "netlify deploy --dir=dist --prod"
```

En Windows, los scripts npm **no** cargan automáticamente las variables de §4; conviene un script `.ps1` documentado o variables en el panel del host de deploy.

---

## 7. Validación realizada en esta rama

| Prueba | Resultado |
|--------|-----------|
| `npm run lint` | **PASS** (exit 0) |
| `npx expo export -p web` con env `web_touch` | **PASS** — 31 rutas estáticas, bundle ~3.44 MB |
| Modificación de `app.json` | **No necesaria** |
| `.env` real | **Sin cambios** |

---

## 8. Checklist antes de compartir el link en la presentación

- [ ] Export hecho con variables §3/§4 (no confiar solo en `.env` de desarrollo).
- [ ] Abrir URL pública en Chrome y Safari (iPhone si aplica).
- [ ] Confirmar: sin tarjeta sensor en Inicio; `/sensor-connection` → fallback controlado.
- [ ] Flujo demo: paciente local → consentimiento → evaluación táctil → terapia táctil.
- [ ] Consola del navegador: sin `ws://192.168.4.1` ni requests a `*.supabase.co`.
- [ ] Export CSV/JSON desde la app (Safari puede exigir gesto de usuario para descarga).
- [ ] Aclarar verbalmente en la presentación que es **demo académica**, datos locales, no uso clínico real.
- [ ] No compartir claves de pacientes reales ni datos identificables en la demo.

---

## 9. Riesgos y pendientes

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Env de build incorrecto | Preview se comporta como `local_sensor` | Siempre exportar con §4; verificar en consola `[runtimeEnv]` o ausencia de UI sensor |
| Bundle grande (~3.4 MB JS) | Carga lenta en móvil | Aceptable para demo; optimización futura |
| Datos solo en navegador | Se pierden al limpiar cache / otro dispositivo | Esperado; documentar en presentación |
| `UNLOCK_ALL_LEVELS` en build público | Todos los niveles jugables | Intencional para demo; no usar este build en pacientes |
| Evaluación/terapia touch ≠ espirometría real | Interpretación clínica | Metadata `measurement_source: touch`, `sensor_used: false` |
| Notificaciones web | Degradadas / sin efecto | Warning conocido de `expo-notifications` en web |
| Sin HTTPS en prueba local | Algunas APIs limitadas | El link público del host sí usa HTTPS |
| Supabase futuro | Requiere nuevo build con flags distintos | Fase posterior; no mezclar con este preview |

---

## 10. Qué no se tocó (por diseño)

- `schema.sql`, firmware, calibración, `predefined-calibration-models.ts`
- `parse-sensor-message.ts`, `esp32-websocket-client.ts`, `persistSessionResult`
- Diseño visual y etiquetas en UI
- Tarjeta de instalación PWA
- `.env` real del desarrollador
- Flujo `local_sensor` nativo (sin `APP_ENV=web_touch` en build de campo)

---

## 11. Referencias

- [web-touch-local-smoke-test.md](./web-touch-local-smoke-test.md) — smoke test Fase 4
- [web-touch-sensor-guards.md](./web-touch-sensor-guards.md) — guards sensor
- [runtime-env-modes.md](./runtime-env-modes.md) — modos `local_sensor` / `web_touch`
- [Expo static rendering](https://docs.expo.dev/router/reference/static-rendering/)

---

## 12. Conclusión

RESPIRA+ está **listo para generar un Web Preview público** con la configuración actual de `app.json` (`output: static`) y un export `web_touch` con variables de entorno documentadas. No hace falta cambio de código ni de config Expo para el primer deploy; el paso crítico es **exportar con las `EXPO_PUBLIC_*` correctas** y desplegar `dist/` en un host estático.
