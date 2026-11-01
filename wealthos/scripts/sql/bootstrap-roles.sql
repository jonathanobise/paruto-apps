-- WealthOS database bootstrap. Run ONCE per Postgres cluster as a superuser / DBA.
-- Creates three roles:
--   wealthos_owner   owns the schema; used only for migrations and maintenance.
--   wealthos_runtime NOLOGIN group that migrations grant table privileges to.
--   wealthos_app     the application's login; member of wealthos_runtime; NOT owner,
--                    NOBYPASSRLS, so row-level security always applies to it.
-- Replace the passwords (or use your platform's IAM auth) outside development.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wealthos_owner') THEN
    CREATE ROLE wealthos_owner LOGIN PASSWORD 'wealthos_owner_dev';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wealthos_runtime') THEN
    CREATE ROLE wealthos_runtime NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wealthos_app') THEN
    CREATE ROLE wealthos_app LOGIN PASSWORD 'wealthos_app_dev' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT wealthos_runtime TO wealthos_app;
-- Then, per database:
--   CREATE DATABASE wealthos_dev OWNER wealthos_owner;
--   \c wealthos_dev
--   CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS citext;
