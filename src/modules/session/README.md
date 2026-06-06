# Módulo `session` (terapia y sesión)

Orquesta la **sesión guiada**, el motor del nivel 1, la **validación de intentos** (sensor o práctica táctil) y la persistencia local de sesiones e intentos.

---

## Carpetas

| Carpeta | Rol |
|---------|-----|
| `screens/` | `SessionScreen` — entrada de sesión por nivel |
| `engine/` | `use-level-one-game`, `use-touch-input-adapter` |
| `games/` | UI del minijuego (`LevelOneGameView`, hints de volumen) |
| `sensor-evaluation/` | Evaluación y validación oficial de intentos con sensor |
| `storage/` | Repositorio AsyncStorage de sesiones e intentos |
| `types/` | `SessionRecord`, `AttemptRecord`, resultados |
| `registry/` | Catálogo de niveles |
| `levels/` | Dificultad y metadatos por nivel |
| `utils/` | Estadísticas del día, agregados ligeros |

Archivos transversales:

- `session-input-mode.ts` — `sensor` vs `touch_practice` y flag de entorno.
- `session-record-classification.ts` — etiquetas Sensor / Práctica / Sin clasificar e campos de exportación.

---

## Modos de entrada

| Modo | Activación | Persistencia |
|------|------------|--------------|
| **Sensor** | Terapia tras compuerta OK | `input_mode: sensor`, `data_source: sensor_model` |
| **Práctica táctil** | `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true` + acción en alerta | `touch_practice`, `is_practice_session: true` |

La validación conservadora con sensor exige, entre otros criterios, **`lowerBoundMl >= target`** y tiempo sostenido configurado en el motor del nivel.

---

## Reglas

1. **No** abrir WebSocket desde session; usar `useActiveVolumeEstimate` y `useSensorConnection`.
2. **No** mezclar métricas de práctica táctil con sesiones medidas por sensor en informes clínicos.
3. Sesiones **sin clasificar** son compatibilidad con registros antiguos (sin `input_mode`).

---

## Rutas

- `app/(tabs)/sesion.tsx` → `SessionScreen`
- `app/(tabs)/resumen.tsx` → resumen post-sesión
- Parámetros: `levelId`, `sessionRunId`, `inputMode`

---

## AsyncStorage relevante (Nivel 1)

| Clave | Contenido | ¿Historial oficial? |
|-------|-----------|---------------------|
| `rehab.levels.progress.v1.u{patientId}` | Progreso de niveles: sesión/rep actual, válidas/fallidas por slot, `interrupted` | Progreso terapéutico del nivel (no borrar al limpiar partida) |
| `rehab.levels.level_one_active_run.v1.u{patientId}` | Marca efímera: `sessionRunId`, `levelId`, `inputMode` | No — se borra al salir limpio; si queda tras cierre abrupto, al abrir la app se descarta el slot a medias |
| `@rehab/sessions_v1` / `@rehab/attempts_v1` | Historial de sesiones e intentos guardados | Sí — no se tocan al reiniciar partida |

**No se persiste en disco:** `phase`, countdown, `holdMs` del motor (solo memoria; se reinicia con `engineScopeKey` y `stopSession`).

**Limpieza de partida en curso:** `prepareFreshLevelOneSessionRun` / `discardInProgressLevelOneRun` (slot actual a cero). Al reentrar con nuevo `sessionRunId`, al abandonar sin marcar slot interrumpido, o al reabrir la app si quedó `level_one_active_run`.

---

## Tipografía (excepción HUD)

Sesión activa y componentes de juego (`LevelOneGameView`, `RunnerGameFeedbackBar`, intro, coach, celebraciones) usan **`Text` nativo** con estilos locales — no `AppText`. Motivo: pesos 800/900 del HUD y celdas compactas; migración Fase 4O revertida por regresión visual. Detalle: [docs/07-ui-design-system/typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md).

Copy volumen en HUD: «Volumen» / abreviaciones; en modal de resumen de sesión: «Vol. máx. / prom. estimado».

---

## Estado

Nivel 1 con juego visual y validación por sensor implementados. Niveles 2–5 en catálogo con bloqueo progresivo (`comingSoon` / diagnóstico).
