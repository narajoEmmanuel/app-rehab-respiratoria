# Historial

## Propósito

Vista motivacional del progreso: racha, calendario de días, logros y detalle por día; distingue sesiones sensor, práctica y sin clasificar. Incluye sección orientada a revisión con profesional.

## Archivos relacionados

| Tipo | Ruta |
|------|------|
| Ruta | `app/(tabs)/historial.tsx` (`ConsentTabGuard`) |
| Pantalla | `src/modules/history/screens/HistoryScreen.tsx` |
| Agregados | `src/modules/history/services/history-aggregates.ts` |
| Racha | `src/modules/history/utils/session-success-streak.ts` |
| Clasificación | `src/modules/session/session-record-classification.ts` |
| Storage | `src/modules/session/storage/session-progress-repository.ts` |

## Flujo funcional

1. Carga sesiones e intentos del paciente activo.
2. Agrupa por día local (`history-aggregates.ts`).
3. Clasifica días: perfect / good / incomplete / interrupted / practice.
4. Renderiza hero de racha, calendario, badges y modal detalle día.
5. **No requiere** evaluación inicial para visualizar.

## Datos y persistencia

| Lee | Escribe |
|-----|---------|
| `@rehab/sessions_v1`, `@rehab/attempts_v1` | Solo lectura |
| Nivel activo (`getCurrentActiveLevel`) | — |

Etiquetas UI vía `sessionClassificationUiLabel`: Sensor, Práctica sin sensor, Sin clasificar.

## Dependencias y gates

| Gate | Requerido |
|------|-----------|
| Paciente activo | Sí |
| Consent activo | Sí (tab press) |
| Evaluación inicial | No |
| Sensor | No (datos históricos) |

Hooks: `usePatientSession`, `useFocusEffect` para recarga.

## Riesgos al modificar

- **Alto:** clasificación calendario afecta percepción de adherencia clínica.
- **Medio:** pantalla ~1700+ líneas; colores hardcoded fuera de tokens wellness.
- **Clínico:** “Reporte para profesional” no implica informe certificado.

## Pendientes o revisión manual

- Refactor en subcomponentes (StreakHero, CalendarGrid, DayDetailModal).
- Unificar colores calendario con `wellnessColors`.
- Leyenda práctica vs terapéutica — validar comprensión con usuarios.

## Checklist manual mínimo

- [ ] Tras sesión sensor: día aparece clasificado correctamente.
- [ ] Sesión touch: marcada como práctica en calendario/detalle.
- [ ] Sin sesiones: empty state legible.
- [ ] Consent inactivo: tab bloqueado.
- [ ] Cambio de paciente: historial filtrado al activo.

## Docs relacionados

- [Sesión de terapia](../03-features/sesion-terapia.md)
- [Exportación](../03-features/exportacion-datos.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
