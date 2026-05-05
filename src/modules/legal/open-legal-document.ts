/**
 * Purpose: Open bundled legal PDF across Expo Go (native) and web/PWA.
 * Module: legal
 */

import { Asset } from 'expo-asset';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import LEGAL_PDF from '../../../assets/legal/terminos-uso-etico.pdf';

export type OpenLegalDocumentResult = 'opened' | 'cancelled';

/**
 * Opens the full legal PDF: in-browser on web, system handler or share sheet on native.
 */
export async function openLegalDocument(): Promise<OpenLegalDocumentResult> {
  const asset = Asset.fromModule(LEGAL_PDF);
  await asset.downloadAsync();
  const sourceUri = asset.localUri ?? asset.uri;
  if (sourceUri == null || sourceUri === '') {
    throw new Error('No se pudo resolver la ruta del documento legal.');
  }

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
    // Falls back to native share sheet when direct open is unavailable in Expo/runtime.
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    return 'cancelled';
  }

  await Sharing.shareAsync(sourceUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Términos y condiciones',
    UTI: 'com.adobe.pdf',
  });
  return 'opened';
}
