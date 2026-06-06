# RESPIRA+ — Overview

## Qué es RESPIRA+

RESPIRA+ es una aplicación móvil (Expo · React Native · TypeScript) de **apoyo al ejercicio respiratorio postoperatorio** con **espirómetro incentivador**. Conecta un ESP32 con sensor VL53L0X para estimar **volumen inspirado** a partir del desplazamiento del pistón, guía sesiones por niveles, registra adherencia y permite exportar datos para revisión con un profesional de la salud.

No es un producto sanitario validado ni una herramienta de diagnóstico clínico autónomo.

## Para quién está orientado

- **Pacientes adultos** en rehabilitación respiratoria postoperatoria que usan espirómetro incentivador bajo indicación de su equipo de salud.
- **Equipos de desarrollo y validación** que prueban hardware ESP32, calibración y flujos de sesión en entorno local-first.

## Qué problema atiende

Facilita la **práctica guiada** de ejercicios respiratorios con:

- Objetivos de volumen personalizados tras una evaluación inicial.
- Retroalimentación estimada en tiempo real (volumen, tiempo sostenido, repeticiones).
- Registro de cumplimiento, consistencia e historial de progreso.
- Exportación estructurada para seguimiento clínico en contexto de desarrollo o investigación académica.

## Componentes del sistema

| Componente | Descripción |
|------------|-------------|
| **App móvil** | UI paciente: inicio, terapia, sesión, historial, perfil, legal, exportación |
| **ESP32 + VL53L0X** | Envía distancia (`distanceMm`) por WebSocket local; no calcula volumen clínico |
| **Calibración RESPIRA+ 3000 mL** | Modelo lineal predefinido en la app; clamp 0–3000 mL |
| **Persistencia local** | AsyncStorage (`@rehab/*`); modo local-first por defecto |
| **Nube (opcional)** | Supabase congelado; ver [README_CLOUD_FREEZE.md](../../README_CLOUD_FREEZE.md) |

## Qué variables registra

Basado en tipos en `src/modules/session/types/session-progress.ts`, `src/modules/diagnostics/types.ts` y exportación clínica:

| Categoría | Ejemplos |
|-----------|----------|
| **Sesión** | Intentos válidos/inválidos, cumplimiento (%), volumen máximo/promedio, tiempo sostenido, perfecta/interrumpida |
| **Origen de datos** | `input_mode` (`sensor` \| `touch_practice`), `data_source`, `is_practice_session` |
| **Sensor / calibración** | Volumen estimado, U95 (modo técnico), perfil de calibración, dispositivo espirómetro, firmware |
| **Evaluación inicial** | VIM (`max_inspiratory_volume`), intentos, consistencia, targets por nivel |
| **Paciente** | Identificador local, clave, nombre, edad, nivel activo, racha |
| **Consentimiento** | Versión documento, flags de aceptación, estado activo/retirado |

## Alcance clínico

**Sí incluye (como apoyo terapéutico):**

- Estimación de **volumen inspirado** (mL) derivada de distancia y calibración.
- Tiempo de inspiración sostenida y repeticiones válidas según reglas de sesión.
- Cumplimiento, consistencia, historial y exportación para revisión profesional.

**No incluye en la versión actual:**

- **Presión inspiratoria** (PIP/MIP u otras métricas de presión).
- Diagnóstico clínico, prescripción autónoma ni sustitución del profesional de la salud.
- Interpretación del volumen como estado clínico definitivo.

## Limitaciones

- Software en **desarrollo avanzado**; pendiente de validación clínica formal.
- Volumen mostrado es **estimado**, no medición directa de flujo ni presión.
- Modo **práctica táctil** simula entrada; no cuenta para desbloqueo de niveles (`persistSessionResult` retorna sin unlock si `isPracticeSession`).
- Evaluación inicial oficial navega con sensor (`navigate-to-initial-evaluation.ts`); ruta touch en tipos existe pero no es el flujo principal documentado.
- Notificaciones locales tienen limitaciones en web (documentadas en módulo notifications).

## Estado de madurez

| Área | Madurez |
|------|---------|
| Conexión ESP32 / WebSocket | Operativa |
| Calibración predefinida 3000 mL | Operativa |
| Evaluación inicial + niveles | Operativa |
| Sesión nivel 1 + validación sensor | Operativa |
| Historial + export clínico v2.4.0 | Operativa |
| Niveles 2–6 | Registrados; gameplay parcial / coming soon en README de sesión |
| Módulo clinician | Scaffold |
| Design system / tipografía | Escala canónica + `AppText`; pantallas principales migradas (4B–4N); excepción HUD/juego con `Text` nativo (4O) |
| Cloud auth | Congelado por defecto |

## Documentación relacionada

- [README raíz](../../README.md)
- [Arquitectura (índice)](../01-app-architecture/README.md)
- [Arquitectura técnica detallada](../../src/docs/architecture.md)
- [Pestañas](../02-tabs/README.md)
- [Funciones](../03-features/README.md)
- [Dispositivo y sensor](../04-device-and-sensor/README.md)
- [Calibración](../05-calibration/README.md)
- [Datos y almacenamiento](../06-data-and-storage/README.md)
- [Design system / tipografía](../07-ui-design-system/README.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Revisión documentación (jun 2026)](./documentation-sync-report.md)
- [Módulo device](../../src/modules/device/README.md)
- [Módulo session](../../src/modules/session/README.md)

## Mapa de navegación documental

```
docs/
├── 00-overview/          ← Este documento
├── 01-app-architecture/  ← Índice técnico, rutas, providers
├── 02-tabs/              ← Inicio, Terapia, Historial, Perfil
├── 03-features/          ← Evaluación, sesión, export, legal, etc.
├── 04-device-and-sensor/ ← ESP32, WebSocket, flujo sensor
├── 05-calibration/       ← RESPIRA+ 3000 mL, flujo técnico, CSV
├── 06-data-and-storage/  ← Claves, modelos, export schema
├── 07-ui-design-system/  ← Tipografía, tokens UI, AppText
└── 08-clinical-safety/   ← Lenguaje clínico y límites del producto
```
