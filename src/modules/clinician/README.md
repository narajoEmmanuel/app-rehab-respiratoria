# Módulo `clinician` (scaffold clínico)

## Propósito

Estructura de carpetas preparada para **futuras** capacidades de visualización y analítica orientadas al profesional de la salud. En el estado actual del repositorio, RESPIRA+ **no incluye un dashboard clínico terminado**, ni persistencia, ni sincronización con backend para uso médico.

La revisión profesional de datos del paciente se realiza hoy mediante **exportación local** (`export/`) e **historial** del propio paciente (`history/`), no mediante este módulo.

---

## Relación con el flujo clínico y funcional

| Canal actual | Rol |
|--------------|-----|
| **Exportación clínica** (`/data-export`) | Paquete JSON/CSV v2.4.0 para revisión con profesional; no informe certificado. |
| **Historial del paciente** | Calendario, rachas y agregados motivacionales; no sustituye expediente clínico. |
| **`clinician/` (scaffold)** | Placeholder arquitectónico; sin rutas Expo ni UI expuesta al usuario final. |

RESPIRA+ es un **prototipo académico** de apoyo en **pacientes adultos postoperatorios**. No diagnostica, no prescribe ni sustituye la valoración del equipo de salud (ITESM, 2026; véase [Seguridad clínica](../../../docs/08-clinical-safety/README.md)).

---

## Archivos y conceptos principales

| Elemento | Estado |
|----------|--------|
| Carpetas `dashboard/`, `reports/`, `export/` | Preparadas para separación futura |
| Tipos y funciones placeholder | Mínimos; sin lógica de negocio |
| Persistencia / API | **No implementadas** |
| Visualización | **No implementada** |

**Diseño previsto:** consumir salidas normalizadas de `session/`, `summary/` e `history/` sin acoplar la lógica de juego ni el pipeline del sensor.

---

## Límites del módulo

- No debe presentarse al usuario como panel médico operativo.
- No reemplaza la exportación ni el consentimiento informado.
- No implica eficacia clínica demostrada ni integración hospitalaria.
- Cloud/Supabase permanece **congelado** por defecto; cualquier sync futuro requeriría diseño regulatorio aparte.

---

## Documentación canónica

- [Exportación de datos](../../../docs/03-features/exportacion-datos.md) · [Módulo export](../export/README.md)
- [Historial](../history/README.md)
- [Datos y almacenamiento](../../../docs/06-data-and-storage/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Validación académica](../../../docs/09-academic-validation/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Exportación de datos — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/exportacion-datos.md`.
