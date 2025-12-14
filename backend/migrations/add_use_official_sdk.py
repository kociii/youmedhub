#!/usr/bin/env python3
"""
添加 use_official_sdk 字段到 ai_models 表
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, SessionLocal

def upgrade():
    """添加 use_official_sdk 字段"""
    with engine.connect() as conn:
        # 检查字段是否已存在
        result = conn.execute(text("""
            SELECT COUNT(*) as count FROM information_schema.columns
            WHERE table_name = 'ai_models' AND column_name = 'use_official_sdk'
        """))
        exists = result.fetchone()[0] > 0

        if not exists:
            conn.execute(text("""
                ALTER TABLE ai_models
                ADD COLUMN use_official_sdk BOOLEAN DEFAULT TRUE
            """))
            # 单独添加注释
            conn.execute(text("""
                COMMENT ON COLUMN ai_models.use_official_sdk IS '是否使用官方SDK（False则使用OpenAI兼容格式）'
            """))
            conn.commit()
            print("已添加 use_official_sdk 字段")
        else:
            print("use_official_sdk 字段已存在")

        # 更新现有记录，设置默认值
        conn.execute(text("""
            UPDATE ai_models
            SET use_official_sdk = TRUE
            WHERE use_official_sdk IS NULL
        """))
        conn.commit()
        print("已更新现有记录的默认值")

def downgrade():
    """删除 use_official_sdk 字段"""
    with engine.connect() as conn:
        # 检查字段是否存在
        result = conn.execute(text("""
            SELECT COUNT(*) as count FROM information_schema.columns
            WHERE table_name = 'ai_models' AND column_name = 'use_official_sdk'
        """))
        exists = result.fetchone()[0] > 0

        if exists:
            conn.execute(text("""
                ALTER TABLE ai_models
                DROP COLUMN use_official_sdk
            """))
            conn.commit()
            print("已删除 use_official_sdk 字段")

if __name__ == "__main__":
    print("执行迁移：添加 use_official_sdk 字段")
    upgrade()
    print("\n迁移完成！")