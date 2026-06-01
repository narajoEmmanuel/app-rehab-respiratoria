/**
 * Datos en Supabase solo cuando el build tiene auth en la nube explícitamente activada.
 */
import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

/** Non-hook predicate for repositories and services. */
export function isCloudDataStoreEnabled(): boolean {
  return isCloudAuthEnabled() && isSupabaseConfigured && supabase != null;
}

/** React components may use this hook; repositories should call isCloudDataStoreEnabled(). */
export function useCloudDataStore(): boolean {
  return isCloudDataStoreEnabled();
}

export function getCloudSupabaseClient() {
  if (!isCloudDataStoreEnabled() || supabase == null) {
    throw new Error('Supabase no está disponible en modo local.');
  }
  return supabase;
}
