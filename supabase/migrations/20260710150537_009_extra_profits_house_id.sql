ALTER TABLE extra_profits
  ADD COLUMN house_id uuid REFERENCES houses(id) ON DELETE SET NULL;
