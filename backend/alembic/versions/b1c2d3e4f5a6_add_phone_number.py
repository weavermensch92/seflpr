"""add_phone_number

Revision ID: b1c2d3e4f5a6
Revises: a3b5c7d9e1f2
Create Date: 2026-04-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a3b5c7d9e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('phone_number', sa.String(length=20), nullable=True)
    )
    op.create_index(
        'ix_users_phone_number', 'users', ['phone_number'], unique=True
    )


def downgrade() -> None:
    op.drop_index('ix_users_phone_number', table_name='users')
    op.drop_column('users', 'phone_number')
