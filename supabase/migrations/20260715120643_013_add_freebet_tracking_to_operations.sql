/*
# Add Freebet Reimbursement Tracking to Operations

## Overview
Adds three columns to the `operations` table to track whether an operation
earns a freebet reimbursement when it results in a loss, the expected freebet
amount, and the lifecycle status of that freebet.

## Modified Tables

### operations
- `returns_freebet_on_loss` (boolean, default false) - When true, the user
  expects a freebet reimbursement if the operation ends in a loss (red).
- `potential_freebet_amount` (numeric(15,2), default 0.00) - The expected
  freebet amount the user will receive if the operation loses.
- `freebet_status` (text, nullable) - Lifecycle of the freebet:
  - 'pendente' - operation still open (pending)
  - 'recebida' - operation ended in a loss and the freebet was generated
  - 'usada' - the user has already used/spent the freebet
  A CHECK constraint enforces valid values.

## Security
- No RLS policy changes. Existing owner-scoped policies on operations
  already cover the new columns (they are part of the same row).

## Important Notes
1. All three columns are added with IF NOT EXISTS guards for idempotency.
2. The CHECK constraint on freebet_status is added only if it doesn't exist.
3. No data is lost — existing rows get safe defaults (false, 0.00, NULL).
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operations' AND column_name = 'returns_freebet_on_loss'
  ) THEN
    ALTER TABLE operations ADD COLUMN returns_freebet_on_loss boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operations' AND column_name = 'potential_freebet_amount'
  ) THEN
    ALTER TABLE operations ADD COLUMN potential_freebet_amount numeric(15,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operations' AND column_name = 'freebet_status'
  ) THEN
    ALTER TABLE operations ADD COLUMN freebet_status text CHECK (freebet_status IN ('pendente', 'recebida', 'usada'));
  END IF;
END $$;

-- Add CHECK constraint on freebet_status if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'operations_freebet_status_check'
  ) THEN
    ALTER TABLE operations ADD CONSTRAINT operations_freebet_status_check
    CHECK (freebet_status IS NULL OR freebet_status IN ('pendente', 'recebida', 'usada'));
  END IF;
END $$;