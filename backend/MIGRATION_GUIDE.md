# Budget Constraint Migration Guide

## Overview
This migration updates the budget amount constraint to allow zero values.

**Before**: Budget amounts must be > 0 (positive only)  
**After**: Budget amounts can be >= 0 (zero or positive)

## Migration Details

### Files Created/Modified:
- ✅ `alembic/` - Alembic configuration setup
- ✅ `alembic/versions/6f1ce18ede3a_allow_zero_budget_amounts.py` - Migration file
- ✅ `app/db/models/budget.py` - Updated constraint in model
- ✅ `app/schemas/budget.py` - Updated validation
- ✅ `app/schemas/budget_group.py` - Updated validation  
- ✅ `app/crud/crud_budget_group.py` - Updated CRUD logic
- ✅ `app/api/budget_groups.py` - Updated error handling
- ✅ Frontend validation updated

## How to Apply the Migration

### Option 1: Using Alembic (Recommended)
```bash
# In production, navigate to your backend directory
cd /path/to/spendly/backend

# Run the migration
python3 -m alembic upgrade head
```

### Option 2: Manual SQL (If Alembic isn't available)
```sql
-- Run this SQL in your database
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS positive_budget_amount;
ALTER TABLE budgets ADD CONSTRAINT positive_budget_amount 
    CHECK (CAST(amount AS NUMERIC) >= 0);
```

## Migration File Location
```
backend/alembic/versions/6f1ce18ede3a_allow_zero_budget_amounts.py
```

## What This Migration Does

### Upgrade (Forward):
1. Drops the existing constraint: `amount > 0`
2. Adds new constraint: `amount >= 0`

### Downgrade (Rollback):
```bash
# If you need to rollback
python3 -m alembic downgrade -1
```

## Verification

After running the migration, verify it worked:

```sql
-- Check the constraint definition
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'positive_budget_amount';

-- Should show: (CAST(amount AS NUMERIC) >= 0)
```

## Expected Results

✅ **After Migration:**
- ✅ Budget amounts can be set to `$0`
- ✅ Budget amounts can be any positive value
- ❌ Negative amounts are still blocked
- ✅ No more constraint violation errors when saving zero amounts

## Code Changes Summary

### Backend:
- **Database Model**: Constraint updated to `>= 0`
- **Validation**: Schemas updated to allow zero
- **CRUD**: Server-side protection updated
- **API**: Better error messages

### Frontend:
- **Input Validation**: Zero amounts now allowed
- **Default Values**: Invalid inputs default to `0` instead of `1`
- **User Experience**: Smoother editing with zero support

## Troubleshooting

### If migration fails:
1. Check database connectivity
2. Ensure proper permissions
3. Verify no conflicting data
4. Try manual SQL approach

### If you have existing zero amounts:
The migration should handle existing data gracefully.

---

**Migration ID**: `6f1ce18ede3a`  
**Created**: 2025-08-12  
**Purpose**: Allow zero budget amounts
