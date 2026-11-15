-- Additive upgrade for existing installations; safe to repeat.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS date_started date;
-- NULL means an older recommendation; the UI falls back to created_at.
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS updated_at timestamp;
COMMIT;
