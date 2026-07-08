/*
# Remove winning_entry_id from operations

This column causes PGRST201 error due to circular reference with operation_entries.
*/

ALTER TABLE operations DROP COLUMN IF EXISTS winning_entry_id;