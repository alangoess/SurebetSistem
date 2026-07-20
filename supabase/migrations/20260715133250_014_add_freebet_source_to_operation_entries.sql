/*
# Add Freebet Source Tracking to Operation Entries

## Overview
Adds a column to `operation_entries` to link a freebet entry back to the
operation that generated the freebet. This enables automatic marking of
the source freebet as "usada" when the user creates a new operation that
consumes that freebet.

## Modified Tables

### operation_entries
- `source_freebet_operation_id` (uuid, nullable) - References the
  operations.id of the operation whose freebet is being consumed by this
  entry. NULL for normal (real money) entries.

## Security
- No RLS policy changes. Existing owner-scoped policies on operation_entries
  already cover the new column (it is part of the same row).

## Important Notes
1. Column is added with IF NOT EXISTS guard for idempotency.
2. No foreign key constraint is added to avoid circular dependency issues
   with the existing operations table structure. The reference is logical.
3. No data is lost — existing rows get NULL default.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operation_entries' AND column_name = 'source_freebet_operation_id'
  ) THEN
    ALTER TABLE operation_entries ADD COLUMN source_freebet_operation_id uuid;
  END IF;
END $$;