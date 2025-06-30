-- Dev-only helper migration: make supabase_admin the owner of storage.objects in local development
-- This script is idempotent and is a no-op on Supabase Cloud (no supabase_admin role).
DO $$
DECLARE
  _is_local BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') INTO _is_local;

  IF _is_local THEN
    BEGIN
      ALTER TABLE storage.objects OWNER TO supabase_admin;
      RAISE NOTICE 'storage.objects owner changed to supabase_admin (local dev)';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE WARNING 'Could not change owner of storage.objects – please run as a privileged role.';
    END;
  ELSE
    RAISE NOTICE 'Cloud environment detected – skipping storage.objects owner change.';
  END IF;
END $$; 