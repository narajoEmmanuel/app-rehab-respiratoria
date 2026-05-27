-- Fase 3B: Trazabilidad metrológica mínima
-- Ejecutar SOLO si Supabase está en uso y se necesitan las columnas remotas.
-- Los campos son opcionales; la app funciona sin esta migración en modo local (AsyncStorage).

-- === sessions ===
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calibration_profile_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_model_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS model_kind text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS spirometer_device_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calibration_created_at bigint;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calibration_updated_at bigint;

-- === attempts ===
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS distance_mm double precision;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS raw_distance_mm double precision;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS filtered_distance_mm double precision;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS in_calibrated_range boolean;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS clamped boolean;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS calibration_profile_id text;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS active_model_id text;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS model_kind text;
