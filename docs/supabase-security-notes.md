# Supabase Security Notes, Prototype Mode

Esta nota describe el **estado de seguridad esperado** mientras RESPIRA+ usa Supabase en **modo prototipo** para desarrollo colaborativo. Debe leerse antes de publicar la app, compartirla con usuarios finales o procesar datos personales reales.

---

## 1. Estado actual

- La integración de **Supabase** está configurada para facilitar el **desarrollo colaborativo**: mismo backend de referencia, esquema compartido y flujo de datos alineado entre integrantes.
- El proyecto se entiende en **fase de prototipo académico**, no como producto sanitario desplegado en producción.
- El equipo puede usar esta configuración para avanzar en **diseño**, **pruebas internas** y **validación del flujo de datos** sin asumir aún un despliegue endurecido.

---

## 2. Advertencia importante

- Esta configuración **no debe considerarse lista para producción**.
- **No debe usarse** con datos reales de pacientes ni con información identificable de personas sin el marco legal y ético adecuado.
- **No debe usarse** para publicación final, tiendas de aplicaciones o entornos expuestos al público **sin un endurecimiento previo** de seguridad, privacidad y gobernanza de datos.

Cualquier uso con datos reales requiere revisión explícita por el equipo y cumplimiento normativo aplicable.

---

## 3. Variables de entorno

- Puede existir un archivo **`.env`** en máquinas locales **solo para desarrollo**; no debe documentarse ni commitearse con valores reales en la versión final del repositorio.
- **`.env.example`** debe servir como **plantilla**: nombres de variables y valores ficticios (`YOUR_PROJECT`, `YOUR_SUPABASE_ANON_KEY`, etc.).
- **No documentar ni pegar valores reales** de URL, claves ni tokens en issues, PRs, wikis o README.

Variables esperadas por la app (nombres únicamente):

| Variable | Uso |
|----------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (placeholder en plantilla). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima / pública de cliente según la configuración del proyecto (placeholder en plantilla). |

**No** debe usarse una clave `service_role` ni secretos de servidor en el cliente de la app.

---

## 4. Riesgos actuales a revisar antes de producción

Antes de considerar el sistema listo para entornos reales, el equipo debe revisar al menos lo siguiente:

- **`.env`**: no debe permanecer versionado en el repositorio en la versión final; la fuente de verdad para secretos y entornos debe ser el proveedor y la configuración de CI/CD o secretos locales no trackeados.
- **Políticas RLS (Row Level Security)**: las políticas de **prototipo** que permiten acceso amplio **no deben** mantenerse en producción; deben sustituirse por reglas que acoten filas por usuario o identidad de paciente autorizada.
- **Consultas**: deben **filtrar por `patient_id` (u otro criterio de aislamiento) en la base de datos**, no confiar solo en el filtrado en el cliente.
- **Memoria del cliente**: evitar cargar en el dispositivo conjuntos de datos que expongan información de **otros pacientes** (p. ej. listas globales sin filtrar).
- **Dominio clínico-legal**: revisar de extremo a extremo **consentimiento**, **sesiones**, **intentos**, **historial**, **diagnóstico** y **exportación** bajo el nuevo modelo de persistencia.
- **Rotación de claves**: si en algún momento se compartieron en el repositorio o en canales inseguros claves reales del proyecto Supabase, **considerar rotación** antes de cualquier publicación o piloto con datos sensibles.

---

## 5. Checklist antes de publicar

Usar esta lista como guía mínima; puede ampliarse según política institucional o regulatoria.

- [ ] Retirar `.env` del control de versiones y mantener solo `.env.example` como referencia.
- [ ] Añadir `.env` y patrones `.env.*` a `.gitignore`, con excepción explícita para `.env.example` si se desea seguir versionando la plantilla.
- [ ] Rotar claves en el panel de Supabase si hubo exposición o duda razonable.
- [ ] Configurar **RLS real** alineada con el modelo de usuario o paciente (sin políticas de “acceso total” de prototipo).
- [ ] Validar que las consultas críticas aplican **filtros por `patient_id`** (u equivalente) en servidor.
- [ ] Probar de punta a punta: **login**, **registro**, **consentimiento**, **sesión**, **historial**, **exportación** y **recordatorios** con Supabase en un entorno que simule el despliegue previsto.
- [ ] Confirmar que **no** se embeben ni distribuyen **claves `service_role`** en el cliente.
- [ ] Confirmar que **no** se utilizan datos reales de pacientes sin marco ético-legal y consentimiento apropiados.

---

## Referencia

- Plantilla local: `.env.example`
- Documentación general del proyecto: `README.md`

Para dudas sobre arquitectura de datos o dispositivo, consultar también la documentación en `src/docs/`.
