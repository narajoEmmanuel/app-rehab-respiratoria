# Validación académica — RESPIRA+

Este documento reúne la **validación académica preliminar** del prototipo RESPIRA+: evidencia técnica de calibración, limitaciones metrológicas, validación de mercado, validación cualitativa con profesionales y **consideraciones regulatorias de referencia**. Se distingue del [aseguramiento de calidad operativo](../10-testing-and-validation/README.md) (checklist manual, mapa de riesgos, regresiones).

RESPIRA+ es un **prototipo académico** de Ingeniería Biomédica orientado al apoyo de ejercicios respiratorios con espirómetro incentivador en **pacientes adultos postoperatorios**, bajo indicación profesional. **No** constituye un producto sanitario registrado, **no** diagnostica, **no** prescribe y **no** sustituye al profesional de la salud.

---

## Cambio de enfoque clínico (validación experta)

El diseño inicial del proyecto consideraba escenarios orientados a **EPOC**. Tras **validación cualitativa preliminar** con especialista en rehabilitación pulmonar, el equipo reorientó la población objetivo hacia **adultos en contexto postoperatorio**, donde el espirómetro incentivador volumétrico y los objetivos de volumen y tiempo sostenido resultan más pertinentes (Instituto Tecnológico y de Estudios Superiores de Monterrey, 2026; véase [Marco legal](../legal/README-terminos-y-condiciones.md), sección 6).

**EPOC no es la población objetivo final** del prototipo en su estado documentado actual.

---

## 1. Validación técnica de calibración

### 1.1 Principio de medición

El sensor **VL53L0X** (Time-of-Flight) mide **distancia** en milímetros entre el montaje óptico y el pistón del espirómetro. **No mide volumen ni flujo espiratorio directamente.** La aplicación convierte `distanceMm` en **volumen inspirado estimado (mL)** mediante un modelo de calibración almacenado localmente.

### 1.2 Modelo canónico vigente (junio 2026)

Para el espirómetro RESPIRA+ **3000 mL**, el modelo lineal predefinido de banco (`cal-predefined-respira-3000-v20260602`, ID visible `R3K-20260602-LIN-v2`) es el **estado actual** del flujo paciente:

| Parámetro | Valor |
|-----------|--------|
| Ecuación | \(V = 28{,}66324925966009 \times d - 523{,}8262554875091\) (mL; \(d\) en mm) |
| R² | 0,992 (0,9921507156019185 en código) |
| MAE | 65,36 mL |
| Fecha de banco | 2026-06-02 |

Fuente interna: [README-csv-tecnico-calibracion.md](../calibration/README-csv-tecnico-calibracion.md); `predefined-calibration-models.ts`.

### 1.3 Reconciliación con informes anteriores

La [auditoría técnica de mayo 2026](../AUDITORIA-TECNICA-SENSOR-ESP32.md) cita una **curva histórica de presentación** (\(V = 52{,}95 \times d - 2251{,}97\); R² = 0,9962; MAE = 41 mL) que **no está instalada** en el flujo paciente actual. Esas métricas corresponden a una **sesión, versión o modelo anterior** de trabajo del equipo, no a una contradicción del modelo canónico de junio 2026.

Para terapia, exportación clínica y documentación académica actual prevalece el modelo de la sección 1.2.

### 1.4 Aptitud del sistema

Con base en la validación técnica inicial documentada en el repositorio, el pipeline distancia→volumen se considera **adecuado para monitoreo funcional preliminar y apoyo a la adherencia** en el marco del prototipo académico. **No** debe interpretarse como espirometría clínica certificada ni como prueba diagnóstica de función pulmonar.

---

## 2. Repetibilidad y limitaciones metrológicas

| Aspecto | Documentación interna |
|---------|------------------------|
| Repetibilidad en banco | 8 volúmenes × 5 repeticiones (40 puntos) en calibración oficial |
| Incertidumbre U95 | Pipeline técnico con factor k=2; visible en modo técnico |
| Dependencia del montaje | El modelo aplica al sistema concreto (unidad física + app + firmware de referencia) |
| Clamp operativo | 0–3000 mL en flujo paciente |
| Validación clínica formal | Pendiente; véase [Overview](../00-overview/README.md) |

Detalle técnico: [módulo de calibración](../../src/modules/device/calibration/README.md), [05-calibration](../05-calibration/README.md).

---

## 3. Validación de mercado

| Evidencia | Estado |
|-----------|--------|
| Encuesta de validación de mercado (n = 66) | TODO: referencia pendiente — no se localizó el instrumento, cuestionario ni resultados agregados en archivos Markdown del repositorio al junio 2026 |

**Advertencia metodológica:** la aceptación de mercado, la intención de uso o la percepción de utilidad **no constituyen evidencia de eficacia clínica**. Cualquier resultado futuro de encuesta debe presentarse como **validación académica preliminar de propuesta de valor**, no como demostración terapéutica.

---

## 4. Validación cualitativa con profesionales de la salud

El repositorio documenta de forma narrativa la revisión del enfoque clínico con profesional en rehabilitación pulmonar, incluido el cambio hacia postoperatorios ([Marco legal](../legal/README-terminos-y-condiciones.md), sección 6).

| Evidencia | Estado |
|-----------|--------|
| Actas, guías de entrevista, transcripciones o informes cualitativos completos | TODO: referencia pendiente — no localizados en Markdown del repositorio |

Esta validación informó el **diseño del producto**; no reemplaza un protocolo clínico controlado ni la indicación individual del paciente.

---

## 5. Consideraciones regulatorias (marco de referencia)

RESPIRA+ **no cuenta con registro sanitario** documentado en el repositorio y **no debe presentarse** como dispositivo médico comercial terminado. Las siguientes líneas son **marco de referencia académico** y **ruta futura** posible, sujetas a asesoría legal y regulatoria especializada:

| Tema | Estado en documentación interna |
|------|--------------------------------|
| **COFEPRIS** (México) | TODO: referencia pendiente — no se localizó documento interno que detalle la ruta regulatoria propuesta |
| **Buenas prácticas de fabricación (BPF)** | TODO: referencia pendiente |
| **ISO 13485** (sistemas de gestión de calidad para dispositivos médicos) | TODO: referencia pendiente como marco de referencia académica |
| **Tecnovigilancia** | TODO: referencia pendiente |
| **Etiquetado e IFU** | Parcial — límites en PDF legal y [seguridad clínica](../08-clinical-safety/README.md) |
| **Protección de datos (LFPDPPP, México)** | Mencionada como marco de referencia en [legal](../legal/README-terminos-y-condiciones.md); **no** se certifica cumplimiento pleno |
| **Gestión de riesgos (ISO 14971 u homólogos)** | TODO: referencia pendiente |

Lenguaje recomendado en presentaciones: *alineación preliminar*, *consideraciones regulatorias*, *ruta futura hacia evaluación por autoridad sanitaria*, no *cumplimiento normativo demostrado*.

---

## 6. Relación con otros documentos

| Documento | Rol |
|-----------|-----|
| [10-testing-and-validation](../10-testing-and-validation/README.md) | QA manual, regresiones, auditorías de código |
| [08-clinical-safety](../08-clinical-safety/README.md) | Límites clínicos, copy, síntomas de alerta |
| [legal](../legal/README-terminos-y-condiciones.md) | Consentimiento, privacidad, descargo |
| [AUDITORIA-TECNICA-SENSOR-ESP32.md](../AUDITORIA-TECNICA-SENSOR-ESP32.md) | Informe técnico mayo 2026 (histórico; ver reconciliación) |
| [CSV técnico calibración](../calibration/README-csv-tecnico-calibracion.md) | Métricas canónicas y trazabilidad |

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Diccionario técnico del CSV de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/calibration/README-csv-tecnico-calibracion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Auditoría técnica sensor ESP32 y calibración* [Informe interno, mayo 2026]. En repositorio `app-rehab-respiratoria`, archivo `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Marco de términos y condiciones para el equipo* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/legal/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación de seguridad clínica y lenguaje* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/08-clinical-safety/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Validación, pruebas y auditorías (QA operativo)* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/10-testing-and-validation/`.
