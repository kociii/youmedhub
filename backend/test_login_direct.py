#!/usr/bin/env python3
"""直接测试数据库中的管理员登录"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings
import bcrypt

def test_login():
    # 创建数据库连接
    engine = create_engine(settings.DATABASE_URL)

    # 查询管理员
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT id, username, email, hashed_password FROM admin_users WHERE username = 'admin'"
        ))
        admin = result.fetchone()

        if not admin:
            print("❌ 管理员账号不存在")
            return

        print(f"✅ 找到管理员账号: {admin[1]}")
        print(f"   邮箱: {admin[2]}")
        print(f"   哈希前缀: {admin[3][:20]}...")

        # 测试密码
        password = "admin123"
        try:
            is_valid = bcrypt.checkpw(password.encode('utf-8'), admin[3].encode('utf-8'))
            print(f"✅ 密码验证结果: {is_valid}")

            if is_valid:
                # 更新最后登录时间
                conn.execute(text(
                    "UPDATE admin_users SET last_login = NOW() WHERE id = :id"
                ), {"id": admin[0]})
                conn.commit()
                print("✅ 更新最后登录时间成功")

        except Exception as e:
            print(f"❌ 密码验证失败: {e}")

if __name__ == "__main__":
    test_login()