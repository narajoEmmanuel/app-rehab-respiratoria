# RESPIRA+

Aplicación de apoyo para **ejercicios respiratorios con espirómetro incentivador**, orientada al **seguimiento de sesiones**, la **adherencia**, el **biofeedback** y el **registro de progreso** en contextos de rehabilitación (p. ej. adultos en proceso postoperatorio). RESPIRA+ organiza el flujo del paciente desde el acceso y el consentimiento hasta la terapia por niveles, el historial y la exportación de datos.

El proyecto se desarrolla con **Expo**, **React Native** y **TypeScript**, y la navegación sigue **Expo Router** (rutas bajo `app/`). **Python** no es la interfaz principal de la app móvil; si el equipo usa scripts en Python, son **herramientas opcionales** externas (análisis o prototipos), no una capa obligatoria del producto descrito aquí.

---

## Estado actual

- **Prototipo académico** en evolución activa; **no sustituye** criterio clínico ni atención profesional (véase [Aviso académico](#aviso-académico)). **No** se declara aquí validación clínica del sistema como producto sanitario.
- **Baseline de equipo:** la versión de código acordada como referencia oficial del equipo está en **GitHub**; úsala como punto de partida para contribuciones y revisiones.
- **Expo**, **React Native** y **TypeScript**, con rutas basadas en **Expo Router**.
- **iPhone durante desarrollo**: compatible mediante **Expo Go** y el flujo estándar de `expo start`.
- **Web / PWA**: objetivo razonable de despliegue; la app incluye ajustes de experiencia (p. ej. splash) pensados también para web.
- **Nube, usuarios y base de datos:** la app incluye integración con **Supabase** y flujos de sesión e historial en modo **prototipo**. El trabajo con **hardware en red local** (ESP32) debe mantenerse **conceptual y técnicamente separado** de ese modo online hasta que el flujo de sensor esté estabilizado y acordado con el equipo.
- **Hardware ESP32 (validado en laboratorio de desarrollo):** el firmware en un **ESP32-WROOM-32** programado desde **Arduino IDE** puede operar como **punto de acceso WiFi** `RESPIRA_ESP32`, con IP **`192.168.4.1`**, página de diagnóstico en **`http://192.168.4.1`** y **WebSocket** en **`ws://192.168.4.1:81`**. El sensor **GY-530 (VL53L0X)** ha sido comprobado por **I2C** en la dirección **`0x29`**. El firmware envía por WebSocket mensajes JSON con al menos: `source`, `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp`. La app **RESPIRA+** ya ha podido conectarse desde las rutas de prueba documentadas abajo y muestra una **barra visual provisional** basada en `distanceMm` (no volumen clínico estimado ni un campo `estimatedVolumeMl` en el contrato actual).
- **Supabase:** integrado en **modo prototipo** para base de datos y desarrollo colaborativo. **No** está documentado ni garantizado como listo para producción. Ver [Notas de seguridad y privacidad](#notas-de-seguridad-y-privacidad) y [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md).

---

## Modos previstos (visión de producto)

El equipo distingue dos líneas de uso; la nomenclatura y el conmutador global de producto para el segundo **aún están por formalizar** en la UX y en la documentación interna.

| Modo | Descripción |
|------|-------------|
| **online** | Flujo principal con identidad, consentimiento, terapia, historial y persistencia en **Supabase** (y resto de integraciones en evolución), según las pantallas y políticas del repo. |
| **offline_sensor_test** | Enfoque centrado en **prueba de hardware** y visualización local, **sin** mezclar de forma prematura calibraciones experimentales ni telemetría del sensor con el historial clínico en nube. Hoy existe una **bandera de entorno** `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` (véase [Variables de entorno](#variables-de-entorno-supabase-y-hardware)) que habilita piezas de prueba en desarrollo; el **modo offline global** unificado bajo este nombre **no** está todavía cerrado como producto. |

**Calibraciones:** cualquier calibración experimental del sensor debe tratarse como **local y provisional**. **No** debe enviarse a la nube ni mezclarse con datos de sesión clínica hasta criterio explícito del equipo y diseño revisado.

---

## Hardware ESP32 (referencia validada en el equipo)

| Elemento | Valor o nota |
|----------|----------------|
| Placa programada | **ESP32-WROOM-32** (Arduino IDE) |
| Modo WiFi | **Access Point**, SSID **`RESPIRA_ESP32`** |
| IP del AP | **`192.168.4.1`** |
| Diagnóstico HTTP | **`http://192.168.4.1`** |
| WebSocket | **`ws://192.168.4.1:81`** |
| Sensor | **GY-530 VL53L0X** |
| Dirección I2C | **`0x29`** |
| Payload WebSocket (campos ya vistos en firmware) | `source`, `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp` |

Los **códigos Arduino** que acompañan al firmware de referencia forman **parte del repositorio** y deben conservarse; **no** se consideran archivos prescindibles. Ver [Código Arduino en el repositorio](#código-arduino-en-el-repositorio).

---

## Rutas de prueba de hardware (Expo Router)

- **`/esp32-raw-test`** — Prueba **mínima de respaldo** para validar conectividad WebSocket y mensajes crudos frente al ESP32, sin el resto del flujo de la pantalla integrada.
- **`/sensor-connection`** — Pantalla **integrada** de conexión, estado y **visualización** (incluye preview en vivo con barra basada en `distanceMm` de forma **provisional**).

Ambas rutas han sido usadas en desarrollo para conectar la app al ESP32 en la configuración AP descrita arriba.

---

## Código Arduino en el repositorio

| Ruta | Rol |
|------|-----|
| `RESPIRA_WebSocket/RESPIRA_WebSocket.ino` | Sketch de firmware de referencia para ESP32 (WebSocket, sensor, etc., según el propio archivo). |
| `arduino_codes/respira_ws_test.html` | Página local de apoyo / diagnóstico para pruebas en navegador contra el mismo esquema de red. |

Mantener estos artefactos versionados facilita reproducibilidad y revisiones entre firmware y app.

---

## Funcionalidades actuales

- **Consentimiento digital** y documentación legal asociada.
- **Bloqueo** de Terapia, Historial y rutas sensibles (p. ej. sensor) si **no** hay consentimiento activo.
- **Perfil** con **avatar** por paciente.
- **Inicio** tipo dashboard.
- **Barra inferior** de navegación plana (tabs).
- **Niveles de terapia** con identidad visual y **colores motivacionales**.
- **Sesión guiada** con la **barra inferior oculta** durante el juego.
- Flujo **PAUSAR**, **Continuar sesión** y **Guardar avance y salir**.
- **Reentrada** a sesión con **`sessionRunId`** para evitar estados incoherentes.
- **Resumen** al cerrar o completar sesión.
- **Historial** de actividad y adherencia.
- **Exportación manual** de datos de sesiones en **CSV** y **JSON**.
- **Recordatorios locales** de terapia (notificaciones).
- **Splash nativo** y **splash web/PWA** con logo de la marca.
- **Conexión real al ESP32** por WebSocket desde las rutas de prueba anteriores, con visualización provisional de distancia.
- **Supabase** en configuración de **prototipo** (ver nota de seguridad).

---

## Stack técnico

| Tecnología | Uso |
|------------|-----|
| **Expo** | Toolchain y runtime del proyecto. |
| **React Native** | UI multiplataforma. |
| **TypeScript** | Tipado en código de aplicación. |
| **Expo Router** | Navegación basada en archivos bajo `app/`. |
| **AsyncStorage** | Persistencia local (p. ej. preferencias y rutas híbridas cuando Supabase no aplica). |
| **Supabase** | Backend de datos en modo prototipo (`@supabase/supabase-js`). |
| **expo-notifications** | Recordatorios locales. |
| **expo-image-picker** | Selección de imágenes (p. ej. avatar). |
| **expo-file-system** | Operaciones de archivos en exportación/descargas. |
| **expo-sharing** | Compartir archivos exportados cuando la plataforma lo permite. |
| **expo-splash-screen** | Control del splash nativo. |
| **expo-linear-gradient** | Gradientes en UI. |
| **@expo-google-fonts/inter** | Tipografía Inter. |

La lista detallada de versiones está en `package.json` (no modificar desde la documentación).

---

## Instalación

```bash
npm install
npx expo start -c
```

El flag `-c` limpia la caché de Metro; es útil tras actualizar dependencias o cuando el bundler se comporta de forma inconsistente.

Atajos habituales del proyecto (según `package.json`):

- `npm run android` — abre en Android.
- `npm run ios` — abre en iOS.
- `npm run web` — abre en navegador.
- `npm run lint` — ESLint vía Expo.

Si el puerto **8081** está ocupado, cierra otras instancias de Metro/Expo o acepta otro puerto cuando la CLI lo ofrezca.

---

## Dependencias importantes

Tras un `git pull`, en la mayoría de los casos basta con:

```bash
npm install
```

**No ejecutes** `npm audit fix --force` de forma automática: puede subir paquetes a versiones **incompatibles** con el **SDK de Expo** fijado en el proyecto y dejar el entorno en un estado difícil de reproducir. Si aparecen avisos de auditoría, consúltalos con el equipo antes de forzar cambios mayores.

---

## Variables de entorno (Supabase y hardware)

Para activar el cliente de Supabase en desarrollo se utilizan variables públicas de Expo (nombres solamente; **sin** pegar valores reales en documentación ni en chats públicos):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Para pruebas de hardware en desarrollo (no sustituye el modo producto **offline_sensor_test** formalizado):

- `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` — con valor `true` activa el camino de prueba offline del sensor descrito en el código; el valor por defecto en `.env.example` es `false`.

Copia `.env.example` a **`.env`** en tu máquina y completa con los valores que el equipo comparta por un canal seguro. Los placeholders en `.env.example` tienen la forma `https://YOUR_PROJECT.supabase.co` y `YOUR_SUPABASE_ANON_KEY`.

**El archivo `.env` no debe subirse a Git** (debe permanecer fuera del control de versiones; el repo solo documenta el ejemplo).

**Seguridad y prototipo:** lee [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md) antes de asumir que la configuración actual es apta para datos reales o para publicación.

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm install` | Instala dependencias. |
| `npx expo start -c` | Inicia el bundler con caché limpia. |
| `npx tsc --noEmit` | Comprobación de tipos sin emitir JS. |
| `npx expo lint` | ESLint configurado para el proyecto. |
| `git status` | Estado del árbol de trabajo. |
| `git pull origin master` | Actualiza la rama local desde remoto (ajusta el nombre de rama si tu flujo usa otro default). |

---

## Flujo recomendado para el equipo

1. `git checkout master` (o la rama acordada como base).
2. `git pull origin master`
3. `npm install`
4. `npx expo start -c`

Buenas prácticas:

- **No** uses `git push --force` en ramas compartidas sin consenso explícito.
- **No** uses `git reset --hard` sin avisar si puede afectar el trabajo de otras personas.
- Para cambios grandes o experimentales, trabaja en **ramas de feature** y abre revisiones (PR) antes de integrar a la rama principal.

Convención de prefijos sugerida: `feat/`, `fix/`, `chore/`, `docs/`.

---

## Estructura del proyecto

| Ruta | Contenido |
|------|-----------|
| `app/` | Rutas Expo Router: stacks, tabs y pantallas que reexportan módulos en `src/`. |
| `src/modules/` | Dominio por áreas: auth, legal, patient, levels, session, history, export, notifications, **device** (sensor / WebSocket), etc. |
| `src/modules/device/` | Módulo de dispositivo: cliente WebSocket, ingestión, adaptadores, mocks, componentes y pantallas. Ver [`src/modules/device/README.md`](src/modules/device/README.md). |
| `src/shared/` | UI reutilizable, tema parcial, utilidades y piezas transversales. |
| `src/theme/` | Tokens y temas de pantalla (p. ej. dashboards, niveles). |
| `assets/` | Imágenes, fuentes y recursos estáticos. |
| `docs/` | Documentación en raíz del repo (p. ej. notas de Supabase). |
| `supabase/` | Artefactos de esquema SQL de referencia para el proyecto Supabase. |
| `RESPIRA_WebSocket/` | Firmware Arduino de referencia para ESP32. |
| `arduino_codes/` | Recursos HTML/Arduino auxiliares para pruebas. |

Documentación histórica o de arquitectura adicional puede vivir en **`src/docs/`** (p. ej. `architecture.md`, `team-ownership.md`). El alias de imports `@/` apunta a la **raíz** del repositorio.

---

## Notas de seguridad y privacidad

RESPIRA+ maneja flujos que, en un despliegue real, pueden implicar **datos personales o sensibles**. La integración actual con **Supabase** está pensada para **prototipo y desarrollo colaborativo**, con riesgos conocidos si se copia tal cual a producción (p. ej. políticas RLS permisivas, variables en repositorio, consultas sin filtrado estricto en servidor).

**Lectura obligatoria antes de publicar o usar datos reales:** [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md).

---

## Roadmap por fases (orientativo)

1. **Fase actual — Baseline y hardware de desarrollo:** firmware ESP32 en repo, AP y WebSocket documentados, app conectando desde `/esp32-raw-test` y `/sensor-connection`, barra provisional con `distanceMm`; módulo `device` acotado del resto de dominio clínico en nube.
2. **Estabilización del sensor:** repetibilidad, manejo de errores de red, UX de conexión y criterios de calidad de señal; seguir sin subir calibraciones experimentales a Supabase hasta acuerdo explícito.
3. **Formalizar modo offline_sensor_test:** conmutación clara respecto a **online**, documentación de usuario y pruebas; sin afirmar hoy un producto cerrado en este punto.
4. **Integración con sesión e historial:** solo cuando el sensor y cualquier calibración estén definidos con criterios de equipo; volumen clínico u otros estimadores deben introducirse con diseño explícito (no se documenta aquí un campo `estimatedVolumeMl` ni una ruta `sensor-calibration` como existentes).
5. **Endurecer Supabase** (RLS, secretos, consultas) antes de cualquier entorno que trate datos reales de pacientes.
6. **Evaluaciones técnicas y de usabilidad** en entornos controlados; **no** confundir con validación clínica del sistema como dispositivo médico.

---

## Aviso académico

**RESPIRA+** es un **prototipo académico** de apoyo al ejercicio respiratorio. **No sustituye** la valoración médica, el diagnóstico profesional, el tratamiento prescrito ni la atención de urgencias. Ante síntomas graves o dudas clínicas, el usuario debe acudir a los servicios de salud correspondientes.

---

## Documentación adicional

- [Notas de seguridad Supabase (modo prototipo)](docs/supabase-security-notes.md)
- [Arquitectura técnica](src/docs/architecture.md)
- [Reparto de módulos en el equipo](src/docs/team-ownership.md)
- [Módulo device (sensor / WebSocket)](src/modules/device/README.md)

## Script `reset-project`

El script `npm run reset-project` proviene del template de Expo. **No lo ejecutes** sin leer `scripts/reset-project.js`: puede alterar o mover rutas según las confirmaciones en consola.
