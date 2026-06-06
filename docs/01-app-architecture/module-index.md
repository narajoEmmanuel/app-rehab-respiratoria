# Índice de módulos (`src/modules/`)

Referencia breve por módulo. Detalle de rutas y providers: [README.md](./README.md).

> RESPIRA+ es software de apoyo. **No diagnostica** ni sustituye al profesional. Volúmenes = **estimaciones** (sensor + calibración).

---

| Módulo | Responsabilidad | README |
|--------|-----------------|--------|
| `auth/` | Acceso local-first y cloud opcional | [auth/README.md](../../src/modules/auth/README.md) |
| `patient/` | Perfil, contexto paciente, borrado | — *(pendiente o en rama)* |
| `diagnostics/` | Evaluación inicial, VIM, niveles | — |
| `device/` | ESP32, calibración, volumen estimado | [device/README.md](../../src/modules/device/README.md) |
| `session/` | Sesión guiada, juego, persistencia | [session/README.md](../../src/modules/session/README.md) |
| `levels/` | UI Terapia, progreso niveles | [levels/README.md](../../src/modules/levels/README.md) |
| `home/` | Dashboard Inicio | [home/README.md](../../src/modules/home/README.md) |
| `history/` | Historial, calendario, rachas | [history/README.md](../../src/modules/history/README.md) |
| `summary/` | Resumen post-sesión | [summary/README.md](../../src/modules/summary/README.md) |
| `export/` | Export clínico v2.4.0 | — |
| `notifications/` | Recordatorios locales | — |
| `legal/` | Consentimiento y guards | — |
| `onboarding/` | Bienvenida primera visita | [onboarding/README.md](../../src/modules/onboarding/README.md) |
| `app-mode/` | Flags env y modo app | [app-mode/README.md](../../src/modules/app-mode/README.md) |
| `clinician/` | Scaffold (sin rutas) | [clinician/README.md](../../src/modules/clinician/README.md) |
| `plans/` | Reservado (vacío) | — |

---

## Notas transversales

| Tema | Referencia |
|------|------------|
| Consentimiento | `legal/` — [terminos-consentimiento.md](../03-features/terminos-consentimiento.md) |
| HUD/juego `Text` nativo | `session/` — [typography-scale.md](../07-ui-design-system/typography-scale.md) |
| Práctica táctil ≠ sesión oficial | `session/` + `patient/` prefs |
| Storage | [storage-keys.md](../06-data-and-storage/storage-keys.md) |

---

## Docs por dominio

- [Pestañas](../02-tabs/README.md) · [Features](../03-features/README.md) · [Sensor](../04-device-and-sensor/README.md) · [Datos](../06-data-and-storage/README.md)
