# Escala tipográfica RESPIRA+

Fuente de verdad: `wellnessTypography` en `src/shared/theme/wellness-theme.ts`.  
Componente recomendado: `AppText` en `src/shared/ui/AppText.tsx`.

## Familia

Inter cargada en `app/_layout.tsx`:

- `Inter_400Regular` — pesos 400
- `Inter_500Medium` — peso 500
- `Inter_600SemiBold` — peso 600
- `Inter_700Bold` — pesos 700 y 800 (no hay Inter 800 en el bundle actual)

`AppText` resuelve `fontFamily` automáticamente según `fontWeight` del token.

## Escala canónica

| Variante | Tamaño | Peso | Uso recomendado |
|----------|--------|------|-----------------|
| `display` | 30 | 800 | Hero metrics, números destacados en dashboard |
| `titleLarge` | 26 | 800 | Título de pantalla principal |
| `titleMedium` | 18 | 800 | Título de sección (`SectionHeader`) |
| `titleSmall` | 16 | 700 | Título de tarjeta, subtítulo fuerte |
| `bodyLarge` | 16 / lh 23 | 400 | Subtítulo de pantalla, párrafo destacado |
| `bodyMedium` | 15 / lh 22 | 400 | Cuerpo por defecto |
| `bodySmall` | 14 / lh 20 | 400 | Texto secundario compacto |
| `caption` | 12 / lh 17 | 600 | Metadatos, notas al pie de tarjeta |
| `button` | 16 | 700 | Etiquetas de `AppButton` y CTAs |
| `metric` | 22 | 800 | Valor numérico estándar en tiles |
| `metricLarge` | 30 | 800 | Métrica hero |
| `metricMedium` | 22 | 800 | Alias de `metric` |
| `metricSmall` | 18 | 800 | Métrica compacta |
| `label` | 11 | 700 | Etiquetas de tile, campos, badges pequeños |
| `chip` | 13 | 700 | Pills y chips medianos (`StatusPill` md) |
| `chipSmall` | 11 | 700 | Pills compactos (`StatusPill` sm) |
| `tabLabel` | 10 | 600 | Etiquetas de tab bar / navegación inferior |
| `input` | 16 / lh 22 | 400 | Campos de formulario |
| `link` | 14 | 700 | Acciones textuales, enlaces inline |
| `statusValue` | 15 / lh 20 | 700 | Valores de estado en `InfoTile`, énfasis status en `MetricTile` |

## Tokens especializados — `gameHud`

Sub-objeto para HUD de terapia/juego. **Referencia para estilos nativos** en sesión activa; el HUD mantiene `Text` con estilos locales (ver excepción más abajo).

| Token | Tamaño | Peso | Uso |
|-------|--------|------|-----|
| `gameHud.titleMini` | 10 | 700 | Título mini del HUD (uppercase) |
| `gameHud.pauseText` | 11 | 800 | Botón pausa |
| `gameHud.cellLabel` | 11 | 600 | Etiqueta de celda |
| `gameHud.cellLabelCompact` | 9 | 600 | Etiqueta compacta |
| `gameHud.cellValue` | 15 | 800 | Valor de celda |
| `gameHud.cellValueCompact` | 12 | 800 | Valor compacto |
| `gameHud.cellUnit` | 10 | 700 | Unidad (mL, s, etc.) |

## Tokens legacy (compatibilidad)

Mantener hasta migración completa. Preferir equivalente canónico en código nuevo.

| Legacy | Canónico | Notas |
|--------|----------|-------|
| `screenTitle` | `titleLarge` | Títulos de pantalla |
| `screenSubtitle` | `bodyLarge` | Subtítulos bajo el título |
| `sectionTitle` | `titleMedium` | Encabezados de sección |
| `cardTitle` | `titleSmall` | Títulos dentro de cards |
| `body` | `bodyMedium` | Párrafo por defecto |

## Jerarquía por contexto

### Pantalla

```
titleLarge  →  título principal
bodyLarge   →  subtítulo / descripción corta bajo el título
```

### Sección

```
titleMedium →  SectionHeader.title
bodyMedium  →  SectionHeader.subtitle
link        →  SectionHeader.actionLabel
```

### Tarjeta

```
titleSmall  →  título de card
bodyMedium  →  contenido
caption     →  notas, timestamps
label       →  etiquetas de métrica
```

### Métrica

```
metricLarge / metricMedium / metricSmall  →  valor numérico según tamaño
label                                     →  nombre de la métrica
statusValue                               →  valor textual de estado
```

### Botón y chip

```
button     →  AppButton
chip       →  StatusPill (md)
chipSmall  →  StatusPill (sm)
```

## Uso de `AppText`

```tsx
import { AppText } from '@/src/shared/ui/AppText';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

<AppText variant="titleMedium" style={{ color: wellnessColors.textPrimary }}>
  Mi sección
</AppText>
```

- `variant` selecciona el token tipográfico.
- `style` añade color, márgenes u overrides puntuales (p. ej. `fontSize` dinámico en `MetricTile`).
- No se fuerza color por defecto: el color lo define el contenedor o `style`.
- Soporta todas las props nativas de `Text` (`numberOfLines`, `accessibilityRole`, etc.).

### Excepción — HUD y juego (sesión activa)

`AppText` resuelve `fontFamily` según el peso del **token base** (`variant`), no del `style` final. Un override `fontWeight: '800'` o `'900'` sobre `bodyMedium` (400) sigue cargando Inter Regular, lo que aplana el look bold del HUD.

**Regla:** en sesión activa y componentes de juego (`RunnerGameFeedbackBar`, `LevelOneGameView`, intro, coach, celebraciones, modales compactos de `SessionScreen`) se permite — y se prefiere cuando el diseño lo exige — **`Text` nativo** con los estilos exactos originales (`fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textTransform`).

Prioridades del juego: legibilidad en cajas compactas, peso visual lúdico (800/900) y cero overflow en chips/fases.

**Copy clínico de volumen:**

| Contexto | Label recomendado |
|----------|-------------------|
| HUD compacto (juego) | «Volumen», «Vol.» o «Meta» — sin «estimado» si no cabe |
| Tarjetas, resumen, reportes, modal de sesión (tile ancho) | «volumen estimado», «Vol. máx. / prom. estimado», etc. |

## Adopción en pantallas

### Fase 4B — `DataExportScreen`

- Todos los `Text` directos reemplazados por `AppText`.
- Variantes: `bodySmall`, `titleSmall`, `statusValue`, `caption` (+ overrides mínimos).
- Sin cambios de layout, colores ni lógica de exportación.

### Fase 4C — `NotificationSettingsScreen`

- Pantalla + 6 componentes del módulo `notifications/` migrados a `AppText`.
- Variantes: `titleLarge`, `titleSmall`, `bodyMedium`, `bodySmall`, `caption`, `label`, `button`, `statusValue`, `metricLarge`, `chip`.
- `TextInput` de horarios conserva estilos propios (no es `AppText`).
- Colores `reminderUi.*` sin cambios; overrides mínimos en métricas grandes (36px) y título pantalla (28px).

### Fase 4D — `SummaryScreen`

- Pantalla + 3 componentes del módulo `summary/` migrados a `AppText`.
- Variantes: `titleLarge`, `titleSmall`, `bodyLarge`, `bodySmall`, `caption`, `label`, `chip`.
- `SessionSummaryMetricsGrid` usa `MetricTile` (Fase 4A); labels de volumen aclarados como estimados.
- `SessionSummaryActions` sin texto propio; `SessionSuccessStreakCard` fuera de alcance (módulo `session/`).

### Fase 4E — `ProfileScreen`

- Pantalla + 5 componentes del módulo `patient/` migrados a `AppText`: `ProfileSection`, `ProfileInfoCard`, `ProfileAvatarPicker`, `ProfileAvatarView`, `DeletePatientConfirmModal`.
- Variantes: `titleSmall`, `titleMedium`, `bodyLarge`, `bodySmall`, `caption`, `label`, `chip`, `statusValue`, `metricLarge`, `metric`, `button`.
- Tarjeta **Recordatorios de terapia** (`useIsFocused`, `readNotificationSettingsForDisplay`, `StatusPill`) sin cambios de lógica.
- `TextInput` del modal de borrado conserva estilos propios; `MetricTile` y `StatusPill` ya usaban tokens (Fase 4A).
- Sin cambios de layout, colores, copy clínico ni navegación.

### Fase 4F — Evaluación inicial / Diagnóstico

- 3 pantallas + 5 componentes del módulo `diagnostics/` migrados a `AppText`: `DiagnosticExamScreen`, `DiagnosticSummaryScreen`, `InitialEvaluationSummaryScreen`, `InitialEvaluationWelcomeView`, `InitialEvaluationCountdownView`, `EvaluationAttemptsCard`, `EvaluationComparisonCard`, `EvaluationLevelTargetsCard`.
- Variantes: `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `caption`, `label`, `chip`, `chipSmall`, `link`, `button`, `statusValue`, `metric`, `metricLarge`, `metricSmall`.
- Rutas `app/diagnostico*.tsx` y `app/evaluacion-resumen.tsx` sin cambios (solo `ConsentStackGuard` + screen).
- `Animated.Text` del countdown conservado para animación Reanimated; lógica VIM, intentos, persistencia y readiness intacta.
- Sin cambios de copy clínico, colores, layout ni navegación.

### Fase 4G — `LevelsScreen` (Terapia / Menú de niveles)

- `LevelsScreen` + `TherapyLevelCard` migrados a `AppText`.
- Variantes: `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `label`, `chip`, `button`, `statusValue`.
- `SectionHeader`, `MetricTile`, `StatusPill` y `AppButton` sin cambios (ya usan tokens o no tienen `Text` directo).
- Lógica de desbloqueo, `resolveTherapySessionLaunchInputMode`, navegación a `/sesion`, readiness y práctica táctil intacta.
- Sin cambios de copy clínico, colores, layout ni progreso.

### Fase 4H — Legal / Consentimiento

- `LegalAcceptScreen` + `LegalDocumentScreen` migrados a `AppText`.
- Variantes: `titleLarge`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `label`, `chip`, `button`, `statusValue`.
- Rutas `app/legal/accept.tsx` y `app/legal/document.tsx` sin cambios (solo re-export).
- `ConsentTabGuard`, `ConsentStackGuard`, `acceptConsent`, `needsConsent` y contenido legal (`SECTIONS`, `CHECK_LABELS`) intactos.
- `SectionHeader` y `AuthRegistrationHeader` fuera de alcance (shared/auth).
- Sin cambios de copy legal, colores, layout ni storage.

### Fase 4I — Sensor / Conexión / Calibración básica

- `SensorConnectionScreen`, `SensorCalibrationPatientScreen` (sin `Text` propio) + 5 componentes migrados: `CalibrationStatusHeroCard`, `CalibrationQuickActions`, `MeasuredVolumeHero`, `LiveVolumeCard`, `SensorLivePreview`.
- Variantes: `titleMedium`, `titleSmall`, `bodyLarge`, `bodySmall`, `caption`, `label`, `chip`, `statusValue`, `metricLarge`, `metricSmall`.
- Flujo técnico avanzado **no tocado** en 4I (migrado en Fase 4J).
- `SensorCalibrationScreen` (router) sin cambios de lógica; WebSocket, calibración RESPIRA+ 3000 mL, readiness y storage intactos.
- Copy: label por defecto en `MeasuredVolumeHero` aclarado como «Volumen estimado».

### Fase 4J — Calibración técnica avanzada

- 4 pantallas + `TechnicalSummaryLink` migrados a `AppText`: `SensorCalibrationTechnicalScreen`, `SensorCalibrationTechnicalCaptureScreen`, `CalibrationTechnicalSummaryScreen`, `TechnicalCalibrationUnavailableScreen`.
- Variantes: `titleLarge`, `titleMedium`, `titleSmall`, `bodyMedium`, `bodySmall`, `caption`, `label`, `chip`, `chipSmall`, `link`, `button`, `statusValue`, `metric`.
- `SectionHeader`, `MetricTile`, `StatusPill`, `MeasuredVolumeHero`, `AppButton` sin cambios (ya usaban tokens o no tienen `Text` directo).
- `TextInput` de identificación y volumen conserva estilos propios.
- Lógica de captura, regresión, exportación CSV técnico, persistencia, flags y navegación intacta.
- Sin cambios de copy clínico, colores, layout ni modelo RESPIRA+ 3000 mL.

### Fase 4K — Auth / Acceso local

- 3 pantallas + 5 componentes del módulo `auth/` migrados a `AppText`: `LoginScreen`, `LocalProfileScreen`, `RegistroScreen`, `AuthWelcomeView`, `AuthCreateProfileView`, `AuthGeneratedKeyView`, `AuthFlowChrome`, `AuthRegistrationHeader`.
- Variantes: `display`, `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `caption`, `label`, `chip`, `link`, `button`, `statusValue`, `metricLarge`.
- Rutas `app/auth/login.tsx`, `app/auth/local-profile.tsx`, `app/auth/registro.tsx` sin cambios (solo re-export).
- `TextInput` de login/registro conserva estilos propios; `AuthPrimaryButton` / botones gradiente usan `AppText variant="button"` con overrides.
- Flujo local-first, paciente activo, consentimiento, storage y validaciones intactos.
- Sin cambios de copy, colores, layout ni navegación.

### Fase 4L — Onboarding / Bienvenida

- `RespiraWelcomeOnboarding` migrado a `AppText`.
- Variantes: `titleLarge`, `bodyLarge`, `bodyMedium`, `chip`.
- Integración en `HomeScreen` sin cambios (solo import del componente).
- Storage `hasSeenWelcomeOnboarding` / `markWelcomeOnboardingSeen`, dismiss y condiciones de visibilidad intactos.
- Sin cambios de copy, colores, layout ni navegación.

### Fase 4M — `HomeScreen` (Inicio)

- `HomeScreen` + `HomeLastSessionCard` migrados a `AppText`.
- Variantes: `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `caption`, `label`, `chip`, `button`, `link`, `statusValue`.
- `SectionHeader`, `MetricTile`, `AppButton`, `AppTopBar` y `RespiraWelcomeOnboarding` sin cambios (ya usaban tokens o no tienen `Text` directo en alcance).
- Copy clínico: labels de volumen en última sesión y card sensor alineados con «estimado».
- Lógica de gates, CTAs, onboarding, consent, sensor, terapia y exportación intacta.

### Fase 4N — `HistoryScreen` (Historial)

- `HistoryScreen` migrado a `AppText` (subcomponentes inline incluidos).
- Variantes: `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `caption`, `label`, `chip`, `chipSmall`, `button`, `link`, `metric`, `statusValue`.
- `AppButton`, `AppTopBar`, `RespiraBunnyImage` sin cambios.
- Copy clínico: labels de volumen en última sesión y modal de día alineados con «estimado».
- Agregados, rachas, calendario, clasificación y modales sin cambios de lógica.

### Fase 4O — `SessionScreen` (Sesión activa / juego)

- **Intento inicial:** migración a `AppText` en `SessionScreen` + 9 componentes visuales del juego.
- **Corrección visual (regresión):** revertido a `Text` nativo en sesión activa y juego. `AppText` no preservaba pesos 800/900 del HUD (mapeo de `fontFamily` por variant base) y el copy «Vol. estimado» provocaba overflow en celdas compactas.
- HUD, fases, countdown, chips, intro, coach y celebraciones conservan estilos locales originales.
- Copy clínico: HUD compacto usa «Volumen» / abreviaciones; modal de resumen de sesión usa «Vol. máx. / prom. estimado» en tile ancho.
- Motor `use-level-one-game`, validación, sensor, touch, persistencia y navegación intactos.

### Fase 4P — Cierre tipográfico producto (perfil + racha resumen)

- `ProfileStatusBadge`, `ProfileActionRow` y `SessionSuccessStreakCard` migrados a `AppText`.
- Variantes: `chip` (badge), `bodyMedium` (filas perfil), `statusValue` + `bodySmall` (racha en `SummaryScreen`).
- Overrides mínimos para paridad visual (`fontSize`, `fontWeight`, `letterSpacing`, colores dinámicos).
- **Sin tocar:** HUD/juego (4O), `VolumeThermometer.tsx` (sin consumidores), dev/debug, wrappers técnicos.

## Qué queda pendiente

| Ámbito | Motivo |
|--------|--------|
| `AppTopBar`, `AppCard` | Sin texto propio o solo layout |
| Estilos HUD legacy en `LevelOneGameView` | Dead styles; render usa `RunnerGameFeedbackBar` |
| `VolumeThermometer.tsx` | Componente legacy sin consumidores; evaluar deprecar o migrar |
| Módulos `device/` (dev) | `HardwareLabScreen`, `esp32-raw-test` — fuera de alcance producto |

## Reglas

1. **Código nuevo:** usar `AppText` + variantes canónicas.
2. **Refactors:** no tocar pantallas grandes sin plan visual.
3. **Overrides:** permitidos para casos dinámicos (tamaño de métrica por `size`), pero partir siempre del token base.
4. **Sin librerías nuevas** para tipografía en esta fase.
