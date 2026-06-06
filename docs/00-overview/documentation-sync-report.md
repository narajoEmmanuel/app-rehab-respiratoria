# Revisión final de documentación

## Fecha y alcance

**Fecha:** 5 de junio de 2026  
**Alcance:** Revisión de README y Markdown del repositorio RESPIRA+ tras integración en master de: auditoría integral, documentación centralizada en `docs/`, consentimiento local-first, bloqueo de evaluación sin consentimiento, limpieza conservadora de código muerto, base tipográfica `AppText` y migración de pantallas (Fases 4A–4O).

**Restricción:** solo archivos Markdown; sin cambios en código runtime.

---

## Archivos revisados

### Raíz

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Visión general, alcance clínico, arquitectura | Actualizado (sin cambios en esta pasada) |
| `README_CLOUD_FREEZE.md` | Modo local-first vs cloud | Actualizado |

### `docs/00-overview/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Overview producto | Actualizado |
| `documentation-sync-report.md` | Este reporte | Creado |

### `docs/01-app-architecture/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Índice arquitectura, rutas, módulos | Actualizado (sin cambios en esta pasada) |

### `docs/02-tabs/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Índice pestañas | Actualizado (sin cambios) |
| `inicio.md` | HomeScreen, gates, AppText 4M | Actualizado (sin cambios) |
| `terapia.md` | LevelsScreen, unlock | Actualizado |
| `historial.md` | HistoryScreen, AppText 4N | Actualizado (sin cambios) |
| `perfil-configuracion.md` | Perfil, recordatorios, refresh foco | Actualizado (sin cambios) |

### `docs/03-features/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Índice funciones | Actualizado |
| `evaluacion-inicial.md` | VIM, consent guard | Actualizado (sin cambios) |
| `sesion-terapia.md` | SessionScreen, excepción HUD | Actualizado (sin cambios) |
| `resumen-sesion.md` | SummaryScreen, AppText 4D | Actualizado (sin cambios) |
| `exportacion-datos.md` | Export v2.4.0 | Actualizado (sin cambios) |
| `notificaciones.md` | Estado Perfil↔Notif, anti-repetición | Actualizado (sin cambios) |
| `terminos-consentimiento.md` | Consent local-first, evaluación | Actualizado (sin cambios) |
| `niveles-progresion.md` | Unlock 6 perfectas | Actualizado (sin cambios) |
| `onboarding.md` | Modal bienvenida 4L | Actualizado (sin cambios) |

### `docs/04-device-and-sensor/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Índice sensor, volumen estimado | Actualizado (sin cambios) |
| `sensor-flow.md` | Flujo técnico central | Actualizado |
| `websocket-protocol.md` | Protocolo WS | Actualizado (sin cambios) |
| `esp32-firmware.md` | Firmware referencia | Actualizado (sin cambios) |
| `hardware-lab.md` | Rutas dev | Actualizado (sin cambios) |

### `docs/05-calibration/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Índice calibración 3000 mL | Actualizado (sin cambios) |
| `patient-flow.md` | Modelo predefinido | Actualizado (sin cambios) |
| `technical-flow.md` | Calibración técnica | Actualizado (sin cambios) |
| `csv-tecnico.md` | CSV schema 2.4.0 | Actualizado (sin cambios) |
| `legacy-5000ml.md` | Perfil histórico | Conservado como histórico |

### `docs/06-data-and-storage/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Persistencia local-first | Actualizado (sin cambios) |
| `export-schema-v2.4.0.md` | Schema export clínico | Actualizado (sin cambios) |
| `data-models.md`, `storage-keys.md`, `privacy-and-local-data.md`, `session-records.md` | Modelos y claves | Actualizado (sin cambios) |

### `docs/07-ui-design-system/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Estado AppText, excepción HUD | **Actualizado** |
| `typography-scale.md` | Escala, fases 4B–4O, excepción juego | Actualizado (sin cambios) |

### `docs/08-clinical-safety/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Lenguaje clínico, consent, volumen estimado | Actualizado (sin cambios) |

### `docs/12-legacy/` y históricos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `README.md` | Elementos conservados por auditoría | Conservado |
| `deprecated-components.md` | Componentes retirados | Conservado |
| `docs/sensor-flow.md` | Flujo sensor (legacy raíz) | **Actualizado** (v2.4.0) |
| `docs/calibration/README.md` | Calibración histórica | Conservado, alineado |
| `docs/calibration/README-csv-tecnico-calibracion.md` | Diccionario CSV técnico | Conservado |
| `docs/calibration-system-readme.md` | Sistema calibración | Conservado |
| `docs/calibration/legacy/README.md` | Legacy 5000 mL | Conservado |
| `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md` | Auditoría mayo 2026 | Conservado como histórico |
| `docs/legal/README-terminos-y-condiciones.md` | Framework legal equipo | Actualizado (sin cambios) |
| `docs/supabase-security-notes.md` | Seguridad Supabase dev | Actualizado (sin cambios) |

### `src/docs/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `architecture.md` | Arquitectura técnica, AppText, riesgos | **Actualizado** |
| `architecture_folders_guide.md` | Guía carpetas equipo | **Actualizado** |
| `team-ownership.md` | Ownership módulos | Actualizado (sin cambios) |

### `src/modules/**/README.md`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `device/README.md` | Sensor ESP32 implementado | Actualizado (sin cambios) |
| `device/calibration/README.md` | Pipeline calibración | Actualizado (sin cambios) |
| `session/README.md` | Terapia, excepción HUD | **Actualizado** |
| `auth/README.md` | Acceso local/cloud | **Actualizado** |
| `clinician/README.md` | Scaffold futuro | Actualizado (sin cambios; sigue scaffold) |

### `assets/`

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `mascot/README.md` | PNG mascota | Actualizado (sin cambios) |

### Excluidos (terceros / skills)

- `libraries/**/*.md` — dependencias Arduino vendoreadas
- `.agents/skills/**/*.md` — skills Supabase/postgres

---

## Archivos actualizados

1. `docs/07-ui-design-system/README.md` — estado post-migración 4B–4N; excepción HUD; pendientes reales
2. `docs/sensor-flow.md` — export clínico v2.1.0 → **v2.4.0**
3. `docs/00-overview/README.md` — madurez design system
4. `docs/03-features/README.md` — enlace a `04-device-and-sensor/` (ya no «pendiente»)
5. `docs/02-tabs/terapia.md` — nota AppText Fase 4G
6. `docs/04-device-and-sensor/sensor-flow.md` — nota sync legacy
7. `README_CLOUD_FREEZE.md` — consentimiento en arranque local-first
8. `src/docs/architecture_folders_guide.md` — `device/` y `patient/` operativos; tipografía
9. `src/docs/architecture.md` — `AppText`, riesgo tipográfico, paridad consent cloud
10. `src/modules/auth/README.md` — alcance real local-first + cloud
11. `src/modules/session/README.md` — excepción HUD/juego documentada
12. `docs/00-overview/documentation-sync-report.md` — este documento

---

## Cambios principales

### README raíz

- `README.md` ya reflejaba v2.4.0, consent local-first, volumen estimado y presión fuera de alcance. Sin edición.
- `README_CLOUD_FREEZE.md`: añadida nota de `isConsentActive()` en arranque local-first.

### Arquitectura

- `architecture_folders_guide.md`: corregido que `device/` era «placeholder»; `patient/` ya no «reservado».
- `architecture.md`: sección UI con `AppText`; riesgo tipográfico rebajado; riesgo paridad consent cloud/local.

### Design system

- `07-ui-design-system/README.md`: reescrito estado actual — pantallas migradas, excepción HUD, regla no forzar AppText, copy «volumen estimado».
- `typography-scale.md` ya estaba completo (Fases 4B–4O).

### Seguridad clínica

- `08-clinical-safety/README.md`, `terminos-consentimiento.md`, `evaluacion-inicial.md`, `inicio.md` ya documentaban consent, no diagnóstico, volumen estimado y presión fuera de alcance.

### Notificaciones

- `notificaciones.md` y `perfil-configuracion.md` ya documentaban estado compartido, refresh al volver a Perfil, estados Activas/Pausadas/Sin permiso/Solo en app y anti-repetición consecutiva.

### Sensor y calibración

- Docs centralizadas en `04-device-and-sensor/` y `05-calibration/` ya correctas (ESP32+VL53L0X, WS local, 3000 mL, legacy 5000, volumen estimado).
- Corregido drift v2.1.0 en `docs/sensor-flow.md` legacy.

### Datos y storage

- `export-schema-v2.4.0.md` y `exportacion-datos.md` ya en v2.4.0.

### Módulos

- `auth/README.md`: de «scaffold» a descripción real del flujo local/cloud.
- `session/README.md`: excepción tipográfica HUD documentada.
- `device/README.md`, `clinician/README.md`: sin cambios (device correcto; clinician sigue scaffold).

### README modulares menores (jun 2026)

Completada documentación breve de módulos de soporte:

| Módulo | Archivo |
|--------|---------|
| `levels/` | `src/modules/levels/README.md` |
| `home/` | `src/modules/home/README.md` |
| `history/` | `src/modules/history/README.md` |
| `summary/` | `src/modules/summary/README.md` |
| `onboarding/` | `src/modules/onboarding/README.md` |
| `app-mode/` | `src/modules/app-mode/README.md` |

Actualizados `docs/01-app-architecture/module-index.md` y enlaces en `docs/01-app-architecture/README.md`.

---

## Documentos que se conservan como históricos

| Documento | Motivo |
|-----------|--------|
| `docs/sensor-flow.md` (raíz) | Referencia legacy enlazada desde README; sincronizado en export v2.4.0 |
| `docs/calibration/README.md` | Detalle histórico de calibración; índice canónico en `05-calibration/` |
| `docs/calibration/README-csv-tecnico-calibracion.md` | Diccionario extenso CSV técnico |
| `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md` | Auditoría mayo 2026 — snapshot técnico |
| `docs/05-calibration/legacy-5000ml.md` | Compatibilidad perfil Besmed 5000 mL |
| `docs/12-legacy/*` | Registro de limpieza conservadora |

---

## Pendientes reales

| Pendiente | Área | Notas |
|-----------|------|-------|
| Paridad cloud: retiro consent con misma versión | Legal | `needsConsent()` vs `isConsentActive()` — revisión manual |
| Consent fail-open en error AsyncStorage | Arranque | `app/index.tsx` |
| HUD/juego: mantener `Text` nativo | Design system | Excepción deliberada documentada |
| `SessionSuccessStreakCard`, `therapy-level-card.tsx` | Tipografía | Sin migrar a AppText |
| Paleta `reminder-ui-tokens.ts` | Notificaciones | Colores fuera de wellness |
| Refactor pantallas monolíticas | Arquitectura | Home, History, Session, calibración técnica capture |
| Niveles 2–6 gameplay | Terapia | Registry existe; gameplay parcial |
| Módulo `clinician/` | Producto | Scaffold sin rutas |
| READMEs módulos críticos | Módulos | `patient/`, `diagnostics/`, `export/`, `notifications/`, `legal/` (si aún sin README en rama) |
| Logout local-first → `/auth/login` | Perfil | Revisión UX |
| Validación clínica formal | Producto | Software en desarrollo avanzado |

---

## Observaciones

- La mayoría de docs centralizados en `docs/` ya habían sido actualizados en fases previas; esta revisión corrigió **drift residual** (export v2.1.0, device placeholder, design system «pendiente», índice features → 04).
- No se inventaron funcionalidades; cambios limitados a precisión de estado y enlaces.
- `typography-scale.md` es la fuente de verdad para pantallas migradas y excepción HUD.

---

## Verificación

Ejecutar tras revisar diff:

```bash
npm run lint
git diff --check
```

Resultados registrados al cierre de esta revisión — ver entrega al usuario.
