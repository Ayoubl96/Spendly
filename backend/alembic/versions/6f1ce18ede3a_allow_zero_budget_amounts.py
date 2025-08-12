"""allow_zero_budget_amounts

Update budget amount constraint to allow zero values.
Changes the constraint from amount > 0 to amount >= 0.

Revision ID: 6f1ce18ede3a
Revises: 
Create Date: 2025-08-12 02:57:29.778007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1ce18ede3a'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update budget constraint to allow zero amounts (>= 0)."""
    
    # Drop the existing constraint that only allowed positive amounts (> 0)
    op.drop_constraint('positive_budget_amount', 'budgets', type_='check')
    
    # Add new constraint that allows zero and positive amounts (>= 0)
    op.create_check_constraint(
        'positive_budget_amount',
        'budgets',
        'CAST(amount AS NUMERIC) >= 0'
    )


def downgrade() -> None:
    """Revert budget constraint to only allow positive amounts (> 0)."""
    
    # Drop the constraint that allows zero amounts
    op.drop_constraint('positive_budget_amount', 'budgets', type_='check')
    
    # Add back the original constraint that only allows positive amounts
    op.create_check_constraint(
        'positive_budget_amount',
        'budgets',
        'CAST(amount AS NUMERIC) > 0'
    )
