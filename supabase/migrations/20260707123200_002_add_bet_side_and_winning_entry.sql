/*
# Add bet_side and winning_entry_id

## Changes
1. Add `bet_side` column to `operation_entries` - distinguishes BACK from LAY bets
2. Add `winning_entry_id` column to `operations` - stores which entry won
*/

-- Add bet_side to operation_entries (BACK or LAY)
ALTER TABLE operation_entries 
ADD COLUMN IF NOT EXISTS bet_side text NOT NULL DEFAULT 'BACK' 
CHECK (bet_side IN ('BACK', 'LAY'));

-- Add winning_entry_id to operations (references the winning entry)
ALTER TABLE operations 
ADD COLUMN IF NOT EXISTS winning_entry_id uuid REFERENCES operation_entries(id) ON DELETE SET NULL;

-- Add index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_operations_winning_entry_id ON operations(winning_entry_id);