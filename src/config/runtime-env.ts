/**
 * Centralized runtime environment configuration for RESPIRA+ deployment modes.
 *
 * Phase 1: read and expose typed flags only. Existing modules keep using their
 * current env checks until later migration phases wire into this layer.
 *
 * Never use service_role or private keys here — client-safe EXPO_PUBLIC_* only.
 */

export type AppEnv = 'local_sensor' | 'web_touch' | 'development' | 'test';

export type DataMode = 'local' | 'cloud';

export type RuntimeEnv = {
  appEnv: AppEnv;
  isLocalSensor: boolean;
  isWebTouch: boolean;
  enableSensor: boolean;
  enableTouchPractice: boolean;
  enableSupabase: boolean;
  dataMode: DataMode;
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
};

const APP_ENV_VALUES: readonly AppEnv[] = [
  'local_sensor',
  'web_touch',
  'development',
  'test',
];

const DATA_MODE_VALUES: readonly DataMode[] = ['local', 'cloud'];

type EnvDefaults = Pick<
  RuntimeEnv,
  'enableSensor' | 'enableTouchPractice' | 'enableSupabase' | 'dataMode'
>;

const APP_ENV_DEFAULTS: Record<AppEnv, EnvDefaults> = {
  local_sensor: {
    enableSensor: true,
    enableTouchPractice: false,
    enableSupabase: false,
    dataMode: 'local',
  },
  web_touch: {
    enableSensor: false,
    enableTouchPractice: true,
    enableSupabase: true,
    dataMode: 'cloud',
  },
  development: {
    enableSensor: true,
    enableTouchPractice: false,
    enableSupabase: false,
    dataMode: 'local',
  },
  test: {
    enableSensor: false,
    enableTouchPractice: false,
    enableSupabase: false,
    dataMode: 'local',
  },
};

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

function parseExplicitBoolean(
  envKey: string,
  value: string | undefined,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  console.warn(
    `[runtimeEnv] Invalid boolean for ${envKey}="${value}". Using app-env default.`,
  );
  return undefined;
}

function parseAppEnv(raw: string | undefined): AppEnv {
  if (raw === undefined) {
    return 'local_sensor';
  }
  if ((APP_ENV_VALUES as readonly string[]).includes(raw)) {
    return raw as AppEnv;
  }
  console.warn(
    `[runtimeEnv] Invalid EXPO_PUBLIC_APP_ENV="${raw}". Falling back to "local_sensor".`,
  );
  return 'local_sensor';
}

function parseDataMode(raw: string | undefined, fallback: DataMode): DataMode {
  if (raw === undefined) {
    return fallback;
  }
  if ((DATA_MODE_VALUES as readonly string[]).includes(raw)) {
    return raw as DataMode;
  }
  console.warn(
    `[runtimeEnv] Invalid EXPO_PUBLIC_DATA_MODE="${raw}". Falling back to "${fallback}".`,
  );
  return fallback;
}

function resolveBooleanFlag(
  envKey: string,
  explicit: boolean | undefined,
  fallback: boolean,
): boolean {
  return explicit ?? fallback;
}

function buildRuntimeEnv(): RuntimeEnv {
  const appEnv = parseAppEnv(normalizeEnvValue(process.env.EXPO_PUBLIC_APP_ENV));
  const defaults = APP_ENV_DEFAULTS[appEnv];

  const enableSensor = resolveBooleanFlag(
    'EXPO_PUBLIC_ENABLE_SENSOR',
    parseExplicitBoolean(
      'EXPO_PUBLIC_ENABLE_SENSOR',
      normalizeEnvValue(process.env.EXPO_PUBLIC_ENABLE_SENSOR),
    ),
    defaults.enableSensor,
  );

  const enableTouchPractice = resolveBooleanFlag(
    'EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE',
    parseExplicitBoolean(
      'EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE',
      normalizeEnvValue(process.env.EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE),
    ),
    defaults.enableTouchPractice,
  );

  const enableSupabase = resolveBooleanFlag(
    'EXPO_PUBLIC_ENABLE_SUPABASE',
    parseExplicitBoolean(
      'EXPO_PUBLIC_ENABLE_SUPABASE',
      normalizeEnvValue(process.env.EXPO_PUBLIC_ENABLE_SUPABASE),
    ),
    defaults.enableSupabase,
  );

  const dataMode = parseDataMode(
    normalizeEnvValue(process.env.EXPO_PUBLIC_DATA_MODE),
    defaults.dataMode,
  );

  const supabaseUrl = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (enableSupabase) {
    if (!supabaseUrl) {
      console.warn(
        '[runtimeEnv] EXPO_PUBLIC_ENABLE_SUPABASE=true but EXPO_PUBLIC_SUPABASE_URL is missing.',
      );
    }
    if (!supabaseAnonKey) {
      console.warn(
        '[runtimeEnv] EXPO_PUBLIC_ENABLE_SUPABASE=true but EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.',
      );
    }
  }

  return {
    appEnv,
    isLocalSensor: appEnv === 'local_sensor',
    isWebTouch: appEnv === 'web_touch',
    enableSensor,
    enableTouchPractice,
    enableSupabase,
    dataMode,
    supabaseUrl,
    supabaseAnonKey,
  };
}

/** Build-time runtime configuration derived from EXPO_PUBLIC_* env vars. */
export const runtimeEnv: RuntimeEnv = buildRuntimeEnv();
