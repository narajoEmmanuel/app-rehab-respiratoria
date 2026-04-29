# Estado de la branch `feature/bluetooth-esp32`

## Objetivo de la branch

Esta branch se creó para iniciar la integración real de Bluetooth entre el ESP32 y la app móvil de rehabilitación respiratoria.

El objetivo inicial no era conectar todavía el sensor a la sesión terapéutica, sino preparar el proyecto para poder usar Bluetooth real en una versión de desarrollo de la app.

## Punto de partida seguro

Antes de comenzar los cambios de Bluetooth, se creó un tag estable del estado actual de la app:

```text
stable-before-bluetooth-2026-04-28
```

Este tag permite regresar a la versión estable previa a cualquier intento de integración Bluetooth en caso de error.

## Pasos realizados

1. Se actualizó `master` con la última versión disponible en GitHub.

2. Se creó la branch de trabajo:

   ```bash
   git checkout -b feature/bluetooth-esp32
   ```

3. Se configuró EAS para poder crear builds de desarrollo.

4. Se generó el archivo:

   ```text
   eas.json
   ```

5. Se preparó el perfil de build de desarrollo con:

   ```json
   "development": {
     "developmentClient": true,
     "distribution": "internal"
   }
   ```

6. Se configuró el proyecto para iOS, ya que el equipo actualmente usa iPhone.

7. Se agregó el iOS bundle identifier en `app.json`:

   ```text
   com.naranjoemmanuel.apprehabrespiratoria
   ```

8. Se intentó crear una development build de iOS con:

   ```bash
   eas build --platform ios --profile development
   ```

## Por qué se pausó

La build de iOS se pausó porque EAS pidió iniciar sesión con una cuenta registrada en Apple Developer Program.

El intento falló con el mensaje:

```text
You are not registered as an Apple Developer.
```

Esto significa que el problema no fue del código ni de la configuración principal del proyecto, sino de un requisito externo de Apple para poder firmar e instalar una development build en un iPhone físico.

## Estado actual

La branch queda pausada con:

- EAS configurado.
- `eas.json` generado.
- Configuración inicial de development build creada.
- iOS bundle identifier agregado.
- No se integró Bluetooth real todavía.
- No se instaló todavía una app de desarrollo en iPhone.
- No se modificó la lógica de sesión.
- No se conectó todavía el ESP32 a la app.

## Qué falta para continuar

Para continuar con Bluetooth real hay dos caminos posibles.

### Opción 1: Continuar con iPhone

Se necesita acceso a una cuenta de Apple Developer Program.

Después de resolver eso, se debe volver a correr:

```bash
eas build --platform ios --profile development
```

Luego se debe instalar la development build en el iPhone y probar que la app actual funciona antes de instalar librerías BLE.

### Opción 2: Probar primero con Android

Si se consigue un teléfono Android, se puede configurar Android para EAS y avanzar con pruebas BLE sin depender de Apple Developer.

En ese caso, el siguiente paso sería configurar Android y generar una development build para Android.

## Siguiente fase técnica recomendada

Cuando se pueda continuar, el siguiente objetivo debe ser pequeño:

```text
ESP32 real -> app detecta el dispositivo -> app se conecta -> app muestra una lectura numérica simple
```

No se debe conectar todavía Bluetooth directamente a `SessionScreen`.

La integración debe mantenerse dentro de:

```text
src/modules/device/bluetooth
src/modules/device/ingestion
src/modules/device/adapters
```

La pantalla `SensorConnectionScreen` debe consumir una capa intermedia, no lógica Bluetooth directa.

## Reglas para continuar esta branch

- No hacer merge a `master` todavía.
- No modificar la lógica de sesión hasta validar primero la conexión básica.
- No instalar librerías BLE sin revisar el plan antes.
- Mantener modo simulado disponible para que el equipo pueda seguir programando sin hardware.

## Comandos útiles para retomar

### Entrar a la branch

```bash
git checkout feature/bluetooth-esp32
git pull origin feature/bluetooth-esp32
```

### Verificar estado

```bash
git status
```

### Intentar de nuevo build iOS cuando exista Apple Developer

```bash
eas build --platform ios --profile development
```

### Regresar a la versión estable previa a Bluetooth, sin borrar nada

```bash
git checkout -b recovery/stable-before-bluetooth stable-before-bluetooth-2026-04-28
```

## Nota para el equipo

Esta branch no representa una integración Bluetooth completa. Representa únicamente la preparación inicial para poder crear una development build y comenzar pruebas futuras con hardware real.

La app estable sigue estando en `master`. Esta branch debe retomarse solo cuando exista una de estas condiciones:

1. Acceso a Apple Developer Program para probar en iPhone.
2. Un teléfono Android disponible para pruebas BLE.
3. Una decisión clara del equipo sobre la librería BLE y el flujo de conexión.
