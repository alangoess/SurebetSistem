/*
# Admin Users View Function

## Overview
Creates a SECURITY DEFINER function `get_all_users_for_admin()` that returns
all profiles joined with their auth.users email, for the admin panel listing.

## Security
- Function is SECURITY DEFINER (bypasses RLS) to read auth.users.email.
- Guard: raises an exception if the caller is not an admin (is_admin = true).
- Returns id, email, phone, status_badge, is_lifetime, trial_started_at,
  expires_at, registration_completed, created_at.
*/

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  status_badge text,
  is_lifetime boolean,
  trial_started_at timestamptz,
  expires_at timestamptz,
  registration_completed boolean,
  created_at timestamptz
) AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT is_admin INTO caller_is_admin FROM profiles WHERE id = auth.uid();
  IF caller_is_admin IS NULL OR caller_is_admin = false THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem listar usuários.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    au.email,
    p.phone,
    p.status_badge,
    p.is_lifetime,
    p.trial_started_at,
    p.expires_at,
    p.registration_completed,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$ language 'plpgsql' SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;