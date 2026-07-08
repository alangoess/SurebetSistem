/*
# Add actual_profit to operations

## Changes
1. Add `actual_profit` column to store the realized profit when settling an operation
*/

-- Add actual_profit to operations (stores the calculated profit when settled)
ALTER TABLE operations 
ADD COLUMN IF NOT EXISTS actual_profit decimal(15,2);