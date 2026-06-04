/**

 * Purpose: Clinical copy for local therapy reminder notifications.

 * Module: notifications

 */



export type MotivationalReminderTextSegment = {

  text: string;

  bold?: boolean;

};



export type MotivationalReminderCopy = {

  title: string;

  body: string;

  previewTitle?: MotivationalReminderTextSegment[];

  previewBody?: MotivationalReminderTextSegment[];

};



/** Plain title/body pair for native notification payloads. */

export type ReminderCopy = Pick<MotivationalReminderCopy, 'title' | 'body'>;



export const FREQUENCY_FOOTER_NOTE =
  'Ajusta RESPIRA+ según la indicación de tu profesional de salud.';

export const FREQUENCY_FIXED_DESCRIPTION = 'Cada 2 h mientras estés despierto.';

export const TODAY_PREVIEW_TITLE = 'Vista de hoy';

export const TODAY_PREVIEW_DESCRIPTION =
  'Horarios programados para hoy dentro de tu horario despierto.';

export const DAY_COMPLETED_TITLE = '✨ ¡Felicidades! ✨';

export const DAY_COMPLETED_MESSAGE =
  'Completaste los avisos de hoy. Descansa y nos vemos mañana.';

export function formatAwakeWindowScheduleMessage(start: string, end: string, enabled: boolean): string {
  if (enabled) {
    return `Recibirás avisos entre ${start} y ${end}.`;
  }
  return `Al activarlos, recibirás avisos entre ${start} y ${end}.`;
}

/** @deprecated Use FREQUENCY_FIXED_DESCRIPTION. */
export const FREQUENCY_FIXED_LABEL = 'Cada 2 h';



/** @deprecated Use FREQUENCY_FIXED_DESCRIPTION. */
export const FREQUENCY_RECOMMENDED_HINT = FREQUENCY_FIXED_DESCRIPTION;



/** @deprecated Use FREQUENCY_FOOTER_NOTE in settings UI. Kept for other screens if referenced. */

export const CLINICAL_DISCLAIMER = FREQUENCY_FOOTER_NOTE;



export const PERMISSION_DENIED_MESSAGE =

  'No se pudieron activar los recordatorios. Revisa los permisos de notificaciones en la configuración del celular.';



export const TEST_NOTIFICATION_DENIED_MESSAGE =

  'No se pudieron enviar recordatorios. Revisa los permisos de notificaciones en la configuración del celular.';



type MotivationalReminderDefinition = {

  title: string;

  body: string;

  titleBold?: readonly string[];

  bodyBold?: readonly string[];

};



function segmentTextWithBold(

  plainText: string,

  boldPhrases: readonly string[],

): MotivationalReminderTextSegment[] {

  const segments: MotivationalReminderTextSegment[] = [];

  let remaining = plainText;



  for (const phrase of boldPhrases) {

    const index = remaining.indexOf(phrase);

    if (index === -1) continue;

    if (index > 0) {

      segments.push({ text: remaining.slice(0, index) });

    }

    segments.push({ text: phrase, bold: true });

    remaining = remaining.slice(index + phrase.length);

  }



  if (remaining.length > 0) {

    segments.push({ text: remaining });

  }



  return segments.length > 0 ? segments : [{ text: plainText }];

}



function defineMotivationalReminder(definition: MotivationalReminderDefinition): MotivationalReminderCopy {

  const { title, body, titleBold = [], bodyBold = [] } = definition;

  return {

    title,

    body,

    previewTitle: titleBold.length > 0 ? segmentTextWithBold(title, titleBold) : undefined,

    previewBody: bodyBold.length > 0 ? segmentTextWithBold(body, bodyBold) : undefined,

  };

}



const MOTIVATIONAL_REMINDER_DEFINITIONS: readonly MotivationalReminderDefinition[] = [

  {

    title: 'Tu sesión RESPIRA+ está lista 🫁✨',

    body: 'Una sesión breve puede ayudarte a mantener tu progreso de hoy 💙',

    titleBold: ['sesión'],

    bodyBold: ['sesión', 'progreso'],

  },

  {

    title: 'Un momento para ti 😊🌬️',

    body: 'Abre RESPIRA+ y continúa con tu ejercicio guiado con calma.',

    titleBold: ['momento'],

    bodyBold: ['calma'],

  },

  {

    title: 'Tu constancia suma 💪💙',

    body: 'Mantén tu ritmo con una sesión respiratoria breve.',

    titleBold: ['constancia'],

    bodyBold: ['ritmo'],

  },

  {

    title: 'Respira con calma 🫁🕊️',

    body: 'Tu sesión está disponible. Avanza a tu ritmo.',

    titleBold: ['Respira'],

    bodyBold: ['a tu ritmo'],

  },

  {

    title: 'Sigue construyendo progreso 🌟🙌',

    body: 'Una sesión más puede ayudarte a mantener tu constancia de hoy.',

    titleBold: ['progreso'],

    bodyBold: ['constancia'],

  },

  {

    title: 'RESPIRA+ te acompaña 🫶✨',

    body: 'Cuando estés listo, realiza tu sesión y registra tu avance.',

    titleBold: ['te acompaña'],

    bodyBold: ['avance'],

  },

  {

    title: 'Pequeños avances, gran constancia 🌱💛',

    body: 'Completa una sesión breve y sigue cuidando tu rutina.',

    titleBold: ['avances'],

    bodyBold: ['rutina'],

  },

  {

    title: 'Tu rutina respiratoria te espera 🔔🫁',

    body: 'Entra a RESPIRA+ y continúa con tu ejercicio guiado.',

    titleBold: ['rutina respiratoria'],

    bodyBold: ['ejercicio guiado'],

  },

  {

    title: 'Vamos paso a paso 🙂🌟',

    body: 'Una sesión a la vez también cuenta para tu progreso.',

    titleBold: ['paso a paso'],

    bodyBold: ['progreso'],

  },

  {

    title: 'Mantén tu ritmo 💙⏱️',

    body: 'Tu recordatorio está listo para acompañar tu sesión de hoy.',

    titleBold: ['ritmo'],

    bodyBold: ['sesión de hoy'],

  },

  {

    title: 'Hora de respirar tranquilo 😌🫁',

    body: 'Realiza tu sesión guiada cuando te sientas preparado.',

    titleBold: ['respirar'],

    bodyBold: ['sesión guiada'],

  },

  {

    title: 'Tu progreso sigue activo 🚀✨',

    body: 'Abre RESPIRA+ y registra una nueva sesión respiratoria.',

    titleBold: ['progreso'],

    bodyBold: ['nueva sesión'],

  },

  {

    title: 'Respira, avanza y registra 🫁📝',

    body: 'Tu sesión está lista para acompañar tu constancia.',

    titleBold: ['Respira'],

    bodyBold: ['constancia'],

  },

  {

    title: 'Un paso más en tu rutina 👣💫',

    body: 'Inicia tu sesión y continúa construyendo tu progreso.',

    titleBold: ['rutina'],

    bodyBold: ['progreso'],

  },

  {

    title: 'Tu momento RESPIRA+ está aquí 💙✨',

    body: 'Dedica unos minutos a tu ejercicio guiado de hoy.',

    titleBold: ['momento RESPIRA+'],

    bodyBold: ['ejercicio guiado'],

  },

  {

    title: 'Sigue tu plan con calma 🧘‍♂️🌤️',

    body: 'Tu sesión respiratoria está lista cuando tú lo estés.',

    titleBold: ['plan'],

    bodyBold: ['cuando tú lo estés'],

  },

  {

    title: 'Constancia que se nota 🏆😊',

    body: 'Abre RESPIRA+ y suma una sesión a tu día.',

    titleBold: ['Constancia'],

    bodyBold: ['suma una sesión'],

  },

  {

    title: 'Tu avance empieza ahora 🌈🫶',

    body: 'Continúa con tu ejercicio guiado y registra tu progreso.',

    titleBold: ['avance'],

    bodyBold: ['registra tu progreso'],

  },

  {

    title: 'Respira con intención 🫁💫',

    body: 'Una sesión breve puede ayudarte a mantener tu ritmo.',

    titleBold: ['Respira'],

    bodyBold: ['mantener tu ritmo'],

  },

  {

    title: 'Hoy también cuenta ☀️💙',

    body: 'Inicia tu sesión RESPIRA+ y sigue construyendo constancia.',

    titleBold: ['Hoy'],

    bodyBold: ['constancia'],

  },

];



export const motivationalReminderMessages: MotivationalReminderCopy[] =

  MOTIVATIONAL_REMINDER_DEFINITIONS.map(defineMotivationalReminder);



export function getMotivationalReminderPreviewTitle(

  copy: MotivationalReminderCopy,

): MotivationalReminderTextSegment[] {

  return copy.previewTitle ?? [{ text: copy.title }];

}



export function getMotivationalReminderPreviewBody(

  copy: MotivationalReminderCopy,

): MotivationalReminderTextSegment[] {

  return copy.previewBody ?? [{ text: copy.body }];

}



export function getMotivationalReminderCopyBySlot(slotIndex: number): MotivationalReminderCopy {

  const index =

    ((slotIndex % motivationalReminderMessages.length) + motivationalReminderMessages.length) %

    motivationalReminderMessages.length;

  return motivationalReminderMessages[index];

}



export function getRandomMotivationalReminderCopy(): MotivationalReminderCopy {

  const index = Math.floor(Math.random() * motivationalReminderMessages.length);

  return motivationalReminderMessages[index];

}



/** @deprecated Use getMotivationalReminderCopyBySlot. */

export function getMotivationalReminderCopy(slotIndex: number): MotivationalReminderCopy {

  return getMotivationalReminderCopyBySlot(slotIndex);

}



/** @deprecated Use getMotivationalReminderCopyBySlot. Kept for callers that pass a tone argument. */

export function getReminderCopy(_tone?: unknown, variantIndex = 0): MotivationalReminderCopy {

  return getMotivationalReminderCopyBySlot(variantIndex);

}



export function describeWebLimitation(): string {

  return 'En la versión web puedes revisar esta configuración, pero los recordatorios locales solo están disponibles en la app para iPhone o Android.';

}


