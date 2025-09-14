"""empty message

Revision ID: f4df71e33fb6
Revises: a59ffd70f1aa
Create Date: 2025-09-14 02:57:56.312920

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4df71e33fb6'
down_revision: Union[str, None] = 'a59ffd70f1aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
