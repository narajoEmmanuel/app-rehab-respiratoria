import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured || supabase == null) {
    throw new Error(
      'Falta configurar Supabase. Define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
}

export function normalizeDataErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('internet') ||
      msg.includes('failed to fetch')
    ) {
      return 'Necesitas conexión a internet para cargar tus datos.';
    }
    return error.message;
  }
  return 'No se pudo sincronizar con la base de datos.';
}

