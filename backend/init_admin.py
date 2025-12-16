#!/usr/bin/env python3
"""
初始化管理员账号
运行此脚本将创建默认的超级管理员账号
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.admin import AdminUser
from app.core.security import get_password_hash

def create_default_admin():
    """创建默认管理员账号"""
    db = SessionLocal()

    try:
        # 检查是否已有管理员
        admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
        if admin:
            print("✅ 默认管理员账号已存在")
            print(f"   用户名: {admin.username}")
            print(f"   邮箱: {admin.email}")
            return

        # 创建默认超级管理员
        default_admin = AdminUser(
            username="admin",
            email="admin@youmedhub.com",
            hashed_password=get_password_hash("admin123"),
            is_super=True,
            is_active=True
        )

        db.add(default_admin)
        db.commit()
        db.refresh(default_admin)

        print("✅ 默认管理员账号创建成功!")
        print(f"   用户名: {default_admin.username}")
        print(f"   邮箱: {default_admin.email}")
        print(f"   密码: admin123")
        print(f"   权限: 超级管理员")
        print("\n⚠️  请在生产环境中修改默认密码!")

    except Exception as e:
        print(f"❌ 创建管理员账号失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("初始化管理员账号")
    print("=" * 50)

    # 确保表已创建
    from app.models import Base
    Base.metadata.create_all(bind=engine)

    create_default_admin()
    print("=" * 50)