# Seguridad clínica y lenguaje — RESPIRA+

Directrices para copy, documentación y futuras pantallas del prototipo académico **RESPIRA+**. Reflejan el comportamiento documentado en el repositorio, no aspiraciones comerciales ni claims de producto sanitario registrado.

---

## Alcance clínico del prototipo

RESPIRA+ apoya **ejercicios respiratorios con espirómetro incentivador** en **pacientes adultos postoperatorios**, **siempre bajo indicación y supervisión** del equipo de salud del paciente. El sistema registra variables funcionales de **seguimiento y adherencia**, entre ellas:

- Volumen inspirado **estimado** (mL)
- Tiempo de inspiración sostenida
- Repeticiones válidas e inválidas
- Cumplimiento y consistencia de sesión
- Historial, rachas y exportación para revisión profesional

Estas variables **no constituyen diagnóstico clínico**, **no reemplazan** pruebas formales de función pulmonar (espirometría clínica certificada, gasometría, imagen) ni **no deben modificarse** indicaciones médicas, dosis o planes terapéuticos de forma autónoma.

El diseño inicial consideraba escenarios orientados a **EPOC**; tras **validación experta** documentada en [Marco legal](../legal/README-terminos-y-condiciones.md), la población objetivo final del prototipo es **postoperatoria**. EPOC no debe presentarse como población objetivo actual.

---

## Uso bajo indicación profesional

RESPIRA+ está pensada como **apoyo** al ejercicio respiratorio postoperatorio, no como tratamiento autónomo.

Copy de referencia en la app:

- `src/modules/levels/screens/LevelsScreen.tsx` — detener sesión ante síntomas.
- `src/modules/patient/screens/ProfileScreen.tsx` — consultar profesional ante dudas.
- `src/modules/notifications/notification-copy.ts` — ajustar según indicación profesional.

Documento legal para el usuario: `assets/legal/terminos-uso-etico.pdf` (vía `open-legal-document.ts`).

---

## No es diagnóstico

La **evaluación inicial** calcula un volumen inspiratorio máximo (VIM) de **apoyo** para fijar objetivos de terapia. **No sustituye** una valoración médica.

Pantallas con disclaimer explícito:

- `src/modules/diagnostics/screens/DiagnosticSummaryScreen.tsx`
- `src/modules/diagnostics/screens/InitialEvaluationSummaryScreen.tsx`

**Evitar** en UI y READMEs: «Diagnóstico de capacidad pulmonar», «Resultado clínico definitivo», «Estado respiratorio del paciente».

**Preferir:** «Evaluación inicial de apoyo», «Referencia para objetivos de terapia», «Resultado estimado para seguimiento con su profesional».

---

## No sustituye al profesional de la salud

La app **no prescribe**, **no ajusta tratamiento** ni **reemplaza** consulta, urgencias o indicaciones médicas individuales.

Framework legal para el equipo: [docs/legal/README-terminos-y-condiciones.md](../legal/README-terminos-y-condiciones.md).

---

## Volumen inspirado estimado y calibración

| Hecho técnico | Implicación clínica en copy |
|---------------|----------------------------|
| ESP32 envía **distancia** (`distanceMm`), no volumen | El volumen es **calculado en la app** |
| Modelo lineal RESPIRA+ 3000 mL (banco jun 2026) | Volumen **estimado**; R² ≈ 0,992 y MAE ≈ 65,36 mL en banco — **validación técnica inicial**, no certificación clínica |
| Clamp 0–3000 mL | Valores fuera de rango visual no implican medición clínica exacta |
| U95 visible solo en modo técnico | No prometer precisión metrológica al paciente en flujo normal |

El pipeline distancia→volumen es **adecuado para monitoreo funcional preliminar** en el marco académico; **no** equivale a espirometría diagnóstica. Detalle: [05-calibration](../05-calibration/README.md), [Validación académica](../09-academic-validation/README.md).

Archivos sensibles en copy futuro: `VolumeThermometer.tsx`, `LiveVolumeCard.tsx`, `SessionEstimatedVolumeCard.tsx`, `SessionSummaryHero.tsx`.

**Lenguaje recomendado:** «volumen inspirado **estimado**», «referencia de apoyo», «lectura orientativa».

---

## Presión inspiratoria — fuera de alcance

La versión actual **no mide ni muestra presión inspiratoria** (PIP, MIP, cmH₂O, etc.).

---

## Síntomas de alerta y suspensión de uso

Los documentos legales y las pantallas operativas del repositorio indican **suspender el ejercicio** y **consultar al profesional de la salud** si aparecen, entre otros:

- **Dolor** (incluido dolor torácico, según redacción del PDF legal)
- **Mareo**
- **Dificultad respiratoria inusual** / falta de aire intensa / **fatiga** respiratoria excesiva
- **Tos** intensa o **malestar** inusual

Ubicaciones documentadas: `LevelsScreen`, `ProfileScreen`, `InitialEvaluationWelcomeView`, [Marco legal](../legal/README-terminos-y-condiciones.md) (sección 5).

**Recomendación:** mantener estos términos visibles antes y durante sesión/evaluación; no minimizarlos en rediseños.

---

## Sesión oficial con sensor vs práctica táctil

| Aspecto | Sesión oficial (`sensor`) | Práctica táctil (`touch_practice`) |
|---------|---------------------------|-------------------------------------|
| Origen datos | `sensor_model` | `touch_simulation` |
| Validación | Reglas en `sensor-evaluation/` | Simulación; no métricas oficiales de sensor |
| Desbloqueo niveles | Sí, si sesión perfecta terapéutica | **No** |
| Copy | Sesión con volumen estimado por sensor | «Modo práctica — no sustituye sesión con sensor» |

Clasificación UI: **Sensor**, **Práctica sin sensor**, **Sin clasificar** (`session-record-classification.ts`).

---

## Consentimiento, privacidad y exportación

Resumen; detalle en [Marco legal](../legal/README-terminos-y-condiciones.md):

| Tema | Comportamiento documentado |
|------|----------------------------|
| **Consentimiento informado** | Pantalla `/legal/accept`; siete casillas; versión `LEGAL_DOCUMENT_VERSION = '1.0'` |
| **Datos sensibles** | Desempeño respiratorio, sesiones, perfil — tratamiento descrito en aviso de privacidad (PDF) |
| **Finalidad** | Apoyo académico, adherencia, mejora del prototipo — **no** diagnóstico autónomo |
| **Exportación** | Manual CSV/JSON para **revisión con profesional**; no informe certificado |
| **Confidencialidad** | Local-first por defecto; modo nube opcional/congelado |
| **Derechos del usuario** | Retiro de consentimiento; acceso al PDF; derechos adicionales según madurez y normativa — TODO: referencia pendiente para procedimiento formal fuera del prototipo |
| **Limitaciones del prototipo** | Estimaciones sujetas a calibración; validación clínica formal pendiente |

**Revisión manual requerida:** fail-open de consentimiento en `app/index.tsx`; seed de consentimiento en modo local de desarrollo — no usar con personas reales sin protocolo ético acordado.

---

## Recomendaciones de lenguaje

### Usar

Apoyo terapéutico, ejercicio guiado, adherencia, estimación, referencia, revisar con profesional, bajo indicación médica, espirómetro incentivador, rehabilitación postoperatoria, prototipo académico.

### Evitar

Diagnosticar, curar, recuperación garantizada, tratamiento autónomo, presión inspiratoria, espirometría clínica certificada (salvo limitación explícita), «resultado normal/anormal» clínico, producto sanitario registrado.

### Exportación e historial

«Resumen para revisar con su profesional de la salud» — no «informe clínico certificado».

---

## Referencias cruzadas

- [Marco legal](../legal/README-terminos-y-condiciones.md)
- [Validación académica](../09-academic-validation/README.md)
- [QA operativo](../10-testing-and-validation/README.md)
- [Overview](../00-overview/README.md)
- [README raíz](../../README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Marco de términos y condiciones para el equipo* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/legal/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Validación académica* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/09-academic-validation/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Diccionario técnico del CSV de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/calibration/README-csv-tecnico-calibracion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Exportación clínica* [Código fuente interno]. Módulo `clinical-export-service.ts` — versión de formato 2.4.0.
