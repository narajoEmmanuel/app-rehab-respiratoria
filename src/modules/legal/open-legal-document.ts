/**
 * Purpose: Open or share the bundled legal PDF across Expo Go (native) and web/PWA.
 * Module: legal
 */

import { Asset } from 'expo-asset';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import LEGAL_PDF from '../../../assets/legal/terminos-uso-etico.pdf';

export type OpenLegalDocumentResult = 'opened' | 'cancelled';

async function resolvePdfUri(): Promise<string> {
  const asset = Asset.fromModule(LEGAL_PDF);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri == null || uri === '') {
    throw new Error('No se pudo resolver la ruta del documento legal.');
  }
  return uri;
}

/**
 * Opens the full legal PDF in an external viewer (browser on web, system handler on native).
 * Falls back to the share sheet if the system cannot open the file directly.
 */
export async function openLegalDocument(): Promise<OpenLegalDocumentResult> {
  const sourceUri = await resolvePdfUri();

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(sourceUri, '_blank', 'noopener,noreferrer');
      return 'opened';
    }
    throw new Error('Vista web no disponible.');
  }

  try {
    const canOpen = await Linking.canOpenURL(sourceUri);
    if (canOpen) {
      await Linking.openURL(sourceUri);
      return 'opened';
    }
  } catch {
    // Falls through to share sheet when direct open is unavailable.
  }

  return shareLegalDocumentPdf();
}

/**
 * Opens the native share sheet so the user can send, save, or open the PDF in another app.
 */
export async function shareLegalDocumentPdf(): Promise<OpenLegalDocumentResult> {
  const sourceUri = await resolvePdfUri();

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(sourceUri, '_blank', 'noopener,noreferrer');
      return 'opened';
    }
    throw new Error('Vista web no disponible.');
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    return 'cancelled';
  }

  await Sharing.shareAsync(sourceUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Documentos legales de RESPIRA+',
    UTI: 'com.adobe.pdf',
  });
  return 'opened';
}
