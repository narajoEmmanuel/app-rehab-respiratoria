# Documentación de RESPIRA+

Este directorio concentra la documentación académica y técnica del prototipo **RESPIRA+**, desarrollado en el marco de Ingeniería Biomédica. RESPIRA+ es una herramienta de **apoyo** al ejercicio respiratorio domiciliario con espirómetro incentivador en **pacientes adultos postoperatorios**. No constituye un producto sanitario validado, no diagnostica condiciones respiratorias ni sustituye la indicación ni la supervisión de un profesional de la salud.

La documentación se organiza por capas: visión del producto, arquitectura, funciones clínicas, hardware, datos, seguridad, validación y migración web. El [README raíz](../README.md) ofrece una síntesis ejecutiva; aquí se profundiza el contexto, los flujos y la trazabilidad del sistema.

---

## Problema clínico y enfoque del proyecto

La rehabilitación pulmonar domiciliaria en adultos postoperatorios enfrenta, con frecuencia, **baja adherencia** a los ejercicios respiratorios prescritos. RESPIRA+ busca facilitar la práctica guiada mediante retroalimentación estimada de volumen, registro de sesiones, historial motivacional y exportación estructurada para revisión con el equipo de salud.

El diseño inicial del proyecto consideraba escenarios orientados a **EPOC**. Tras **validación experta** con especialista en rehabilitación pulmonar, el equipo reorientó el producto hacia **postoperatorios**, donde el espirómetro incentivador volumétrico y los objetivos de volumen y tiempo sostenido resultan más pertinentes (véase [Marco legal y términos](./legal/README-terminos-y-condiciones.md)).

---

## Mapa del árbol documental

```
docs/
├── README.md                      ← Este índice maestro
├── 00-overview/                   ← Visión general del producto
├── 01-app-architecture/           ← Arquitectura, rutas, módulos, providers
├── 02-tabs/                       ← Pestañas: Inicio, Terapia, Historial, Perfil
├── 03-features/                   ← Flujos funcionales (evaluación, sesión, export, etc.)
├── 04-device-and-sensor/          ← ESP32, VL53L0X, WebSocket, firmware
├── 05-calibration/                ← Calibración RESPIRA+ 3000 mL (índice canónico)
├── 06-data-and-storage/           ← AsyncStorage, modelos, export schema, privacidad
├── 07-ui-design-system/           ← Tipografía, tokens, AppText
├── 08-clinical-safety/            ← Lenguaje clínico, límites, bioética
├── 10-testing-and-validation/     ← QA, auditorías, validación académica
├── 12-web-cloud-migration/        ← Modo web, PWA, demo, runtime-env
├── 12-legacy/                     ← Código y documentación histórica conservada
├── legal/                         ← Términos, consentimiento, marco para el equipo
├── calibration/                   ← Ruta histórica de calibración (conservada)
├── AUDITORIA-TECNICA-SENSOR-ESP32.md
└── supabase-security-notes.md
```

Documentación técnica complementaria en `src/docs/` (`architecture.md`, `team-ownership.md`) y README por módulo en `src/modules/*/README.md`.

---

## Guía de lectura por audiencia

### Equipo académico y clínico

1. [Overview del producto](./00-overview/README.md)
2. [Seguridad clínica y lenguaje](./08-clinical-safety/README.md)
3. [Términos y condiciones (equipo)](./legal/README-terminos-y-condiciones.md)
4. [Validación, QA y auditorías](./10-testing-and-validation/README.md)

### Desarrollo con sensor (modo local)

1. [Dispositivo y sensor](./04-device-and-sensor/README.md)
2. [Calibración — índice canónico](./05-calibration/README.md)
3. [Flujo del sensor](./04-device-and-sensor/sensor-flow.md)
4. [Arquitectura de la app](./01-app-architecture/README.md)

### Desarrollo web, PWA y demo

1. [Migración web y modos de runtime](./12-web-cloud-migration/README.md)
2. [Congelación de nube](../README_CLOUD_FREEZE.md)

### Datos, exportación y revisión profesional

1. [Datos y almacenamiento](./06-data-and-storage/README.md)
2. [Exportación de datos](./03-features/exportacion-datos.md)
3. [Schema export clínico v2.4.0](./06-data-and-storage/export-schema-v2.4.0.md)

> **Nota sobre «dashboard médico»:** el módulo `clinician/` es un **scaffold** sin rutas activas. La revisión profesional documentada se realiza mediante **exportación clínica** (CSV/JSON) e historial en la app del paciente, no mediante un panel clínico terminado.

---

## Índices por carpeta numerada

| Carpeta | Índice | Contenido principal |
|---------|--------|---------------------|
| `00-overview` | [README](./00-overview/README.md) | Qué es RESPIRA+, población, madurez |
| `01-app-architecture` | [README](./01-app-architecture/README.md) | Módulos, rutas, providers, flujo de datos |
| `02-tabs` | [README](./02-tabs/README.md) | Navegación por pestañas |
| `03-features` | [README](./03-features/README.md) | Evaluación inicial, terapia, notificaciones, legal |
| `04-device-and-sensor` | [README](./04-device-and-sensor/README.md) | Hardware, protocolo WebSocket |
| `05-calibration` | [README](./05-calibration/README.md) | Modelo lineal 3000 mL, flujo técnico |
| `06-data-and-storage` | [README](./06-data-and-storage/README.md) | Persistencia local, privacidad |
| `07-ui-design-system` | [README](./07-ui-design-system/README.md) | Design system |
| `08-clinical-safety` | [README](./08-clinical-safety/README.md) | Límites clínicos y copy |
| `10-testing-and-validation` | [README](./10-testing-and-validation/README.md) | QA manual, auditorías, validación |
| `12-web-cloud-migration` | [README](./12-web-cloud-migration/README.md) | Web, PWA, runtime-env, preview público |
| `12-legacy` | [README](./12-legacy/README.md) | Limpieza conservadora |

---

## Rutas históricas (conservadas)

| Ruta | Estado | Índice canónico actual |
|------|--------|------------------------|
| `docs/sensor-flow.md` | Histórica | [04-device-and-sensor/sensor-flow.md](./04-device-and-sensor/sensor-flow.md) |
| `docs/calibration/` | Histórica | [05-calibration/](./05-calibration/README.md) |

Estas rutas se mantienen para no romper enlaces existentes. Las métricas de calibración pueden diferir entre documentos de distintas fechas; el **modelo activo** del espirómetro RESPIRA+ 3000 mL (junio 2026) es el canónico para el flujo paciente (véase [CSV técnico de calibración](./calibration/README-csv-tecnico-calibracion.md)).

---

## Estado documental (junio 2026)

| Área | Documentación |
|------|---------------|
| Flujo sensor + calibración 3000 mL | Consolidada |
| Notificaciones con flag global desactivada | Actualizada (jun 2026) |
| Modo web / PWA / demo | Índice en `12-web-cloud-migration/` |
| Validación académica (encuesta, cualitativa) | Parcial; véase [10-testing-and-validation](./10-testing-and-validation/README.md) |
| Marco regulatorio detallado | Parcial en `legal/`; TODO: referencia pendiente para normas específicas |

Informe de sincronización previo: [documentation-sync-report.md](./00-overview/documentation-sync-report.md) (5 jun 2026). Los cambios posteriores (notificaciones, índices maestros) se documentan en los README actualizados de esta fase.

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación de seguridad clínica y lenguaje* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/08-clinical-safety/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Marco de términos y condiciones para el equipo* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/legal/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Diccionario técnico del CSV de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/calibration/README-csv-tecnico-calibracion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Auditoría técnica sensor ESP32 y calibración* [Informe interno, mayo 2026]. En repositorio `app-rehab-respiratoria`, archivo `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md`.
