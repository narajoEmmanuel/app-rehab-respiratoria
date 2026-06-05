# Inicio

## Propósito

Dashboard principal del paciente: saludo, estado de evaluación/sesiones, acceso rápido a terapia, sensor, historial y perfil; CTA principal hacia evaluación inicial o sesión sugerida; card de exportación y onboarding de bienvenida.

## Archivos relacionados

| Tipo | Ruta |
|------|------|
| Ruta | `app/(tabs)/index.tsx` |
| Pantalla | `src/modules/home/screens/HomeScreen.tsx` |
| Componente | `src/modules/home/components/HomeLastSessionCard.tsx` |
| Onboarding | `src/modules/onboarding/components/RespiraWelcomeOnboarding.tsx` |
| Top bar | `src/shared/ui/AppTopBar.tsx` |

Subcomponentes inline en `HomeScreen.tsx`: `DeviceCard`, `HomeQuickAccessGrid`.

## Flujo funcional

1. Carga paciente, consent, evaluación, sesiones y estado sensor/calibración.
2. Determina layout: `pre_eval` | `eval_no_sessions` | `has_sessions`.
3. CTA principal: evaluación → `/diagnostico`, o terapia → gates sensor/touch → `/(tabs)/sesion`.
4. Quick access: Terapia, Historial, Sensor (`/sensor-connection`), Perfil (`/profile`).
5. Card exportación → `/data-export` (requiere consent).
6. Primera visita: modal `RespiraWelcomeOnboarding` (AsyncStorage por paciente).

## Datos y persistencia

| Lee | Escribe |
|-----|---------|
| `@rehab/diagnostics_v1`, `@rehab/sessions_v1` | Onboarding: clave en `onboarding/constants.ts` |
| Estado sensor vía `SensorConnectionProvider` | `updateDailyProgress` al lanzar sesión |
| Nivel activo (`diagnostic-service`) | — |

Muestra volumen **estimado** en card de dispositivo; no presión inspiratoria.

## Dependencias y gates

| Gate | Efecto en Inicio |
|------|------------------|
| Paciente | Requerido (redirect en tab layout si falta) |
| Consent | Banner/alertas; tab Inicio siempre accesible |
| Evaluación (`hasDiagnostic`) | Cambia CTA y copy |
| Sensor + calibración | Card dispositivo; readiness para terapia oficial |
| Touch practice | Flag env + pref perfil (`useTouchPracticeGate`) |

Hooks principales: `usePatientSession`, `useConsentActive`, `useTherapyReadinessGate`, `useSensorConnection`, `useCalibrationSnapshot`, `useLevelsProgress`, `useTouchPracticeGate`, `useTouchPracticePreference`.

Servicios: `diagnostic-service`, `session-progress-repository`, `navigate-to-initial-evaluation`, `resolveTherapySessionLaunchInputMode`.

## Riesgos al modificar

- **Alto:** CTAs de terapia y evaluación; lógica duplicada con `LevelsScreen.tsx`.
- **Medio:** onboarding, export card, gates sensor/touch.
- **Clínico:** no presentar volumen como diagnóstico; mantener disclaimers en copy de export.

## Pendientes o revisión manual

- `HomeScreen.tsx` ~1100+ líneas — candidato a refactor (extraer `DeviceCard`, launch controller).
- Lógica `beginOfficialSensorSession` / `navigateToSession` duplicada con Terapia.
- Consent no revalidado al arranque local-first (`app/index.tsx`).

## Checklist manual mínimo

- [ ] Con paciente nuevo: muestra CTA evaluación inicial.
- [ ] Tras evaluación: CTA nivel sugerido visible.
- [ ] Sin sensor: alerta readiness o ruta touch si flag + pref activos.
- [ ] Quick access navega a tabs/rutas correctas.
- [ ] Onboarding aparece solo primera vez por paciente.
- [ ] Card exportación respeta consent inactivo.

## Docs relacionados

- [Evaluación inicial](../03-features/evaluacion-inicial.md)
- [Exportación](../03-features/exportacion-datos.md)
- [Onboarding](../03-features/onboarding.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
