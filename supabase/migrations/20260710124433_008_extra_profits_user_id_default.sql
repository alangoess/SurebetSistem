ALTER TABLE extra_profits
  ALTER COLUMN user_id SET DEFAULT auth.uid();
