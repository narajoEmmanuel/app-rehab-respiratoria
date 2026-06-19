# Validación, pruebas y auditorías — RESPIRA+

Esta carpeta agrupa la documentación de **aseguramiento de calidad**, **auditorías técnicas** y **validación académica** del prototipo RESPIRA+. RESPIRA+ es un sistema en desarrollo avanzado orientado al apoyo terapéutico en **pacientes adultos postoperatorios**; los procesos aquí descritos **no equivalen** a validación clínica formal ni a certificación de producto sanitario.

---

## Propósito de la validación en el proyecto

El equipo documenta tres líneas complementarias de evidencia:

1. **Validación técnica:** desempeño del pipeline sensor → calibración → estimación de volumen → sesión → exportación.
2. **Validación de mercado:** percepción de usuarios potenciales sobre la propuesta de valor (adherencia, usabilidad, disposición de uso).
3. **Validación cualitativa con profesionales de la salud:** revisión del enfoque clínico, incluido el **cambio de población objetivo** de escenarios centrados en EPOC hacia **postoperatorios** tras validación experta.

Estas líneas informan el diseño del producto pero **no sustituyen** estudios clínicos controlados ni indicación médica individual.

---

## Documentos en esta carpeta

| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [full-app-manual-qa-checklist.md](./full-app-manual-qa-checklist.md) | QA manual | Checklist integral post-auditoría, tipografía, consentimiento, sensor, export |
| [regression-risk-map.md](./regression-risk-map.md) | Riesgo | Mapa de áreas críticas y severidad ante regresiones |

---

## Auditorías y informes técnicos relacionados

| Documento | Ubicación | Alcance |
|-----------|-----------|---------|
| [Auditoría técnica sensor / ESP32 / calibración](../AUDITORIA-TECNICA-SENSOR-ESP32.md) | `docs/` | Arquitectura hardware-software, calibración, export técnico (mayo 2026) |
| [Auditoría web / Supabase readiness](../12-web-cloud-migration/web-touch-supabase-readiness-audit.md) | `12-web-cloud-migration/` | Preparación modo web táctil y cloud |
| [Smoke test web local](../12-web-cloud-migration/web-touch-local-smoke-test.md) | `12-web-cloud-migration/` | Prueba local del flujo web |
| [Revisión documentación (jun 2026)](../00-overview/documentation-sync-report.md) | `00-overview/` | Sincronización de Markdown (5 jun 2026) |

---

## Resultados técnicos canónicos (calibración)

Para el **modelo lineal activo** del espirómetro RESPIRA+ **3000 mL** (`cal-predefined-respira-3000-v20260602`, validación de banco 2 jun 2026), la documentación técnica interna reporta:

| Métrica | Valor documentado | Fuente interna |
|---------|-------------------|----------------|
| Coeficiente de determinación (R²) | 0,992 (0,9921507156019185 en código) | [README-csv-tecnico-calibracion.md](../calibration/README-csv-tecnico-calibracion.md); `predefined-calibration-models.ts` |
| Error absoluto medio (MAE) | 65,36 mL | [README-csv-tecnico-calibracion.md](../calibration/README-csv-tecnico-calibracion.md) |

**Nota metodológica:** otros informes del repositorio pueden citar métricas distintas (por ejemplo, R² = 0,9962 y MAE = 41 mL en la [auditoría de mayo 2026](../AUDITORIA-TECNICA-SENSOR-ESP32.md)). Esas cifras corresponden a **sesiones o modelos distintos** y no deben confundirse con el modelo predefinido instalado en el flujo paciente actual. Para terapia y exportación clínica prevalece el modelo canónico de 3000 mL documentado en [05-calibration/](../05-calibration/README.md).

---

## Validación de mercado y validación cualitativa

| Evidencia | Estado en el repositorio |
|-----------|--------------------------|
| Encuesta de validación de mercado (n = 66) | TODO: referencia pendiente — no se localizó el instrumento ni los resultados completos en archivos Markdown del repositorio al junio 2026 |
| Validación cualitativa con profesionales de la salud | Documentada de forma narrativa en [Marco legal](../legal/README-terminos-y-condiciones.md) (cambio postoperatorio); TODO: referencia pendiente para actas, guías o transcripciones si existen fuera del repo |
| Validación clínica formal | Pendiente; el prototipo se declara en desarrollo avanzado en [Overview](../00-overview/README.md) |

---

## Cómo usar el checklist QA

El [checklist manual](./full-app-manual-qa-checklist.md) debe ejecutarse tras cambios en:

- Consentimiento y gates de arranque
- Conexión ESP32 y estimación de volumen
- Evaluación inicial (VIM) y terapia
- Historial, exportación y clasificación sensor/práctica
- Notificaciones (incluido `EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false`)
- Modo web / PWA (véase [12-web-cloud-migration](../12-web-cloud-migration/README.md))

Ante fallos, consultar el [mapa de riesgos](./regression-risk-map.md) para priorizar regresiones.

---

## Relación con otros índices

- [Índice maestro de documentación](../README.md)
- [Overview del producto](../00-overview/README.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Calibración](../05-calibration/README.md)
- [Migración web](../12-web-cloud-migration/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Checklist manual de QA integral* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/10-testing-and-validation/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Mapa de riesgos de regresión* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/10-testing-and-validation/regression-risk-map.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Diccionario técnico del CSV de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/calibration/README-csv-tecnico-calibracion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Auditoría técnica sensor ESP32 y calibración* [Informe interno, mayo 2026]. En repositorio `app-rehab-respiratoria`, archivo `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Marco de términos y condiciones para el equipo* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/legal/`.
