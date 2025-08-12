-- ============================================================================
-- Budget Constraint Rollback: Revert to Positive-Only Amounts
-- ============================================================================
-- This script reverts the budget constraint back to requiring positive amounts
-- Use this ONLY if you need to rollback the zero-amount migration
-- Date: 2025-08-12
-- ============================================================================

BEGIN;

-- Warning message
DO $$
BEGIN
    RAISE WARNING '⚠️  ROLLBACK MIGRATION: Reverting budget constraint to positive-only';
    RAISE WARNING '⚠️  This will prevent zero budget amounts from being saved';
    RAISE WARNING '⚠️  Any existing budgets with zero amounts may cause issues';
END $$;

-- Step 1: Check for existing budgets with zero amounts
DO $$
DECLARE
    zero_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zero_count 
    FROM budgets 
    WHERE CAST(amount AS NUMERIC) = 0;
    
    IF zero_count > 0 THEN
        RAISE WARNING '⚠️  Found % budget(s) with zero amounts!', zero_count;
        RAISE WARNING '⚠️  These will violate the new constraint';
        RAISE WARNING '⚠️  Consider updating them before proceeding';
    ELSE
        RAISE NOTICE '✓ No budgets with zero amounts found';
    END IF;
END $$;

-- Step 2: Drop the current constraint (>= 0)
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS positive_budget_amount;

DO $$
BEGIN
    RAISE NOTICE 'Dropped current constraint (>= 0)';
END $$;

-- Step 3: Add the old constraint (> 0) - positive amounts only
ALTER TABLE budgets ADD CONSTRAINT positive_budget_amount 
    CHECK (CAST(amount AS NUMERIC) > 0);

DO $$
BEGIN
    RAISE NOTICE 'Added old constraint: amount > 0 (positive only)';
    RAISE WARNING '⚠️  Zero budget amounts are no longer allowed';
END $$;

-- Step 4: Verification
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT check_clause INTO constraint_def
    FROM information_schema.check_constraints 
    WHERE constraint_name = 'positive_budget_amount';
    
    IF constraint_def IS NOT NULL THEN
        RAISE NOTICE 'Rollback verification successful!';
        RAISE NOTICE 'Constraint definition: %', constraint_def;
    ELSE
        RAISE ERROR 'Rollback verification failed - constraint not found!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Post-Rollback Information
-- ============================================================================
--
-- The constraint has been reverted to:
--   - ALLOW: amounts > 0 (positive numbers only)
--   - BLOCK: amounts <= 0 (zero and negative numbers)
--
-- This means:
--   ✓ Budget amounts must be positive (> 0)
--   ✗ Budget amounts cannot be zero (= 0)
--   ✗ Budget amounts cannot be negative (< 0)
--
-- ⚠️  WARNING: If you have existing budgets with zero amounts,
--     they may cause constraint violations until updated.
--
-- ============================================================================
