# Auditoría final de Text restantes

**Fecha:** 6 jun 2026
**Alcance:** `app/`, `src/` — post migración tipográfica Fases 4A–4P
**Método:** búsqueda estática de `<Text`, `<Animated.Text`, imports de `Text` desde `react-native`
**Última actualización:** Fase 4P — cierre tipográfico producto (perfil + racha resumen)

---

## Resumen ejecutivo

Tras la migración masiva a `AppText` (Fases 4B–4N), la excepción HUD/juego (Fase 4O) y el cierre producto (Fase 4P), quedan **18 archivos** con dependencia activa de `Text` nativo en `app/` y `src/`.

| Hallazgo | Valor (post 4P) |
|----------|-----------------|
| Archivos con JSX `Text` / `Animated.Text` | **17** |
| Archivos con `Text` solo en infraestructura (sin JSX) | **1** (`app/_layout.tsx`) |
| Instancias JSX `<Text>` | **132** |
| Instancias JSX `<Animated.Text>` | **1** |
| Imports muertos de `Text` | **0** |
| SVG `Text` (`react-native-svg`) | **0** |

La mayoría del volumen restante (**~69 %** de instancias JSX) corresponde a la **excepción aceptada HUD/juego** (Fase 4O). El **único pendiente real de producto** es **`VolumeThermometer.tsx`** (6 instancias, sin consumidores — prioridad baja, fuera de alcance 4P).

**Fase 4P completada (jun 2026):** `ProfileStatusBadge`, `ProfileActionRow`, `SessionSuccessStreakCard` migrados a `AppText` con paridad visual.

Módulos de producto (`home`, `history`, `auth`, `legal`, `patient`, `summary`): **sin `Text` nativo restante** en flujos activos.

---

## Conteo total

| Métrica | Pre-4P | Post-4P |
|---------|--------|---------|
| Archivos con `Text` restante (runtime o infra) | 21 | **18** |
| Archivos con `<Text>` JSX | 20 | **17** |
| Instancias `<Text>` | 144 | **132** |
| Instancias `<Animated.Text>` | 1 | **1** |
| Archivos con `TextInput` (excluidos del conteo principal) | 9 | 9 |
| Imports muertos `Text` | 0 | 0 |

---

## Conteo por categoría

| Cat. | Descripción | Archivos (post 4P) | Instancias JSX aprox. |
|------|-------------|--------------------|------------------------|
| **A** | Pendiente real de migración a `AppText` | 1 | 6 |
| **B** | Excepción aceptada HUD/juego | 10 | 91 |
| **C** | `TextInput` / input — no aplica | 9 | — |
| **D** | SVG, ícono o ilustración — no aplica | 0 | 0 |
| **E** | Debug / dev interno | 3 | 37 |
| **F** | Wrapper especial o caso técnico | 4 | 5 |
| **G** | Import `Text` muerto | 0 | 0 |
| **—** | Migrado Fase 4P | 3 | 0 (`AppText`) |

> **Nota:** categoría A reducida a `VolumeThermometer.tsx` (sin consumidores). B, E y F no son deuda de migración producto.

---

## Inventario por archivo

### Migrado — Fase 4P (jun 2026)

| Ruta | Variantes `AppText` | Notas |
|------|---------------------|-------|
| `src/modules/patient/components/ProfileStatusBadge.tsx` | `chip` | Override `fontSize: 14` + color dinámico por variante |
| `src/modules/patient/components/ProfileActionRow.tsx` | `bodyMedium` (label + chevron) | Overrides de peso, color y `textDecorationLine` por variante link/primary/neutral |
| `src/modules/session/patient-ui/SessionSuccessStreakCard.tsx` | `bodyMedium` (emoji), `statusValue` (título), `bodySmall` (subtítulo) | Overrides `fontWeight: '800'`, `letterSpacing`, `lineHeight` para paridad |

### Categoría A — Pendiente real de migración a AppText

| Ruta | Usos | Prioridad | Riesgo migrar | Motivo | Recomendación |
|------|------|-----------|---------------|--------|---------------|
| `src/modules/device/components/VolumeThermometer.tsx` | 6 | **Baja** | Bajo | Termómetro visual legacy; **sin imports en el codebase** (reemplazado por `LiveVolumeCard` en `SensorConnectionScreen`). Fuera de alcance 4P. | Migrar solo si se reactiva el componente; si no, considerar eliminación en fase de limpieza. |

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

**Post Fase 4P:** solo queda backlog de baja prioridad.

1. **`VolumeThermometer.tsx`** — Baja, 6 usos, sin consumidores; evaluar deprecar vs. migrar si se reactiva.

**Total pendiente producto:** 1 archivo · 6 instancias JSX (componente huérfano)

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

1. **Fase 4P completada** — perfil y racha resumen en `AppText`.
2. **No tocar** los 10 archivos de categoría B sin plan visual y extensión de `AppText` / tokens `gameHud`.
3. **Evaluar** destino de `VolumeThermometer.tsx` (componente sin imports).
4. **Mantener** `app/_layout.tsx` y `AppText.tsx` como puntos de acoplamiento a `Text` nativo en infraestructura.
5. **Dev screens:** migración opcional y baja prioridad.

---

## Próximos pasos

| Paso | Acción | Esfuerzo |
|------|--------|----------|
| 1 | Decidir sobre `VolumeThermometer` (migrar vs. deprecar) | Revisión |
| 2 | Revisar `AppBrandWordmark` en fase branding | Opcional |
| 3 | Consolidar `fontWeight: '800'` suelto fuera de sesión (auditoría separada) | Backlog |
| 4 | Dev screens (`esp32-raw-test`, `HardwareLabScreen`, showcase) | Opcional |

---

## Módulos revisados — estado

| Módulo / área | `Text` nativo restante | Estado |
|---------------|------------------------|--------|
| `src/modules/session/` | Sí (HUD/juego) | Excepción 4O; `SessionSuccessStreakCard` migrado 4P |
| `src/modules/home/` | No | Migrado (4M) |
| `src/modules/history/` | No | Migrado (4N) |
| `src/modules/device/` | Sí (lab dev + termómetro huérfano) | Parcial; `VolumeThermometer` sin consumidores |
| `src/modules/auth/` | No | Migrado (4J) |
| `src/modules/legal/` | No | Migrado (4H) |
| `src/modules/diagnostics/` | Solo `Animated.Text` | Migrado (4F) |
| `src/modules/patient/` | No | Migrado (4E + 4P) |
| `src/shared/ui/` | `AppText`, showcase dev | Infra + dev |
| `app/` | `_layout`, `esp32-raw-test` | Infra + dev |

---

## Referencias

- [Escala tipográfica](./typography-scale.md)
- [README design system](./README.md)
- `src/shared/ui/AppText.tsx`
- Informe de sincronización: `docs/00-overview/documentation-sync-report.md`
