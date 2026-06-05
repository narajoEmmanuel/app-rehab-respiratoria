# Notificaciones

## Propósito

Configurar recordatorios locales de adherencia dentro de una ventana horaria de vigilia; programación con `expo-notifications` (no push remotas).

## Archivos principales

| Rol | Ruta |
|-----|------|
| Ruta | `app/notification-settings.tsx` |
| Pantalla | `src/modules/notifications/screens/NotificationSettingsScreen.tsx` |
| Hook | `src/modules/notifications/use-notification-settings.ts` |
| Scheduler | `src/modules/notifications/notification-scheduler.ts` |
| Storage | `src/modules/notifications/notification-settings.storage.ts` |
| Copy | `src/modules/notifications/notification-copy.ts` |
| Componentes | `ReminderHeroCard`, `AwakeWindowCard`, `DayNightVisualCard`, `NextReminderCard`, `TodayReminderTimeline`, `TestNotificationButton` |

## Rutas relacionadas

- `/notification-settings` — entrada desde Perfil.

## Entradas del flujo

- Paciente activo + consent activo (redirige a legal si no).

## Salidas del flujo

- Recordatorios programados/cancelados en SO local.
- Test notification inmediata (`TestNotificationButton`).

## Datos persistidos

Settings por paciente en AsyncStorage (`notification-settings.storage.ts` — clave por `patientId`).

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Paciente | Settings scoped por paciente activo |
| Consent | Requerido al abrir pantalla |
| Sensor/touch | Sin relación directa |
| Profesional | Copy: ajustar según indicación profesional |

## Riesgos clínicos o técnicos

- Recordatorios no sustituyen prescripción médica.
- Limitaciones web documentadas en `notification-copy.ts` — **requiere revisión manual** en cada plataforma.
- Permisos iOS/Android deben concederse.

## Pendientes

- Paleta UI propia (`reminder-ui-tokens.ts`) diverge de wellness tokens.
- README módulo notifications no existe.

## Checklist manual mínimo

- [ ] Sin consent: redirige a `/legal/accept`.
- [ ] Cambiar ventana vigilia reprograma recordatorios.
- [ ] Test notification llega en dispositivo nativo.
- [ ] Desactivar notificaciones cancela schedule.
- [ ] Web: comportamiento documentado/limitado verificado.

## Docs relacionados

- [Perfil](../02-tabs/perfil-configuracion.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
