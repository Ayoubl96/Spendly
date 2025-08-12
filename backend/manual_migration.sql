-- Manual migration to add expense share models and update shared_expenses table
-- Run this SQL script in your PostgreSQL database

-- Add missing columns to shared_expenses table
ALTER TABLE shared_expenses 
ADD COLUMN IF NOT EXISTS share_percentage VARCHAR,
ADD COLUMN IF NOT EXISTS share_amount VARCHAR;

-- Create expense_shares table for the new configurable shared expense model
CREATE TABLE IF NOT EXISTS expense_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_percentage VARCHAR NOT NULL,
    share_amount VARCHAR NOT NULL,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    share_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    custom_amount VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_id, user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id ON expense_shares(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_user_id ON expense_shares(user_id);

-- Add comments for documentation
COMMENT ON TABLE expense_shares IS 'Configurable shares for shared expenses';
COMMENT ON COLUMN expense_shares.share_type IS 'Type of share: percentage, fixed_amount, or equal';
COMMENT ON COLUMN expense_shares.share_percentage IS 'Percentage of expense (stored as string for precision)';
COMMENT ON COLUMN expense_shares.share_amount IS 'Amount of expense (stored as string for precision)';
COMMENT ON COLUMN expense_shares.custom_amount IS 'Custom amount for fixed_amount type (stored as string for precision)';
