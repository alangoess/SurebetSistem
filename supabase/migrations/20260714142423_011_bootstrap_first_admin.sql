/*
# Bootstrap First Admin

## Overview
Creates a SECURITY DEFINER function `bootstrap_first_admin(email text)` that
allows any authenticated user to set the FIRST admin, but only if no admin
currently exists. This is a one-time bootstrap mechanism: once an admin is
set, subsequent admin promotions must be done by an existing admin through
the admin UI (protected by the admin_update_all_profiles RLS policy).

## Security
- Function is SECURITY DEFINER (bypasses RLS) so it can write to profiles.
- Guard: if any profile has is_admin = true, the function raises an exception.
- Only callable by authenticated users (caller must have a valid JWT).
*/

CREATE OR REPLACE FUNCTION bootstrap_first_admin(admin_email text)
RETURNS void AS $$
DECLARE
  admin_count int;
  target_user uuid;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE is_admin = true;
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'An admin already exists. Ask an existing admin to promote new admins.';
  END IF;

  SELECT id INTO target_user FROM auth.users WHERE email = admin_email;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email: %', admin_email;
  END IF;

  -- Ensure profile row exists, then set as admin
  INSERT INTO profiles (id, is_admin, status_badge, registration_completed)
  VALUES (target_user, true, 'cliente', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true, status_badge = 'cliente';

END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Allow authenticated users to call the bootstrap function
GRANT EXECUTE ON FUNCTION bootstrap_first_admin(text) TO authenticated;