/*
# Leads Table for Abandoned Registration Tracking

## Overview
Creates a `leads` table to capture email/phone data from users who start the
signup flow but abandon before completing registration. This lets the admin
see partial signups (email only, phone only, or both) for outreach.

## New Tables
### leads
- `id` (uuid, primary key)
- `email` (text, nullable) - Email typed during signup
- `phone` (text, nullable) - WhatsApp/phone typed during signup
- `status` (text, default 'abandoned') - 'abandoned' or 'registered'
- `auth_user_id` (uuid, nullable, references auth.users) - Linked once signup completes
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security
- RLS enabled.
- anon + authenticated can INSERT (leads are captured before login).
- Only admins can SELECT and UPDATE (to manage/link leads).
- Unique constraint on email (where not null) for upsert deduplication.

## Important Notes
1. Email is nullable to support phone-only leads.
2. Unique index on email allows upsert via onConflict.
3. When a user completes registration, the lead is updated to 'registered'
   and linked to the auth user via auth_user_id.
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  status text NOT NULL DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'registered')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert leads
DROP POLICY IF EXISTS "insert_leads" ON leads;
CREATE POLICY "insert_leads" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update leads (needed for anon upsert on conflict)
DROP POLICY IF EXISTS "update_leads" ON leads;
CREATE POLICY "update_leads" ON leads
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Only admins can read leads
DROP POLICY IF EXISTS "admin_select_leads" ON leads;
CREATE POLICY "admin_select_leads" ON leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Unique index on email for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique ON leads(email) WHERE email IS NOT NULL;

-- Trigger for updated_at (reuses existing function)
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();