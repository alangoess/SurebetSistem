/*
# GFV Initial Schema - Sports Betting Operations Management

## Overview
Creates the complete database schema for GFV, a multi-user sports betting operations management system.

## New Tables

### houses
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, not null, defaults to auth.uid()) - Owner reference
- `name` (text, not null) - Betting house name
- `logo_url` (text) - Optional logo URL
- `color` (text) - UI color for display
- `balance` (decimal, default 0) - Current balance
- `status` (text, default 'active') - Status: active, inactive, suspended
- `notes` (text) - Optional observations
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

### operations
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, not null, defaults to auth.uid()) - Owner reference
- `date` (date, not null) - Operation date
- `desired_return` (decimal) - Target return percentage
- `notes` (text) - Optional observations
- `status` (text, default 'pending') - Status: pending, completed, cancelled
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

### operation_entries
- `id` (uuid, primary key) - Unique identifier
- `operation_id` (uuid, foreign key to operations) - Parent operation
- `house_id` (uuid, foreign key to houses) - Betting house
- `market` (text) - Betting market type
- `selection` (text) - Selected outcome
- `bet_type` (text) - Type: 'real' (real money) or 'freebet'
- `odd` (decimal, not null) - Betting odds
- `stake` (decimal, not null) - Amount staked
- `created_at` (timestamptz) - Creation timestamp

### deposits
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, not null, defaults to auth.uid()) - Owner reference
- `house_id` (uuid, foreign key to houses) - Target house
- `amount` (decimal, not null) - Deposit amount
- `date` (date, not null) - Deposit date
- `notes` (text) - Optional observations
- `created_at` (timestamptz) - Creation timestamp

### withdrawals
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, not null, defaults to auth.uid()) - Owner reference
- `house_id` (uuid, foreign key to houses) - Source house
- `amount` (decimal, not null) - Withdrawal amount
- `date` (date, not null) - Withdrawal date
- `notes` (text) - Optional observations
- `created_at` (timestamptz) - Creation timestamp

### transfers
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, not null, defaults to auth.uid()) - Owner reference
- `from_house_id` (uuid, foreign key to houses) - Source house
- `to_house_id` (uuid, foreign key to houses) - Destination house
- `amount` (decimal, not null) - Transfer amount
- `date` (date, not null) - Transfer date
- `notes` (text) - Optional observations
- `created_at` (timestamptz) - Creation timestamp

### settings
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, not null, unique, defaults to auth.uid()) - Owner reference (one row per user)
- `bankroll` (decimal, default 0) - Total bankroll
- `currency` (text, default 'BRL') - Currency symbol
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

## Security
- RLS enabled on all tables
- Owner-scoped policies for authenticated users using auth.uid()
- All tables have user_id with DEFAULT auth.uid() for automatic owner assignment

## Indexes
- Indexes on user_id columns for efficient queries
- Indexes on foreign keys for join performance
- Indexes on date columns for filtering
*/

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Houses table
CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  color text DEFAULT '#3B82F6',
  balance decimal(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE houses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_houses" ON houses;
CREATE POLICY "select_own_houses" ON houses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_houses" ON houses;
CREATE POLICY "insert_own_houses" ON houses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_houses" ON houses;
CREATE POLICY "update_own_houses" ON houses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_houses" ON houses;
CREATE POLICY "delete_own_houses" ON houses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Operations table
CREATE TABLE IF NOT EXISTS operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  desired_return decimal(5,2),
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_operations" ON operations;
CREATE POLICY "select_own_operations" ON operations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_operations" ON operations;
CREATE POLICY "insert_own_operations" ON operations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_operations" ON operations;
CREATE POLICY "update_own_operations" ON operations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_operations" ON operations;
CREATE POLICY "delete_own_operations" ON operations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Operation entries table
CREATE TABLE IF NOT EXISTS operation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  market text,
  selection text,
  bet_type text NOT NULL DEFAULT 'real' CHECK (bet_type IN ('real', 'freebet')),
  odd decimal(10,2) NOT NULL CHECK (odd > 0),
  stake decimal(15,2) NOT NULL CHECK (stake >= 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE operation_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entries" ON operation_entries;
CREATE POLICY "select_own_entries" ON operation_entries FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM operations WHERE operations.id = operation_entries.operation_id AND operations.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_entries" ON operation_entries;
CREATE POLICY "insert_own_entries" ON operation_entries FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM operations WHERE operations.id = operation_entries.operation_id AND operations.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_entries" ON operation_entries;
CREATE POLICY "update_own_entries" ON operation_entries FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM operations WHERE operations.id = operation_entries.operation_id AND operations.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM operations WHERE operations.id = operation_entries.operation_id AND operations.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_entries" ON operation_entries;
CREATE POLICY "delete_own_entries" ON operation_entries FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM operations WHERE operations.id = operation_entries.operation_id AND operations.user_id = auth.uid())
  );

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_deposits" ON deposits;
CREATE POLICY "select_own_deposits" ON deposits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_deposits" ON deposits;
CREATE POLICY "insert_own_deposits" ON deposits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_deposits" ON deposits;
CREATE POLICY "update_own_deposits" ON deposits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_deposits" ON deposits;
CREATE POLICY "delete_own_deposits" ON deposits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_withdrawals" ON withdrawals;
CREATE POLICY "select_own_withdrawals" ON withdrawals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_withdrawals" ON withdrawals;
CREATE POLICY "insert_own_withdrawals" ON withdrawals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_withdrawals" ON withdrawals;
CREATE POLICY "update_own_withdrawals" ON withdrawals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_withdrawals" ON withdrawals;
CREATE POLICY "delete_own_withdrawals" ON withdrawals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  from_house_id uuid NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  to_house_id uuid NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transfers" ON transfers;
CREATE POLICY "select_own_transfers" ON transfers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transfers" ON transfers;
CREATE POLICY "insert_own_transfers" ON transfers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transfers" ON transfers;
CREATE POLICY "update_own_transfers" ON transfers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transfers" ON transfers;
CREATE POLICY "delete_own_transfers" ON transfers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bankroll decimal(15,2) DEFAULT 0,
  currency text DEFAULT 'BRL',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_houses_user_id ON houses(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_user_id ON operations(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(date);
CREATE INDEX IF NOT EXISTS idx_operation_entries_operation_id ON operation_entries(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_entries_house_id ON operation_entries(house_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_house_id ON deposits(house_id);
CREATE INDEX IF NOT EXISTS idx_deposits_date ON deposits(date);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_house_id ON withdrawals(house_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_date ON withdrawals(date);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_houses_updated_at ON houses;
CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_operations_updated_at ON operations;
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();