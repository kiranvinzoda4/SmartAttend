"""Update employee table - remove salary, add face fields

Revision ID: update_employee_face
Revises: a586c97eaa5b
Create Date: 2024-01-01 00:00:04.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'update_employee_face'
down_revision = 'a586c97eaa5b'
branch_labels = None
depends_on = None

def upgrade():
    # Remove salary column
    op.drop_column('employees', 'salary')
    
    # Add face image columns
    op.add_column('employees', sa.Column('face_image_left', sa.String(length=500), nullable=True))
    op.add_column('employees', sa.Column('face_image_center', sa.String(length=500), nullable=True))
    op.add_column('employees', sa.Column('face_image_right', sa.String(length=500), nullable=True))
    op.add_column('employees', sa.Column('face_embedding_id', sa.String(length=255), nullable=True))

def downgrade():
    # Remove face image columns
    op.drop_column('employees', 'face_embedding_id')
    op.drop_column('employees', 'face_image_right')
    op.drop_column('employees', 'face_image_center')
    op.drop_column('employees', 'face_image_left')
    
    # Add back salary column
    op.add_column('employees', sa.Column('salary', sa.Integer(), nullable=True))