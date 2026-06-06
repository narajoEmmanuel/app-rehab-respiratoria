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
| Pantalla | `screens/HomeScreen.tsx` |
| Card última sesión | `components/HomeLastSessionCard.tsx` |

**Ruta:** `app/(tabs)/index.tsx` → `HomeScreen`.

---

## HomeScreen — secciones y CTAs

- **Header** — saludo con nombre del paciente activo.
- **CTA principal** — iniciar terapia en nivel activo (compuerta sensor + consentimiento).
- **Sensor / calibración** — estado de conexión, señal en vivo, enlace a `/sensor-connection`; copy: *«Conecta el sensor para medir tu volumen estimado.»*
- **Evaluación inicial** — si no hay diagnóstico, CTA vía `navigateToInitialEvaluation`.
- **Métricas rápidas** — sesiones de la semana, sesiones hoy, nivel activo.
- **Última sesión** — `HomeLastSessionCard` cuando hay datos.
- **Accesos** — Terapia, Historial, Exportación (`/data-export`), Perfil.
- **Onboarding** — modal de bienvenida en primera visita por paciente.

Requiere `PatientSessionProvider` y paciente activo; sin paciente, redirige a flujo de acceso.

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

---

## Referencias

- [Pestaña Inicio](../../../docs/02-tabs/inicio.md)
- [Evaluación inicial](../../../docs/03-features/evaluacion-inicial.md)
- [Exportación](../../../docs/03-features/exportacion-datos.md)
- [Onboarding](../../../docs/03-features/onboarding.md)
- Tipografía: `AppText` (Fase 4M) — [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)
