# Mascota RESPIRA+ (PNG)

Ilustraciones con fondo transparente para **onboarding, pop-ups, celebraciones y mensajes guía**.

No usar en gameplay del runner; ahí va el conejo programado (`RespiraBunny.tsx`).

## Archivos oficiales

| Archivo | Pose (`RespiraBunnyImage`) | Uso recomendado |
|---------|----------------------------|-----------------|
| `bunny-presenting.png` | `presenting` | Tutoriales y explicación |
| `bunny-wave.png` | `wave` | Bienvenida |
| `bunny-wink.png` | `wink` | Consejos |
| `bunny-celebrate.png` | `celebrate` | Logros |
| `bunny-happy.png` | `happy` | Progreso positivo |
| `bunny-neutral.png` | `neutral` | Estados calmados / **default** |
| `bunny-astronaut.png` | `astronaut` | Nivel espacial |
| `bunny-error.png` | `error` | Solo errores técnicos o casos no clínicos |

## Notas de producto

- **No** usar `error` para fallos del paciente ni sesiones detenidas; en esos casos usar `neutral`.
- El default del componente es `pose="neutral"`.
- Sustituir PNGs manteniendo el mismo nombre de archivo; no hace falta cambiar el mapa en `RespiraBunnyImage.tsx` si el nombre coincide.

## Retirados

`bunny-idle.png` y `bunny-soft-alert.png` ya no forman parte de la librería. Sustitutos: `neutral`.
