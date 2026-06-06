# Pestañas principales — Índice

Documentación de las secciones visibles en la barra de tabs y del perfil (stack fuera de tabs).

| Pestaña | Ruta | Documento |
|---------|------|-----------|
| **Inicio** | `/(tabs)/index` | [inicio.md](./inicio.md) |
| **Terapia** | `/(tabs)/terapia` | [terapia.md](./terapia.md) |
| **Historial** | `/(tabs)/historial` | [historial.md](./historial.md) |
| **Perfil / Configuración** | `/profile` (tab legacy `/(tabs)/perfil` → redirect) | [perfil-configuracion.md](./perfil-configuracion.md) |

Tabs ocultas (`href: null` en `app/(tabs)/_layout.tsx`):

| Ruta | Pantalla | Documentación |
|------|----------|---------------|
| `/(tabs)/sesion` | Sesión activa | [../03-features/sesion-terapia.md](../03-features/sesion-terapia.md) |
| `/(tabs)/resumen` | Resumen post-sesión | [../03-features/resumen-sesion.md](../03-features/resumen-sesion.md) |

## Gates comunes

| Gate | Inicio | Terapia | Historial | Perfil |
|------|:------:|:-------:|:---------:|:------:|
| Paciente activo | Sí | Sí | Sí | Sí |
| Consent activo (tab press) | No | Sí | Sí | Parcial* |

\* Perfil accesible desde `AppTopBar`; acciones sensibles verifican consent internamente.

## Referencias

- [Arquitectura](../01-app-architecture/README.md)
- [Funciones](../03-features/README.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
