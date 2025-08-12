-- ============================================================================
-- Budget Constraint Status Check
-- ============================================================================
-- This script checks the current state of the budget constraint
-- Run this to see what constraint is currently active
-- ============================================================================

-- Check current constraint definition
SELECT 
    constraint_name,
    check_clause,
    CASE 
        WHEN check_clause LIKE '%>= 0%' OR check_clause LIKE '%>=0%' THEN 'Allows zero amounts (>= 0)'
        WHEN check_clause LIKE '%> 0%' OR check_clause LIKE '%>0%' THEN 'Positive only (> 0)'
        ELSE 'Unknown constraint type'
    END as constraint_type
FROM information_schema.check_constraints 
WHERE constraint_name = 'positive_budget_amount';

-- Count budgets by amount range
SELECT 
    'Zero amounts (= 0)' as amount_range,
    COUNT(*) as budget_count
FROM budgets 
WHERE CAST(amount AS NUMERIC) = 0

UNION ALL

SELECT 
    'Positive amounts (> 0)' as amount_range,
    COUNT(*) as budget_count
FROM budgets 
WHERE CAST(amount AS NUMERIC) > 0

UNION ALL

SELECT 
    'Negative amounts (< 0)' as amount_range,
    COUNT(*) as budget_count
FROM budgets 
WHERE CAST(amount AS NUMERIC) < 0

ORDER BY 
    CASE amount_range
        WHEN 'Negative amounts (< 0)' THEN 1
        WHEN 'Zero amounts (= 0)' THEN 2
        WHEN 'Positive amounts (> 0)' THEN 3
    END;
