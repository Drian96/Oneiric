-- Add auth_user_id mapping for Supabase Auth
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS auth_user_id UUID;

    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS last_shop_id UUID;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'users'
        AND constraint_name = 'users_last_shop_id_fkey'
    ) THEN
      ALTER TABLE public.users
        ADD CONSTRAINT users_last_shop_id_fkey
        FOREIGN KEY (last_shop_id) REFERENCES public.shops(id);
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
    CREATE INDEX IF NOT EXISTS idx_users_last_shop_id ON public.users (last_shop_id);
  END IF;
END $$;
