CREATE TABLE extra_profits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2) NOT NULL,
  source text NOT NULL CHECK (source IN ('roleta', 'deposite_ganhe', 'cassino', 'outro')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE extra_profits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_extra_profits" ON extra_profits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_extra_profits" ON extra_profits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_extra_profits" ON extra_profits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_extra_profits" ON extra_profits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Also allow anon access for apps without auth
CREATE POLICY "select_anon_extra_profits" ON extra_profits FOR SELECT
  TO anon USING (true);
CREATE POLICY "insert_anon_extra_profits" ON extra_profits FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "update_anon_extra_profits" ON extra_profits FOR UPDATE
  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "delete_anon_extra_profits" ON extra_profits FOR DELETE
  TO anon USING (true);
