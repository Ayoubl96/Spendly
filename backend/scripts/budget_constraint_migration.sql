-- Budget Constraint Migration: Allow Zero Amounts
-- This script updates the positive_budget_amount constraint to allow zero values

-- Step 1: Drop the existing constraint
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS positive_budget_amount;

-- Step 2: Add the new constraint that allows >= 0 (zero or positive)
ALTER TABLE budgets ADD CONSTRAINT positive_budget_amount 
    CHECK (CAST(amount AS NUMERIC) >= 0);

-- Verification query (optional - run this to verify the change)
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'positive_budget_amount';
