-- Roles & permissions foundation schema
-- Adds server-backed site roles and production feature flags.

CREATE TABLE IF NOT EXISTS public.account_access (
  account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  site_role text NOT NULL DEFAULT 'user' CHECK (site_role IN ('user', 'moderator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.account_access (account_id, site_role)
SELECT id, 'user'
FROM auth.users
ON CONFLICT (account_id) DO NOTHING;

ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_access_owner_read" ON public.account_access;
CREATE POLICY "account_access_owner_read"
  ON public.account_access
  FOR SELECT
  USING (auth.uid() = account_id);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_public_read" ON public.feature_flags;
CREATE POLICY "feature_flags_public_read"
  ON public.feature_flags
  FOR SELECT
  USING (true);
