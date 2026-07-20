/*
# Licensing, Lead Capture, and Feedbacks

## Overview
Adds a `profiles` table to track per-user licensing state (trial, status badge,
lifetime access) and a `feedbacks` table for user-submitted bug reports and
suggestions. Both tables integrate with the existing auth.users table.

## New Tables

### profiles
- `id` (uuid, primary key, references auth.users ON DELETE CASCADE) - 1:1 with auth user
- `phone` (text) - WhatsApp/phone number for lead capture and admin outreach
- `status_badge` (text, default 'lead') - Licensing state: 'lead', 'cliente', 'expirado'
- `is_lifetime` (boolean, default false) - When true, ignores trial/expiration checks
- `trial_started_at` (timestamptz) - Timestamp the trial clock started (first completed signup)
- `expires_at` (timestamptz) - 30-day client plan expiration date
- `registration_completed` (boolean, default false) - True once the user finishes the signup flow
- `is_admin` (boolean, default false) - Admin flag for accessing the admin panel
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### feedbacks
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles, nullable for anonymous reports)
- `user_email` (text) - Email of the submitter (denormalized for easy admin listing)
- `message` (text) - Feedback or bug report content
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on both tables.
- profiles: users can read/update only their own row. Admins (is_admin = true)
  can read all rows and update all rows (for managing status/lifetime/expires_at).
- feedbacks: any authenticated user can insert their own feedback; admins can
  read all feedbacks; users can read their own feedbacks.

## Important Notes
1. profiles.id is both PK and FK to auth.users, enforcing 1:1 relationship.
2. status_badge uses a CHECK constraint to ensure valid values.
3. An index on profiles.is_admin supports the admin-listing query.
4. The updated_at trigger reuses the existing update_updated_at_column() function.
*/

-- Profiles table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  status_badge text NOT NULL DEFAULT 'lead' CHECK (status_badge IN ('lead', 'cliente', 'expirado')),
  is_lifetime boolean NOT NULL DEFAULT false,
  trial_started_at timestamptz,
  expires_at timestamptz,
  registration_completed boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Users can update their own profile (e.g. phone, registration_completed)
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (status, lifetime, expires_at)
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Users can insert their own profile row
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert feedback
DROP POLICY IF EXISTS "insert_feedbacks" ON feedbacks;
CREATE POLICY "insert_feedbacks" ON feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own feedbacks
DROP POLICY IF EXISTS "select_own_feedbacks" ON feedbacks;
CREATE POLICY "select_own_feedbacks" ON feedbacks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all feedbacks
DROP POLICY IF EXISTS "admin_select_all_feedbacks" ON feedbacks;
CREATE POLICY "admin_select_all_feedbacks" ON feedbacks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_status_badge ON profiles(status_badge);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);

-- Trigger for profiles.updated_at (reuses existing function)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create a profile row when a new auth.user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, status_badge, registration_completed)
  VALUES (NEW.id, 'lead', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();