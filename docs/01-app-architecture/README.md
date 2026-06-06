# Arquitectura de la app — Índice

Índice de alto nivel de la arquitectura RESPIRA+. Para detalle técnico de capas, providers y riesgos, ver también [src/docs/architecture.md](../../src/docs/architecture.md).

## Mapa de carpetas principales

```
app-rehab-respiratoria/
├── app/                    # Rutas Expo Router (delgadas)
├── src/
│   ├── modules/            # Dominio por feature
│   ├── shared/             # UI, tema, utils, branding
│   ├── theme/              # Tokens adicionales (niveles, dashboard)
│   ├── lib/                # Supabase / cloud (opcional)
│   └── docs/               # Notas técnicas de equipo
├── assets/                 # Imágenes, PDFs legales, mascota
├── docs/                   # Documentación central del proyecto
├── arduino_codes/          # Firmware ESP32 de referencia
├── libraries/              # Libs Arduino vendoreadas (no bundle RN)
└── supabase/               # Schema SQL (cloud opcional)
```

## Tabla de módulos (`src/modules/`)

| Módulo | Archivos (~) | Responsabilidad | README módulo |
|--------|:------------:|-----------------|---------------|
| `device/` | 69 | WebSocket ESP32, calibración, volumen, pantallas sensor | [device/README.md](../../src/modules/device/README.md) |
| `session/` | 56 | Terapia, sesión, intentos, juego, persistencia, unlock | [session/README.md](../../src/modules/session/README.md) |
| `patient/` | 20 | Perfil, prefs, contexto paciente, borrado local | — |
| `diagnostics/` | 20 | Evaluación inicial, VIM, `patient_levels` | — |
| `export/` | 13 | Export JSON/CSV clínico v2.4.0 | — |
| `notifications/` | 16 | Recordatorios locales | — |
| `legal/` | 10 | Consentimiento, guards, PDF | [docs/legal](../legal/README-terminos-y-condiciones.md) |
| `auth/` | 13 | Login cloud, perfil local | [auth/README.md](../../src/modules/auth/README.md) |
| `levels/` | 7 | UI Terapia, progreso niveles | — |
| `home/` | 2 | Dashboard Inicio | — |
| `history/` | 3 | Historial y agregados | — |
| `summary/` | 5 | Resumen post-sesión | — |
| `onboarding/` | 3 | Modal bienvenida | — |
| `app-mode/` | 4 | Feature flags env | — |
| `clinician/` | 8 | Scaffold (sin rutas) | [clinician/README.md](../../src/modules/clinician/README.md) |
| `plans/` | 1 | Vacío | — |

## Tabla de rutas principales (`app/`)

| Ruta | Archivo | Pantalla / módulo |
|------|---------|-------------------|
| `/` | `app/index.tsx` | Gate arranque (local / cloud) |
| `/(tabs)/index` | `app/(tabs)/index.tsx` | Inicio → `HomeScreen` |
| `/(tabs)/terapia` | `app/(tabs)/terapia.tsx` | Terapia → `LevelsScreen` |
| `/(tabs)/sesion` | `app/(tabs)/sesion.tsx` | Sesión → `SessionScreen` (tab oculta) |
| `/(tabs)/historial` | `app/(tabs)/historial.tsx` | Historial → `HistoryScreen` |
| `/(tabs)/resumen` | `app/(tabs)/resumen.tsx` | Resumen → `SummaryScreen` (tab oculta) |
| `/profile` | `app/profile.tsx` | Perfil → `ProfileScreen` |
| `/auth/local-profile` | `app/auth/local-profile.tsx` | Alta perfil local |
| `/auth/login` | `app/auth/login.tsx` | Login cloud |
| `/legal/accept` | `app/legal/accept.tsx` | Consentimiento |
| `/legal/document` | `app/legal/document.tsx` | Documento legal PDF |
| `/diagnostico` | `app/diagnostico.tsx` | Evaluación inicial |
| `/diagnostico-resumen` | `app/diagnostico-resumen.tsx` | Resumen post-examen |
| `/evaluacion-resumen` | `app/evaluacion-resumen.tsx` | Resumen histórico evaluación |
| `/sensor-connection` | `app/sensor-connection.tsx` | Conexión sensor |
| `/sensor-calibration` | `app/sensor-calibration.tsx` | Calibración (técnica si flag) |
| `/data-export` | `app/data-export.tsx` | Exportación clínica |
| `/notification-settings` | `app/notification-settings.tsx` | Recordatorios |
| `/hardware-lab` | `app/hardware-lab.tsx` | Lab hardware (dev) |
| `/esp32-raw-test` | `app/esp32-raw-test.tsx` | Test WS mínimo (dev) |

## Tabla de providers globales

Definidos en `app/_layout.tsx`:

| Provider | Archivo |
|----------|---------|
| `ThemeProvider` | `@react-navigation/native` |
| `AppModeProvider` | `src/modules/app-mode/app-mode-context.tsx` |
| `SensorConnectionProvider` | `src/modules/device/state/SensorConnectionProvider.tsx` |
| `PatientSessionProvider` | `src/modules/patient/context/PatientSessionContext.tsx` |
| `TouchPracticePreferenceProvider` | `src/modules/session/hooks/use-touch-practice-preference.tsx` |
| `LevelsProgressProvider` | `src/modules/levels/state/levels-progress-context.tsx` |

## Tabla de servicios críticos

| Servicio | Archivo | Función |
|----------|---------|---------|
| Persistencia sesión + unlock | `session/session-progress-service.ts` | `persistSessionResult`, `checkAndUnlockNextLevel` |
| Evaluación + niveles paciente | `diagnostics/diagnostic-service.ts` | VIM, `generatePatientLevels`, `hasDiagnostic` |
| Consentimiento | `legal/consent-service.ts` | `needsConsent`, `isConsentActive`, `acceptConsent` |
| Paciente | `patient/patient-service.ts` | CRUD local, paciente actual |
| Volumen estimado | `device/volume-estimation/volume-estimation-service.ts` | Distancia → mL |
| Readiness terapia | `device/volume-estimation/therapy-readiness-service.ts` | Compuerta antes de sesión oficial |
| Calibración predefinida | `device/calibration/predefined-calibration-service.ts` | Instala modelo RESPIRA+ 3000 mL |
| Export clínico | `export/services/clinical-export-service.ts` | Snapshot v2.4.0 |
| Validación intentos | `session/sensor-evaluation/session-attempt-validation-service.ts` | Reglas oficiales sensor |
| Lanzamiento sesión | `session/hooks/resolve-therapy-session-launch.ts` | Sensor vs touch |

## Flujo de datos (resumen)

```
ESP32 (distanceMm) → SensorConnectionProvider → volume-estimation → SessionScreen
                                                              ↓
                                                    session-progress-service
                                                              ↓
                              AsyncStorage (@rehab/sessions_v1, attempts_v1)
                                                              ↓
                              history/ · summary/ · export/ (v2.4.0)
```

## Documento técnico de referencia

El archivo [src/docs/architecture.md](../../src/docs/architecture.md) contiene:

- Principios de capas y separación device/UI
- Descripción extendida de módulos
- Provider tree y gates (consent, evaluación, sensor, touch)
- Claves AsyncStorage
- Riesgos arquitectónicos conocidos (auditoría jun-2026)

## Otras referencias

- [Overview del producto](../00-overview/README.md)
- [Pestañas principales](../02-tabs/README.md)
- [Funciones y flujos](../03-features/README.md)
- [Dispositivo y sensor](../04-device-and-sensor/README.md)
- [Calibración](../05-calibration/README.md)
- [Datos y almacenamiento](../06-data-and-storage/README.md)
- [Design system / tipografía](../07-ui-design-system/README.md)
- [Legacy y limpieza](../12-legacy/README.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Flujo del sensor](../sensor-flow.md)
- [Calibración](../calibration/README.md)
- [Ownership por equipo](../../src/docs/team-ownership.md)
