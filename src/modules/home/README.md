# Módulo `home` (Inicio)

## Propósito

Dashboard principal del **paciente** tras el gate de arranque y el consentimiento informado. Centraliza el acceso a terapia gamificada, conexión del sensor, evaluación inicial, historial y exportación. El copy de sensor enfatiza **volumen estimado**, no presión inspiratoria ni diagnóstico.

RESPIRA+ es un **prototipo académico** de apoyo en **pacientes adultos postoperatorios** (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

Inicio actúa como **hub** del recorrido local-first:

| Estado del paciente | CTA principal |
|---------------------|---------------|
| Sin evaluación | Evaluación inicial (VIM) |
| Con evaluación, meta diaria cumplida | Refuerzo motivacional |
| Listo para terapia | Nivel sugerido → `useTherapySessionLauncher` |

Integraciones transversales:

- **Sensor** (`device/`): `HomeDeviceCard` — conexión ESP32/VL53L0X y calibración.
- **Terapia** (`levels/`, `session/`): lanzamiento con compuertas de readiness.
- **Export** (`export/`): `/data-export` para revisión profesional (no informe certificado).
- **Historial** (`history/`): acceso rápido desde grid.

**Modo local con sensor:** flujo recomendado para sesión y VIM oficiales.

**Modo touch / web / demo:** CTAs pueden ofrecer práctica táctil; no equivale a medición con hardware.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Pantalla (orquestación) | `screens/HomeScreen.tsx` |
| Card última sesión | `components/HomeLastSessionCard.tsx` |
| Estado loading / sin paciente | `components/HomeLoadingState.tsx` |
| Saludo | `components/HomeHeaderGreeting.tsx` |
| CTA evaluación inicial | `components/HomeEvaluationCtaCard.tsx` |
| CTA meta diaria | `components/HomeDailyGoalCtaCard.tsx` |
| CTA terapia sugerida | `components/HomeTherapyCtaCard.tsx` |
| Progreso vacío / con datos | `components/HomeProgressEmptyState.tsx`, `HomeProgressTodayCard.tsx` |
| Tarjeta sensor | `components/HomeDeviceCard.tsx` |
| Accesos rápidos | `components/HomeQuickAccessGrid.tsx` |
| Consentimiento pendiente | `components/HomeConsentNoticeCard.tsx` |
| Exportación | `components/HomeExportCard.tsx` |
| Clave de acceso | `components/HomeAccessKeyCard.tsx` |

**Ruta:** `app/(tabs)/index.tsx` → `HomeScreen`.

---

## HomeScreen — orquestación (Fase 5A)

`HomeScreen` conserva toda la lógica de negocio y los hooks. Los componentes en `components/` son **puramente presentacionales**: reciben props y renderizan; no navegan ni consultan estado global por sí mismos.

### Lógica que permanece en HomeScreen

- Hooks: `usePatientSession`, `useConsentActive`, `useCalibrationSnapshot`, `useTherapyReadinessGate`, `useSensorConnection`, `useLevelsProgress`, `useTouchPracticeGate`, `useTouchPracticePreference`.
- Carga de progreso (`loadProgress`), layout `pre_eval` | `eval_no_sessions` | `has_sessions`.
- Lanzamiento de terapia: `goStartRecommendedLevel` (gates locales) → `useTherapySessionLauncher().launchTherapySession` (Fase 5B).
- Gates de consentimiento en CTAs y sensor.
- Onboarding: `hasSeenWelcomeOnboarding` / `markWelcomeOnboardingSeen` + `RespiraWelcomeOnboarding`.
- Derivados: `lastSession`, `weeklyCompleted`, `therapyCtaDisabled`, `sensorSignalLive`.

### Componentes extraídos — responsabilidades

| Componente | Renderiza | Props principales |
|------------|-----------|-------------------|
| `HomeLoadingState` | Placeholder sin paciente | `onGoToLogin` |
| `HomeHeaderGreeting` | Saludo + tagline | `firstName` |
| `HomeEvaluationCtaCard` | CTA evaluación inicial | `onPress` |
| `HomeDailyGoalCtaCard` | CTA meta diaria completada | `onPress` |
| `HomeTherapyCtaCard` | CTA nivel sugerido | `levelDisplayName`, `buttonTitle`, `onPress`, `disabled` |
| `HomeProgressEmptyState` | Sin sesiones hoy | — |
| `HomeProgressTodayCard` | Métricas hoy/semana + barra | `todayCompletedSessions`, `weeklyCompleted` |
| `HomeDeviceCard` | Estado sensor/calibración (incl. helpers de copy) | `calibrationSnapshot`, `sensorConnected`, `sensorSignalLive`, `onPress` |
| `HomeQuickAccessGrid` | Grid Terapia/Historial/Sensor/Perfil | callbacks `onTherapy`, `onHistory`, `onSensor`, `onProfile` |
| `HomeConsentNoticeCard` | Aviso consentimiento pendiente | `onReviewPress` |
| `HomeExportCard` | Card exportación clínica | `onPress` |
| `HomeAccessKeyCard` | Clave de acceso del paciente | `clave` |
| `HomeLastSessionCard` | Resumen última sesión | `session` |

### Secciones visuales (sin cambio funcional)

- **Header** — `HomeHeaderGreeting`.
- **CTA principal** — uno de evaluación, meta diaria o terapia según estado.
- **Sensor / calibración** — `HomeDeviceCard`; copy: *«Conecta el sensor para medir tu volumen estimado.»*
- **Progreso** — `HomeProgressEmptyState` o `HomeProgressTodayCard`.
- **Última sesión** — `HomeLastSessionCard` cuando hay datos.
- **Accesos** — `HomeQuickAccessGrid`.
- **Footer** — consentimiento, exportación, clave.
- **Onboarding** — modal en `HomeScreen` (no extraído).

Requiere `PatientSessionProvider` y paciente activo; sin paciente, `HomeLoadingState`.

---

## HomeLastSessionCard

Muestra la sesión más reciente del paciente:

- Fecha, estado (completada / interrumpida).
- Progreso de repeticiones válidas vs objetivo (`TARGET_ATTEMPTS`).
- **Volumen máx. estimado** y **volumen prom. estimado** (mL).
- Labels con «estimado» (Fase 4M).

---

## Onboarding (integración)

`HomeScreen` consulta `hasSeenWelcomeOnboarding(patientId)` y muestra `RespiraWelcomeOnboarding` una vez por paciente. Al continuar: `markWelcomeOnboardingSeen`.

Detalle: [onboarding/README.md](../onboarding/README.md).

---

## Sensor y calibración

- `useSensorConnection`, `useTherapyReadinessGate`, `useCalibrationSnapshot`.
- Inicio de sesión oficial solo tras readiness OK (o flujo táctil documentado en alerta).
- Calibración técnica visible solo si `isTechnicalCalibrationEnabled()`.

---

## Exportación

Enlace a `/data-export` desde sección de datos clínicos (requiere consentimiento activo en pantalla de export). Apoyo para revisión profesional; ver [Módulo export](../export/README.md).

---

## Límites del módulo

- No administra identidad (ver `patient/`, `auth/`).
- No ejecuta sesión ni validación de intentos.
- Cloud auth no es flujo principal (`README_CLOUD_FREEZE.md`).

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Lanzar terapia sin readiness | Sesiones sin volumen estimado fiable |
| Omitir gate de consentimiento en CTAs | Acceso clínico sin aceptación legal |
| Mostrar volumen sin «estimado» | Expectativa de medición clínica incorrecta |
| Duplicar lógica de unlock/progreso | Drift con `levels/` y `session/` |
| Mover lógica a componentes presentacionales | Romper gates o duplicar navegación |
| Alterar `HomeDeviceCard` helpers | Drift de copy clínico de sensor/calibración |
| Cambiar props de CTAs sin revisar HomeScreen | Desincronizar disabled/títulos dinámicos |

---

## Documentación canónica

- [Pestaña Inicio](../../../docs/02-tabs/inicio.md)
- [Evaluación inicial](../../../docs/03-features/evaluacion-inicial.md)
- [Exportación](../../../docs/03-features/exportacion-datos.md)
- [Onboarding](../../../docs/03-features/onboarding.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Web / demo](../../../docs/12-web-cloud-migration/README.md)
- Tipografía: [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Exportación de datos — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/exportacion-datos.md`.
