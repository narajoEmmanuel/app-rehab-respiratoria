/**
 * Purpose: Open bundled legal PDF across Expo Go (native) and web/PWA.
 * Module: legal
 */

import { Asset } from 'expo-asset';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import LEGAL_PDF from '../../../assets/docs/respira-legal-v1.pdf';

export type OpenLegalDocumentResult = 'opened' | 'cancelled';

/**
 * Opens the full legal PDF: in-browser on web, system handler or share sheet on native.
 */
export async function openLegalDocument(): Promise<OpenLegalDocumentResult> {
  const asset = Asset.fromModule(LEGAL_PDF);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri == null || uri === '') {
    throw new Error('No se pudo resolver la ruta del documento legal.');
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(uri, '_blank', 'noopener,noreferrer');
      return 'opened';
    }
    throw new Error('Vista web no disponible.');
  }

  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
      return 'opened';
    }
    await Linking.openURL(uri);
    return 'opened';
  } catch {
    return 'cancelled';
  }
}
