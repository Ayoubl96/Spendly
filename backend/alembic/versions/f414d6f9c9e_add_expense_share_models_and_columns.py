"""add_expense_share_models_and_columns

Add new ExpenseShare model and update SharedExpense with new columns for configurable shared expenses.

Revision ID: f414d6f9c9e
Revises: 6f1ce18ede3a
Create Date: 2025-08-12 22:23:06.076169

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f414d6f9c9e'
down_revision: Union[str, None] = '6f1ce18ede3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to shared_expenses table
    op.add_column('shared_expenses', sa.Column('share_percentage', sa.String(), nullable=True))
    op.add_column('shared_expenses', sa.Column('share_amount', sa.String(), nullable=True))
    
    # Create expense_shares table for the new configurable shared expense model
    op.create_table('expense_shares',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('expense_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('share_percentage', sa.String(), nullable=False),
        sa.Column('share_amount', sa.String(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('share_type', sa.String(length=20), nullable=False, server_default='percentage'),
        sa.Column('custom_amount', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['currency'], ['currencies.code'], ),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('expense_id', 'user_id')
    )
    
    # Create indexes for performance
    op.create_index('idx_expense_shares_expense_id', 'expense_shares', ['expense_id'])
    op.create_index('idx_expense_shares_user_id', 'expense_shares', ['user_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_expense_shares_user_id', table_name='expense_shares')
    op.drop_index('idx_expense_shares_expense_id', table_name='expense_shares')
    
    # Drop expense_shares table
    op.drop_table('expense_shares')
    
    # Remove columns from shared_expenses table
    op.drop_column('shared_expenses', 'share_amount')
    op.drop_column('shared_expenses', 'share_percentage')
