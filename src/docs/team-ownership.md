# Ownership por equipo

Plantilla para repartir trabajo sin solapar conflictos frecuentes. Copia la tabla a tu herramienta (Notion, Linear, etc.) y asigna nombres o iniciales.

## Tabla de ownership

| Área del código | Carpetas / archivos típicos | Responsable (nombre) | Notas |
|-----------------|----------------------------|----------------------|-------|
| Rutas Expo Router | `app/` | | Solo wrappers; PRs pequeños. |
| Home + niveles | `src/modules/home/`, `src/modules/levels/` | | UX paciente, navegación a sesión. |
| Sesión | `src/modules/session/` | | Core, games, levels, registry, screens. |
| Resumen + historial | `src/modules/summary/`, `src/modules/history/` | | Post-sesión y listados. |
| Planes | `src/modules/plans/` | | Calendario y plan semanal. |
| Auth | `src/modules/auth/` | | Login/registro (ligero hasta backend). |
| Dispositivo | `src/modules/device/` | | Bluetooth, ingestion, adapters, mocks. |
| Clínico | `src/modules/clinician/` | | Dashboard, reports, export. |
| Paciente (perfil) | `src/modules/patient/` | | Perfil y preferencias futuras. |
| Compartido | `src/shared/` | | Coordinar en PR: tema, UI, utils. |
| Datos locales | `src/data/` | | Storage y mocks. |
| Documentación | `src/docs/`, README raíz | | Cambios de arquitectura visibles. |

## Reglas de colisión

1. **Un PR por área cuando sea posible.** Si dos personas tocan `src/shared/theme`, mergear en orden o dividir commits.
2. **`app/`:** Coordinar con quien cambie tabs o stack; conflictos son de nombres de archivo.
3. **`session/registry`:** Quien añada niveles debe avisar en el canal de sesión para no pisar IDs.
4. **`shared`:** Los cambios globales de color o tipografía deben revisarse por alguien con contexto de UI.

## Checklist antes de abrir PR

- [ ] Lint local (`npm run lint`).
- [ ] App arranca en la plataforma que tocas (web / Android / iOS).
- [ ] Si tocaste contratos (`session`, `device`, `clinician`), actualiza el README del módulo en el mismo PR o el siguiente.

## Plantilla de mensaje (Slack / Teams)

```
Área: [session | device | ...]
Rama: feat/nombre-corto
Toco: rutas / pantallas / tipos
No toco: shared/theme (salvo X)
Necesito review de: @persona
```
