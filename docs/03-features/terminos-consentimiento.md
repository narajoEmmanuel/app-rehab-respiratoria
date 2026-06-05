# Términos y consentimiento

## Propósito

Capturar consentimiento informado digital (7 declaraciones + versión documento), permitir lectura del PDF legal, retiro de consentimiento y bloquear flujos clínicos sin consent activo.

## Archivos principales

| Rol | Ruta |
|-----|------|
| Aceptación | `app/legal/accept.tsx` → `src/modules/legal/screens/LegalAcceptScreen.tsx` |
| Documento | `app/legal/document.tsx` → `LegalDocumentScreen.tsx` |
| Servicio | `src/modules/legal/consent-service.ts` |
| Constantes | `src/modules/legal/constants.ts` (`LEGAL_DOCUMENT_VERSION = '1.0'`, `@rehab/legal_consent_v1`) |
| Guards | `src/modules/legal/ConsentTabGuard.tsx`, `ConsentStackGuard.tsx` |
| Hrefs | `src/modules/legal/legal-hrefs.ts` |
| PDF | `assets/legal/terminos-uso-etico.pdf` (vía `open-legal-document.ts`) |
| Hook | `src/modules/legal/use-consent-active.ts` |

Documento equipo: [../legal/README-terminos-y-condiciones.md](../legal/README-terminos-y-condiciones.md).

## Rutas relacionadas

- `/legal/accept` — flujo inicial o re-aceptación
- `/legal/document` — lectura PDF desde Perfil

## Entradas del flujo

- Cloud: gate en `app/index.tsx` si `needsConsent()`.
- Local-first: tras crear perfil (`local-profile`) o retiro desde Perfil.
- Tab/stack guards interceptan Terapia, Historial, sensor, export, notificaciones.

## Salidas del flujo

- `acceptConsent` → AsyncStorage (+ Supabase si cloud).
- `withdrawConsent` → `consentStatus: withdrawn`.

## Datos persistidos

`AcceptedConsentRecord`: flags por statement id, versión documento, timestamps, estado.

## Relaciones

| Flujo | Requiere consent |
|-------|------------------|
| Terapia tab | Sí |
| Historial tab | Sí |
| Sensor stack | Sí (`ConsentStackGuard`) |
| Export | Sí (pantalla) |
| Notificaciones | Sí |
| Inicio | No (tab siempre accesible con paciente) |

## Riesgos clínicos o técnicos

- Declaraciones incluyen prototipo académico y no sustitución médica.
- `seedLocalPrototypeConsentForPatient` — bypass dev — **no usar con usuarios reales** sin acuerdo ético.
- PDF duplicado `assets/docs/respira-legal-v1.pdf` no referenciado en código.

## Pendientes

- Consent no revalidado cold start local-first.
- README dev `src/modules/legal/README.md` no existe.

## Checklist manual mínimo

- [ ] 7 checkboxes + master requeridos para aceptar.
- [ ] Tras aceptar: Terapia/Historial accesibles.
- [ ] Retiro consent: tabs protegidos bloqueados.
- [ ] PDF abre desde document screen.
- [ ] Versión 1.0 persistida en registro.

## Docs relacionados

- [Legal framework](../legal/README-terminos-y-condiciones.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Perfil](../02-tabs/perfil-configuracion.md)
