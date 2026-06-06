# Módulo `home` (Inicio)

Dashboard principal del paciente: CTA de terapia, estado del sensor, última sesión y accesos esenciales. RESPIRA+ **no diagnostica**; el copy de sensor habla de **volumen estimado**, no presión inspiratoria.

---

## Propósito

- Pantalla **Inicio** (`HomeScreen`) tras gate de arranque y consentimiento.
- Resumen compacto de la última sesión (`HomeLastSessionCard`).
- Integración del modal de bienvenida (`onboarding/RespiraWelcomeOnboarding`).
- Punto de entrada a terapia, sensor, evaluación, exportación e historial.

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

Enlace a `/data-export` desde sección de datos clínicos (requiere consentimiento activo en pantalla de export).

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

## Referencias

- [Pestaña Inicio](../../../docs/02-tabs/inicio.md)
- [Evaluación inicial](../../../docs/03-features/evaluacion-inicial.md)
- [Exportación](../../../docs/03-features/exportacion-datos.md)
- [Onboarding](../../../docs/03-features/onboarding.md)
- Tipografía: `AppText` (Fase 4M) — [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)
