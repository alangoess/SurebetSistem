/*
# Fix ambiguous column in get_all_users_for_admin

## Overview
The function's return type declares a column named `id`, which collides with
the `profiles.id` column in the admin-check subquery (`WHERE id = auth.uid()`).
Qualify the column reference as `profiles.id` to remove the ambiguity.

## Security
No security changes. Same SECURITY DEFINER + admin guard.
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
  SELECT p.is_admin INTO caller_is_admin FROM profiles p WHERE p.id = auth.uid();
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