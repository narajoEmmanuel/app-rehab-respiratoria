# RESPIRA+ | Términos, consentimiento, privacidad y descargo clínico

Documento explicativo del **marco ético, legal, clínico y funcional** de los textos legales y del flujo de aceptación dentro de RESPIRA+. Está dirigido a integrantes del equipo, evaluadores académicos y personas que no programan. **No sustituye asesoría jurídica ni certificación regulatoria.**

---

## 1. Propósito de este documento

Este archivo describe **por qué** RESPIRA+ incorpora Términos y Condiciones, Consentimiento Informado, Aviso de Privacidad y Descargo Clínico; **cómo** se relacionan entre sí; **qué hace la app hoy** para registrar la aceptación; y **qué límites** tiene el prototipo académico.

Su objetivo es alinear criterios de diseño, redacción de PDFs, pruebas de usuario y presentaciones del proyecto, sin afirmar que el prototipo cumple por sí solo toda la normativa aplicable en México u otros países.

---

## 2. ¿Para qué sirven los Términos y Condiciones?

En RESPIRA+, los documentos legales (en conjunto con la pantalla de aceptación digital) cumplen funciones concretas:

| Función | Explicación en el contexto de RESPIRA+ |
|--------|----------------------------------------|
| **Definir el alcance de la app** | Aclara que la herramienta apoya **monitoreo y seguimiento** de ejercicios respiratorios con espirómetro incentivador, no atención hospitalaria completa. |
| **Informar el uso correcto** | Indica que el uso debe alinearse con **indicación o validación** de un profesional de la salud y con las instrucciones del espirómetro. |
| **Delimitar responsabilidades** | Separa lo que hace el **prototipo académico** de lo que corresponde al **médico**, al **paciente** y al **equipo desarrollador**. |
| **Identificar el prototipo académico** | Deja explícito que RESPIRA+ está en **desarrollo y validación preliminar** (Ingeniería Biomédica), no como producto médico comercial terminado. |
| **Evitar interpretación como diagnóstico** | Refuerza que volumen estimado, cumplimiento, repeticiones e historial son **indicadores de apoyo**, no un diagnóstico ni una prescripción automática. |
| **Contextualizar los datos** | Los registros sirven para **adherencia, retroalimentación y progreso** en el marco del proyecto; no reemplazan una evaluación clínica integral. |
| **Proteger a las partes** | Reduce malentendidos que podrían afectar al **usuario/paciente**, al **equipo** y a **profesionales** que participan en pruebas o validación. |

En la práctica, los Términos y Condiciones son las **reglas de uso** de la aplicación: qué puede y qué no puede hacer el usuario, bajo qué condiciones se ofrece el software y qué limitaciones tiene.

---

## 3. Diferencia entre documentos legales

Los cuatro bloques suelen aparecer **integrados** en un mismo PDF y en **casillas de aceptación** separadas en la app, pero cumplen roles distintos:

| Documento | Qué significa | Para qué sirve en RESPIRA+ | Qué riesgo ayuda a controlar |
|-----------|---------------|----------------------------|----------------------------|
| **Términos y Condiciones** | Reglas contractuales o de uso del software: alcance, limitaciones, propiedad intelectual, conducta permitida, etc. | Establecer que la app es un **prototipo de apoyo** al seguimiento domiciliario; definir conductas prohibidas (p. ej. usar resultados como diagnóstico). | Uso indebido de la app, expectativas irreales, disputas por mal uso del software. |
| **Consentimiento informado** | Aceptación **voluntaria** después de conocer objetivos, procedimientos, beneficios, riesgos y alternativas de participar en el uso o prueba del prototipo. | Registrar que el usuario **entiende** que participa en un proyecto académico en validación y que puede **retirar** su consentimiento. | Uso del prototipo sin comprensión de riesgos; falta de trazabilidad de la decisión del usuario. |
| **Aviso de privacidad** | Transparencia sobre **datos personales**: qué se recaba, finalidades, conservación, transferencias y derechos del titular. | Explicar tratamiento de datos de desempeño respiratorio, sesiones, historial y exportación; alinear expectativas con Supabase o almacenamiento local según el modo de la app. | Tratamiento opaco de datos sensibles; uso de información sin conocimiento del usuario. |
| **Descargo clínico** | Aclaración de que la herramienta **no sustituye** atención médica, diagnóstico, tratamiento ni indicación profesional. | Reforzar que métricas como volumen inspirado **estimado**, tiempo sostenido o cumplimiento **no** son decisiones clínicas autónomas. | Daño por automedicación, retraso en atención real, interpretación errónea de indicadores. |

**Relación entre ellos:** los Términos marcan el **marco de uso**; el Consentimiento registra la **decisión informada** de participar; el Aviso de Privacidad cubre el **tratamiento de datos**; el Descargo acota el **alcance clínico**. En RESPIRA+ conviene que los cuatro mensajes sean **coherentes** (misma población objetivo, mismos límites, misma versión de documento).

---

## 4. Relación con datos personales sensibles

RESPIRA+ puede registrar información vinculada al **desempeño terapéutico** y al **estado respiratorio** del usuario (por ejemplo: volumen inspirado estimado, tiempo de inspiración sostenida, repeticiones válidas, cumplimiento de sesión, consistencia, historial de progreso, datos de perfil y sesiones). En muchos marcos normativos, este tipo de datos se acerca a **datos personales sensibles** o datos de salud, y exige mayor cuidado.

El usuario debe poder conocer, al menos:

| Tema | Qué debe quedar claro |
|------|------------------------|
| **Qué datos se recaban** | Variables de sesión, intentos, niveles, diagnóstico inicial, preferencias, registro de consentimiento, y en modo nube datos asociados al paciente en Supabase. |
| **Para qué se recaban** | Apoyo al seguimiento domiciliario, adherencia, biofeedback, análisis del prototipo y mejora del sistema — **no** para diagnosticar ni prescribir de forma autónoma. |
| **Cómo se almacenan** | Localmente en el dispositivo (`AsyncStorage`) y, si el modo nube está activo, en tablas como `consent_records`, `sessions`, `attempts`, etc. (ver `supabase/schema.sql`). |
| **Si se exportan o comparten** | La app incluye **exportación manual** (JSON/CSV) hacia archivos compartidos por el usuario; eso traslada la responsabilidad de custodia fuera de la app. |
| **Limitaciones del sistema** | Estimaciones de volumen sujetas a calibración; prototipo en validación; posibles modos de prueba sin sincronización clínica real. |
| **Derechos del usuario** | Acceso al PDF, posibilidad de **retirar consentimiento** (limitando funciones), y en el diseño futuro: rectificación, cancelación o portabilidad según normativa y madurez del producto. |

**Importante:** este README **no** certifica cumplimiento pleno de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México), GDPR u otras. El equipo debe validar textos y procesos con asesoría legal si el prototipo escala a uso con pacientes reales fuera del entorno académico controlado.

---

## 5. Relación con la seguridad del paciente

Los documentos legales y las advertencias en la app son una capa de **seguridad del paciente** (junto con el diseño clínico del protocolo de ejercicios). Ayudan a **prevenir mal uso** del prototipo.

Ejemplos de mensajes que deben mantenerse alineados en PDF, pantallas y capacitación:

- **Detener la sesión** si aparece dolor torácico, mareo, disnea intensa, tos excesiva o malestar inusual.
- **Usar el sistema** solo bajo indicación o supervisión/validación de un profesional de la salud, según el protocolo del estudio o la práctica clínica que respalde el proyecto.
- **No interpretar** los resultados de la app como diagnóstico, pronóstico o indicación de medicación.
- **No forzar metas** de volumen o repeticiones por comparación con otros usuarios o con valores “ideales” de la app.
- **No comparar** resultados entre pacientes sin contexto clínico (edad, cirugía, comorbilidades, capacidad pulmonar basal).

La app **bloquea o desincentiva** funciones sensibles sin consentimiento activo (Terapia, Historial, sensor en modo nube), lo cual es una medida técnica complementaria a los textos legales.

---

## 6. Relación con la validación clínica del proyecto

Tras trabajo de validación con especialista en **rehabilitación pulmonar**, el proyecto orientó su diseño hacia **adultos en contexto postoperatorio**, donde el espirómetro incentivador con referencia de **volumen y tiempo** resulta más pertinente que escenarios centrados solo en **EPOC** u otras poblaciones con necesidades distintas.

Esto debe reflejarse de forma coherente en:

- Textos del **PDF legal** (población objetivo, exclusiones, advertencias).
- Pantalla **“Antes de comenzar”** y casillas de aceptación.
- Materiales de **presentación** y protocolos de prueba con usuarios.
- Cualquier **modo futuro** “clínico” o comercial: una nueva población objetivo exige **nueva versión** del documento y, probablemente, nuevo consentimiento.

**No** implica que el prototipo ya esté validado como dispositivo médico ni que pueda usarse fuera del marco académico acordado sin revisión ética y legal adicional.

Documentación ampliada: [Validación académica](../09-academic-validation/README.md).

---

## 6.1 Bioética, consentimiento y privacidad (síntesis para el equipo)

Esta sección **resume** el marco ético-legal; el texto completo para el usuario está en el PDF (`terminos-uso-etico.pdf`). No sustituye asesoría jurídica.

| Tema | Qué debe quedar claro |
|------|------------------------|
| **Consentimiento informado** | Participación **voluntaria** en un prototipo académico en validación; derecho a **retirar** el consentimiento y limitar funciones |
| **Datos personales y sensibles** | Perfil, sesiones, desempeño respiratorio estimado — posible categoría de datos de salud según marco aplicable |
| **Finalidad académica y de seguimiento** | Adherencia, biofeedback, mejora del sistema, documentación del proyecto — **no** diagnóstico ni prescripción autónoma |
| **Exportación** | El usuario puede generar CSV/JSON; la custodia posterior es responsabilidad de quien comparte el archivo |
| **Confidencialidad** | Modo local-first por defecto; nube opcional/congelada; políticas Supabase de prototipo no aptas para producción con datos reales |
| **Derechos del titular** | Acceso al PDF, retiro de consentimiento; rectificación/cancelación/portabilidad — alineación con LFPDPPP como **marco de referencia**, no certificación de cumplimiento |
| **Limitaciones del prototipo** | Estimaciones sujetas a calibración; sin registro sanitario documentado; validación clínica formal pendiente |

Síntomas de alerta documentados (detener ejercicio ante dolor, mareo, disnea intensa, tos excesiva, malestar): alineados con [Seguridad clínica](../08-clinical-safety/README.md) y sección 5 de este documento.

---

## 6.2 Consideraciones regulatorias (marco de referencia)

RESPIRA+ **no cuenta con registro sanitario** documentado en el repositorio. Las referencias normativas siguientes son **consideraciones académicas preliminares** y **ruta futura** posible, no afirmaciones de cumplimiento:

| Tema | Estado en documentación interna |
|------|--------------------------------|
| **COFEPRIS** (México) | TODO: referencia pendiente — ruta regulatoria no detallada en Markdown del repo |
| **LFPDPPP** (México) | Marco de referencia citado en sección 4; cumplimiento pleno **no** certificado por este README |
| **Buenas prácticas de fabricación, ISO 13485, ISO 14971, tecnovigilancia** | TODO: referencia pendiente |
| **Etiquetado e instrucciones de uso (IFU)** | Parcial — PDF legal y copy de app; TODO: referencia pendiente para IFU formal |

Detalle: [Validación académica](../09-academic-validation/README.md), sección 5.

---

## 7. Flujo esperado dentro de la app (implementación actual)

Resumen del comportamiento **según el código** del repositorio (puede evolucionar; ver sección 8).

### 7.1 Documento legal y versión

- Versión actual en código: **`LEGAL_DOCUMENT_VERSION = '1.1'`** (`src/modules/legal/constants.ts`).
- Título registrado: **“RESPIRA+ — Términos, consentimiento, privacidad y descargo (v1.1)”**.
- PDF abierto desde la app: **`assets/legal/terminos-uso-etico.pdf`** (`open-legal-document.ts`) — **canónico**.
- Copia alineada para el equipo: **`assets/docs/respira-legal-v1.pdf`** (mismo contenido que el canónico desde v1.1).
- Archivo histórico v1.0: **`assets/legal/terminos-uso-etico-v1.0.pdf`** (no lo abre la app).

### 7.2 Pantalla de aceptación

- Ruta: **`/legal/accept`** → `LegalAcceptScreen.tsx`.
- Siete casillas obligatorias (todas deben marcarse para continuar), alineadas con:
  - Términos y condiciones.
  - Consentimiento informado.
  - Aviso de privacidad.
  - Prototipo académico.
  - No sustitución de atención médica.
  - Indicadores de apoyo (no mediciones clínicas definitivas).
  - Derecho a retirar consentimiento.
- Botón **“Ver términos y condiciones (PDF)”** abre el documento completo.
- Al aceptar, se guarda un registro **`AcceptedConsentRecord`** con fecha, versión, versión de app, IDs de enunciados aceptados y método `digital_in_app`.

### 7.3 Almacenamiento de la aceptación

| Modo | Comportamiento |
|------|----------------|
| **Nube (Supabase activo)** | Inserción en tabla `consent_records`; lectura del registro activo más reciente por `patient_id`. Clave local de respaldo: `@rehab/legal_consent_v1`. |
| **Prototipo local (nube desactivada)** | `app/index.tsx` puede ejecutar **`seedLocalPrototypeConsentForPatient`**, que pre-acepta consentimiento **sin pasar por la pantalla legal** para facilitar pruebas offline. Esto es un **atajo de desarrollo**, no un sustituto del flujo ético en estudios con personas reales. |

### 7.4 Consulta posterior y retiro

- **Perfil** → sección “Privacidad, consentimiento y términos”: versión aceptada, fecha, abrir PDF, volver a aceptar, **retirar consentimiento** (`withdrawConsent`).
- Retiro: estado `withdrawn` + `withdrawnAt`; limita Terapia, Historial y sensor hasta nueva aceptación.

### 7.5 Bloqueos sin consentimiento activo

| Mecanismo | Alcance |
|-----------|---------|
| **`app/index.tsx`** | Con nube activa, redirige a `/legal/accept` si `needsConsent()` (sin registro o versión distinta de `LEGAL_DOCUMENT_VERSION`, hoy `1.1`). |
| **`ConsentTabGuard`** | Envuelve **Terapia**, **Plan**, **Historial**; redirige a Inicio si no hay consentimiento activo. |
| **`(tabs)/_layout.tsx`** | En pestañas protegidas, `tabPress` muestra alerta y enlace a aceptación. |
| **`HomeScreen`** | Alertas al intentar Terapia o sensor sin consentimiento; tarjeta “Consentimiento pendiente”. |
| **`ConsentStackGuard`** | Rutas de **sensor**, **calibración**, **hardware-lab**; con nube activa exige consentimiento salvo excepciones abajo. |
| **`DataExportScreen`** | Verifica `isConsentActive()` antes de exportar. |

**Excepciones actuales (modo prueba / prototipo):**

- Si **`isCloudAuthEnabled()`** es falso, `ConsentStackGuard` **no bloquea** (banner “Modo prototipo local…”).
- Modo **`offline_sensor_test`** con flag habilitado: bypass del guard de consentimiento en rutas de sensor (banner experimental).

### 7.6 Actualización de versión legal

- Si cambia **`LEGAL_DOCUMENT_VERSION`**, `needsConsent()` devuelve verdadero y el usuario debe **volver a aceptar** (flujo de re-consentimiento).
- Al publicar un PDF nuevo, incrementar versión en `constants.ts` y revisar textos de casillas si cambian obligaciones.

```mermaid
flowchart TD
  A[Usuario inicia sesión] --> B{¿Nube activa?}
  B -->|No| C[Bootstrap local opcional seed consent]
  B -->|Sí| D{¿needsConsent?}
  D -->|Sí| E[/legal/accept]
  D -->|No| F[Tabs Inicio]
  E --> G[Marcar 7 casillas + PDF]
  G --> H[acceptConsent → AsyncStorage / Supabase]
  H --> F
  F --> I{Terapia / Historial / Sensor}
  I --> J{¿isConsentActive?}
  J -->|No| K[Alerta o Redirect]
  J -->|Sí| L[Usar función]
```

---

## 8. Archivos del proyecto relacionados

Rutas **encontradas** en el repositorio (mayo 2026). Rutas listadas en la solicitud pero **no encontradas** se indican al final.

### 8.1 Módulo legal (`src/modules/legal/`)

| Archivo | Rol |
|---------|-----|
| `constants.ts` | Versión `1.0`, clave AsyncStorage, IDs de enunciados. |
| `types.ts` | Tipo `AcceptedConsentRecord`, estados `active` / `withdrawn`. |
| `consent-service.ts` | Lectura/escritura consentimiento, `needsConsent`, `isConsentActive`, retiro, seed local. |
| `legal-hrefs.ts` | Href `/legal/accept`. |
| `use-consent-active.ts` | Hook React para UI que depende del consentimiento. |
| `open-legal-document.ts` | Abre PDF empaquetado (web / nativo / compartir). |
| `screens/LegalAcceptScreen.tsx` | Pantalla de aceptación obligatoria. |
| `ConsentTabGuard.tsx` | Guardián de pestañas Terapia / Plan / Historial. |
| `ConsentStackGuard.tsx` | Guardián de rutas stack (sensor, calibración, lab). |

### 8.2 Rutas de aplicación

| Archivo | Rol |
|---------|-----|
| `app/legal/accept.tsx` | Ruta Expo Router → `LegalAcceptScreen`. |
| `app/index.tsx` | Puerta de entrada; redirección a legal si falta consentimiento (modo nube). |
| `app/(tabs)/terapia.tsx`, `plan.tsx`, `historial.tsx` | Envueltos en `ConsentTabGuard`. |
| `app/(tabs)/_layout.tsx` | Bloqueo por `tabPress` en pestañas protegidas. |
| `app/sensor-connection.tsx`, `sensor-calibration.tsx`, `hardware-lab.tsx` | Envueltos en `ConsentStackGuard`. |
| `app/_layout.tsx` | Registra pantalla `legal/accept`. |

### 8.3 Integración en otras pantallas

| Archivo | Rol |
|---------|-----|
| `src/modules/home/screens/HomeScreen.tsx` | Avisos y navegación a aceptación legal. |
| `src/modules/patient/screens/ProfileScreen.tsx` | Estado de consentimiento, PDF, retiro, re-aceptación. |
| `src/modules/export/screens/DataExportScreen.tsx` | Requiere consentimiento activo para exportar. |
| `src/modules/notifications/screens/NotificationSettingsScreen.tsx` | Enlace a revisar documentos legales. |

### 8.4 Activos y tipos

| Archivo | Rol |
|---------|-----|
| `assets/legal/terminos-uso-etico.pdf` | PDF canónico usado por `openLegalDocument` (v1.1). |
| `assets/docs/respira-legal-v1.pdf` | Copia alineada al canónico (mismo hash desde v1.1). |
| `assets/legal/terminos-uso-etico-v1.0.pdf` | Archivo histórico v1.0 (no lo abre la app). |
| `legal-assets.d.ts` | Declaración TypeScript para importar `*.pdf`. |

### 8.5 Base de datos y documentación

| Archivo | Rol |
|---------|-----|
| `supabase/schema.sql` | Tabla `consent_records` y políticas RLS de prototipo (“open access”). |
| `docs/supabase-security-notes.md` | Advertencias de no usar datos reales sin marco ético-legal. |
| `README.md` | Menciona consentimiento digital y bloqueo de rutas sensibles. |

### 8.6 No encontrado como módulo independiente

- **`src/modules/legal/consent-service.ts`** — **sí existe** (listado arriba).
- Carpeta **`docs/legal/`** — creada con este README; antes no existía.
- No se encontró un módulo separado solo de “privacidad” fuera de `src/modules/legal/`.

---

## 9. Recomendaciones para mantener el sistema legal

1. **Versionar siempre** el documento legal (`LEGAL_DOCUMENT_VERSION`) y el PDF; mantener un registro de cambios (changelog) accesible al equipo.
2. **No recabar ni sincronizar** datos sensibles de salud sin consentimiento activo y propósito documentado en el aviso de privacidad.
3. **No prometer** diagnóstico, tratamiento autónomo ni precisión clínica certificada en marketing, UI o README.
4. **Lenguaje claro** para usuarios no técnicos; evitar jerga legal innecesaria en casillas y alertas.
5. **Diferenciar modos** en UI y documentación:
   - Prototipo académico local (sin nube).
   - Modo online con Supabase (prototipo colaborativo).
   - Modo prueba de sensor (`offline_sensor_test`).
   - Posible versión clínica futura (requeriría revisión regulatoria aparte).
6. **Revisar documentos** cuando cambien: población objetivo (p. ej. postoperatorio vs EPOC), variables medidas, calibración del sensor, almacenamiento o exportación.
7. **Mantener alineados** `terminos-uso-etico.pdf` (canónico app) y `assets/docs/respira-legal-v1.pdf` (copia de equipo) cuando cambie el documento.
8. **Endurecer Supabase en producción**: las políticas “Prototype open access” **no** son adecuadas para datos reales; ver checklist en `docs/supabase-security-notes.md`.
9. **Evaluar el seed automático** de consentimiento en modo local: útil para laboratorio, **inadecuado** para ensayos con pacientes sin pantalla de aceptación real.
10. **Cualquier uso clínico real** (hospital, consultorio, ensayo con pacientes identificables) debe pasar por comité de ética, consentimiento informado en papel o digital según protocolo, y asesoría legal/local.

---

## 10. Respuesta breve para presentación

**Los Términos y Condiciones sirven para delimitar el uso seguro y responsable de RESPIRA+. Como la app registra información relacionada con el desempeño respiratorio, es necesario informar al usuario qué datos se recaban, para qué se usan y cuáles son los límites del sistema. También aclaran que RESPIRA+ es una herramienta de apoyo al seguimiento, no un diagnóstico ni sustituto del profesional de salud. Por eso, más que un trámite legal, son una medida ética, clínica y de seguridad para proteger al paciente y al equipo desarrollador.**

---

## Aviso final

RESPIRA+ es un **prototipo académico** de Ingeniería Biomédica. Los textos legales y los guardas técnicos en la app **reducen riesgos** pero **no reemplazan** supervisión médica, validación regulatoria ni cumplimiento normativo completo. Ante dudas, consultar a profesionales de salud participantes en el proyecto y, cuando corresponda, a asesoría jurídica especializada.

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación de seguridad clínica y lenguaje* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/08-clinical-safety/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Validación académica* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/09-academic-validation/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Notas de seguridad Supabase (desarrollo)* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/supabase-security-notes.md`.
