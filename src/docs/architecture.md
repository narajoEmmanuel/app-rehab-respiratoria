# Arquitectura técnica

Este documento describe cómo está organizado el código y por qué, para que el equipo pueda extenderlo sin acoplar capas que deben evolucionar por separado.

## Principios

1. **`app/` solo enruta.** Los archivos bajo `app/` deben ser delgados: importan pantallas o layouts desde `src/modules` o `src/shared` y definen rutas de Expo Router.
2. **`src/` contiene el producto.** Dominio, UI reutilizable, datos locales y documentación viven aquí.
3. **Imports con prefijo explícito:** `@/src/...` y `@/assets/...`. El alias `@/*` sigue apuntando a la raíz del proyecto (no se redirige a `src/`).
4. **Separar dificultad de juego visual.** En sesión, la dificultad terapéutica y el identificador del minijuego visual son conceptos distintos; se enlazan por configuración, no se mezclan en un solo enum.
5. **Dispositivo y UI.** La integración Bluetooth / ESP32 debe concentrarse en `device`; la UI del paciente no debe parsear payloads crudos.
6. **Clínica y juego.** El módulo `clinician` debe consumir resultados normalizados (resumen, historial, informes), no montar componentes de minijuego.

## Capas y carpetas

| Área | Ruta | Responsabilidad |
|------|------|------------------|
| Rutas | `app/` | Stack, tabs, `auth/*`; sin lógica de negocio. |
| Módulos de producto | `src/modules/*` | Auth, home, niveles, planes, sesión, resumen, historial, paciente, dispositivo, clínico. |
| Compartido | `src/shared/*` | UI genérica, tema, utilidades, tipos comunes. |
| Datos | `src/data/*` | Mocks y almacenamiento local (evolución futura). |
| Documentación | `src/docs/*` | Arquitectura, ownership de equipo, notas técnicas. |

## Flujo de sesión y niveles

- **`session/levels`:** Define `LevelDifficulty`, `LevelDefinition` (metadatos + `gameVisualId`).
- **`session/games`:** Define `GameVisualId` y el contrato `VisualGameViewProps` para montar una vista de juego por id.
- **`session/registry`:** Lista central de niveles (`listLevels`, `getLevelById`). Añadir un nivel nuevo implica registrarlo aquí y, si aplica, crear la vista en `session/games` (futuro).
- **`session/core`:** Tipos de ciclo de vida de sesión y helpers mínimos; aquí crecerá el motor cuando existan reglas claras.
- **`session/screens`:** Punto de entrada UI del paciente para la sesión.

## Flujo dispositivo → informe (objetivo)

Estado actual: placeholders. Dirección prevista:

1. **Transporte:** `device/bluetooth` (conexión, estado).
2. **Ingestión:** `device/ingestion` (parseo, validación, normalización a series temporales o eventos).
3. **Adaptadores:** `device/adapters` (protocolo ESP32 u otros dispositivos).
4. **Mocks:** `device/mocks` para desarrollo sin hardware.
5. **Sesión:** consume señal ya normalizada (no acoplada al protocolo).
6. **Post-sesión:** `summary` / `history` persisten o exponen agregados.
7. **Clínico:** `clinician/reports` y `clinician/export` leen modelos de informe, no el motor del juego.

## Tema y UI compartida

- Tokens en `src/shared/theme/` (`colors`, `typography`, `spacing`, `radii`, `shadows`, `index`).
- Componentes de plantilla y utilidades en `src/shared/ui` y `src/shared/utils`.

## Convención de ramas (recomendada en equipo)

Documentada también en el README raíz y detallada en `team-ownership.md`. Resumen: prefijos `feat/`, `fix/`, `chore/`, `docs/` + área corta (`feat/session-niveles`).

## Referencias de módulos

- `src/modules/session/README.md`
- `src/modules/device/README.md`
- `src/modules/clinician/README.md`
