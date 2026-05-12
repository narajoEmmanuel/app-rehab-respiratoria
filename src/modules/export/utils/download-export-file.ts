/**
 * Purpose: Write export to app documents directory and open share sheet (Expo Go / iOS compatible).
 * Module: export
 * Notes: Uses expo-file-system/legacy — documentDirectory + writeAsStringAsync (required in Expo SDK 54).
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export type DownloadExportFileResult =
  | { ok: true; mode: 'web_download' | 'native_share' }
  | { ok: false; reason: 'sharing_unavailable' | 'write_failed'; message: string };

const DEFAULT_CSV = 'respira_export.csv';

/** CSV fijo genérico o reporte clínico dinámico respira_reporte_clinico_* .csv */
function assertCsvFilename(name: string): boolean {
  if (name === DEFAULT_CSV) return true;
  return /^respira_reporte_clinico_[A-Za-z0-9_-]+\.csv$/.test(name);
}

function resolveFilename(mimeType: string, csvFileName?: string): string {
  if (mimeType.includes('json')) {
    return 'respira_export.json';
  }
  const candidate = csvFileName ?? DEFAULT_CSV;
  if (!assertCsvFilename(candidate)) {
    throw new Error('Nombre de archivo CSV no válido.');
  }
  return candidate;
}

function triggerWebDownload(content: string, filename: string, mimeType: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export type DownloadExportOptions = {
  /** Solo CSV; p. ej. respira_reporte_clinico_CLAVE_20260507-143022.csv */
  csvFileName?: string;
};

export async function downloadExportFile(
  content: string,
  mimeType: string,
  options?: DownloadExportOptions,
): Promise<DownloadExportFileResult> {
  const fileName = resolveFilename(mimeType, options?.csvFileName);

  if (Platform.OS === 'web') {
    try {
      if (!content.length) {
        throw new Error('El contenido está vacío.');
      }
      const ok = triggerWebDownload(content, fileName, mimeType);
      if (!ok) {
        throw new Error('No se pudo iniciar la descarga en el navegador.');
      }
      return { ok: true, mode: 'web_download' };
    } catch (error) {
      console.error('EXPORT ERROR:', error);
      Alert.alert('Error al exportar', String(error instanceof Error ? error.message : error));
      return {
        ok: false,
        reason: 'write_failed',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  try {
    if (!FileSystem.documentDirectory) {
      throw new Error('documentDirectory no disponible en este entorno.');
    }
    if (!content.length) {
      throw new Error('El contenido está vacío.');
    }

    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    console.log('documentDirectory:', FileSystem.documentDirectory);
    console.log('fileUri:', fileUri);
    console.log('content length:', content.length);

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const info = await FileSystem.getInfoAsync(fileUri);
    console.log('file info:', info);
    if (!info.exists) {
      throw new Error('El archivo no se creó');
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: mimeType.includes('json') ? 'application/json' : 'text/csv',
        dialogTitle: 'Exportar datos RESPIRA+',
        UTI: mimeType.includes('json') ? 'public.json' : 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Archivo generado', fileUri);
    }
    return { ok: true, mode: 'native_share' };
  } catch (error) {
    console.error('EXPORT ERROR:', error);
    const msg = String(error instanceof Error ? error.message : error);
    Alert.alert('Error al exportar', msg);
    return {
      ok: false,
      reason: 'write_failed',
      message: msg,
    };
  }
}
