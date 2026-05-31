/**
 * Mensaje legible para Alert / logs (nunca lanzar el objeto crudo de Supabase u otros).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return 'Error desconocido';
  }
}
