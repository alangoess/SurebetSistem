/*
# Fix feedbacks admin RLS policy recursion

The admin SELECT policy on feedbacks still uses the recursive inline subquery
on profiles. Replace it with is_admin() to match the profiles/leads fix.
*/

DROP POLICY IF EXISTS "admin_select_all_feedbacks" ON feedbacks;
CREATE POLICY "admin_select_all_feedbacks" ON feedbacks
  FOR SELECT TO authenticated
  USING (is_admin());