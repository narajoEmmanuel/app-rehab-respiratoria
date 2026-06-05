# Seguridad clínica y lenguaje — RESPIRA+

Directrices para copy, documentación y futuras pantallas. Reflejan el comportamiento actual del código, no aspiraciones futuras.

## Uso bajo indicación profesional

RESPIRA+ está pensada como **apoyo** al ejercicio respiratorio postoperatorio con espirómetro incentivador, **bajo indicación y supervisión** del equipo de salud del paciente.

Copy de referencia en la app:

- `src/modules/levels/screens/LevelsScreen.tsx` — detener sesión ante síntomas.
- `src/modules/patient/screens/ProfileScreen.tsx` — consultar profesional ante dudas.
- `src/modules/notifications/notification-copy.ts` — ajustar según indicación profesional.

## No es diagnóstico

La **evaluación inicial** calcula un volumen inspiratorio máximo (VIM) de apoyo para fijar objetivos de terapia. **No sustituye** una valoración médica.

Pantallas con disclaimer explícito:

- `src/modules/diagnostics/screens/DiagnosticSummaryScreen.tsx`
- `src/modules/diagnostics/screens/InitialEvaluationSummaryScreen.tsx`

Evitar en UI y READMEs:

- “Diagnóstico de capacidad pulmonar”
- “Resultado clínico definitivo”
- “Estado respiratorio del paciente”

Preferir:

- “Evaluación inicial de apoyo”
- “Referencia para objetivos de terapia”
- “Resultado estimado para seguimiento con su profesional”

## No sustituye al profesional de la salud

La app **no prescribe**, **no ajusta tratamiento** ni **no reemplaza** consulta, urgencias o indicaciones médicas.

Documento legal: `assets/legal/terminos-uso-etico.pdf` (abierto vía `src/modules/legal/open-legal-document.ts`).

Framework legal para el equipo: [docs/legal/README-terminos-y-condiciones.md](../legal/README-terminos-y-condiciones.md).

## No tratamiento autónomo

Los niveles, recordatorios y métricas son **herramientas de adherencia y práctica guiada**. El paciente debe seguir el plan acordado con su equipo de salud.

## Volumen inspirado estimado

| Hecho técnico | Implicación clínica en copy |
|---------------|----------------------------|
| ESP32 envía **distancia** (`distanceMm`), no volumen | Explicar que el volumen es **calculado en la app** |
| Modelo de calibración lineal RESPIRA+ 3000 mL | Volumen **estimado** con incertidumbre; no equivalencia a espirometría clínica certificada |
| Clamp 0–3000 mL | Valores fuera de rango visual no implican medición clínica exacta |
| U95 visible solo en modo técnico/debug | No prometer precisión metrológica al paciente en flujo normal |

Archivos sensibles en copy futuro:

- `src/modules/device/components/VolumeThermometer.tsx`
- `src/modules/device/components/LiveVolumeCard.tsx`
- `src/modules/session/games/components/SessionEstimatedVolumeCard.tsx`
- `src/modules/summary/components/SessionSummaryHero.tsx`

**Lenguaje recomendado:** “volumen inspirado **estimado**”, “referencia de apoyo”, “lectura orientativa”.

## Presión inspiratoria — fuera de alcance

La versión actual **no mide ni muestra presión inspiratoria** (PIP, MIP, cmH₂O, etc.). No documentar ni insinuar estas métricas en READMEs de paciente.

## Síntomas de alerta

Mensajes actuales mencionan detener el ejercicio ante:

- **Dolor**
- **Mareo**
- Falta de aire intensa / **fatiga** respiratoria excesiva
- **Tos** intensa o **malestar**

Ubicaciones: `LevelsScreen`, `ProfileScreen`, `InitialEvaluationWelcomeView`, documento legal.

**Recomendación:** mantener estos términos visibles antes y durante sesión/evaluación; no minimizarlos en rediseños.

## Sesión oficial con sensor vs práctica táctil

Comportamiento definido en código:

| Aspecto | Sesión oficial (`input_mode: sensor`) | Práctica táctil (`touch_practice`) |
|---------|--------------------------------------|-------------------------------------|
| Origen datos | `data_source: sensor_model` | `data_source: touch_simulation` |
| Flag sesión | `is_practice_session: false` | `is_practice_session: true` |
| Validación | Reglas sensor en `sensor-evaluation/` | Simulación táctil |
| Desbloqueo niveles | Cuenta si perfecta y terapéutica (`isTherapeuticSessionRecord`) | **No desbloquea** (`persistSessionResult` retorna `NO_UNLOCK`) |
| Activación | Sensor conectado + readiness | `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true` + preferencia en Perfil + sin transporte sensor (`resolve-therapy-session-launch.ts`) |

Clasificación UI: `src/modules/session/session-record-classification.ts` — etiquetas **Sensor**, **Práctica sin sensor**, **Sin clasificar**.

**Copy recomendado para práctica táctil:**

- “Modo práctica — no sustituye sesión con sensor”
- “Esta sesión no cuenta para desbloquear niveles” (si se muestra al usuario)

## Consentimiento y privacidad

- Consentimiento digital requerido para Terapia, Historial, sensor, exportación y notificaciones (`ConsentTabGuard`, `ConsentStackGuard`).
- Exportación etiquetada para revisión con profesional (`DataExportScreen.tsx`).
- Modo local-first: datos en dispositivo (AsyncStorage). Borrado en `patient-delete-service.ts`.

**Requiere revisión manual:** en local-first, `app/index.tsx` no fuerza re-aceptación legal al cold start si el consent fue retirado (solo cloud revalida). Documentar al usuario interno hasta corregirse.

**Requiere revisión manual:** `seedLocalPrototypeConsentForPatient` en `consent-service.ts` puede omitir flujo legal en desarrollo — no usar en pruebas con usuarios reales sin acuerdo ético.

## Recomendaciones de lenguaje para futuras pantallas y READMEs

### Usar

- Apoyo terapéutico, ejercicio guiado, adherencia, estimación, referencia, revisar con profesional, bajo indicación médica, espirómetro incentivador, rehabilitación postoperatoria.

### Evitar

- Diagnosticar, curar, recuperación garantizada, tratamiento autónomo, presión inspiratoria, espirometría clínica certificada (salvo contexto de limitación explícita), “resultado normal/anormal” clínico.

### Exportación e historial

- “Resumen para revisar con su profesional de la salud” — no “informe clínico certificado”.
- Incluir versión de export (`2.4.0`) y naturaleza estimada de volúmenes en documentación técnica, no alarmista en UI paciente.

## Referencias

- [Overview](../00-overview/README.md)
- [README raíz](../../README.md)
- [Términos y condiciones (equipo)](../legal/README-terminos-y-condiciones.md)
- [Export clínico](../../src/modules/export/services/clinical-export-service.ts) — `CLINICAL_EXPORT_FORMAT_VERSION = '2.4.0'`
