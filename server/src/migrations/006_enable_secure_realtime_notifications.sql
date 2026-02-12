-- Enable secure, production-ready Supabase Realtime for notifications.
-- Run this in Supabase SQL Editor (or your DB migration pipeline).

BEGIN;

-- 1) Ensure notifications are replicated to Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;

-- 2) Enable RLS so clients can only receive/manage their own notifications.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3) Allow authenticated users to select only notifications linked to their auth user id.
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = notifications.user_id
      AND u.auth_user_id = auth.uid()
  )
);

-- 4) Allow authenticated users to update only their own notifications.
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = notifications.user_id
      AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = notifications.user_id
      AND u.auth_user_id = auth.uid()
  )
);

-- 5) Allow authenticated users to delete only their own notifications.
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = notifications.user_id
      AND u.auth_user_id = auth.uid()
  )
);

-- 6) Keep write/create notifications to backend service role only.
-- (No INSERT policy for authenticated role by design.)

-- 7) Helpful index for user-specific notification feeds.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

COMMIT;
