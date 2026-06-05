# Datos y almacenamiento — Índice

Persistencia **local-first** (AsyncStorage). Sin backend obligatorio en flujo paciente por defecto.

| Documento | Contenido |
|-----------|-----------|
| [storage-keys.md](./storage-keys.md) | Claves AsyncStorage |
| [data-models.md](./data-models.md) | Entidades TypeScript |
| [session-records.md](./session-records.md) | Sesiones e intentos |
| [export-schema-v2.4.0.md](./export-schema-v2.4.0.md) | Export clínico |
| [privacy-and-local-data.md](./privacy-and-local-data.md) | Privacidad y borrado |

## Fuente de verdad claves clínicas

`src/modules/patient/storage-keys.ts` — prefijo `@rehab/*` para datos de paciente/sesión/diagnóstico.

## Referencias

- [Seguridad clínica](../08-clinical-safety/README.md)
- [Exportación](../03-features/exportacion-datos.md)
- [Calibración](../05-calibration/README.md)
