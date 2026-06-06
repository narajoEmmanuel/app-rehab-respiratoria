# Módulo `onboarding` (bienvenida)

Modal de **primera visita** con la mascota Respira Bunny. Refuerza el tono calmado y de apoyo de RESPIRA+ sin sustituir educación clínica ni consentimiento legal.

---

## Propósito

- Presentar la guía visual (`RespiraBunnyImage`) en el primer acceso a Inicio por paciente.
- Persistir «ya visto» por `paciente_id` en AsyncStorage.
- No bloquear flujos clínicos; el usuario puede cerrar y continuar.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Modal UI | `components/RespiraWelcomeOnboarding.tsx` |
| Storage | `storage/onboarding-storage.ts` |
| Clave | `constants.ts` |

**Integración:** `HomeScreen` controla visibilidad (`welcomeVisible`, `handleWelcomeContinue`).

Ruta dev opcional: `app/dev/respira-bunny-image-showcase.tsx` (showcase de poses, no flujo producto).

---

## RespiraWelcomeOnboarding

- Modal transparente con `RespiraBunnyImage` pose `happy`.
- Copy de bienvenida y CTA continuar / cerrar (X).
- Paleta lavanda local al modal (acento distinto del teal principal).
- Tipografía: `AppText` (Fase 4L).
- **No** usa HUD de juego ni `Text` nativo de sesión activa.

---

## Storage de primera visita

| Clave | Formato |
|-------|---------|
| `@rehab/onboarding_welcome_seen_v1_u{patientId}` | `{ seenAt: ISO string }` |

API:

- `hasSeenWelcomeOnboarding(patientId)` — si true, no mostrar modal.
- `markWelcomeOnboardingSeen(patientId)` — al cerrar/continuar.
- `clearWelcomeOnboardingSeen(patientId)` — utilidad de reset (tests / borrado manual).

Al borrar paciente, la clave queda huérfana hasta limpieza explícita (no crítica para producto).

---

## Relación con paciente activo

El check se ejecuta cuando `HomeScreen` tiene `patient.paciente_id` hidratado. Cada paciente local ve la bienvenida **una vez**.

No depende de consentimiento ni evaluación inicial.

---

## Relación con Home

Único punto de producto que dispara el modal. No aparece en Terapia, Perfil ni arranque global.

---

## Tono de mascota

Respira Bunny: guía amable, no infantilizada; alineado con identidad wellness médica. Pose `happy` en bienvenida; otras poses documentadas en showcase dev.

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Clave global sin `patientId` | Segundo paciente no ve bienvenida o la salta incorrectamente |
| Modal bloqueante sin cierre | Mala UX en primer arranque |
| Confundir con consentimiento legal | Obligación regulatoria mal ubicada |
| Mostrar en cada login | Fatiga de onboarding |

---

## Referencias

- [Onboarding (feature)](../../../docs/03-features/onboarding.md)
- [Inicio / Home](../home/README.md)
- [Design system — mascota](../../../docs/07-ui-design-system/README.md)
