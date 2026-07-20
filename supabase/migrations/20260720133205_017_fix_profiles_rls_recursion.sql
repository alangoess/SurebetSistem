/*
# Fix RLS recursion on profiles admin policies

## Overview
The admin RLS policies on `profiles` used an inline subquery
`EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)`
which references the same table the policy is on — causing infinite RLS
recursion. The profile SELECT silently fails, so `profile` stays null and
`isAdmin` is always false (Admin sidebar link never shows).

## Fix
Create a `SECURITY DEFINER` function `is_admin()` that bypasses RLS to check
the caller's admin status, then rewrite the admin policies to call it instead
of the recursive subquery.

## Security
- `is_admin()` is SECURITY DEFINER, owned by postgres, bypasses RLS safely.
- Only reads `is_admin` + `id` — no data leakage.
- GRANT EXECUTE to authenticated.
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Replace admin_select_all_profiles to use is_admin() (no recursion)
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (is_admin());

-- Replace admin_update_all_profiles to use is_admin() (no recursion)
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());