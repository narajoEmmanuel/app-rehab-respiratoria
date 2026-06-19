# Modo web, PWA, demo y runtime — RESPIRA+

Esta carpeta documenta la **migración controlada** hacia despliegues web y cloud de RESPIRA+, sin sustituir el modo principal de campo con **sensor ESP32** en red local. RESPIRA+ permanece un **prototipo académico** de apoyo terapéutico; las variantes web descritas aquí están orientadas a **demostración, familiarización y pruebas**, no a sustituir el flujo clínico con hardware en postoperatorios reales.

---

## Dos modos de despliegue

### Modo local con sensor (`local_sensor`)

Es el modo **canónico de producción en campo** documentado en el [README raíz](../../README.md):

- App nativa iOS/Android
- ESP32 + VL53L0X por WiFi (`RESPIRA_ESP32`) y WebSocket (`ws://192.168.4.1:81`)
- Calibración RESPIRA+ 3000 mL, evaluación inicial con sensor, terapia oficial
- Persistencia **local-first** (AsyncStorage)
- Supabase y auth online **congelados** por defecto ([README_CLOUD_FREEZE.md](../../README_CLOUD_FREEZE.md))

### Modo web / demo (`web_touch`)

Variante para **navegador** y **PWA** (`npx expo start --web`, export estático):

- **Sin sensor ESP32**; entrada principal por **práctica táctil** (press/hold)
- Notificaciones locales **degradadas** («Solo en app» en web)
- Puede usarse con datos locales en navegador para **preview académico**
- No debe presentarse como equivalente clínico al flujo con espirómetro instrumentado

La capa de configuración tipada vive en `src/config/runtime-env.ts`. Detalle de variables: [runtime-env-modes.md](./runtime-env-modes.md).

> **Estado de integración:** `runtime-env.ts` expone flags tipados (Fase 1). Parte del código legacy sigue leyendo variables `EXPO_PUBLIC_ENABLE_*` individuales durante la transición documentada en [runtime-env-modes.md](./runtime-env-modes.md).

---

## Documentos en esta carpeta

| Documento | Tema |
|-----------|------|
| [runtime-env-modes.md](./runtime-env-modes.md) | `EXPO_PUBLIC_APP_ENV`, `local_sensor` vs `web_touch`, overrides |
| [web-preview-public-link.md](./web-preview-public-link.md) | Preview público académico, export estático, variables de build |
| [web-touch-supabase-readiness-audit.md](./web-touch-supabase-readiness-audit.md) | Auditoría de preparación web/cloud |
| [web-touch-sensor-guards.md](./web-touch-sensor-guards.md) | Guards de runtime sensor en web |
| [web-touch-local-smoke-test.md](./web-touch-local-smoke-test.md) | Smoke test local web |
| [touch-evaluation-review-levels.md](./touch-evaluation-review-levels.md) | Evaluación táctil y niveles |
| [web-profile-freeze-and-pwa-icon-fix.md](./web-profile-freeze-and-pwa-icon-fix.md) | Perfil web y icono PWA |
| [web-pwa-safe-area-navigation-polish.md](./web-pwa-safe-area-navigation-polish.md) | Safe areas y navegación PWA |

---

## Cómo ejecutar la app web localmente

Desde la raíz del repositorio:

```bash
npm install
npx expo start --web -c
```

Para un **build estático** (hosting en Netlify, Vercel, Cloudflare Pages, etc.):

```bash
npx expo export -p web
```

La salida se genera en `dist/`. Antes del export, configurar las variables `EXPO_PUBLIC_*` según el modo deseado (véase [web-preview-public-link.md](./web-preview-public-link.md), sección de variables).

### Preview académico documentado

El documento [web-preview-public-link.md](./web-preview-public-link.md) describe una configuración de **presentación académica** con:

- `EXPO_PUBLIC_APP_ENV=web_touch`
- Datos locales en navegador (`EXPO_PUBLIC_DATA_MODE=local`)
- Supabase desactivado
- Sensor desactivado; práctica táctil activa
- Niveles desbloqueados en UI solo para demo (`EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW=true`)

Esta configuración **no debe usarse con pacientes reales** ni presentarse como versión clínica de campo.

---

## Notificaciones en web

En navegador, las notificaciones locales tienen limitaciones de plataforma. Además, la build por defecto del repositorio define `EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false`, por lo que **no se programan** recordatorios locales en ninguna plataforma mientras la flag permanezca desactivada. Véase [Notificaciones](../03-features/notificaciones.md) y [módulo notifications](../../src/modules/notifications/README.md).

---

## Cloud y Supabase

La integración cloud permanece **opcional y congelada** para el flujo principal. Notas de seguridad: [supabase-security-notes.md](../supabase-security-notes.md). Decisión de equipo: [README_CLOUD_FREEZE.md](../../README_CLOUD_FREEZE.md).

---

## Relación con otros índices

- [Índice maestro](../README.md)
- [Arquitectura](../01-app-architecture/README.md)
- [Dispositivo y sensor](../04-device-and-sensor/README.md) — flujo ESP32 (modo local)
- [Validación y QA](../10-testing-and-validation/README.md)
- [Módulo app-mode](../../src/modules/app-mode/README.md) — flags de compilación

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Modos de runtime (`runtimeEnv`)* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/12-web-cloud-migration/runtime-env-modes.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Web preview público (presentación académica)* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/12-web-cloud-migration/web-preview-public-link.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Auditoría web touch / Supabase readiness* [Informe interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/12-web-cloud-migration/web-touch-supabase-readiness-audit.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Congelación temporal de cloud y auth* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `README_CLOUD_FREEZE.md`.
