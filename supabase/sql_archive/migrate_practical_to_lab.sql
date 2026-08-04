-- ============================================================
-- Migration: Rename class_type enum value 'Practical' → 'Lab'
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the new 'Lab' value to the enum
ALTER TYPE class_type ADD VALUE IF NOT EXISTS 'Lab';

-- Step 2: Migrate all existing 'Practical' rows to 'Lab'
-- (Must be done BEFORE removing the old value)
UPDATE workloads SET type = 'Lab' WHERE type = 'Practical';

-- Step 3: Note - PostgreSQL does not support DROP VALUE from enums directly.
-- The 'Practical' value will remain in the enum but no row will use it.
-- If you need to remove it completely, recreate the type (advanced migration).
-- For this application 'Practical' being a dead enum value causes no issues
-- because the backend validator now maps 'practical' → 'Lab' before inserting.

-- Verify:
SELECT DISTINCT type FROM workloads ORDER BY type;
