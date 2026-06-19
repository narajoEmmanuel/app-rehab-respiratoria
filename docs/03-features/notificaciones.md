# Notificaciones

## Propósito

Configurar recordatorios locales de adherencia dentro de una ventana horaria de vigilia. La implementación usa `expo-notifications` (notificaciones **locales**, no push remotas). RESPIRA+ es un prototipo académico de apoyo; los recordatorios **no sustituyen** la indicación ni el seguimiento de un profesional de la salud.

---

## Estado actual de la build (junio 2026)

La build de referencia del repositorio define en `.env.example`:

```
EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false
```

Mientras esta variable **no** sea exactamente `true`, el sistema **no debe programar** recordatorios locales. Además ejecuta **limpieza** de notificaciones RESPIRA+ pendientes en:

| Momento | Función | Motivo (`reason`) |
|---------|---------|-------------------|
| Arranque nativo | `initializeRespiraNotificationsOnStartup` | `startup` |
| Vuelta a primer plano | `subscribeRespiraNotificationCleanupOnForeground` | `foreground` |
| Sincronización / refresh de settings | `syncRespiraNotifications`, `useNotificationSettings.refresh` | `refresh` |

La persistencia aplica `coerceNotificationSettingsWhenGloballyDisabled`: fuerza `enabled: false`, vacía `scheduledNotificationIds` y `lastScheduledAt` al leer y guardar, conservando horarios y ventana para una activación futura con flag `true`.

En web, las notificaciones locales están limitadas; Perfil muestra **Solo en app**.

Detalle de implementación: [módulo notifications](../../src/modules/notifications/README.md).

---

## Archivos principales

| Rol | Ruta |
|-----|------|
| Ruta | `app/notification-settings.tsx` |
| Pantalla | `src/modules/notifications/screens/NotificationSettingsScreen.tsx` |
| Hook | `src/modules/notifications/use-notification-settings.ts` |
| Scheduler / cleanup | `src/modules/notifications/notification-scheduler.ts` |
| Storage | `src/modules/notifications/notification-settings.storage.ts` |
| Flag global | `src/config/runtime-flags.ts` |
| Copy | `src/modules/notifications/notification-copy.ts` |
| Componentes | `ReminderHeroCard`, `AwakeWindowCard`, `DayNightVisualCard`, `NextReminderCard`, `TodayReminderTimeline`, `TestNotificationButton` |

---

## Rutas relacionadas

- `/notification-settings` — entrada desde Perfil.

---

## Entradas y salidas del flujo

**Entradas:** paciente activo + consentimiento activo (redirige a legal si no).

**Salidas (con flag global `true`):** recordatorios programados o cancelados en el SO local; notificación de prueba inmediata.

**Salidas (con flag global `false`):** limpieza de pendientes; UI informa que los recordatorios están desactivados en esta versión; storage normalizado sin IDs programados.

---

## Datos persistidos

Settings por paciente en AsyncStorage (`notification-settings.storage.ts` — clave por `patientId`).

---

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Paciente | Settings scoped por paciente activo |
| Consent | Requerido al abrir pantalla |
| Sensor/touch | Sin relación directa |
| Profesional | Copy: ajustar según indicación profesional |
| Perfil | Lee el mismo `NotificationSettings`; estado visible vía `resolveProfileReminderStatus` |

---

## Estado compartido Perfil ↔ Notificaciones

- Fuente de verdad: `loadNotificationSettings` / `saveNotificationSettings` por `paciente_id`.
- `NotificationSettingsScreen` persiste `enabled` con `useNotificationSettings` (sujeto a coerción si flag global off).
- `ProfileScreen` recarga settings y permiso nativo al recuperar foco (`useIsFocused` + `readNotificationSettingsForDisplay`).
- Etiquetas Perfil: **Activas**, **Pausadas**, **Sin permiso**, **Requiere revisión**, **Solo en app** (web).

---

## Mensajes sin repetición consecutiva

*(Aplica cuando la flag global permite programación.)*

- Clave estable `lastReminderMessageKey` (`title + body`) en `NotificationSettings`.
- Prueba (`sendTestNotification`) y reprogramación (`scheduleDailyReminders`) eligen un mensaje distinto al anterior cuando hay más de una variante.
- **Limitación:** cada aviso programado conserva el texto fijado al programar; la rotación aplica al emparejar slots adyacentes y entre prueba ↔ siguiente programación.

---

## Riesgos clínicos o técnicos

- Recordatorios no sustituyen prescripción médica.
- Con flag global off, verificar que no queden pendientes tras migraciones (cleanup en startup/foreground).
- Permisos iOS/Android deben concederse cuando la funcionalidad esté activada en una build futura.

---

## Pendientes

- Paleta UI propia (`reminder-ui-tokens.ts`) diverge de wellness tokens (colores sin migrar; tipografía sí — Fase 4C).

---

## Checklist manual mínimo

- [ ] Con `EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false`: no se programan recordatorios; cleanup en arranque y foreground.
- [ ] Perfil y Notificaciones muestran estado coherente (apagado / desactivado en build).
- [ ] Sin consent: redirige a `/legal/accept`.
- [ ] Web: etiqueta **Solo en app** verificada.
- [ ] *(Solo si flag `true` en build de prueba)* Activar/pausar reprograma; test notification llega; deduplicación de slots.

---

## Docs relacionados

- [Módulo notifications](../../src/modules/notifications/README.md)
- [Perfil](../02-tabs/perfil-configuracion.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Módulo app-mode](../../src/modules/app-mode/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Módulo notifications* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `src/modules/notifications/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación de seguridad clínica y lenguaje* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/08-clinical-safety/`.
