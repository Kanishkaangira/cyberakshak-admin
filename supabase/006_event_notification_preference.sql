ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS notify_app_users boolean NOT NULL DEFAULT false;
