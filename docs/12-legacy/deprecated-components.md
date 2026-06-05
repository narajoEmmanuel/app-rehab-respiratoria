# Componentes y tokens eliminados (Fase 3)

Auditoría: junio 2026. Criterio: **0 imports/referencias en código** + bajo riesgo clínico.

## Eliminados

### 1. `src/modules/session/components/TouchPracticeFallbackPanel.tsx`

| Campo | Detalle |
|-------|---------|
| **Qué era** | Stub `@deprecated`; activación de práctica táctil movida a Perfil |
| **Evidencia** | Grep global: 0 matches (solo el archivo). Sin exports en barrels |
| **Contenido** | Solo comentario de deprecación, sin componente |
| **Riesgo** | **Bajo** — sin runtime |
| **Fecha Fase 3** | 2026-06-05 |

### 2. `src/modules/session/games/components/LevelOnePreStartIntro.tsx`

| Campo | Detalle |
|-------|---------|
| **Qué era** | Wrapper deprecated sobre `RunnerLevelPreStartIntro` para level-1 |
| **Evidencia** | Grep: 0 imports externos; `SessionScreen` usa `RunnerLevelPreStartIntro` directamente |
| **Riesgo** | **Bajo** — alias no referenciado |
| **Fecha Fase 3** | 2026-06-05 |

### 3. `src/shared/theme/radii.ts` + export en `index.ts`

| Campo | Detalle |
|-------|---------|
| **Qué era** | Escala legacy `sm/md/lg/xl/full` duplicada por `wellnessRadius` / `wellnessRadii` |
| **Evidencia** | Grep `src/`: solo `index.ts` re-exportaba; ningún import de consumidor |
| **Cambio adicional** | Eliminada línea `export { radii }` de `src/shared/theme/index.ts` |
| **Riesgo** | **Bajo** — tokens activos en `wellness-theme.ts` |
| **Fecha Fase 3** | 2026-06-05 |

### 4. `isCalibrationReady()` en `use-calibration-snapshot.ts`

| Campo | Detalle |
|-------|---------|
| **Qué era** | Helper `@deprecated`; sustituido por `isTherapyReadyForActiveSpirometer` |
| **Evidencia** | Grep: solo definición; `SensorConnectionScreen` importa `isTherapyReadyForActiveSpirometer`, no `isCalibrationReady` |
| **Riesgo** | **Bajo** — export muerto |
| **Fecha Fase 3** | 2026-06-05 |

## No eliminados (evidencia en revisión)

### Assets `react-logo*` (plantilla Expo)

| Campo | Detalle |
|-------|---------|
| **Estado** | **No presentes** en `assets/images/` del repo actual (glob sin matches) |
| **Acción** | Ninguna — nada que borrar |

### Otros candidatos auditoría — conservados

| Elemento | Motivo conservación |
|----------|---------------------|
| `clinician/` módulo completo | Scaffold documentado; fuera de alcance |
| `seedLocalPrototypeConsentForPatient` | Restricción explícita Fase 3 |
| `expo-blur` en package.json | Dependencia; Fase 3 no toca deps |
| `ensureLocalPrototypePatientRecord` | No en lista aprobada; requiere revisión manual |
| `src/shared/theme/index.ts` otros exports | En uso indirecto posible vía paths directos a wellness |

## Verificación post-eliminación

```bash
npm run lint
git diff --check
```

Revisar que no queden imports rotos hacia rutas eliminadas.
