"""add_ingest_and_dashboard_fields

Revision ID: a3b5c7d9e1f2
Revises: f18f84939a98
Create Date: 2026-04-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b5c7d9e1f2'
down_revision: Union[str, None] = 'f18f84939a98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # personal_profiles: enrichment 관련 필드
    op.add_column('personal_profiles', sa.Column('enrichment_status', sa.String(length=20), nullable=False, server_default='none'))
    op.add_column('personal_profiles', sa.Column('ai_summary_json', sa.JSON(), nullable=True))

    # users: 무료 ingest 잔여 횟수
    op.add_column('users', sa.Column('free_ingests_remaining', sa.Integer(), nullable=False, server_default='3'))


def downgrade() -> None:
    op.drop_column('users', 'free_ingests_remaining')
    op.drop_column('personal_profiles', 'ai_summary_json')
    op.drop_column('personal_profiles', 'enrichment_status')
