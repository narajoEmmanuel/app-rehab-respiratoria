# RESPIRA+ — Design system (UI)

Documentación del sistema visual compartido de RESPIRA+. Esta carpeta centraliza tokens, tipografía y reglas de adopción progresiva.

## Estado actual (Fase 4P — jun 2026)

| Área | Estado |
|------|--------|
| Paleta (`wellness`, `wellnessColors`) | Definida en `src/shared/theme/wellness-theme.ts` |
| Tipografía (`wellnessTypography`) | Escala canónica ampliada (Fase 4A) |
| Componente `AppText` | `src/shared/ui/AppText.tsx` |
| Adopción en pantallas grandes | **Migradas** (Fases 4B–4P): export, notificaciones, resumen, perfil, diagnóstico, terapia, legal, sensor, calibración técnica, auth, onboarding, inicio, historial, cierre producto 4P |
| Excepción HUD / juego sesión activa | **`Text` nativo** en `SessionScreen` y componentes de juego (Fase 4O revertida) — ver [typography-scale.md](./typography-scale.md) |
| Adopción en `src/shared/ui/` | Parcial (botones, tiles, headers, pills) |

## Fuentes de verdad

| Recurso | Archivo |
|---------|---------|
| Tokens wellness | `src/shared/theme/wellness-theme.ts` |
| Familia Inter | `src/shared/theme/typography.ts` |
| Espaciado | `src/shared/theme/spacing.ts` |
| Texto reutilizable | `src/shared/ui/AppText.tsx` |

## Documentos

- [Escala tipográfica](./typography-scale.md) — variantes, jerarquía, pantallas migradas y excepción HUD
- [Auditoría final Text restantes](./text-migration-audit.md) — inventario post-migración, categorías A–G, pendientes y excepciones (jun 2026)

## Reglas de adopción

1. **Nuevas pantallas y componentes** deben usar `AppText` con variantes de `wellnessTypography`, no `fontSize` hardcoded.
2. **No forzar `AppText`** cuando compromete legibilidad, peso bold (800/900) o layout compacto — preferir `Text` nativo con estilos locales documentados (HUD/juego).
3. **No inventar colores por pantalla** — usar `wellness` / `wellnessColors`.
4. **Copy clínico de volumen:** en cards, resumen, historial y export usar «volumen estimado»; en HUD compacto permitir «Volumen» / abreviaciones.
5. **Tokens legacy** (`screenTitle`, `sectionTitle`, `cardTitle`, `body`) siguen válidos; preferir nombres canónicos en código nuevo.

## Pendiente real (post Fase 4P — jun 2026)

Ver detalle en [text-migration-audit.md](./text-migration-audit.md).

| Ámbito | Motivo |
|--------|--------|
| HUD / juego sesión activa | Excepción deliberada — `Text` nativo (10 archivos) |
| `VolumeThermometer.tsx` | Componente sin consumidores; evaluar deprecar o migrar (prioridad baja) |
| Paleta `reminder-ui-tokens.ts` | Colores fuera de wellness (tipografía sí migrada) |
| Estilos HUD legacy en `LevelOneGameView` | Dead styles; render usa `RunnerGameFeedbackBar` |
| Auditar `fontWeight: '800'` suelto fuera de sesión activa | Consolidar con tokens |
| Evaluar barrel `src/shared/ui/index.ts` | Imports directos por archivo hoy |

## Referencias

- [Overview](../00-overview/README.md)
- [Arquitectura](../01-app-architecture/README.md)
- [Regla Cursor: diseño visual](../../.cursor/rules/respira-visual-design.mdc)
