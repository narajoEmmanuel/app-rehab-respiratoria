# RESPIRA+ — Design system (UI)

Documentación del sistema visual compartido de RESPIRA+. Esta carpeta centraliza tokens, tipografía y reglas de adopción progresiva.

## Estado actual (Fase 4A)

| Área | Estado |
|------|--------|
| Paleta (`wellness`, `wellnessColors`) | Definida en `src/shared/theme/wellness-theme.ts` |
| Tipografía (`wellnessTypography`) | Escala canónica ampliada (Fase 4A) |
| Componente `AppText` | Creado en `src/shared/ui/AppText.tsx` |
| Adopción en pantallas grandes | **Pendiente** — no migrar sin revisión visual |
| Adopción en `src/shared/ui/` | Parcial (botones, tiles, headers, pills) |

## Fuentes de verdad

| Recurso | Archivo |
|---------|---------|
| Tokens wellness | `src/shared/theme/wellness-theme.ts` |
| Familia Inter | `src/shared/theme/typography.ts` |
| Espaciado | `src/shared/theme/spacing.ts` |
| Texto reutilizable | `src/shared/ui/AppText.tsx` |

## Documentos

- [Escala tipográfica](./typography-scale.md) — variantes, jerarquía y reglas de uso

## Reglas de adopción

1. **Nuevas pantallas y componentes** deben usar `AppText` con variantes de `wellnessTypography`, no `fontSize` hardcoded.
2. **No migrar pantallas grandes** (Home, History, Session, calibración técnica, juego) sin revisión visual dedicada.
3. **No inventar colores por pantalla** — usar `wellness` / `wellnessColors`.
4. **Tokens legacy** (`screenTitle`, `sectionTitle`, `cardTitle`, `body`) siguen válidos; preferir nombres canónicos en código nuevo.

## Pendiente (post Fase 4A)

- Migrar pantallas tab (`HomeScreen`, `HistoryScreen`, `SessionScreen`, `LevelsScreen`)
- Migrar HUD de juego a tokens `gameHud` + `AppText`
- Migrar `therapy-level-card.tsx` y componentes de módulo con muchos estilos inline
- Auditar `fontWeight: '800'` suelto y consolidar con tokens
- Evaluar barrel `src/shared/ui/index.ts` (hoy los imports son directos por archivo)

## Referencias

- [Overview](../00-overview/README.md)
- [Arquitectura](../01-app-architecture/README.md)
- [Regla Cursor: diseño visual](../../.cursor/rules/respira-visual-design.mdc)
