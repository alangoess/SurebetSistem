/*
# Bank Transactions (Caixa)

Tracks deposits/withdrawals from bank account.
*/

CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_bank_transactions" ON bank_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_bank_transactions" ON bank_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_bank_transactions" ON bank_transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_bank_transactions" ON bank_transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_bank_transactions_user_date ON bank_transactions(user_id, date DESC);