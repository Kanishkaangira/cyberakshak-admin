-- Admin allowlist and login authorization. Create Auth users in Supabase Auth,
-- then add their Auth UID and email to public.admins.
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admins TO authenticated;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own row" ON public.admins;
DROP POLICY IF EXISTS "admins_select_own_row" ON public.admins;
CREATE POLICY "Admins read own row" ON public.admins
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins AS a WHERE a.id = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_login_admin(email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins AS a
    WHERE lower(btrim(a.email)) = lower(btrim($1))
  );
$$;
REVOKE ALL ON FUNCTION public.can_login_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_login_admin(text) TO anon, authenticated;