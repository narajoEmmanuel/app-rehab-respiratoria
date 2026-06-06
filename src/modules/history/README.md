# Módulo `history` (Historial)

Vista de **progreso motivacional**: calendario, rachas, agregados por día y detalle de sesiones. No sustituye informe clínico. Los volúmenes mostrados son **estimaciones** del sensor cuando la sesión es terapéutica con sensor.

---

## Propósito

- Pantalla **Historial** (`HistoryScreen`).
- Agregaciones puras en `history-aggregates.ts`.
- Utilidad de racha de sesiones exitosas (`session-success-streak.ts`), reutilizada también en resumen.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Pantalla | `screens/HistoryScreen.tsx` |
| Agregados | `services/history-aggregates.ts` |
| Racha exitosa | `utils/session-success-streak.ts` |

**Ruta:** `app/(tabs)/historial.tsx` → `HistoryScreen` (con `ConsentTabGuard`).

**Nota:** La evaluación inicial **no** es requisito para ver Historial (comentario en cabecera de pantalla).

---

## HistoryScreen

- Calendario mensual con codificación por tipo de día.
- Hero de racha (días consecutivos con actividad terapéutica).
- Métricas globales (volumen máx. estimado con sensor, repeticiones, etc.).
- Modal de detalle por día seleccionado.
- Enlace a exportación y debug de sensor solo si flags dev activos.

Tipografía: `AppText` (Fase 4N).

---

## history-aggregates

Funciones puras sobre `SessionRecord` + `AttemptRecord`:

| Función / constante | Uso |
|---------------------|-----|
| `LEVEL1_DAILY_GOAL` (= 6) | Meta visual diaria alineada con unlock |
| `groupSessionsByDay`, `buildDayAggregate` | Resumen por día |
| `classifyCalendarDay` | Color del calendario (`perfect`, `good`, `incomplete`, `interrupted`, `none`) |
| `therapeuticActivityDayKeys` / `practiceActivityDayKeys` | Separación sensor vs práctica |
| `computeStreakDays` | Racha de días con actividad |
| `globalMaxSensorVolumeMlForPatient` | Máximo volumen estimado con sensor |

Días con solo **práctica táctil** usan color distinto (`CAL_BG_PRACTICE` — «Práctica (sin sensor)»).

---

## session-success-streak

`computeSuccessfulSessionStreak` — solo lectura, sin persistir:

- Cuenta sesiones **terapéuticas oficiales** (`isTherapeuticSessionRecord`).
- Exitosas = completadas, perfectas, no interrumpidas.
- Usado en `SummaryScreen` vía `SessionSuccessStreakCard`.

La práctica táctil **no** alimenta la racha de sesiones exitosas.

---

## Calendario y rachas

- Leyenda: Completada, Parcial, Sin actividad, Incompleta, Interrumpida, Práctica (sin sensor).
- Racha en UI: gradiente según días activos consecutivos.
- Mascota `RespiraBunnyImage` en bloque hero de racha.

---

## Práctica táctil vs sesión oficial

Clasificación vía `session-record-classification.ts`:

- **Terapéutica con sensor** — métricas de volumen estimado en agregados.
- **Práctica** — etiqueta separada en calendario; no mezclar con adherencia clínica oficial.

---

## Volumen estimado

Labels en UI y agregados usan volumen del modelo de sensor (`max_sensor_estimated_volume_ml`, picos de intentos). No se presenta como presión ni medición hospitalaria.

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Incluir práctica en racha terapéutica | Motivación inflada / datos engañosos |
| Cambiar `LEVEL1_DAILY_GOAL` sin alinear Terapia | Meta diaria inconsistente |
| Tratar calendario como diagnóstico | Expectativa clínica incorrecta |
| Pantalla monolítica (~1800 líneas) | Regresiones difíciles de revisar |

---

## Referencias

- [Pestaña Historial](../../../docs/02-tabs/historial.md)
- [Clasificación de sesiones](../../../src/modules/session/session-record-classification.ts)
- [Resumen post-sesión](../summary/README.md)
- Tipografía: [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)
