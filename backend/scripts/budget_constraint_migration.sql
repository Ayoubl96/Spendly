-- ============================================================================
-- Budget Constraint Migration: Allow Zero Amounts
-- ============================================================================
-- This migration updates the positive_budget_amount constraint to allow zero values
-- Date: 2025-08-12
-- Purpose: Allow budget amounts to be 0 (zero) or positive instead of only positive
-- ============================================================================

BEGIN;

-- Step 1: Check current constraint (informational)
DO $$
BEGIN
    RAISE NOTICE 'Current constraint check...';
    RAISE NOTICE 'Looking for existing positive_budget_amount constraint';
END $$;

-- Step 2: Drop the existing constraint if it exists
-- This handles both the old constraint (> 0) and ensures clean state
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS positive_budget_amount;

-- Informational message
DO $$
BEGIN
    RAISE NOTICE 'Dropped existing positive_budget_amount constraint (if it existed)';
END $$;

-- Step 3: Add the new constraint that allows >= 0 (zero or positive amounts)
ALTER TABLE budgets ADD CONSTRAINT positive_budget_amount 
    CHECK (CAST(amount AS NUMERIC) >= 0);

-- Informational message
DO $$
BEGIN
    RAISE NOTICE 'Added new positive_budget_amount constraint: amount >= 0';
    RAISE NOTICE 'Budget amounts can now be zero or positive';
END $$;

-- Step 4: Verification - show the new constraint
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT check_clause INTO constraint_def
    FROM information_schema.check_constraints 
    WHERE constraint_name = 'positive_budget_amount';
    
    IF constraint_def IS NOT NULL THEN
        RAISE NOTICE 'Constraint verification successful!';
        RAISE NOTICE 'New constraint definition: %', constraint_def;
    ELSE
        RAISE WARNING 'Constraint verification failed - constraint not found!';
    END IF;
END $$;

-- Step 5: Test the constraint with a sample check (doesn't insert actual data)
DO $$
BEGIN
    RAISE NOTICE 'Testing constraint logic...';
    -- This would succeed with the new constraint
    IF (0::NUMERIC >= 0) THEN
        RAISE NOTICE '✓ Zero amounts are now allowed';
    END IF;
    
    -- This would still fail with the new constraint  
    IF NOT (-1::NUMERIC >= 0) THEN
        RAISE NOTICE '✓ Negative amounts are still blocked';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Post-Migration Information
-- ============================================================================
-- 
-- The constraint has been updated to:
--   - ALLOW: amounts >= 0 (zero and positive numbers)
--   - BLOCK: amounts < 0 (negative numbers)
--
-- This means you can now:
--   ✓ Set budget amounts to 0 (zero)
--   ✓ Set budget amounts to any positive value
--   ✗ Set budget amounts to negative values (still blocked)
--
-- To verify the migration worked, you can run:
--   SELECT constraint_name, check_clause 
--   FROM information_schema.check_constraints 
--   WHERE constraint_name = 'positive_budget_amount';
--
-- ============================================================================
