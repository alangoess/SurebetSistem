/*
# Add qualifying operation reference

Links an operation to its qualifying operation (the one that generated the freebet).
*/

ALTER TABLE operations
ADD COLUMN qualifying_operation_id uuid REFERENCES operations(id) ON DELETE SET NULL;