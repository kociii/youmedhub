#!/usr/bin/env python3
"""测试管理员认证"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext

def test_password_verification():
    # 测试密码验证
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password = "admin123"
    # 使用bcrypt生成的哈希
    hashed = "$2b$12$gp8/oJCeu73mRQCZxlFSXOTpfcDSTUlv6CNzHei6MYRRsr/IRaCRu"

    print(f"密码: {password}")
    print(f"哈希: {hashed}")

    try:
        result = pwd_context.verify(password, hashed)
        print(f"验证结果: {result}")
    except Exception as e:
        print(f"验证错误: {e}")

    # 直接使用bcrypt测试
    try:
        import bcrypt
        password_bytes = password.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        result = bcrypt.checkpw(password_bytes, hashed_bytes)
        print(f"bcrypt验证结果: {result}")
    except Exception as e:
        print(f"bcrypt验证错误: {e}")

if __name__ == "__main__":
    test_password_verification()