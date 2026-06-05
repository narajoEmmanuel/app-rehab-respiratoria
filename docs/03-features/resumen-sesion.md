# Resumen de sesión

## Propósito

Mostrar resultados inmediatos post-sesión: métricas, clasificación sensor/práctica, racha y acciones (repetir, inicio, terapia).

## Archivos principales

| Rol | Ruta |
|-----|------|
| Ruta | `app/(tabs)/resumen.tsx` |
| Pantalla | `src/modules/summary/screens/SummaryScreen.tsx` |
| Componentes | `src/modules/summary/components/SessionSummaryHero.tsx`, `SessionSummaryMetricsGrid.tsx`, `SessionSummaryProgressCard.tsx`, `SessionSummaryActions.tsx` |
| Streak | `src/modules/session/patient-ui/SessionSuccessStreakCard.tsx` |
| Clasificación | `src/modules/session/session-record-classification.ts` |
| Carga datos | `session-progress-service.ts` (`getSessionDetail`) |

## Rutas relacionadas

`/(tabs)/resumen?sessionId=` — tab oculta.

## Entradas del flujo

- Fin de `SessionScreen` con `sessionId` guardado.

## Salidas del flujo

- Navegación a `/(tabs)/terapia`, `/(tabs)/index`, o repetir sesión.

## Datos persistidos

Solo lectura de sesión/intentos ya guardados. No escribe nuevos registros clínicos.

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Paciente | Filtra sesión por paciente activo |
| Consent | Acceso vía flujo post-sesión (sin tab directo) |
| Sensor/práctica | Copy distinto vía `sessionClassificationMainTitle` |

## Riesgos clínicos o técnicos

- Hero metrics deben decir **volumen estimado**, no diagnóstico.
- `SessionEstimatedVolumeCard` oculto en touch — coherente con no prometer medición sensor.

## Pendientes

- README módulo `summary/` no existe.
- `SessionSuccessStreakCard` (módulo `session/`) aún sin migrar a `AppText`.

## Checklist manual mínimo

- [ ] Tipografía Fase 4D: hero, progreso y estados vacío/error legibles con `AppText`.
- [ ] Tiles de volumen muestran “estimado” en etiqueta.
- [ ] Tras sesión sensor: métricas y clasificación “Sesión completada”.
- [ ] Tras touch: copy “Modo práctica”.
- [ ] sessionId inválido: manejo de error/empty.
- [ ] Acciones navegan correctamente.

## Docs relacionados

- [Sesión terapia](./sesion-terapia.md)
- [Historial](../02-tabs/historial.md)
