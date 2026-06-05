# Legacy y limpieza conservadora

Registro de código eliminado o conservado tras auditorías, sin sustituir la documentación funcional de producto.

| Documento | Contenido |
|-----------|-----------|
| [deprecated-components.md](./deprecated-components.md) | Eliminaciones Fase 3 (código muerto verificado) |

## Qué no se elimina en Fase 3

Elementos detectados por auditoría pero **conservados** por riesgo, uso potencial o revisión pendiente:

| Elemento | Motivo |
|----------|--------|
| `src/modules/clinician/` | Scaffold futuro; sin rutas activas — documentar, no borrar |
| `seedLocalPrototypeConsentForPatient` | Bypass dev explícito; restricción de fase |
| `src/modules/plans/` | Vacío; roadmap posible |
| `src/data/mock/`, `src/data/storage/` | Placeholders `.gitkeep` |
| Assets legales duplicados | Riesgo legal |
| Dependencias `package.json` | Fuera de alcance Fase 3 |
| `ensureLocalPrototypePatientRecord`, placeholders clinician | 0 imports pero no en lista aprobada |

## Referencias

- [Arquitectura](../01-app-architecture/README.md)
- [Auditoría device (mayo 2026)](../AUDITORIA-TECNICA-SENSOR-ESP32.md)
