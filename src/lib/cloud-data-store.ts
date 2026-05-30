/**
 * Datos en Supabase solo cuando el build tiene auth en la nube explícitamente activada.
 */
import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

export function useCloudDataStore(): boolean {
  return isCloudAuthEnabled() && isSupabaseConfigured && supabase != null;
}

export function getCloudSupabaseClient() {
  if (!useCloudDataStore() || supabase == null) {
    throw new Error('Supabase no está disponible en modo local.');
  }
  return supabase;
}
