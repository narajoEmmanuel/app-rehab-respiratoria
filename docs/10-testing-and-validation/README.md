# Validación, pruebas y auditorías — RESPIRA+

Esta carpeta agrupa el **aseguramiento de calidad operativo (QA)** del prototipo RESPIRA+: checklists manuales, mapas de riesgo de regresión y enlaces a auditorías técnicas de código y hardware.

La **validación académica preliminar** (calibración de banco, encuesta de mercado, validación cualitativa, marco regulatorio de referencia) se documenta en [09-academic-validation](../09-academic-validation/README.md) para evitar mezclar QA con evidencia académica.

RESPIRA+ es un prototipo en desarrollo avanzado orientado al apoyo terapéutico en **pacientes adultos postoperatorios**; los procesos aquí descritos **no equivalen** a validación clínica formal ni a certificación de producto sanitario.

---

## Documentos en esta carpeta

| Documento | Tipo | Descripción |
|-----------|------|-------------|
| [full-app-manual-qa-checklist.md](./full-app-manual-qa-checklist.md) | QA manual | Checklist integral: tipografía, consentimiento, sensor, export, notificaciones |
| [regression-risk-map.md](./regression-risk-map.md) | Riesgo | Áreas críticas y severidad ante regresiones |

---

## Auditorías técnicas relacionadas

| Documento | Fecha | Alcance |
|-----------|-------|---------|
| [Auditoría sensor / ESP32 / calibración](../AUDITORIA-TECNICA-SENSOR-ESP32.md) | Mayo 2026 | Hardware-software, WebSocket, calibración (informe histórico; ver reconciliación en [09-academic-validation](../09-academic-validation/README.md)) |
| [Auditoría web / Supabase](../12-web-cloud-migration/web-touch-supabase-readiness-audit.md) | 2026 | Preparación modo web/cloud |
| [Smoke test web local](../12-web-cloud-migration/web-touch-local-smoke-test.md) | 2026 | Flujo web local |
| [Revisión documentación](../00-overview/documentation-sync-report.md) | 5 jun 2026 | Sincronización Markdown |

---

## Métricas de calibración (referencia cruzada)

El modelo canónico de banco (jun 2026) para espirómetro 3000 mL: R² = 0,992; MAE = 65,36 mL. No repetir aquí el detalle metrológico; véase [05-calibration](../05-calibration/README.md) y [Validación académica](../09-academic-validation/README.md).

---

## Cuándo ejecutar el checklist QA

Tras cambios en:

- Consentimiento y gates de arranque
- Conexión ESP32 y estimación de volumen
- Evaluación inicial (VIM) y terapia
- Historial, exportación y clasificación sensor/práctica
- Notificaciones (`EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false`)
- Modo web / PWA ([12-web-cloud-migration](../12-web-cloud-migration/README.md))

Ante fallos, consultar el [mapa de riesgos](./regression-risk-map.md).

---

## Relación con otros índices

- [Índice maestro](../README.md)
- [Validación académica](../09-academic-validation/README.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Calibración](../05-calibration/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Checklist manual de QA integral* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/10-testing-and-validation/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Mapa de riesgos de regresión* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/10-testing-and-validation/regression-risk-map.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Validación académica* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/09-academic-validation/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Auditoría técnica sensor ESP32 y calibración* [Informe interno, mayo 2026]. En repositorio `app-rehab-respiratoria`, archivo `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md`.
