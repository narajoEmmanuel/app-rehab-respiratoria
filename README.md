# Rehab respiratoria (app móvil)

Aplicación móvil para **rehabilitación pulmonar domiciliaria**, orientada a **adultos postoperatorios** que usan **espirómetro incentivador**. El flujo previsto incluye autenticación, inicio, selección de nivel, sesión terapéutica, resumen, historial, calendario y plan semanal. Los minijuegos finales aún no están definidos; el identificador `rocket-experimental` en el registro de niveles es solo un marcador de prueba futura, no el producto final obligatorio.

## Stack tecnológico

- [Expo](https://expo.dev/) SDK ~54
- [Expo Router](https://docs.expo.dev/router/introduction/) (rutas basadas en archivos)
- React 19 / React Native 0.81
- TypeScript
- ESLint (`expo lint`)

No se añadieron librerías extra en la migración modular; las dependencias coinciden con `package.json`.

## Cómo correrlo en local

```bash
npm install
npm run start
```

Atajos útiles:

- `npm run android` — inicia con Android
- `npm run ios` — inicia con iOS
- `npm run web` — inicia con web
- `npm run lint` — ESLint

Si el puerto **8081** está ocupado, cierra el otro proceso de Metro/Expo o elige otro puerto cuando la CLI lo pregunte.

## Estructura de carpetas (resumen)

```
app/                 # Solo capa de rutas (Expo Router)
  _layout.tsx
  auth/login.tsx, auth/registro.tsx
  (tabs)/            # Tabs: inicio, niveles, sesión, resumen, historial, calendario, plan-semanal

src/
  modules/           # Dominio por área (auth, home, levels, session, …)
  shared/            # UI, tema, utils, tipos compartidos
  data/              # Mocks y storage (evolución)
  docs/              # Arquitectura y trabajo en equipo

assets/              # Imágenes y recursos estáticos
```

Imports recomendados: `@/src/modules/...`, `@/src/shared/...`, `@/assets/...`. El alias `@/*` apunta a la **raíz** del repo (no a `src/` sola).

## Flujo principal de la app (paciente)

1. **Auth** (rutas stack): login y registro (`app/auth/*` → pantallas en `src/modules/auth`).
2. **Tabs**: inicio → niveles → sesión → resumen → historial → calendario → plan semanal.
3. **Sesión**: configuración por **nivel** (dificultad) y **tipo de juego visual** separados; registro central en `src/modules/session/registry`.

## Flujo de datos: dispositivo → reportes (diseño)

Objetivo para cuando exista hardware:

1. **WebSocket** sobre **WiFi local** recibe mensajes en tiempo real (`device/websocket`).
2. **Ingestión** normaliza a modelos internos (`device/ingestion`).
3. **Adaptadores** mapean protocolo concreto, p. ej. ESP32 (`device/adapters`).
4. **Mocks** permiten desarrollo sin hardware (`device/mocks`).
5. **Sesión** consume señal ya normalizada (sin acoplar UI al protocolo).
6. **Resumen / historial** guardan o muestran resultados agregados.
7. **Clínico** genera métricas, informes y exportación sin depender del componente visual del juego.

Detalle técnico: [src/docs/architecture.md](src/docs/architecture.md).

## Cómo trabajar en equipo

- Cada persona **prioriza su carpeta** de la tabla en [src/docs/team-ownership.md](src/docs/team-ownership.md).
- Cambios en **`src/shared/`** afectan a todos: conviene PR pequeño y aviso en el canal del equipo.
- **`app/`**: cambios coordinados (nombres de rutas, orden de tabs).

## Convención de ramas (sugerida)

| Prefijo | Uso |
|---------|-----|
| `feat/` | Nueva funcionalidad (`feat/session-timer`) |
| `fix/` | Corrección de bug |
| `chore/` | Herramientas, config, refactor sin cambio de producto |
| `docs/` | Solo documentación |

Opcional: sufijo con área (`feat/plans-calendario`).

## Qué hace cada módulo (`src/modules`)

| Módulo | Rol |
|--------|-----|
| `auth` | Login y registro (estructura ligera hasta backend). |
| `home` | Pantalla de inicio del paciente. |
| `levels` | Selección de nivel de dificultad (UI base). |
| `session` | Sesión: core, juegos visuales, niveles, registro, pantalla. |
| `summary` | Resumen post-sesión. |
| `history` | Historial de actividad o sesiones. |
| `plans` | Calendario y plan semanal (simple en esta fase). |
| `patient` | Perfil y datos del paciente (reservado). |
| `device` | WebSocket (WiFi local), ingestión, adaptadores, mocks. |
| `clinician` | Dashboard, informes y exportación futuros. |

README específicos: `session`, `device`, `clinician` dentro de cada carpeta.

## Carpetas compartidas vs “tuyas”

- **Compartidas (cuidado):** `src/shared/`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`.
- **Por feature:** la carpeta del módulo que te asignen (`src/modules/session`, etc.).
- **Solo rutas:** archivos bajo `app/` que reexportan una pantalla desde `src/modules`.

## Script `reset-project`

El script `npm run reset-project` viene del template de Expo y asume carpetas antiguas en la raíz. Este repo ya migró UI y tema a `src/shared/`. **No lo uses** para “resetear” sin leer `scripts/reset-project.js`: podría mover o borrar `app/` según confirmes en consola.

## Documentación adicional

- [Arquitectura técnica](src/docs/architecture.md)
- [Reparto de módulos en el equipo](src/docs/team-ownership.md)
