/**
 * Purpose: Single gate for Supabase reads/writes vs local AsyncStorage.
 * Module: app-mode
 */
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { getPersistedAppMode } from '@/src/modules/app-mode/app-mode-storage';

/**
 * True only when Supabase is configured and the user is not in full offline (no-cloud) mode.
 * Repositories must use this instead of `supabase != null` so ESP32 / no-internet flows stay local.
 */
export async function shouldUseCloudData(): Promise<boolean> {
  if (!isSupabaseConfigured || supabase == null) {
    return false;
  }
  const mode = await getPersistedAppMode();
  if (mode === 'offline_sensor_test') {
    return false;
  }
  return true;
}
