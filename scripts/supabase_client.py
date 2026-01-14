#!/usr/bin/env python3
"""
Supabase 客户端 - 用于与自部署的 Supabase 实例交互
支持表管理、数据 CRUD、SQL 查询、数据导入导出等功能
"""

import os
import sys
import json
import csv
import requests
from typing import Optional, Dict, List, Any, Union
from datetime import datetime


class SupabaseClient:
    """Supabase API 客户端"""

    def __init__(
        self,
        url: Optional[str] = None,
        service_role_key: Optional[str] = None
    ):
        """
        初始化 Supabase 客户端

        Args:
            url: Supabase URL (可选，默认使用预配置的 URL)
            service_role_key: Service Role Key (可选，默认使用预配置的 Key)

        优先级: 用户提供的参数 > 环境变量 > 预配置默认值
        """
        # 默认配置
        DEFAULT_URL = "http://139.159.196.0:8000/"
        DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjYwNzM2MDAsImV4cCI6MTkyMzg0MDAwMH0.gGDjevHPJ-KMfwoV3D3wCSePKtDzc5QiFZuTcLUqYTE"

        # 按优先级获取配置
        self.url = url or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or DEFAULT_URL
        self.key = service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or DEFAULT_KEY

        # 移除 URL 末尾的斜杠，避免拼接时出现双斜杠
        self.url = self.url.rstrip("/")

        # 设置请求头
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # PostgreSQL Meta API 端点
        self.meta_api_url = f"{self.url}/pg"

        print(f"✅ Supabase 客户端已初始化")
        print(f"   URL: {self.url}")

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        发送 HTTP 请求

        Args:
            method: HTTP 方法 (GET, POST, PATCH, DELETE)
            endpoint: API 端点
            data: 请求体数据
            params: URL 查询参数

        Returns:
            响应 JSON 数据
        """
        url = f"{self.url}{endpoint}"

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, params=params, timeout=30)
            elif method.upper() == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data, params=params, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers, params=params, timeout=30)
            else:
                raise ValueError(f"不支持的 HTTP 方法: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ 请求失败: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   响应内容: {e.response.text}")
            raise

    # ==================== 表管理 ====================

    def create_table(
        self,
        table_name: str,
        columns: List[Dict[str, Any]],
        schema: str = "public"
    ) -> Dict:
        """
        创建数据库表

        Args:
            table_name: 表名
            columns: 列定义列表，每个列包含:
                - name: 列名
                - type: 数据类型 (text, integer, bigint, numeric, boolean, timestamp, etc.)
                - isPrimaryKey: 是否主键
                - isIdentity: 是否自增
                - isNullable: 是否可空
                - defaultValue: 默认值
            schema: 模式名 (默认为 public)

        Returns:
            创建的表信息

        Example:
            >>> client.create_table(
            ...     "products",
            ...     [
            ...         {"name": "id", "type": "bigint", "isPrimaryKey": True, "isIdentity": True},
            ...         {"name": "name", "type": "text", "isNullable": False},
            ...         {"name": "price", "type": "numeric", "isNullable": True}
            ...     ]
            ... )
        """
        # 使用直接 SQL 执行而不是 postgres-meta API
        # 因为 postgres-meta API 的 /tables 端点有时不能正确创建字段

        # 构建 SQL 语句
        column_defs = []
        for col in columns:
            col_def = f'    "{col["name"]}" {col["type"].upper()}'

            # 添加约束
            if col.get("isPrimaryKey"):
                col_def += " PRIMARY KEY"

            if col.get("isIdentity"):
                # 对于 PostgreSQL，使用 SERIAL 或 BIGSERIAL
                if col["type"].lower() in ["integer", "int"]:
                    col_def = f'    "{col["name"]}" SERIAL PRIMARY KEY'
                elif col["type"].lower() in ["bigint", "big integer"]:
                    col_def = f'    "{col["name"]}" BIGSERIAL PRIMARY KEY'
                else:
                    col_def += " GENERATED BY DEFAULT AS IDENTITY"

            if not col.get("isNullable", False) and not col.get("isPrimaryKey"):
                col_def += " NOT NULL"

            if col.get("defaultValue"):
                default_val = col["defaultValue"]
                # 处理特殊的默认值
                if default_val == "now()":
                    col_def += " DEFAULT NOW()"
                elif isinstance(default_val, str) and not default_val.isdigit():
                    col_def += f" DEFAULT '{default_val}'"
                else:
                    col_def += f" DEFAULT {default_val}"

            column_defs.append(col_def)

        # 构建完整的 CREATE TABLE 语句
        full_table_name = f'"{schema}"."{table_name}"' if schema != "public" else f'"{table_name}"'
        sql = f"CREATE TABLE {full_table_name} (\n" + ",\n".join(column_defs) + "\n);"

        print(f"🔧 正在创建表 '{table_name}'...")

        # 使用 postgres-meta 的 query 端点执行 SQL
        response = requests.post(
            f"{self.meta_api_url}/query",
            headers=self.headers,
            json={"query": sql}
        )
        response.raise_for_status()

        print(f"✅ 表 '{table_name}' 创建成功")

        # 等待 PostgREST 刷新 schema cache
        print("⏳ 等待 PostgREST 刷新 schema cache...")
        import time
        time.sleep(3)

        return {"table_name": table_name, "columns": columns}

    def list_tables(self, schema: str = "public") -> List[Dict]:
        """列出所有表"""
        response = requests.get(
            f"{self.meta_api_url}/tables",
            headers=self.headers,
            params={"schema": schema}
        )
        response.raise_for_status()
        return response.json()

    def get_table_info(self, table_name: str, schema: str = "public") -> Dict:
        """获取表详细信息"""
        response = requests.get(
            f"{self.meta_api_url}/tables/{schema}.{table_name}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def drop_table(self, table_name: str, schema: str = "public", cascade: bool = False) -> Dict:
        """删除表"""
        response = requests.delete(
            f"{self.meta_api_url}/tables/{schema}.{table_name}",
            headers=self.headers,
            params={"cascade": cascade}
        )
        response.raise_for_status()
        print(f"✅ 表 '{table_name}' 删除成功")
        return response.json()

    def add_column(
        self,
        table_name: str,
        column: Dict[str, Any],
        schema: str = "public"
    ) -> Dict:
        """
        添加列到表

        Args:
            table_name: 表名
            column: 列定义 (格式同 create_table 的 columns)
            schema: 模式名
        """
        response = requests.post(
            f"{self.meta_api_url}/tables/{schema}.{table_name}/columns",
            headers=self.headers,
            json=column
        )
        response.raise_for_status()
        print(f"✅ 列 '{column['name']}' 添加到表 '{table_name}'")
        return response.json()

    def alter_column(
        self,
        table_name: str,
        column_name: str,
        alterations: Dict[str, Any],
        schema: str = "public"
    ) -> Dict:
        """
        修改列

        Args:
            table_name: 表名
            column_name: 列名
            alterations: 要修改的字段，如 {"nullable": False, "default": "0"}
            schema: 模式名
        """
        response = requests.patch(
            f"{self.meta_api_url}/tables/{schema}.{table_name}/columns/{column_name}",
            headers=self.headers,
            json=alterations
        )
        response.raise_for_status()
        print(f"✅ 列 '{column_name}' 修改成功")
        return response.json()

    def drop_column(
        self,
        table_name: str,
        column_name: str,
        schema: str = "public"
    ) -> Dict:
        """删除列"""
        response = requests.delete(
            f"{self.meta_api_url}/tables/{schema}.{table_name}/columns/{column_name}",
            headers=self.headers
        )
        response.raise_for_status()
        print(f"✅ 列 '{column_name}' 删除成功")
        return response.json()

    # ==================== 数据 CRUD ====================

    def insert(
        self,
        table_name: str,
        data: Union[Dict, List[Dict]],
        schema: str = "public"
    ) -> List[Dict]:
        """
        插入数据

        Args:
            table_name: 表名
            data: 要插入的数据 (单条记录或记录列表)
            schema: 模式名

        Returns:
            插入的记录
        """
        endpoint = f"/rest/v1/{table_name}"
        headers = self.headers.copy()
        headers["Prefer"] = "return=representation"

        is_single = not isinstance(data, list)
        payload = data if is_single else data

        url = f"{self.url}{endpoint}"
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        if is_single:
            result = [result]

        print(f"✅ 插入 {len(result)} 条记录到 '{table_name}'")
        return result

    def select(
        self,
        table_name: str,
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        schema: str = "public"
    ) -> List[Dict]:
        """
        查询数据

        Args:
            table_name: 表名
            columns: 要查询的列，默认 "*"
            filters: 过滤条件，如 {"id": "eq.1", "name": "like.%test%"}
            order: 排序，如 "id.desc" 或 "name.asc"
            limit: 限制返回数量
            offset: 偏移量
            schema: 模式名

        Returns:
            查询结果列表

        Example:
            >>> client.select(
            ...     "products",
            ...     filters={"price": "gte.100"},
            ...     order="created_at.desc",
            ...     limit=10
            ... )
        """
        endpoint = f"/rest/v1/{table_name}"
        params = {"select": columns}

        # 添加过滤条件
        if filters:
            for key, value in filters.items():
                params[key] = value

        # 添加排序
        if order:
            params["order"] = order

        # 添加分页
        if limit:
            params["limit"] = limit
        if offset:
            params["offset"] = offset

        url = f"{self.url}{endpoint}"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()

        result = response.json()
        print(f"✅ 查询到 {len(result)} 条记录")
        return result

    def update(
        self,
        table_name: str,
        data: Dict[str, Any],
        filters: Dict[str, Any],
        schema: str = "public"
    ) -> List[Dict]:
        """
        更新数据

        Args:
            table_name: 表名
            data: 要更新的数据
            filters: 过滤条件 (必须)
            schema: 模式名

        Returns:
            更新的记录
        """
        endpoint = f"/rest/v1/{table_name}"
        headers = self.headers.copy()
        headers["Prefer"] = "return=representation"

        # 将 filters 转为查询参数
        params = {}
        for key, value in filters.items():
            params[key] = value

        url = f"{self.url}{endpoint}"
        response = requests.patch(url, headers=headers, json=data, params=params)
        response.raise_for_status()

        result = response.json()
        print(f"✅ 更新了 {len(result)} 条记录")
        return result

    def delete(
        self,
        table_name: str,
        filters: Dict[str, Any],
        schema: str = "public"
    ) -> List[Dict]:
        """
        删除数据

        Args:
            table_name: 表名
            filters: 过滤条件 (必须)
            schema: 模式名

        Returns:
            删除的记录
        """
        endpoint = f"/rest/v1/{table_name}"
        headers = self.headers.copy()
        headers["Prefer"] = "return=representation"

        # 将 filters 转为查询参数
        params = {}
        for key, value in filters.items():
            params[key] = value

        url = f"{self.url}{endpoint}"
        response = requests.delete(url, headers=headers, params=params)
        response.raise_for_status()

        result = response.json()
        print(f"✅ 删除了 {len(result)} 条记录")
        return result

    def count(
        self,
        table_name: str,
        filters: Optional[Dict[str, Any]] = None,
        column: str = "*",
        schema: str = "public"
    ) -> int:
        """
        统计记录数

        Args:
            table_name: 表名
            filters: 过滤条件
            column: 统计的列 (默认 *)
            schema: 模式名

        Returns:
            记录数
        """
        endpoint = f"/rest/v1/{table_name}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Prefer": "count=exact"
        }

        params = {}
        if filters:
            for key, value in filters.items():
                params[key] = value

        url = f"{self.url}{endpoint}"
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        count = int(response.headers.get("Content-Range", "0").split("/")[1])
        print(f"✅ 表 '{table_name}' 中有 {count} 条记录")
        return count

    # ==================== SQL 查询 ====================

    def execute_sql(self, sql: str) -> List[Dict]:
        """
        执行 SQL 查询

        Args:
            sql: SQL 查询语句

        Returns:
            查询结果

        Example:
            >>> client.execute_sql("SELECT * FROM products WHERE price > 100")
        """
        endpoint = "/rest/v1/rpc/exec_sql"
        url = f"{self.url}{endpoint}"
        response = requests.post(
            url,
            headers=self.headers,
            json={"query": sql}
        )

        # 如果 exec_sql 不存在，尝试使用 alternative approach
        if response.status_code == 404:
            print("⚠️  exec_sql 函数不存在，请先在数据库中创建该函数")
            print("   可以使用以下 SQL 创建:")
            print("""
            CREATE OR REPLACE FUNCTION exec_sql(query text)
            RETURNS SETOF json
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RETURN QUERY EXECUTE query;
            END;
            $$;
            """)
            response.raise_for_status()

        response.raise_for_status()
        result = response.json()
        print(f"✅ SQL 查询执行成功，返回 {len(result)} 条记录")
        return result

    # ==================== 数据导入导出 ====================

    def export_to_csv(
        self,
        table_name: str,
        output_file: str,
        filters: Optional[Dict[str, Any]] = None,
        schema: str = "public"
    ) -> int:
        """
        导出数据到 CSV 文件

        Args:
            table_name: 表名
            output_file: 输出文件路径
            filters: 过滤条件
            schema: 模式名

        Returns:
            导出的记录数
        """
        data = self.select(table_name, filters=filters, schema=schema)

        if not data:
            print(f"⚠️  表 '{table_name}' 中没有数据")
            return 0

        # 获取所有字段
        fieldnames = list(data[0].keys())

        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

        print(f"✅ 导出 {len(data)} 条记录到 '{output_file}'")
        return len(data)

    def import_from_csv(
        self,
        table_name: str,
        input_file: str,
        schema: str = "public",
        batch_size: int = 1000
    ) -> int:
        """
        从 CSV 文件导入数据

        Args:
            table_name: 表名
            input_file: 输入文件路径
            schema: 模式名
            batch_size: 批量插入大小

        Returns:
            导入的记录数
        """
        with open(input_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            data = list(reader)

        if not data:
            print(f"⚠️  CSV 文件 '{input_file}' 中没有数据")
            return 0

        # 批量插入
        total = 0
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            # 将字符串值转换为适当类型
            converted_batch = []
            for row in batch:
                converted_row = {}
                for key, value in row.items():
                    # 尝试转换为数字
                    if value and value.replace('.', '', 1).replace('-', '', 1).isdigit():
                        converted_row[key] = float(value) if '.' in value else int(value)
                    else:
                        converted_row[key] = value
                converted_batch.append(converted_row)

            self.insert(table_name, converted_batch, schema=schema)
            total += len(converted_batch)

        print(f"✅ 从 '{input_file}' 导入 {total} 条记录")
        return total

    def export_to_json(
        self,
        table_name: str,
        output_file: str,
        filters: Optional[Dict[str, Any]] = None,
        schema: str = "public"
    ) -> int:
        """
        导出数据到 JSON 文件

        Args:
            table_name: 表名
            output_file: 输出文件路径
            filters: 过滤条件
            schema: 模式名

        Returns:
            导出的记录数
        """
        data = self.select(table_name, filters=filters, schema=schema)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

        print(f"✅ 导出 {len(data)} 条记录到 '{output_file}'")
        return len(data)

    def import_from_json(
        self,
        table_name: str,
        input_file: str,
        schema: str = "public",
        batch_size: int = 1000
    ) -> int:
        """
        从 JSON 文件导入数据

        Args:
            table_name: 表名
            input_file: 输入文件路径
            schema: 模式名
            batch_size: 批量插入大小

        Returns:
            导入的记录数
        """
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, list):
            data = [data]

        if not data:
            print(f"⚠️  JSON 文件 '{input_file}' 中没有数据")
            return 0

        # 批量插入
        total = 0
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            self.insert(table_name, batch, schema=schema)
            total += len(batch)

        print(f"✅ 从 '{input_file}' 导入 {total} 条记录")
        return total


def main():
    """命令行接口"""
    import argparse

    parser = argparse.ArgumentParser(description="Supabase 客户端命令行工具")
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # 列表命令
    list_parser = subparsers.add_parser("list", help="列出所有表")
    list_parser.add_argument("--schema", default="public", help="模式名")

    # 表信息命令
    info_parser = subparsers.add_parser("info", help="获取表信息")
    info_parser.add_argument("table", help="表名")
    info_parser.add_argument("--schema", default="public", help="模式名")

    # 查询命令
    select_parser = subparsers.add_parser("select", help="查询数据")
    select_parser.add_argument("table", help="表名")
    select_parser.add_argument("--columns", default="*", help="列名")
    select_parser.add_argument("--filter", help="过滤条件 (JSON)")
    select_parser.add_argument("--limit", type=int, help="限制数量")
    select_parser.add_argument("--schema", default="public", help="模式名")

    # 插入命令
    insert_parser = subparsers.add_parser("insert", help="插入数据")
    insert_parser.add_argument("table", help="表名")
    insert_parser.add_argument("data", help="数据 (JSON)")
    insert_parser.add_argument("--schema", default="public", help="模式名")

    # SQL 命令
    sql_parser = subparsers.add_parser("sql", help="执行 SQL")
    sql_parser.add_argument("query", help="SQL 查询")

    # 导出命令
    export_parser = subparsers.add_parser("export", help="导出数据")
    export_parser.add_argument("table", help="表名")
    export_parser.add_argument("output", help="输出文件")
    export_parser.add_argument("--format", choices=["csv", "json"], default="csv", help="文件格式")
    export_parser.add_argument("--schema", default="public", help="模式名")

    # 导入命令
    import_parser = subparsers.add_parser("import", help="导入数据")
    import_parser.add_argument("table", help="表名")
    import_parser.add_argument("input", help="输入文件")
    import_parser.add_argument("--schema", default="public", help="模式名")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # 初始化客户端
    client = SupabaseClient()

    # 执行命令
    if args.command == "list":
        tables = client.list_tables(schema=args.schema)
        print("\n📋 数据库表列表:")
        for table in tables:
            print(f"  - {table['name']}")
        print(f"\n共 {len(tables)} 个表")

    elif args.command == "info":
        info = client.get_table_info(args.table, schema=args.schema)
        print(f"\n📋 表 '{args.table}' 信息:")
        print(json.dumps(info, indent=2, ensure_ascii=False))

    elif args.command == "select":
        filters = json.loads(args.filter) if args.filter else None
        data = client.select(
            args.table,
            columns=args.columns,
            filters=filters,
            limit=args.limit,
            schema=args.schema
        )
        print("\n📋 查询结果:")
        print(json.dumps(data, indent=2, ensure_ascii=False))

    elif args.command == "insert":
        data = json.loads(args.data)
        client.insert(args.table, data, schema=args.schema)

    elif args.command == "sql":
        result = client.execute_sql(args.query)
        print("\n📋 查询结果:")
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "export":
        if args.format == "csv":
            client.export_to_csv(args.table, args.output, schema=args.schema)
        else:
            client.export_to_json(args.table, args.output, schema=args.schema)

    elif args.command == "import":
        if args.input.endswith(".csv"):
            client.import_from_csv(args.table, args.input, schema=args.schema)
        else:
            client.import_from_json(args.table, args.input, schema=args.schema)


if __name__ == "__main__":
    main()
