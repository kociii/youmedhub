#!/usr/bin/env python3
"""
API功能测试脚本
测试完整的认证和API请求流程
"""

import requests
import json
import time

# API基础URL
BASE_URL = "http://localhost:8000"

def test_auth_and_analysis():
    """测试完整的认证和分析API流程"""
    print("=" * 60)
    print("🚀 开始API功能测试")
    print("=" * 60)

    # 1. 测试用户注册
    print("\n📝 步骤1: 测试用户注册")
    register_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }

    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✅ 注册成功! 用户ID: {user_data.get('id')}")
            print(f"   💰 初始点数: {user_data.get('credits')}")
        else:
            print(f"   ⚠️  注册失败: {response.text}")
    except Exception as e:
        print(f"   ❌ 注册请求错误: {e}")

    # 2. 测试用户登录
    print("\n🔐 步骤2: 测试用户登录")
    login_data = {
        "username": "testuser",
        "password": "password123"
    }

    token = None
    user_info = None

    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            login_result = response.json()
            token = login_result.get("access_token")
            user_info = login_result.get("user")
            print(f"   ✅ 登录成功!")
            print(f"   🪪 Token: {token[:50]}...")
            print(f"   👤 用户信息: {user_info}")
        else:
            print(f"   ❌ 登录失败: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ 登录请求错误: {e}")
        return

    # 3. 测试获取当前用户信息
    print("\n👤 步骤3: 测试获取当前用户信息")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            current_user = response.json()
            print(f"   ✅ 获取用户信息成功!")
            print(f"   📊 当前点数: {current_user.get('credits')}")
        else:
            print(f"   ❌ 获取用户信息失败: {response.text}")
    except Exception as e:
        print(f"   ❌ 获取用户信息错误: {e}")

    # 4. 测试管理员登录
    print("\n👑 步骤4: 测试管理员登录")
    admin_login_data = {
        "username": "kocijia",
        "password": "mfkz941027"
    }

    admin_token = None

    try:
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=admin_login_data)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            admin_result = response.json()
            admin_token = admin_result.get("access_token")
            print(f"   ✅ 管理员登录成功!")
            print(f"   🪪 Admin Token: {admin_token[:50]}...")
        else:
            print(f"   ❌ 管理员登录失败: {response.text}")
    except Exception as e:
        print(f"   ❌ 管理员登录错误: {e}")

    # 5. 测试分析API（需要认证）
    print("\n🎬 步骤5: 测试视频分析API")
    analysis_data = {
        "video_url": "https://example.com/test-video.mp4",
        "model_id": "qwen3-vl-flash"
    }

    if token and user_info and user_info.get('credits', 0) >= 5:
        print(f"   💳 当前用户点数: {user_info.get('credits')}")
        print(f"   💰 分析消耗: 5点数")

        try:
            # 先测试普通分析请求
            response = requests.post(
                f"{BASE_URL}/api/analysis/stream",
                json=analysis_data,
                headers=headers
            )
            print(f"   状态码: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ 分析API认证成功!")
                print("   📡 开始流式响应...")

                # 读取流式响应的前几行
                for line in response.iter_lines():
                    if line:
                        decoded_line = line.decode('utf-8')
                        if decoded_line.startswith('data: '):
                            data = decoded_line[6:]  # 去掉 'data: ' 前缀
                            if data == '[DONE]':
                                print("   🏁 分析完成!")
                                break
                            try:
                                json_data = json.loads(data)
                                print(f"   📝 收到数据: {json_data}")
                                break  # 只读取第一块数据进行测试
                            except json.JSONDecodeError:
                                print(f"   📄 收到文本: {data}")
                                break
            elif response.status_code == 401:
                print("   ❌ 认证失败 - 请检查JWT token")
                print(f"   响应: {response.text}")
            elif response.status_code == 402:
                print("   ❌ 点数不足")
                print(f"   响应: {response.text}")
            else:
                print(f"   ❌ 分析请求失败: {response.text}")
        except Exception as e:
            print(f"   ❌ 分析请求错误: {e}")
    else:
        print("   ⚠️  无法测试分析API: 用户未登录或点数不足")

    # 6. 测试任务历史API
    print("\n📋 步骤6: 测试任务历史API")
    if token:
        try:
            response = requests.get(f"{BASE_URL}/api/analysis/tasks", headers=headers)
            print(f"   状态码: {response.status_code}")
            if response.status_code == 200:
                tasks = response.json()
                print(f"   ✅ 获取任务历史成功!")
                print(f"   📊 任务总数: {len(tasks.get('tasks', []))}")
                for task in tasks.get('tasks', [])[:3]:  # 显示前3个任务
                    print(f"   - 任务ID: {task.get('id')}, 状态: {task.get('status')}")
            else:
                print(f"   ❌ 获取任务历史失败: {response.text}")
        except Exception as e:
            print(f"   ❌ 获取任务历史错误: {e}")

    # 7. 测试管理员获取AI模型配置
    print("\n🤖 步骤7: 测试管理员获取AI模型配置")
    if admin_token:
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        try:
            response = requests.get(f"{BASE_URL}/api/admin/ai-models", headers=admin_headers)
            print(f"   状态码: {response.status_code}")
            if response.status_code == 200:
                models = response.json()
                print(f"   ✅ 获取AI模型配置成功!")
                print(f"   📊 模型总数: {len(models)}")
                for model in models:
                    print(f"   - {model.get('name')}: {model.get('provider')}")
            else:
                print(f"   ❌ 获取AI模型配置失败: {response.text}")
        except Exception as e:
            print(f"   ❌ 获取AI模型配置错误: {e}")

    print("\n" + "=" * 60)
    print("✅ API功能测试完成!")
    print("=" * 60)

    # 8. 测试无认证访问分析API
    print("\n🚫 步骤8: 测试无认证访问分析API")
    try:
        response = requests.post(f"{BASE_URL}/api/analysis/stream", json=analysis_data)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ 正确阻止了未认证访问!")
            print(f"   响应: {response.json()}")
        else:
            print(f"   ❌ 应该返回401，实际返回: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 测试无认证访问错误: {e}")

def test_database_connection():
    """测试数据库连接"""
    print("\n🔍 测试数据库连接...")
    try:
        response = requests.get(f"{BASE_URL}/api/analysis/models")
        if response.status_code == 200:
            print("   ✅ 数据库连接正常!")
            models = response.json()
            print(f"   📊 可用AI模型数: {len(models)}")
        else:
            print(f"   ❌ 数据库连接异常: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 数据库连接测试失败: {e}")

if __name__ == "__main__":
    print("⏰ 测试开始时间:", time.strftime("%Y-%m-%d %H:%M:%S"))

    # 测试数据库连接
    test_database_connection()

    # 执行完整的功能测试
    test_auth_and_analysis()

    print("\n⏰ 测试结束时间:", time.strftime("%Y-%m-%d %H:%M:%S"))
    print("\n💡 提示: 如果所有测试通过，说明认证系统工作正常！")