/*
# Use is_admin() in leads and feedbacks admin policies

## Overview
Update admin SELECT policies on `leads` and `feedbacks` to call the new
`is_admin()` SECURITY DEFINER function instead of an inline subquery on
`profiles`. Consistent with the profiles fix and avoids nested RLS evaluation.

## Security
Same access control — only admins can read. No behavioral change.
*/

DROP POLICY IF EXISTS "admin_select_leads" ON leads;
CREATE POLICY "admin_select_leads" ON leads
  FOR SELECT TO authenticated
  USING (is_admin());

-- Check if feedbacks has an admin policy and update it too
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'feedbacks'::regclass AND polname = 'admin_select_feedbacks') THEN
    DROP POLICY "admin_select_feedbacks" ON feedbacks;
    CREATE POLICY "admin_select_feedbacks" ON feedbacks
      FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;
