-- Standalone, additive upgrade for existing OpenShelf installations.
-- Run with psql -v ON_ERROR_STOP=1 -f drizzle/agent-first-upgrade.sql.
-- Existing records and legacy constraints are deliberately left untouched.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS source text;

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL,
  prefix text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT api_tokens_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT api_tokens_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

COMMIT;
