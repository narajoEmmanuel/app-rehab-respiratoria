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

Sub-objeto para HUD de terapia/juego. **No migrados en Fase 4A**; definidos para futura consolidación de `LevelOneGameView` y `RunnerGameFeedbackBar`.

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

## Adopción en pantallas (Fase 4B)

**Primera pantalla migrada:** `DataExportScreen` (`src/modules/export/screens/DataExportScreen.tsx`).

- Todos los `Text` directos reemplazados por `AppText`.
- Variantes usadas: `bodySmall`, `titleSmall`, `statusValue`, `caption` (+ overrides mínimos en `emptyHint`, `technicalSectionTitle`, `disclaimer`).
- `SectionHeader`, `AppButton`, `MetricTile`, `InfoTile` y `StatusPill` ya usaban tokens desde Fase 4A.
- Sin cambios de layout, colores ni lógica de exportación.

## Qué queda pendiente

| Ámbito | Motivo |
|--------|--------|
| `HomeScreen`, `HistoryScreen`, `SessionScreen` | Pantallas grandes — pendiente Fase 4C+ |
| `SensorCalibrationTechnicalCaptureScreen` | Restricción explícita de auditoría |
| `therapy-level-card.tsx` | Componente grande con muchos estilos contextuales |
| `AppTopBar`, `AppCard` | Sin texto propio o solo layout |
| HUD de juego | Tokens definidos; migración requiere revisión visual del gameplay |
| Módulos `device/`, `notifications/`, `session/games/` | Alto volumen de `fontSize` hardcoded |

## Reglas

1. **Código nuevo:** usar `AppText` + variantes canónicas.
2. **Refactors:** no tocar pantallas grandes sin plan visual.
3. **Overrides:** permitidos para casos dinámicos (tamaño de métrica por `size`), pero partir siempre del token base.
4. **Sin librerías nuevas** para tipografía en esta fase.
