# Módulo `summary` (Resumen post-sesión)

## Propósito

Presenta el **resumen inmediato** tras completar o interrumpir una sesión de terapia gamificada. Carga la sesión persistida por `sessionId` y muestra métricas de **seguimiento y motivación**. Los volúmenes en mL son **estimaciones** cuando la sesión usó sensor oficial.

RESPIRA+ es un **prototipo académico** de apoyo en **pacientes adultos postoperatorios**; **no diagnostica** ni certifica resultados clínicos (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

```
SessionScreen → persistSessionResult → SummaryScreen → Terapia / Historial / Export (opcional)
```

| Elemento | Rol |
|----------|-----|
| Métricas de repeticiones | Adherencia a la sesión del día |
| Volumen máx./prom. estimado | Seguimiento funcional; no espirometría certificada |
| Racha de sesiones exitosas | Motivación; solo sesiones terapéuticas oficiales con sensor |
| Clasificación sensor/práctica | Alineación con historial y export v2.4.0 |

El profesional de salud puede revisar el mismo registro persistido vía **exportación**; este resumen es vista paciente, no informe médico.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Pantalla | `screens/SummaryScreen.tsx` |
| Hero | `components/SessionSummaryHero.tsx` |
| Métricas | `components/SessionSummaryMetricsGrid.tsx` |
| Progreso | `components/SessionSummaryProgressCard.tsx` |
| Acciones | `components/SessionSummaryActions.tsx` |

**Ruta:** `app/(tabs)/resumen.tsx` → `SummaryScreen` (tab oculta; parámetro `sessionId`).

**Dependencia UI:** `SessionSuccessStreakCard` en `session/patient-ui/` (Fase 4P — `AppText`).

---

## SummaryScreen

- Parámetro de ruta: `sessionId` (entero).
- Carga: `getSessionDetail(sessionId)` desde `session/session-progress-service.ts`.
- Estados vacío / ID inválido / no encontrado → CTA «Volver a Terapia».
- Clasificación de sesión: título y nota vía `sessionClassificationMainTitle` / `sessionClassificationSummaryNote`.
- Card de datos de sensor visible solo si `sessionSensorDataCardVisible(session)`.
- Bloque debug de volumen sensor si `isSensorDebugEnabled()`.

---

## Componentes y métricas

| Componente | Contenido |
|------------|-----------|
| `SessionSummaryHero` | Mascota (`RespiraBunnyImage`), título, chips de nivel y clasificación |
| `SessionSummaryProgressCard` | Progreso de repeticiones válidas vs `TARGET_ATTEMPTS` |
| `SessionSummaryMetricsGrid` | Repeticiones válidas / no completadas; **volumen máx. y prom. estimado**; tiempos máx./prom. sostenidos |
| `SessionSuccessStreakCard` | Racha actual (sesiones perfectas consecutivas con sensor) |
| `SessionSummaryActions` | «Volver a Terapia», «Ver Historial» |

---

## Volumen estimado

Grid usa labels «Volumen máx. estimado» y «Volumen prom. estimado» (mL). En sesiones de práctica táctil, la card de sensor puede ocultarse; no prometer paridad con espirometría clínica.

---

## Navegación post-sesión

Flujo típico desde `SessionScreen` / modales de juego → `/(tabs)/resumen?sessionId={id}`.

Acciones:

- `router.replace('/(tabs)/terapia')`
- `router.push('/(tabs)/historial')`

La sesión activa (HUD) en `session/` usa **`Text` nativo** — este resumen ya está en `AppText`.

---

## Relación con sesión persistida

Lee `@rehab/sessions_v1` y `@rehab/attempts_v1` indirectamente vía `getSessionDetail`. No muta registros; solo visualización.

Racha: `computeSuccessfulSessionStreak` sobre sesiones del mismo `patient_id`.

---

## Límites del módulo

- Solo lectura; no exporta ni sincroniza con cloud.
- No sustituye revisión profesional del paquete JSON/CSV.
- Práctica táctil no debe presentarse con la misma validez que sesión con sensor.

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Resumen sin `sessionId` en navegación desde juego | Pantalla vacía |
| Mostrar métricas de práctica como oficiales | Informe clínico engañoso |
| Omitir clasificación sensor/práctica | Export e historial desalineados |
| Cambiar labels de volumen sin «estimado» | Expectativa regulatoria incorrecta |

---

## Documentación canónica

- [Resumen de sesión (feature)](../../../docs/03-features/resumen-sesion.md)
- [Sesión y persistencia](../session/README.md)
- [Historial / rachas](../history/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- Tipografía: [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Resumen de sesión — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/resumen-sesion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.
