# RESPIRA+ — Overview

## Qué es RESPIRA+

RESPIRA+ es una aplicación móvil (Expo · React Native · TypeScript) de **apoyo al ejercicio respiratorio postoperatorio** con **espirómetro incentivador**. Conecta un ESP32 con sensor VL53L0X para estimar **volumen inspirado** a partir del desplazamiento del pistón, guía sesiones por niveles, registra adherencia y permite exportar datos para revisión con un profesional de la salud.

Se trata de un **prototipo académico** en desarrollo avanzado. **No** es un producto sanitario validado ni una herramienta de diagnóstico clínico autónomo, y **no sustituye** la indicación ni la supervisión de un profesional de la salud.

---

## Problema clínico

La **baja adherencia** a la rehabilitación pulmonar domiciliaria en **pacientes adultos postoperatorios** limita el beneficio de los ejercicios respiratorios prescritos. RESPIRA+ busca apoyar la práctica guiada mediante objetivos personalizados, retroalimentación estimada, registro de sesiones e historial motivacional, complementando — sin reemplazar — el seguimiento clínico.

---

## Cambio de enfoque clínico (EPOC → postoperatorios)

El diseño inicial del proyecto consideraba escenarios orientados a **EPOC**. Tras **validación experta** con especialista en rehabilitación pulmonar, el equipo reorientó el producto hacia **postoperatorios**, donde el espirómetro incentivador volumétrico y los objetivos de volumen y tiempo sostenido resultan más pertinentes. La arquitectura actual (perfil RESPIRA+ 3000 mL, calibración predefinida, terapia con validación conservadora) refleja ese enfoque final (Instituto Tecnológico y de Estudios Superiores de Monterrey, 2026; véase [Marco legal](../legal/README-terminos-y-condiciones.md)).

---

## Para quién está orientado

- **Pacientes adultos** en rehabilitación respiratoria postoperatoria que usan espirómetro incentivador bajo indicación de su equipo de salud.
- **Equipos de desarrollo y validación** que prueban hardware ESP32, calibración y flujos de sesión en entorno local-first.
- **Revisores académicos** que evalúan el prototipo mediante exportación clínica e historial, no mediante un panel clínico terminado (el módulo `clinician/` es scaffold).

---

## Componentes del sistema

| Componente | Descripción |
|------------|-------------|
| **App móvil / web** | UI paciente: inicio, terapia, sesión, historial, perfil, legal, exportación |
| **ESP32 + VL53L0X** | Envía distancia (`distanceMm`) por WebSocket local; no calcula volumen clínico |
| **Calibración RESPIRA+ 3000 mL** | Modelo lineal predefinido; R² ≈ 0,992, MAE ≈ 65,36 mL en banco (modelo canónico jun 2026) |
| **Persistencia local** | AsyncStorage (`@rehab/*`); modo local-first por defecto |
| **Nube (opcional)** | Supabase congelado; ver [README_CLOUD_FREEZE.md](../../README_CLOUD_FREEZE.md) |
| **Modo web / demo** | Práctica táctil sin sensor; véase [12-web-cloud-migration](../12-web-cloud-migration/README.md) |

---

## Modos de despliegue

| Modo | Descripción | Documentación |
|------|-------------|---------------|
| **Local con sensor** | iOS/Android + ESP32; flujo clínico principal | [Dispositivo y sensor](../04-device-and-sensor/README.md) |
| **Web / PWA / demo** | Navegador, touch, sin hardware; preview académico | [12-web-cloud-migration](../12-web-cloud-migration/README.md) |

---

## Qué variables registra

Basado en tipos en `src/modules/session/types/session-progress.ts`, `src/modules/diagnostics/types.ts` y exportación clínica v2.4.0:

| Categoría | Ejemplos |
|-----------|----------|
| **Sesión** | Intentos válidos/inválidos, cumplimiento (%), volumen máximo/promedio, tiempo sostenido |
| **Origen de datos** | `input_mode` (`sensor` \| `touch_practice`), `data_source`, `is_practice_session` |
| **Sensor / calibración** | Volumen estimado, perfil, dispositivo, firmware |
| **Evaluación inicial** | VIM (`max_inspiratory_volume`), targets por nivel |
| **Paciente** | Identificador local, clave, nivel activo, racha |
| **Consentimiento** | Versión documento, flags de aceptación |

---

## Alcance clínico

**Sí incluye (como apoyo terapéutico):** estimación de volumen inspirado (mL), tiempo sostenido, repeticiones válidas, cumplimiento, historial y exportación para revisión profesional.

**No incluye:** presión inspiratoria (PIP/MIP), diagnóstico, prescripción autónoma ni sustitución del profesional de la salud.

---

## Limitaciones

- Software en **desarrollo avanzado**; validación clínica formal pendiente.
- Volumen **estimado**, no medición directa certificada de flujo.
- Práctica táctil no desbloquea niveles oficiales.
- Notificaciones: build actual con `EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false` — sin programación local (véase [Notificaciones](../03-features/notificaciones.md)).

---

## Estado de madurez (junio 2026)

| Área | Madurez |
|------|---------|
| Conexión ESP32 / WebSocket | Operativa |
| Calibración predefinida 3000 mL | Operativa |
| Evaluación inicial + niveles | Operativa |
| Sesión nivel 1 + validación sensor | Operativa |
| Historial + export clínico v2.4.0 | Operativa |
| Notificaciones locales | Implementadas; **desactivadas por flag** en build de referencia |
| Niveles 2–6 | Gameplay parcial |
| Módulo `clinician/` | Scaffold (sin dashboard clínico terminado) |
| Modo web / PWA | Documentado; preview académico |
| Cloud auth | Congelado por defecto |

---

## Validación académica

| Línea | Estado documentado |
|-------|-------------------|
| Validación técnica (sensor, calibración) | [10-testing-and-validation](../10-testing-and-validation/README.md), [Auditoría mayo 2026](../AUDITORIA-TECNICA-SENSOR-ESP32.md) |
| Encuesta de mercado (n = 66) | TODO: referencia pendiente en repositorio |
| Validación cualitativa con profesionales | Narrativa en [legal](../legal/README-terminos-y-condiciones.md); TODO: referencia pendiente para instrumentos completos |

---

## Documentación relacionada

- [Índice maestro](../README.md)
- [README raíz](../../README.md)
- [Arquitectura](../01-app-architecture/README.md)
- [Validación y QA](../10-testing-and-validation/README.md)
- [Web / PWA / demo](../12-web-cloud-migration/README.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Revisión documentación (5 jun 2026)](./documentation-sync-report.md)

---

## Mapa de navegación documental

```
docs/
├── README.md                   ← Índice maestro
├── 00-overview/                ← Este documento
├── 01-app-architecture/
├── 02-tabs/
├── 03-features/
├── 04-device-and-sensor/
├── 05-calibration/
├── 06-data-and-storage/
├── 07-ui-design-system/
├── 08-clinical-safety/
├── 10-testing-and-validation/  ← QA, auditorías, validación
├── 12-web-cloud-migration/     ← Web, PWA, runtime-env
└── 12-legacy/
```

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Marco de términos y condiciones para el equipo* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/legal/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Diccionario técnico del CSV de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/calibration/README-csv-tecnico-calibracion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Validación, pruebas y auditorías* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/10-testing-and-validation/`.
