# RESPIRA+

Aplicación de apoyo para **ejercicios respiratorios con espirómetro incentivador**, orientada al **seguimiento de sesiones**, la **adherencia**, el **biofeedback** y el **registro de progreso** en contextos de rehabilitación (p. ej. adultos en proceso postoperatorio). RESPIRA+ organiza el flujo del paciente desde el acceso y el consentimiento hasta la terapia por niveles, el historial y la exportación de datos.

---

## Estado actual

- **Prototipo académico** en evolución activa; no sustituye criterio clínico ni atención profesional (véase [Aviso académico](#aviso-académico)).
- **Expo**, **React Native** y **TypeScript**, con rutas basadas en **Expo Router**.
- **iPhone durante desarrollo**: compatible mediante **Expo Go** y el flujo estándar de `expo start`.
- **Web / PWA**: objetivo razonable de despliegue; la app incluye ajustes de experiencia (p. ej. splash) pensados también para web.
- **Sensor**: la línea prevista para el hardware es **ESP32** comunicándose por **WiFi** y **WebSocket** (no Bluetooth como estrategia principal actual). La integración completa con el dispositivo final puede estar en **pruebas o planificación** según la rama y el momento del repo; no se asume aquí que el sensor de producción ya está conectado de forma definitiva.
- **Supabase**: integrado en **modo prototipo** para base de datos, persistencia y sincronización en desarrollo colaborativo. **No** está documentado ni garantizado como listo para producción. Ver [Notas de seguridad y privacidad](#notas-de-seguridad-y-privacidad) y [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md).

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

## Variables de entorno (Supabase)

Para activar el cliente de Supabase en desarrollo se utilizan variables públicas de Expo (nombres solamente; **sin** pegar valores reales en documentación ni en chats públicos):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Copia `.env.example` a `.env` en tu máquina y completa con los valores que el equipo comparta por un canal seguro. Los placeholders en `.env.example` tienen la forma `https://YOUR_PROJECT.supabase.co` y `YOUR_SUPABASE_ANON_KEY`.

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
| `src/modules/` | Dominio por áreas: auth, legal, patient, levels, session, history, export, notifications, device, etc. |
| `src/shared/` | UI reutilizable, tema parcial, utilidades y piezas transversales. |
| `src/theme/` | Tokens y temas de pantalla (p. ej. dashboards, niveles). |
| `assets/` | Imágenes, fuentes y recursos estáticos. |
| `docs/` | Documentación en raíz del repo (p. ej. notas de Supabase). |
| `supabase/` | Artefactos de esquema SQL de referencia para el proyecto Supabase. |

Documentación histórica o de arquitectura adicional puede vivir en **`src/docs/`** (p. ej. `architecture.md`, `team-ownership.md`). El alias de imports `@/` apunta a la **raíz** del repositorio.

---

## Notas de seguridad y privacidad

RESPIRA+ maneja flujos que, en un despliegue real, pueden implicar **datos personales o sensibles**. La integración actual con **Supabase** está pensada para **prototipo y desarrollo colaborativo**, con riesgos conocidos si se copia tal cual a producción (p. ej. políticas RLS permisivas, variables en repositorio, consultas sin filtrado estricto en servidor).

**Lectura obligatoria antes de publicar o usar datos reales:** [`docs/supabase-security-notes.md`](docs/supabase-security-notes.md).

---

## Roadmap próximo (orientativo)

- Unificar visualmente pantallas secundarias para una experiencia más cohesiva.
- Mejorar el **biofeedback** y la claridad del juego durante la sesión.
- Preparar **PWA** o enlace compartible estable para demos web.
- **Conectar ESP32** por **WiFi / WebSocket** de forma robusta y documentada.
- **Endurecer Supabase** (RLS, secretos, consultas) antes de cualquier producción.
- **Validación técnica y clínica** en entornos controlados.

---

## Estado del sensor (hardware)

El diseño previsto concentra la comunicación del **espirómetro incentivador** o módulo asociado en un **ESP32** accesible por **red local (WiFi)** y un canal **WebSocket**, no en Bluetooth como eje principal de la app en este repositorio.

**Python** no es la interfaz principal de la app actual (Expo / React Native). Si el equipo usa scripts en Python, puede ser como **herramienta opcional** de análisis o prototipos externos, no como capa obligatoria del producto móvil descrito aquí.

---

## Aviso académico

**RESPIRA+** es un **prototipo académico** de apoyo al ejercicio respiratorio. **No sustituye** la valoración médica, el diagnóstico profesional, el tratamiento prescrito ni la atención de urgencias. Ante síntomas graves o dudas clínicas, el usuario debe acudir a los servicios de salud correspondientes.

---

## Documentación adicional

- [Notas de seguridad Supabase (modo prototipo)](docs/supabase-security-notes.md)
- [Arquitectura técnica](src/docs/architecture.md)
- [Reparto de módulos en el equipo](src/docs/team-ownership.md)

## Script `reset-project`

El script `npm run reset-project` proviene del template de Expo. **No lo ejecutes** sin leer `scripts/reset-project.js`: puede alterar o mover rutas según las confirmaciones en consola.
