-- ============================================
-- MIDDAY DATABASE SETUP - FUNCTIONS & EXTENSIONS
-- Execute this FIRST before running drizzle-kit push
-- ============================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. SCHEMA PRIVATE
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO postgres, authenticated, service_role;

-- 3. CRITICAL RLS FUNCTION
CREATE OR REPLACE FUNCTION private.get_teams_for_authenticated_user()
RETURNS TABLE(team_id uuid) AS $$
  SELECT DISTINCT ut.team_id
  FROM public.users_on_team ut
  WHERE ut.user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION private.get_teams_for_authenticated_user() TO authenticated, service_role;

-- 4. PUBLIC FUNCTIONS

-- Extract product names from JSON for FTS
CREATE OR REPLACE FUNCTION public.extract_product_names(products json)
RETURNS text AS $$
BEGIN
  IF products IS NULL THEN
    RETURN '';
  END IF;
  RETURN COALESCE(
    (SELECT string_agg(item->>'name', ' ')
     FROM json_array_elements(products) AS item
     WHERE item->>'name' IS NOT NULL),
    ''
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate FTS vector for inbox
CREATE OR REPLACE FUNCTION public.generate_inbox_fts(display_name text, product_names text)
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector(
    'english'::regconfig,
    COALESCE(display_name, '') || ' ' || COALESCE(product_names, '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate random inbox ID
CREATE OR REPLACE FUNCTION public.generate_inbox(length int DEFAULT 10)
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Nanoid-like function for codes
CREATE OR REPLACE FUNCTION public.nanoid(size int DEFAULT 21)
RETURNS text AS $$
DECLARE
  id text := '';
  i int := 0;
  alphabet char(64) := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
  bytes bytea := gen_random_bytes(size);
  byte int;
BEGIN
  WHILE i < size LOOP
    byte := get_byte(bytes, i);
    id := id || substr(alphabet, (byte & 63) + 1, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.extract_product_names(json) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.generate_inbox_fts(text, text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.generate_inbox(int) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.nanoid(int) TO authenticated, service_role, anon;

-- 6. TRACKER PROJECT FUNCTIONS

-- Calculate total duration for a tracker project (in seconds)
CREATE OR REPLACE FUNCTION public.total_duration(project tracker_projects)
RETURNS integer AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN te.stop IS NOT NULL THEN EXTRACT(EPOCH FROM (te.stop - te.start))::integer
      ELSE 0
    END
  ), 0)::integer
  FROM public.tracker_entries te
  WHERE te.project_id = project.id
$$ LANGUAGE sql STABLE;

-- Calculate total amount for a tracker project
CREATE OR REPLACE FUNCTION public.get_project_total_amount(project tracker_projects)
RETURNS numeric AS $$
  SELECT COALESCE(
    (project.rate / 3600.0) * public.total_duration(project),
    0
  )
$$ LANGUAGE sql STABLE;

-- Get assigned users for a tracker project
CREATE OR REPLACE FUNCTION public.get_assigned_users_for_project(project tracker_projects)
RETURNS json AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'user_id', u.id,
        'full_name', u.full_name,
        'avatar_url', u.avatar_url
      )
    ),
    '[]'::json
  )
  FROM (
    SELECT DISTINCT te.assigned_id
    FROM public.tracker_entries te
    WHERE te.project_id = project.id
    AND te.assigned_id IS NOT NULL
  ) assigned
  JOIN public.users u ON u.id = assigned.assigned_id
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.total_duration(tracker_projects) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_project_total_amount(tracker_projects) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_assigned_users_for_project(tracker_projects) TO authenticated, service_role, anon;

-- Done! Now you can run: drizzle-kit push
