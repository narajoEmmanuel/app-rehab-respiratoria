# Onboarding

## Propósito

Mostrar modal de bienvenida (`RespiraWelcomeOnboarding`) en la primera visita de cada paciente al Inicio; explicación inicial sin bloquear flujos clínicos críticos.

## Archivos principales

| Rol | Ruta |
|-----|------|
| Componente | `src/modules/onboarding/components/RespiraWelcomeOnboarding.tsx` |
| Storage | `src/modules/onboarding/storage/onboarding-storage.ts` |
| Clave | `src/modules/onboarding/constants.ts` (`getWelcomeOnboardingStorageKey`) |
| Integración | `src/modules/home/screens/HomeScreen.tsx` |

Tipografía: `RespiraWelcomeOnboarding` usa `AppText` + tokens (Fase 4L); sin cambio de copy ni lógica de primera visita.

## Rutas relacionadas

- Modal en `/(tabs)/index` — no ruta dedicada.

## Entradas del flujo

- Paciente activo entra a Inicio y `hasSeenWelcomeOnboarding(patientId) === false`.

## Salidas del flujo

- `markWelcomeOnboardingSeen(patientId)` → AsyncStorage por paciente.

## Datos persistidos

`WelcomeOnboardingSeenRecord`: `{ seenAt: ISO string }` bajo clave `@rehab/onboarding_welcome_seen_v1_u{patientId}` (`onboarding/constants.ts`).

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Paciente | Una vez por `patientId` |
| Consent | Independiente |
| Sensor/touch | Sin relación |

## Riesgos clínicos o técnicos

- Copy debe mantener tono apoyo, no prometer curación.
- No sustituir documento legal formal (consent aparte).

## Pendientes

- **Requiere revisión manual:** comportamiento si JSON corrupto en storage (marca como seen).

Documentación del módulo: [onboarding/README.md](../../src/modules/onboarding/README.md).

## Checklist manual mínimo

- [ ] Primer acceso paciente nuevo: modal visible.
- [ ] Cerrar/continuar: no reaparece en segunda visita.
- [ ] Nuevo paciente distinto: modal vuelve a mostrarse.
- [ ] No impide acceso a evaluación si usuario cierra rápido.

## Docs relacionados

- [Inicio](../02-tabs/inicio.md)
- [Términos y consentimiento](./terminos-consentimiento.md)
