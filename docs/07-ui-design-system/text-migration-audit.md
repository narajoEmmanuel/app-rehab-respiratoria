# Auditoría final de Text restantes

**Fecha:** 6 jun 2026  
**Alcance:** `app/`, `src/` — post migración tipográfica Fases 4A–4O  
**Método:** búsqueda estática de `<Text`, `<Animated.Text`, imports de `Text` desde `react-native`  
**Restricción:** solo auditoría; sin cambios de runtime

---

## Resumen ejecutivo

Tras la migración masiva a `AppText` (Fases 4B–4N) y la excepción documentada para HUD/juego (Fase 4O), quedan **21 archivos** con dependencia activa de `Text` nativo en `app/` y `src/`.

| Hallazgo | Valor |
|----------|-------|
| Archivos con JSX `Text` / `Animated.Text` | **20** |
| Archivos con `Text` solo en infraestructura (sin JSX) | **1** (`app/_layout.tsx`) |
| Instancias JSX `<Text>` | **144** |
| Instancias JSX `<Animated.Text>` | **1** |
| Imports muertos de `Text` | **0** |
| SVG `Text` (`react-native-svg`) | **0** |

La mayoría del volumen restante (**~63 %** de instancias JSX) corresponde a la **excepción aceptada HUD/juego** (Fase 4O). Los **pendientes reales de migración** son **4 archivos** y **12 instancias JSX**, concentrados en perfil (`ProfileStatusBadge`, `ProfileActionRow`), resumen (`SessionSuccessStreakCard`) y un componente huérfano (`VolumeThermometer`).

Módulos revisados explícitamente (`session/`, `home/`, `history/`, `device/`, `auth/`, `legal/`, `diagnostics/`, `patient/`, `shared/ui/`, `app/`): **home, history, auth y legal no tienen `Text` nativo restante** — migración completa en esos ámbitos.

---

## Conteo total

| Métrica | Cantidad |
|---------|----------|
| Archivos con `Text` restante (runtime o infra) | 21 |
| Archivos con `<Text>` JSX | 20 |
| Instancias `<Text>` | 144 |
| Instancias `<Animated.Text>` | 1 |
| Archivos con `TextInput` (excluidos del conteo principal) | 9 |
| Imports muertos `Text` | 0 |

---

## Conteo por categoría

| Cat. | Descripción | Archivos | Instancias JSX aprox. |
|------|-------------|----------|------------------------|
| **A** | Pendiente real de migración a `AppText` | 4 | 12 |
| **B** | Excepción aceptada HUD/juego | 10 | 91 |
| **C** | `TextInput` / input — no aplica | 9 | — |
| **D** | SVG, ícono o ilustración — no aplica | 0 | 0 |
| **E** | Debug / dev interno | 3 | 37 |
| **F** | Wrapper especial o caso técnico | 4 | 5 |
| **G** | Import `Text` muerto | 0 | 0 |

> **Nota:** las categorías B, E y F no son deuda de migración. A es la única cola activa de producto.

---

## Inventario por archivo

### Categoría A — Pendiente real de migración a AppText

| Ruta | Usos | Prioridad | Riesgo migrar | Motivo | Recomendación |
|------|------|-----------|---------------|--------|---------------|
| `src/modules/patient/components/ProfileStatusBadge.tsx` | 1 | **Alta** | Bajo | Pill de consentimiento en perfil; estilos inline (`fontSize: 14`, `fontWeight: '700'`). Resto del módulo `patient/` ya usa `AppText` (Fase 4E). | Migrar a `AppText variant="chip"` o `chipSmall` + override de color dinámico por variante. |
| `src/modules/patient/components/ProfileActionRow.tsx` | 2 | **Alta** | Bajo | Filas de navegación en perfil; label + chevron `›`. Variantes link/primary/neutral con pesos 600/700. | Label → `AppText variant="bodyMedium"` / `link`; chevron → `AppText` con `fontWeight: '300'` override o símbolo en `caption`. |
| `src/modules/session/patient-ui/SessionSuccessStreakCard.tsx` | 3 | **Media** | Medio | Card de racha en `SummaryScreen`; usa `fontWeight: '800'` en título. Documentado como pendiente en `typography-scale.md`. No es HUD activo. | Migrar título/subtítulo a `AppText`; emoji 🔥 puede quedar en `Text` mínimo o `AppText` sin variant. Validar peso 800 con token `titleSmall` / override. |
| `src/modules/device/components/VolumeThermometer.tsx` | 6 | **Baja** | Bajo | Termómetro visual legacy; **sin imports en el codebase** (reemplazado por `LiveVolumeCard` en `SensorConnectionScreen`). | Migrar solo si se reactiva el componente; si no, considerar eliminación en fase de limpieza (fuera de esta auditoría). |

### Categoría B — Excepción aceptada HUD/juego

Documentado en [typography-scale.md](./typography-scale.md) — Fase 4O. `AppText` no preserva pesos 800/900 del HUD ni layout compacto.

| Ruta | Usos | Prioridad | Riesgo migrar | Motivo | Recomendación |
|------|------|-----------|---------------|--------|---------------|
| `src/modules/session/screens/SessionScreen.tsx` | 31 | No aplica | **Alto** | Pantalla de sesión activa: loading, modales pausa/resumen, chips, métricas. Revertido en 4O por regresión visual. | **Conservar `Text` nativo.** No forzar `AppText`. |
| `src/modules/session/games/components/LevelOneGameView.tsx` | 16 | No aplica | **Alto** | Intro, toasts, celebraciones, fases INSPIRA/SOSTÉN/DESCANSA; `Text` anidado para énfasis bold. HUD compacto. | **Conservar.** Incluye estilos HUD legacy muertos (render principal vía `RunnerGameFeedbackBar`). |
| `src/modules/session/games/components/RunnerGameFeedbackBar.tsx` | 16 | No aplica | **Alto** | HUD principal: volumen, meta, repeticiones, pausa, countdown, fases. Pesos 800/900, celdas compactas. | **Conservar.** Referencia de tokens `gameHud` en `wellnessTypography`. |
| `src/modules/session/games/components/RunnerLevelPreStartIntro.tsx` | 7 | No aplica | Alto | Intro pre-inicio de nivel; tipografía lúdica con acentos dinámicos. | **Conservar** como excepción de juego. |
| `src/modules/session/games/components/AllLevelsCompleteCelebrationModal.tsx` | 7 | No aplica | Medio-Alto | Modal celebración fin de recorrido; copy emocional compacto. | **Conservar** (mismo criterio 4O). |
| `src/modules/session/games/components/LevelAdvanceCelebrationModal.tsx` | 4 | No aplica | Medio-Alto | Modal avance de nivel. | **Conservar.** |
| `src/modules/session/games/components/SessionCompleteMicroCelebration.tsx` | 4 | No aplica | Medio | Micro-celebración post-sesión en contexto de juego. | **Conservar.** |
| `src/modules/session/games/components/SensorAttemptVolumeHint.tsx` | 4 | No aplica | Medio | Hint de volumen durante intento; layout compacto en sesión. | **Conservar.** |
| `src/modules/session/games/components/SessionEstimatedVolumeCard.tsx` | 1 | No aplica | Medio | Chip de estado del sensor en cabecera de sesión. | **Conservar** (parte del chrome de sesión activa). |
| `src/modules/session/games/components/RunnerBunnyCoachBubble.tsx` | 1 | No aplica | Medio | Burbuja coach con `numberOfLines={3}` y modo compacto. | **Conservar.** |

### Categoría C — TextInput / no aplica

No se auditan como deuda `Text`. Conservan estilos propios (`wellnessTypography.input` o locales).

| Ruta | Notas |
|------|-------|
| `app/_layout.tsx` | `TextInput.defaultProps` global (familia Inter) |
| `app/esp32-raw-test.tsx` | Campo URL WebSocket (pantalla dev) |
| `src/modules/auth/screens/LoginScreen.tsx` | Credenciales |
| `src/modules/auth/screens/RegistroScreen.tsx` | Registro |
| `src/modules/auth/components/AuthCreateProfileView.tsx` | Perfil auth |
| `src/modules/device/screens/SensorConnectionScreen.tsx` | IP / host sensor |
| `src/modules/device/screens/SensorCalibrationTechnicalCaptureScreen.tsx` | Captura técnica |
| `src/modules/notifications/components/AwakeWindowCard.tsx` | Horarios |
| `src/modules/patient/components/DeletePatientConfirmModal.tsx` | Confirmación DELETE |

### Categoría D — SVG / ilustración

**Ningún uso** de `Text` de `react-native-svg` en `app/` ni `src/`. Los SVG del proyecto usan primitivas geométricas (`Path`, `Circle`, etc.) sin texto vectorial.

### Categoría E — Debug / desarrollo

| Ruta | Usos | Prioridad | Riesgo migrar | Motivo | Recomendación |
|------|------|-----------|---------------|--------|---------------|
| `app/esp32-raw-test.tsx` | 12 | Baja | N/A | Prueba WebSocket ESP32; ruta `/esp32-raw-test`. | No migrar en fase de producto; opcional `AppText` si se unifica estilo dev. |
| `src/modules/device/screens/HardwareLabScreen.tsx` | 11 | Baja | N/A | Laboratorio hardware; acceso condicionado (`isHardwareLabAccessible`). | No migrar; pantalla interna de diagnóstico. |
| `src/shared/ui/RespiraBunnyImageShowcase.tsx` | 14 | Baja | N/A | Showcase de poses; ruta `app/dev/respira-bunny-image-showcase.tsx`. | No migrar; solo dev/design QA. |

### Categoría F — Wrapper especial / caso técnico

| Ruta | Usos | Prioridad | Riesgo migrar | Motivo | Recomendación |
|------|------|-----------|---------------|--------|---------------|
| `src/shared/ui/AppText.tsx` | 1 | No aplica | N/A | Wrapper canónico; **debe** delegar en `Text` nativo. | No migrar — es la implementación base. |
| `src/shared/branding/AppBrandWordmark.tsx` | 3 | No aplica | Medio | Fallback textual del logo; `Text` anidado (Respira + `+`) con familias distintas. | Revisión manual futura; posible `AppText` solo si se preserva anidamiento y colores de marca. |
| `app/_layout.tsx` | 0 JSX | No aplica | **Alto** | Asigna `Text.defaultProps.style` con `fontRegular` tras cargar fuentes Inter. | **No tocar** — infraestructura global de tipografía. |
| `src/modules/diagnostics/components/InitialEvaluationCountdownView.tsx` | 1 `Animated.Text` | No aplica | Alto | Dígito animado (ZoomIn/FadeOut) en countdown diagnóstico; resto ya usa `AppText`. | **Conservar `Animated.Text`** — Reanimated requiere componente animado; no es deuda `AppText`. |

### Categoría G — Imports muertos

**Ninguno detectado.** Todos los archivos que importan `Text` desde `react-native` lo usan en JSX, en `typeof Text` / `defaultProps`, o como wrapper (`AppText`).

---

## Pendientes reales de migración

Orden sugerido (Fase 4P):

1. **`ProfileStatusBadge.tsx`** — Alta, 1 uso, bajo riesgo  
2. **`ProfileActionRow.tsx`** — Alta, 2 usos, bajo riesgo  
3. **`SessionSuccessStreakCard.tsx`** — Media, 3 usos, validar peso 800  
4. **`VolumeThermometer.tsx`** — Baja; evaluar si el componente sigue vigente (actualmente sin consumidores)

**Total pendiente:** 4 archivos · 12 instancias JSX

---

## Excepciones aceptadas

| Ámbito | Archivos | Instancias |
|--------|----------|------------|
| Sesión activa + juego (Fase 4O) | 10 | 91 |
| Infraestructura tipográfica | `AppText.tsx`, `app/_layout.tsx` | 1 + global defaults |
| Branding especial | `AppBrandWordmark.tsx` | 3 |
| Animación Reanimated | `InitialEvaluationCountdownView.tsx` (`Animated.Text`) | 1 |

Ver detalle en [typography-scale.md](./typography-scale.md) — sección «Excepción — HUD y juego».

---

## TextInput / no aplica

9 archivos con `TextInput` (listados en categoría C). No forman parte de la cola de migración `Text` → `AppText`.

---

## Debug o desarrollo

3 archivos · 37 instancias JSX — rutas dev/hardware no expuestas al flujo paciente principal:

- `/esp32-raw-test`
- `/hardware-lab`
- `/dev/respira-bunny-image-showcase`

---

## Imports muertos

| Resultado |
|-----------|
| **0 archivos** con `import { … Text … } from 'react-native'` sin uso en JSX o infraestructura |

Búsqueda incluyó imports agrupados (`View, Text, Pressable`) y alias `type TextProps`.

---

## Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Regresión visual HUD al migrar sesión/juego | **Alta** | Mantener excepción 4O; no reintentar sin extender `AppText` para pesos 800/900 reales |
| Overflow en celdas compactas | Alta | Copy «Vol. estimado» ya revertido; HUD usa abreviaciones |
| `fontWeight: '800'` en `SessionSuccessStreakCard` | Media | Probar `titleSmall` + override; `AppText` mapea 800 → `fontBold` |
| `AppBrandWordmark` anidado | Media | Migración manual; preservar dos colores/familias |
| `VolumeThermometer` huérfano | Baja | Decidir retiro o reactivación antes de migrar |
| `Animated.Text` en countdown | Alta si se cambia | No sustituir por `AppText` sin wrapper Reanimated |

---

## Recomendaciones

1. **Fase 4P (siguiente):** migrar solo categoría A — perfil (2 archivos) y `SessionSuccessStreakCard`.  
2. **No tocar** los 10 archivos de categoría B sin plan visual y extensión de `AppText` / tokens `gameHud`.  
3. **Actualizar** `docs/07-ui-design-system/README.md`: `therapy-level-card.tsx` ya usa `AppText` (pendiente obsoleto en índice previo).  
4. **Evaluar** destino de `VolumeThermometer.tsx` (componente sin imports).  
5. **Mantener** `app/_layout.tsx` y `AppText.tsx` como únicos puntos de acoplamiento a `Text` nativo en infraestructura.  
6. **Dev screens:** migración opcional y baja prioridad.

---

## Próximos pasos

| Paso | Acción | Esfuerzo |
|------|--------|----------|
| 1 | Migrar `ProfileStatusBadge` + `ProfileActionRow` | ~30 min |
| 2 | Migrar `SessionSuccessStreakCard` con QA en `SummaryScreen` | ~45 min |
| 3 | Decidir sobre `VolumeThermometer` (migrar vs. deprecar) | Revisión |
| 4 | Revisar `AppBrandWordmark` en fase branding | Opcional |
| 5 | Consolidar `fontWeight: '800'` suelto fuera de sesión (auditoría separada) | Backlog |

---

## Módulos revisados — estado

| Módulo / área | `Text` nativo restante | Estado |
|---------------|------------------------|--------|
| `src/modules/session/` | Sí (HUD/juego + 1 pendiente streak card) | Excepción + 1 pendiente |
| `src/modules/home/` | No | Migrado (4M) |
| `src/modules/history/` | No | Migrado (4N) |
| `src/modules/device/` | Sí (lab dev + termómetro huérfano) | Parcial |
| `src/modules/auth/` | No | Migrado (4J) |
| `src/modules/legal/` | No | Migrado (4H) |
| `src/modules/diagnostics/` | Solo `Animated.Text` | Migrado (4F) |
| `src/modules/patient/` | Sí (2 componentes) | Casi completo |
| `src/shared/ui/` | `AppText`, showcase dev | Infra + dev |
| `app/` | `_layout`, `esp32-raw-test` | Infra + dev |

---

## Referencias

- [Escala tipográfica](./typography-scale.md)
- [README design system](./README.md)
- `src/shared/ui/AppText.tsx`
- Informe de sincronización: `docs/00-overview/documentation-sync-report.md`
