#!/usr/bin/env python3
"""
AI 模型配置恢复脚本
使用方法: python restore_ai_models.py
"""

import json
import os

# 备份文件路径
BACKUP_FILE = os.path.join(os.path.dirname(__file__), 'ai_models_backup.json')

def generate_sql():
    """生成 SQL 恢复语句"""
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        models = json.load(f)

    sql_statements = [
        "-- AI 模型配置恢复脚本",
        "-- 生成时间: " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "",
        "DELETE FROM ai_models;  -- 清空现有配置",
        ""
    ]

    for model in models:
        # 转义单引号
        prompt = model.get('prompt', '').replace("'", "''")
        thinking_params = model.get('thinking_params', '').replace("'", "''")

        sql = f"""INSERT INTO ai_models (
    model_id, name, provider, api_key, base_url, prompt,
    thinking_params, use_official_sdk, is_active
) VALUES (
    '{model['model_id']}',
    '{model['name']}',
    '{model['provider']}',
    '{model['api_key']}',
    '{model['base_url']}',
    '{prompt}',
    '{thinking_params}',
    {str(model['use_official_sdk']).lower()},
    {str(model['is_active']).lower()}
);"""

        sql_statements.append(sql)
        sql_statements.append("")

    # 保存 SQL 文件
    sql_file = os.path.join(os.path.dirname(__file__), 'restore_ai_models.sql')
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))

    print(f"✅ SQL 恢复脚本已生成: {sql_file}")
    print(f"📊 共恢复 {len(models)} 个 AI 模型配置")

if __name__ == '__main__':
    from datetime import datetime
    generate_sql()