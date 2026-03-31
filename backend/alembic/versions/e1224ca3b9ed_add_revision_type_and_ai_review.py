"""add_revision_type_and_ai_review

Revision ID: e1224ca3b9ed
Revises: 8be067d81750
Create Date: 2026-03-31 02:00:47.133227

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1224ca3b9ed'
down_revision: Union[str, None] = '8be067d81750'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


revision_type_enum = sa.Enum('AI_GENERATED', 'USER_EDIT', 'AI_REVISED', 'AI_REVIEW_APPLIED', name='revisiontype')


def upgrade() -> None:
    revision_type_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('answer_revisions', sa.Column('revision_type', revision_type_enum, nullable=False, server_default='AI_GENERATED'))
    op.add_column('answer_revisions', sa.Column('ai_review_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('answer_revisions', 'ai_review_text')
    op.drop_column('answer_revisions', 'revision_type')
    revision_type_enum.drop(op.get_bind(), checkfirst=True)
