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

## Estado

Nivel 1 con juego visual y validación por sensor implementados. Niveles 2–5 en catálogo con bloqueo progresivo (`comingSoon` / diagnóstico).
