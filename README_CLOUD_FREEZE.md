# Congelación temporal de cloud y auth (RESPIRA+)

Este documento describe la **decisión de equipo** de **no eliminar** Supabase, login ni servicios en la nube, sino **congelar temporalmente** su uso obligatorio mientras se estabiliza el prototipo con **ESP32 en red local sin internet**.

---

## a. Qué significa «cloud/auth congelado»

Significa que el código de **Supabase**, **login real**, **consentimiento remoto** y **perfil sincronizado con la nube** **sigue en el repositorio** y puede retomarse. La aplicación puede compilarse y ejecutarse en un modo **local-first**: paciente y consentimiento **mínimos en almacenamiento local**, sin exigir sesión online ni llamadas a la nube como **requisito** para abrir las pantallas principales o trabajar con el sensor por WiFi local.

No es un borrado de funcionalidad; es un **interruptor por variable de entorno** que desactiva la **dependencia obligatoria** de la nube durante esta fase de prototipo hardware.

---

## b. Por qué se hizo

Para probar el ESP32 como **punto de acceso WiFi**, la laptop o el iPhone debe unirse a la red **`RESPIRA_ESP32`**. Esa red **no tiene salida a internet**. Cualquier flujo que **requiera** Supabase, SQL remoto, login en nube, perfil remoto o consentimiento **solo** en servidor **bloquea** el desarrollo y las pruebas del hardware en condiciones reales.

La decisión separa **desarrollo del sensor y biofeedback local** de la **integración cloud**, hasta que el equipo decida volver a priorizar el flujo online de extremo a extremo.

---

## c. Qué variable controla el comportamiento

La variable pública de Expo:

| Valor | Comportamiento |
|--------|----------------|
| **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`** (o ausente / distinto de la cadena `true`) | **Modo local-first**: prototipo sin depender de internet para el gate inicial; consentimiento y paciente pueden resolverse en local según la implementación actual del repo. |
| **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`** | **Modo online (futuro / retomar equipo)**: se restaura la expectativa de flujo con identidad y nube según lo implementado en la rama. |

La definición exacta en código debe consultarse en `src/modules/app-mode/app-mode-config.ts` (función `isCloudAuthEnabled()`).

---

## d. Cómo trabajar en modo local-first

1. En tu entorno local, define **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`** (o simplemente **no** pongas `true`). Usa **`.env.example`** como guía; copia a `.env` y ajusta **sin commitear secretos**.
2. Reinicia el bundler de Expo (`expo start`) para que cargue las variables.
3. Navega por la app **sin depender de internet** para las pantallas principales del prototipo.
4. El **Hardware Lab** y herramientas de diagnóstico del ESP32 están pensadas para alcanzarse desde el flujo de **Conexión del sensor**, no como modo global de entrada al iniciar la app (véase sección 7).

---

## e. Cómo probar el ESP32 conectado a RESPIRA_ESP32

1. Conecta el teléfono o la tablet a la WiFi **`RESPIRA_ESP32`** (SSID del ESP32 en modo Access Point).
2. Abre la app en modo local-first (véase apartado d).
3. Entra a la ruta de **conexión del sensor** (`/sensor-connection` en Expo Router).
4. Usa el WebSocket del firmware: **`ws://192.168.4.1:81`**.
5. Opcional: página de diagnóstico en navegador (misma red): **`http://192.168.4.1`**.
6. Rutas adicionales de prueba documentadas en el README principal: p. ej. **`/esp32-raw-test`** para diagnóstico WebSocket aislado.

---

## f. Cómo retomar el flujo online al final

1. En **`.env`** (solo local; no subir a Git), establece **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`**.
2. Configura **`EXPO_PUBLIC_SUPABASE_URL`** y **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** según el proyecto Supabase del equipo (valores en `.env.example` como referencia de nombres).
3. Reinicia el bundler y valida login, consentimiento y pantallas que dependan de la nube en un entorno **con internet**.
4. Revisar con el equipo **RLS**, políticas y flujos en [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md) cuando se acerque un despliegue serio.

---

## g. Qué cosas NO se deben borrar

- Cliente **Supabase** y configuración asociada en el código.
- Pantallas y flujo de **login / registro** reales.
- **Repositorios, servicios y tablas** pensados para cloud (aunque esta fase no los exija al arrancar).
- **Guards y providers** relacionados con auth/consentimiento: deben seguir evolucionando de forma **compatible** con local-first y con modo online, no eliminarse para «limpiar».

---

## h. Qué riesgos evitar

- **Subir `.env`** con claves reales al repositorio: usar siempre **`.env.example`** como plantilla sin secretos.
- **Eliminar** código de nube «porque ahora no se usa» rompe el trabajo paralelo del equipo y dificulta reactivar **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`**.
- **Asumir** que el prototipo local cumple las mismas garantías que el flujo clínico online: el modo local-first es para **desarrollo de hardware y UX**; el producto final con datos sensibles debe alinearse con políticas y consentimiento acordados.
- **Mezclar** telemetría experimental del sensor con historial clínico en nube sin diseño explícito del equipo (véase también el README principal sobre calibraciones).

---

## i. Pasos para el equipo al volver a activar la nube

1. **Acordar** en el equipo que la fase hardware-local tiene los entregables necesarios o que se puede trabajar en paralelo con red disponible.
2. **Definir** entorno: `.env` con **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`** y credenciales Supabase válidas (solo en máquinas locales o secretos de CI, nunca en el repo).
3. **Probar** registro/login, perfil, consentimiento remoto (si aplica) y sincronización según las ramas activas.
4. **Actualizar** documentación de despliegue y seguridad si cambian políticas o esquema.
5. **Comunicar** a quien desarrolla firmware que las pruebas en **`RESPIRA_ESP32`** sin internet siguen siendo válidas usando **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`** cuando haga falta.

---

## Modo local-first y modo online (resumen)

| Modo | Variable |
|------|----------|
| **Local-first (prototipo ESP32, sin internet obligatorio)** | **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`** |
| **Online (retomar flujo real con nube)** | **`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`** |

En **local-first**, el arranque (`app/index.tsx`) exige consentimiento activo con `isConsentActive()` antes de abrir tabs (incluye retiro de consent o versión de documento desactualizada). Terapia, Historial, sensor, exportación, notificaciones y evaluación inicial quedan bloqueados sin consent. Detalle: [docs/03-features/terminos-consentimiento.md](docs/03-features/terminos-consentimiento.md).

---

## Variables de entorno y Git

- El archivo **`.env`** contiene secretos y configuración local; **no debe subirse a Git** (debe figurar en `.gitignore`).
- **`.env.example`** es la **plantilla segura**: nombres de variables y valores ficticios o placeholders, sin claves reales.

---

## Hardware Lab y Conexión del sensor

El **Hardware Lab** (ruta tipo `/hardware-lab` según el proyecto) está pensado como **apoyo dentro del flujo de conexión del sensor**, no como pantalla de arranque global al abrir la app. Desde **Conexión del sensor** se enlazan el laboratorio y, si existe en el repo, pruebas avanzadas como **`/esp32-raw-test`**.

---

## Referencia actual ESP32 (Access Point)

| Concepto | Valor |
|----------|--------|
| SSID | **`RESPIRA_ESP32`** |
| WebSocket (app) | **`ws://192.168.4.1:81`** |
| Página diagnóstico (navegador, misma red) | **`http://192.168.4.1`** |

---

## Evolución futura: Station Mode

En una **fase posterior**, el firmware podrá operar en **Station Mode**: el ESP32 se unirá a una WiFi con **internet**, lo que permitirá combinar, cuando el diseño lo permita, **pruebas de hardware** y **sincronización cloud** sin cambiar de red en el teléfono. Hasta entonces, el modo AP **`RESPIRA_ESP32`** sigue siendo el escenario principal de laboratorio documentado para este prototipo.

---

## Documentación relacionada

- [README.md](README.md) — visión general del proyecto, hardware y rutas de prueba.
- [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md) — notas de seguridad Supabase.
