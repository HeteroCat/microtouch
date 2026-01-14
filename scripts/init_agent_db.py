#!/usr/bin/env python3
"""
智能体搜索系统数据库初始化脚本

创建以下表：
- source_configs: 数据源配置表
- monitor_jobs: 监控任务记录表
- push_logs: 推送记录表
"""

import sys
import os

# 添加 scripts 目录到路径
sys.path.insert(0, os.path.dirname(__file__))
from supabase_client import SupabaseClient


def main():
    """主函数"""
    print("=" * 50)
    print("智能体搜索系统数据库初始化")
    print("=" * 50)
    print()

    try:
        # 初始化客户端
        print("正在连接 Supabase...")
        client = SupabaseClient()
        print()

        # 创建 source_configs 表
        print("1. 创建数据源配置表 (source_configs)...")
        client.create_table("source_configs", [
            {"name": "id", "type": "UUID", "isPrimaryKey": True},
            {"name": "user_id", "type": "UUID", "isNullable": False},
            {"name": "type", "type": "VARCHAR(20)", "isNullable": False},
            {"name": "name", "type": "VARCHAR(100)", "isNullable": False},
            {"name": "description", "type": "TEXT", "isNullable": True},
            {"name": "config", "type": "JSONB", "isNullable": False},
            {"name": "schedule", "type": "VARCHAR(50)", "defaultValue": "'0 */6 * * *'"},
            {"name": "enabled", "type": "BOOLEAN", "defaultValue": "true"},
            {"name": "push_targets", "type": "JSONB", "defaultValue": "'[]'::jsonb"},
            {"name": "last_check_at", "type": "TIMESTAMP", "isNullable": True},
            {"name": "last_content_id", "type": "VARCHAR(255)", "isNullable": True},
            {"name": "last_error", "type": "TEXT", "isNullable": True},
            {"name": "error_count", "type": "INTEGER", "defaultValue": "0"},
            {"name": "created_at", "type": "TIMESTAMP", "defaultValue": "now()"},
            {"name": "updated_at", "type": "TIMESTAMP", "defaultValue": "now()"}
        ])
        print()

        # 创建 monitor_jobs 表
        print("2. 创建监控任务记录表 (monitor_jobs)...")
        client.create_table("monitor_jobs", [
            {"name": "id", "type": "UUID", "isPrimaryKey": True},
            {"name": "source_config_id", "type": "UUID", "isNullable": False},
            {"name": "status", "type": "VARCHAR(20)", "defaultValue": "'pending'"},
            {"name": "items_found", "type": "INTEGER", "defaultValue": "0"},
            {"name": "new_items", "type": "INTEGER", "defaultValue": "0"},
            {"name": "summary_generated", "type": "BOOLEAN", "defaultValue": "false"},
            {"name": "error_message", "type": "TEXT", "isNullable": True},
            {"name": "retry_count", "type": "INTEGER", "defaultValue": "0"},
            {"name": "started_at", "type": "TIMESTAMP", "isNullable": True},
            {"name": "completed_at", "type": "TIMESTAMP", "isNullable": True},
            {"name": "created_at", "type": "TIMESTAMP", "defaultValue": "now()"}
        ])
        print()

        # 创建 push_logs 表
        print("3. 创建推送记录表 (push_logs)...")
        client.create_table("push_logs", [
            {"name": "id", "type": "UUID", "isPrimaryKey": True},
            {"name": "user_id", "type": "UUID", "isNullable": False},
            {"name": "monitor_job_id", "type": "UUID", "isNullable": True},
            {"name": "push_type", "type": "VARCHAR(20)", "isNullable": False},
            {"name": "status", "type": "VARCHAR(20)", "defaultValue": "'pending'"},
            {"name": "title", "type": "VARCHAR(255)", "isNullable": True},
            {"name": "content_summary", "type": "TEXT", "isNullable": True},
            {"name": "content_full", "type": "TEXT", "isNullable": True},
            {"name": "metadata", "type": "JSONB", "isNullable": True},
            {"name": "sent_at", "type": "TIMESTAMP", "isNullable": True},
            {"name": "error_message", "type": "TEXT", "isNullable": True},
            {"name": "created_at", "type": "TIMESTAMP", "defaultValue": "now()"}
        ])
        print()

        # 验证表创建
        print("4. 验证表结构...")
        tables = client.list_tables()
        agent_tables = [t for t in tables if t['name'] in ['source_configs', 'monitor_jobs', 'push_logs']]

        for table in agent_tables:
            info = client.get_table_info(table['name'])
            print(f"  ✓ {table['name']}: {len(info)} 列")

        print()
        print("=" * 50)
        print("✓ 数据库初始化完成！")
        print("=" * 50)

    except Exception as e:
        print()
        print("=" * 50)
        print(f"✗ 初始化失败: {e}")
        print("=" * 50)
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
