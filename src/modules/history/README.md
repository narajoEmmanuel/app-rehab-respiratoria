# Módulo `history` (Historial)

## Propósito

Ofrece una vista de **progreso motivacional y seguimiento de adherencia**: calendario mensual, rachas de días activos, agregados por día y detalle de sesiones. Los volúmenes mostrados son **estimaciones** del sensor cuando la sesión es terapéutica con sensor. **No sustituye un informe clínico** ni un expediente médico.

RESPIRA+ es un **prototipo académico** para apoyo en **pacientes adultos postoperatorios** (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

El historial complementa la terapia gamificada (`session/`) y el resumen inmediato (`summary/`). El paciente revisa adherencia visual; el profesional puede obtener un paquete estructurado vía **exportación** (`export/`), no mediante un dashboard clínico terminado (`clinician/` scaffold).

| Métrica en UI | Interpretación |
|---------------|----------------|
| Racha de días | Actividad terapéutica con sensor (práctica táctil excluida de racha de sesiones exitosas) |
| Calendario | Clasificación por día: completada, parcial, interrumpida, práctica sin sensor |
| Progreso respiratorio | Referencias VIM, sostén y adherencia — seguimiento, no diagnóstico |
| Export card | Atajo a `/data-export` para revisión profesional |

La evaluación inicial **no** es requisito para ver Historial (comentario en cabecera de pantalla).

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Pantalla (orquestación) | `screens/HistoryScreen.tsx` |
| Agregados | `services/history-aggregates.ts` |
| Racha exitosa | `utils/session-success-streak.ts` |
| Estados loading / sin paciente | `components/HistoryLoadingState.tsx`, `HistoryNoPatientState.tsx` |
| Header | `components/HistoryPageHeader.tsx` |
| Hero racha | `components/HistoryStreakHeroCard.tsx` |
| Tarjetas métricas | `components/HistoryStatMiniCard.tsx` |
| Progreso respiratorio | `components/HistoryRespiratoryProgressCard.tsx`, `HistoryMetricProgressRow.tsx` |
| Calendario | `components/HistoryCalendarCard.tsx`, `HistoryCalendarLegend.tsx` |
| Última sesión / vacío | `components/HistoryLastSessionCard.tsx`, `HistoryEmptySessionsCard.tsx` |
| Logros | `components/HistoryAchievementsSection.tsx`, `HistoryAchievementCompactCard.tsx` |
| Exportación | `components/HistoryExportCard.tsx` |
| Modal día | `components/HistoryDayDetailModal.tsx` |

**Ruta:** `app/(tabs)/historial.tsx` → `HistoryScreen` (con `ConsentTabGuard`).

---

## HistoryScreen — orquestación (Fase 5C)

`HistoryScreen` conserva carga, agregados, rachas, estado del modal y navegación. Los componentes en `components/` son **puramente presentacionales**.

### Lógica que permanece en HistoryScreen

- `load()`, `useFocusEffect`, lectura de `readAllSessions` / `readAllAttempts`.
- Agregados: `groupSessionsByDay`, `computeStreakDays`, `buildHistoryProgressAchievements`, `displayStats`.
- Estado: `viewYear` / `viewMonth`, `selectedDay`, `legendExpanded`.
- Handlers: `openDay`, `openLastSessionDay`, `shiftMonth`.
- Derivados: `streakDays`, `hasAnyHistory`, métricas VIM/sostén/adherencia, `progressAchievements`.

### Componentes extraídos — responsabilidades

| Componente | Renderiza | Props principales |
|------------|-----------|-------------------|
| `HistoryNoPatientState` | Sin paciente activo | — |
| `HistoryLoadingState` | Cargando | — |
| `HistoryPageHeader` | Título + chip mes actual | `monthChipLabel` |
| `HistoryStreakHeroCard` | Hero racha + Bunny | `streakDays`, `streakLost`, `dailyGoalMet` |
| `HistoryStatMiniCardsRow` | Fila de 3 mini cards | `streakMiniValue`, `weeklySessions`, `totalValidReps` |
| `HistoryRespiratoryProgressCard` | Card progreso respiratorio | métricas VIM, sostén, adherencia |
| `HistoryCalendarCard` | Calendario mensual + leyenda | celdas, `byDay`, callbacks navegación mes/día |
| `HistoryEmptySessionsCard` | Sin sesiones | `onStartFirstSession` |
| `HistoryLastSessionCard` | Resumen última sesión | `session`, `bestHoldSeconds`, `onViewDetail` |
| `HistoryAchievementsSection` | Grid de logros | `achievements` |
| `HistoryExportCard` | Exportación clínica | `hasAnyHistory`, `onExport` |
| `HistoryDayDetailModal` | Modal detalle día | `selectedDay`, `sensorDebug`, `onClose` |

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

## Límites del módulo

- No diagnostica ni prescribe ajustes terapéuticos.
- No reemplaza exportación formal para revisión profesional.
- Agregados motivacionales pueden diferir de criterios clínicos hospitalarios.

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Incluir práctica en racha terapéutica | Motivación inflada / datos engañosos |
| Cambiar `LEVEL1_DAILY_GOAL` sin alinear Terapia | Meta diaria inconsistente |
| Tratar calendario como diagnóstico | Expectativa clínica incorrecta |
| Pantalla monolítica | Fase 5C extrajo UI; agregados siguen en pantalla — no duplicar lógica en componentes |
| Mover `classifyCalendarDay` fuera de `HistoryCalendarCard` sin revisar colores | Drift visual del calendario |
| Alterar props de métricas sin revisar derivados en pantalla | Conteos o barras desincronizados |

---

## Documentación canónica

- [Pestaña Historial](../../../docs/02-tabs/historial.md)
- [Exportación](../../../docs/03-features/exportacion-datos.md) · [Módulo export](../export/README.md)
- [Clasificación de sesiones](../session/session-record-classification.ts)
- [Resumen post-sesión](../summary/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Validación académica](../../../docs/09-academic-validation/README.md)
- Tipografía: [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Exportación de datos — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/exportacion-datos.md`.
