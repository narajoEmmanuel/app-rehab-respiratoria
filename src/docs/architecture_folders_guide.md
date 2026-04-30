# Guía de carpetas y arquitectura del proyecto

## Propósito de este documento
Este documento explica la función de cada carpeta principal del proyecto, qué tipo de código debe vivir en cada una, qué no conviene colocar ahí y cómo se relaciona con el resto de la arquitectura. Su objetivo es ayudar al equipo a mantener una estructura clara, modular y segura para trabajo colaborativo.

---

## Visión general de la arquitectura
La arquitectura del proyecto sigue una regla central:

- `app/` se usa solo para rutas y navegación con Expo Router.
- `src/` contiene el código real del producto.

Esto permite que la navegación esté separada de la lógica de negocio, la UI modular, la integración con dispositivo y la evolución futura de la app.

---

## Carpetas principales del proyecto

### `app/`
**Propósito**  
Definir las rutas de la aplicación con Expo Router.

**Qué tipo de código va aquí**  
- Archivos de rutas
- Layouts
- Pantallas-ruta muy ligeras
- Conexiones hacia pantallas reales de `src/modules`

**Qué sí debería ir aquí**  
- `_layout.tsx`
- rutas como `app/auth/login.tsx`
- rutas dentro de `app/(tabs)/`

**Qué no debería ir aquí**  
- lógica de negocio
- reglas clínicas
- manejo de WebSocket / red local hacia el dispositivo
- procesamiento de datos
- estado complejo de sesión

**Relación con el sistema**  
Es la capa de entrada y navegación, no el lugar donde vive la lógica real de la app.

---

### `src/`
**Propósito**  
Contener el código real del producto.

**Qué tipo de código va aquí**  
- módulos funcionales
- componentes compartidos
- tema global
- utilidades
- tipos compartidos
- datos mock o persistencia
- documentación técnica interna

**Relación con el sistema**  
Es la base principal de la arquitectura del proyecto.

---

### `assets/`
**Propósito**  
Guardar recursos estáticos de la app.

**Qué tipo de código va aquí**  
No guarda lógica, solo archivos de recursos.

**Qué sí debería ir aquí**  
- imágenes
- íconos
- splash screens
- recursos gráficos

**Qué no debería ir aquí**  
- componentes
- pantallas
- lógica de sesión
- datos clínicos

---

### `scripts/`
**Propósito**  
Agrupar scripts auxiliares del proyecto.

**Qué tipo de código va aquí**  
- scripts de mantenimiento
- automatizaciones internas
- herramientas de soporte para desarrollo

**Qué sí debería ir aquí**  
- scripts como `reset-project.js`

**Qué no debería ir aquí**  
- lógica de producto usada por la app en runtime

---

## Documentación técnica interna

### `src/docs/`
**Propósito**  
Mantener documentación técnica del proyecto.

**Qué tipo de contenido va aquí**  
- decisiones de arquitectura
- ownership del equipo
- reglas de carpetas
- convenciones de desarrollo
- flujos técnicos

**Ejemplos**  
- `architecture.md`
- `team-ownership.md`
- futuros documentos como `architecture-folders.md`

**Relación con el sistema**  
Sirve como referencia para que el equipo mantenga consistencia al crecer la app.

---

## Datos y persistencia

### `src/data/`
**Propósito**  
Centralizar datos auxiliares de la app que no pertenecen directamente a un módulo funcional específico.

---

### `src/data/mock/`
**Propósito**  
Guardar datos simulados para desarrollo y pruebas.

**Qué tipo de contenido va aquí**  
- sesiones falsas
- respuestas simuladas
- datos de prueba para UI o lógica

**Qué no debería ir aquí**  
- datos reales clínicos
- lógica de negocio

---

### `src/data/storage/`
**Propósito**  
Preparar la capa de persistencia local.

**Qué tipo de código va aquí**  
- acceso a almacenamiento local
- repositorios locales
- abstracciones para guardar historial, planes o resúmenes

**Relación con el sistema**  
Sirve para desacoplar la app de la tecnología concreta de almacenamiento.

---

## Código compartido global

### `src/shared/`
**Propósito**  
Agrupar elementos reutilizables por múltiples módulos.

**Qué tipo de código va aquí**  
- componentes UI compartidos
- tema global
- constantes compartidas
- utilidades globales
- tipos reutilizables

**Qué no debería ir aquí**  
- lógica específica de un módulo como sesión, auth o device

---

### `src/shared/ui/`
**Propósito**  
Contener componentes reutilizables de interfaz.

**Qué tipo de código va aquí**  
- botones base
- wrappers visuales
- textos temáticos
- vistas reutilizables
- componentes de layout comunes

**Qué no debería ir aquí**  
- pantallas completas de negocio
- lógica clínica específica

---

### `src/shared/theme/`
**Propósito**  
Centralizar el sistema visual de la aplicación.

**Archivos esperados**  
- `colors.ts`
- `typography.ts`
- `spacing.ts`
- `radii.ts`
- `shadows.ts`
- `index.ts`

**Qué tipo de código va aquí**  
- tokens de diseño
- estilos globales reutilizables

**Ventaja arquitectónica**  
Evita hardcodear colores, tamaños y estilos por toda la app.

---

### `src/shared/constants/`
**Propósito**  
Guardar constantes globales compartidas.

**Qué tipo de contenido va aquí**  
- claves estáticas
- labels globales
- configuraciones simples compartidas

**Qué no debería ir aquí**  
- reglas terapéuticas específicas de sesión

---

### `src/shared/utils/`
**Propósito**  
Guardar funciones y helpers reutilizables.

**Qué tipo de código va aquí**  
- utilidades generales
- helpers puros
- hooks auxiliares no ligados a un módulo de negocio concreto

**Qué no debería ir aquí**  
- lógica de negocio compleja o específica de un dominio

---

### `src/shared/types/`
**Propósito**  
Definir tipos compartidos entre módulos.

**Qué tipo de código va aquí**  
- interfaces globales
- tipos base usados por más de un módulo

**Qué no debería ir aquí**  
- tipos exclusivos de un solo módulo, esos deben quedarse en su módulo correspondiente

---

## Módulos funcionales

### `src/modules/`
**Propósito**  
Organizar la app por dominios funcionales.

**Ventaja arquitectónica**  
Cada módulo representa una responsabilidad del producto, lo que facilita escalar, dividir trabajo en equipo y evitar acoplamiento innecesario.

---

### `src/modules/auth/`
**Propósito**  
Gestionar autenticación y acceso del usuario.

**Qué tipo de código va aquí**  
- pantallas de login y registro
- validación de formularios
- tipos de autenticación
- servicios futuros de sesión o identidad

**Qué no debería ir aquí**  
- navegación global completa
- datos clínicos
- reglas de sesión terapéutica

---

### `src/modules/home/`
**Propósito**  
Representar la pantalla principal del paciente.

**Qué tipo de código va aquí**  
- vista inicial
- accesos rápidos
- resumen de estado del usuario
- navegación hacia módulos principales

---

### `src/modules/levels/`
**Propósito**  
Mostrar y administrar la selección de niveles desde la UI.

**Qué tipo de código va aquí**  
- pantalla de selección de niveles
- visualización de niveles disponibles
- progreso o desbloqueo desde la perspectiva del usuario

**Importante**  
Aquí vive la selección visual del nivel, no necesariamente la configuración terapéutica detallada. Esa parte pertenece a `src/modules/session/levels/`.

---

### `src/modules/plans/`
**Propósito**  
Gestionar la planeación terapéutica del usuario.

**Qué tipo de código va aquí**  
- calendario
- plan semanal
- estructura de rutinas programadas
- placeholders de futuras sesiones planeadas

---

### `src/modules/history/`
**Propósito**  
Mostrar el historial de sesiones del usuario.

**Qué tipo de código va aquí**  
- lista de sesiones pasadas
- visualización de tendencias básicas
- acceso a detalles históricos

---

### `src/modules/summary/`
**Propósito**  
Mostrar el resumen de una sesión finalizada.

**Qué tipo de código va aquí**  
- métricas post-sesión
- cumplimiento
- feedback final
- resumen visual de desempeño

---

### `src/modules/patient/`
**Propósito**  
Concentrar información y lógica relacionada con el paciente.

**Qué tipo de código podría ir aquí**  
- perfil del paciente
- preferencias
- datos personales relevantes para la experiencia de la app
- configuraciones individuales

**Estado actual**  
Es un módulo reservado para crecimiento futuro.

---

## Módulo de sesión terapéutica

### `src/modules/session/`
**Propósito**  
Controlar la experiencia central de rehabilitación durante una sesión.

**Relación con la arquitectura**  
Es uno de los módulos más importantes del proyecto porque conecta reglas terapéuticas, experiencia interactiva, resultados y futura integración con datos del dispositivo.

---

### `src/modules/session/core/`
**Propósito**  
Definir el núcleo lógico de la sesión.

**Qué tipo de código va aquí**  
- estado de sesión
- tipos base de sesión
- reglas del ciclo de vida de una sesión
- lógica central que no depende de una UI específica

**Qué no debería ir aquí**  
- minijuegos visuales
- parsing de payloads del dispositivo (p. ej. vía WebSocket)
- componentes de pantalla

---

### `src/modules/session/games/`
**Propósito**  
Representar la capa visual o interactiva de los juegos de sesión.

**Qué tipo de código va aquí**  
- contratos visuales de juego
- tipos de juego
- componentes de biofeedback visual
- futuras implementaciones de minijuegos

**Decisión importante de arquitectura**  
Esta carpeta debe mantenerse separada de la dificultad terapéutica. El tipo de juego no debe estar mezclado con el nivel clínico.

---

### `src/modules/session/levels/`
**Propósito**  
Definir la configuración terapéutica de los niveles.

**Qué tipo de código va aquí**  
- dificultad
- metas
- parámetros de volumen o tiempo
- criterios de progresión

**Qué no debería ir aquí**  
- arte visual del juego
- componentes de interfaz específicos

---

### `src/modules/session/registry/`
**Propósito**  
Registrar oficialmente los niveles disponibles y su composición.

**Qué tipo de código va aquí**  
- registro central de niveles
- mapeo entre nivel, configuración y experiencia visual

**Ventaja arquitectónica**  
Facilita agregar nuevos niveles sin tocar múltiples partes de la app.

---

### `src/modules/session/screens/`
**Propósito**  
Contener pantallas relacionadas con la sesión.

**Qué tipo de código va aquí**  
- pantallas que orquestan la experiencia usando `core`, `games`, `levels` y `registry`

---

## Integración con dispositivo

### `src/modules/device/`
**Propósito**  
Agrupar la integración del dispositivo externo con la app.

**Relación con la arquitectura**  
Este módulo prepara la app para integrarse con el ESP32 por **WiFi local** y **WebSocket** sin mezclar esa complejidad con la UI o la lógica clínica.

---

### `src/modules/device/websocket/`
**Propósito**  
Gestionar la capa de comunicación en tiempo real con el hardware (cliente WebSocket hacia el ESP32 en la LAN).

**Qué tipo de código va aquí**  
- apertura y cierre del socket
- reconexión y heartbeats (según protocolo)
- estado de conexión
- entrega de mensajes crudos hacia ingestión/adaptadores

**Qué no debería ir aquí**  
- lógica clínica
- resumen de sesiones
- UI de paciente

---

### `src/modules/device/ingestion/`
**Propósito**  
Recibir y normalizar datos provenientes del dispositivo.

**Qué tipo de código va aquí**  
- validación de datos crudos
- transformación a modelos internos
- saneamiento de eventos recibidos

**Importancia**  
Esta capa evita que el resto de la app dependa directamente del formato crudo del ESP32.

---

### `src/modules/device/adapters/`
**Propósito**  
Traducir protocolos o formatos específicos de hardware a un formato interno estable.

**Qué tipo de código va aquí**  
- adaptadores por protocolo
- compatibilidad con distintos dispositivos o formatos

**Ventaja**  
Permite cambiar hardware o formato de transmisión sin romper toda la aplicación.

---

### `src/modules/device/mocks/`
**Propósito**  
Simular datos del dispositivo mientras no exista integración real.

**Qué tipo de código va aquí**  
- datos falsos
- eventos simulados de sesión
- secuencias de prueba para desarrollo

**Importancia actual**  
Es clave en esta etapa, porque el proyecto quiere preparar la arquitectura antes de integrar el cliente WebSocket real.

---

### `src/modules/device/types.ts`
**Propósito**  
Definir los tipos compartidos del módulo de dispositivo.

**Qué tipo de contenido va aquí**  
- payloads
- estado de conexión
- estructuras normalizadas del dispositivo

---

## Módulo clínico

### `src/modules/clinician/`
**Propósito**  
Separar la información útil para el profesional de salud de la experiencia del paciente.

**Relación con la arquitectura**  
Esta separación ayuda a que la parte clínica se vea más seria, confiable y organizada, sin contaminar la experiencia del juego o de la sesión interactiva.

---

### `src/modules/clinician/dashboard/`
**Propósito**  
Preparar vistas de métricas o seguimiento clínico.

**Qué tipo de código podría ir aquí**  
- indicadores agregados
- paneles de seguimiento
- métricas útiles para revisión profesional

---

### `src/modules/clinician/reports/`
**Propósito**  
Gestionar reportes clínicos o resúmenes estructurados.

**Qué tipo de código podría ir aquí**  
- generación de reportes
- modelos de resumen clínico
- formatos de entrega para revisión profesional

---

### `src/modules/clinician/export/`
**Propósito**  
Preparar la exportación de datos o resultados.

**Qué tipo de código podría ir aquí**  
- exportación a archivos
- estructuras compartibles
- formatos para enviar o guardar resultados

---

### `src/modules/clinician/types.ts`
**Propósito**  
Guardar tipos compartidos del dominio clínico.

---

## Reglas generales para mantener la arquitectura sana

### Regla 1
`app/` enruta, `src/` implementa.

### Regla 2
La lógica de negocio debe vivir en módulos, no en rutas.

### Regla 3
La dificultad terapéutica debe mantenerse separada del tipo de juego visual.

### Regla 4
La integración con hardware no debe mezclarse con la UI del paciente.

### Regla 5
Los elementos clínicos deben mantenerse separados de la experiencia lúdica.

### Regla 6
Lo reutilizable global va en `shared/`, pero lo específico de un módulo debe quedarse dentro de su módulo.

### Regla 7
Los cambios grandes de estructura deben documentarse en `src/docs/` para que todo el equipo use el mismo criterio.

---

## Estado actual de la arquitectura

### Fortalezas actuales
- buena separación entre rutas y lógica real
- módulos ya preparados para crecer
- separación clara entre sesión, device y clinician
- sistema visual centralizado en `shared/theme`
- existencia de documentación interna real

### Áreas todavía en desarrollo
- `patient/` aún reservado
- `device/` sigue en fase de placeholder
- `clinician/` sigue en fase inicial
- varias pantallas están en modo scaffold
- todavía faltan contratos de datos más definidos entre sesión, resumen e historial

---

## Recomendación final
La estructura actual es buena para crecer, siempre que el equipo respete la modularidad. El mayor riesgo no está en la carpeta actual, sino en que con el tiempo se empiece a meter lógica rápida dentro de rutas, pantallas o carpetas compartidas que no corresponden. Este documento debe servir como referencia viva y puede actualizarse conforme entren nuevas decisiones técnicas o nuevos módulos.

