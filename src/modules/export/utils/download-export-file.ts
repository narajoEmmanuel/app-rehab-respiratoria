import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type DownloadExportFileResult =
  | { ok: true; mode: 'web_download' | 'native_share' }
  | { ok: false; reason: 'sharing_unavailable' | 'write_failed'; message: string };

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

export async function downloadExportFile(
  content: string,
  filename: string,
  mimeType: string,
): Promise<DownloadExportFileResult> {
  if (Platform.OS === 'web') {
    const ok = triggerWebDownload(content, filename, mimeType);
    if (!ok) {
      return {
        ok: false,
        reason: 'write_failed',
        message: 'No se pudo iniciar la descarga en el navegador.',
      };
    }
    return { ok: true, mode: 'web_download' };
  }

  let fileUri: string;
  try {
    const file = new File(Paths.cache, filename);
    if (file.exists) {
      file.delete();
    }
    file.create({ intermediates: true, overwrite: true });
    file.write(content, { encoding: 'utf8' });
    fileUri = file.uri;
  } catch {
    return {
      ok: false,
      reason: 'write_failed',
      message: 'No se pudo guardar el archivo temporal.',
    };
  }

  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return {
        ok: false,
        reason: 'sharing_unavailable',
        message:
          'Compartir archivos no está disponible en este dispositivo. Prueba otra versión de la app o exporta desde la versión web.',
      };
    }
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: 'Exportar datos',
      UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
    });
    return { ok: true, mode: 'native_share' };
  } catch {
    return {
      ok: false,
      reason: 'write_failed',
      message: 'No se pudo abrir la hoja de compartir.',
    };
  }
}
