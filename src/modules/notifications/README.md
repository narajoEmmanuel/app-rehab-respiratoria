# Módulo `notifications` (recordatorios locales)

Este módulo implementa **recordatorios locales de adherencia** con `expo-notifications` en plataformas nativas (iOS/Android). RESPIRA+ es un prototipo académico de apoyo terapéutico; los recordatorios **no sustituyen** la prescripción ni el seguimiento de un profesional de la salud.

---

## Propósito clínico-funcional

Facilitar la **constancia** en ejercicios respiratorios domiciliarios en adultos postoperatorios mediante avisos programados dentro de una ventana horaria de vigilia. La funcionalidad es complementaria al historial y a la exportación para revisión profesional; no constituye intervención clínica autónoma.

---

## Estado actual de la build (junio 2026)

La plantilla `.env.example` y la build de referencia del repositorio definen:

```
EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false
```

Cuando esta variable **no** es exactamente la cadena `true`:

| Comportamiento | Implementación |
|----------------|----------------|
| **No programar** recordatorios | `scheduleDailyReminders`, `sendTestNotification` y `syncRespiraNotifications` abortan o omiten la programación |
| **Limpieza al arranque** | `initializeRespiraNotificationsOnStartup` → `cleanupRespiraNotificationsWhenGloballyDisabled('startup')` en `app/_layout.tsx` |
| **Limpieza al volver a primer plano** | `subscribeRespiraNotificationCleanupOnForeground()` (nativo, flag off) |
| **Limpieza al refrescar configuración** | `useNotificationSettings.refresh` y `syncRespiraNotifications` con motivo `'refresh'` |
| **Persistencia coerced** | `coerceNotificationSettingsWhenGloballyDisabled` fuerza `enabled: false` e IDs vacíos al leer/guardar |

En **`__DEV__`**, si tras la cancelación selectiva quedan notificaciones RESPIRA+ huérfanas (p. ej. migración Expo Go), puede ejecutarse `cancelAllScheduledNotificationsAsync` **solo** con la flag global apagada.

En **web**, las notificaciones locales están limitadas; Perfil muestra **Solo en app**.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Scheduler / cleanup | `notification-scheduler.ts` |
| Persistencia | `notification-settings.storage.ts` |
| Hook UI | `use-notification-settings.ts` |
| Pantalla | `screens/NotificationSettingsScreen.tsx` |
| Copy clínico | `notification-copy.ts` |
| Permisos / canal Android | `notification-permissions.ts` |
| Flag global | `src/config/runtime-flags.ts` (`RESPIRA_NOTIFICATIONS_ENABLED`) |

Ruta Expo Router: `/notification-settings` (`app/notification-settings.tsx`).

---

## Flujo resumido

1. El paciente abre Recordatorios desde Perfil (requiere consentimiento activo).
2. `useNotificationSettings` carga settings por `patientId` desde AsyncStorage.
3. Si la flag global está **activa** y el usuario habilita recordatorios, `syncRespiraNotifications` cancela lotes previos y programa slots diarios deduplicados.
4. Si la flag global está **inactiva**, la UI informa que los recordatorios están desactivados en esta versión; el sistema limpia pendientes y normaliza storage.

La pantalla Perfil lee el mismo storage vía `readNotificationSettingsForDisplay` y recarga al recuperar foco.

---

## Relación con otros módulos

| Módulo | Relación |
|--------|----------|
| `patient/` | Settings scoped por paciente activo |
| `legal/` | Consentimiento requerido para acceder a la pantalla |
| `app-mode/` | Flags de compilación (véase README del módulo) |

---

## Documentación relacionada

- [Notificaciones (feature doc)](../../../docs/03-features/notificaciones.md)
- [Perfil — configuración](../../../docs/02-tabs/perfil-configuracion.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Arquitectura — rutas](../../../docs/01-app-architecture/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación de la función Notificaciones* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/03-features/`, archivo `notificaciones.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación de seguridad clínica y lenguaje* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/08-clinical-safety/`.
