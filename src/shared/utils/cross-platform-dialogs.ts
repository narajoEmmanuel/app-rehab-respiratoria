/**
 * Purpose: Confirmaciones y avisos que funcionan en native (Alert.alert) y en web.
 * Module: shared/utils
 *
 * React Native Web no implementa Alert.alert (no-op silencioso), por lo que en web
 * se usan los diálogos nativos del navegador (window.confirm / window.alert).
 * En iOS/Android el comportamiento de Alert.alert se conserva sin cambios.
 */

import { Alert, Platform } from 'react-native';

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  /** Etiqueta del botón que confirma la acción (native). */
  confirmLabel: string;
  /** Etiqueta del botón cancelar (native). Default: "Cancelar". */
  cancelLabel?: string;
  /** Estilo destructivo para el botón confirmar (native). */
  destructive?: boolean;
};

/**
 * Confirmación de dos opciones (Cancelar / Confirmar).
 * Resuelve `true` solo si el usuario confirma explícitamente.
 */
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const { title, message, confirmLabel, cancelLabel = 'Cancelar', destructive = false } = options;

  if (Platform.OS === 'web') {
    const ok =
      typeof globalThis.confirm === 'function'
        ? globalThis.confirm(`${title}\n\n${message}`)
        : false;
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Aviso informativo sin decisión (un solo botón OK / Entendido).
 * `nativeButtonLabel` conserva la etiqueta original del botón en iOS/Android.
 */
export function showInfoAlert(
  title: string,
  message: string,
  nativeButtonLabel?: string,
): void {
  if (Platform.OS === 'web') {
    if (typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
    }
    return;
  }
  if (nativeButtonLabel) {
    Alert.alert(title, message, [{ text: nativeButtonLabel, style: 'default' }]);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Aviso con un solo botón de acción (ej. "Repetir evaluación").
 * Resuelve `true` cuando el usuario reconoce el aviso; en native, si el
 * diálogo se descarta sin presionar el botón, la promesa no resuelve
 * (mismo comportamiento que el Alert.alert original).
 */
export function showAcknowledgeDialog(
  title: string,
  message: string,
  actionLabel: string,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
    }
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: actionLabel, onPress: () => resolve(true) }]);
  });
}
