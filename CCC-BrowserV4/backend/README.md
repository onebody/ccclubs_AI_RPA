# CCC-BrowserV4 Backend

Python FastAPI 后端，使用 MySQL 作为主数据库。

## 数据库配置

数据库连接通过环境变量配置，复制 `.env.example` 为 `.env` 并修改：

```bash
cp .env.example .env
```

主要配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_TYPE` | 数据库类型（mysql / sqlite） | `mysql` |
| `DB_HOST` | MySQL 主机地址 | `127.0.0.1` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USERNAME` | 数据库用户名 | `ccc_user` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_DATABASE` | 数据库名称 | `ccc_browser` |

## 启动 MySQL Docker 容器

项目根目录提供了 `docker-compose.yml`，一键启动 MySQL：

```bash
cd ..  # 回到 CCC-BrowserV4 目录
docker compose up -d
```

容器名称为 `ccc-mysql`，使用 MySQL 8.0，字符集为 `utf8mb4`。

常用命令：

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f mysql

# 停止容器
docker compose down

# 停止并清除数据
docker compose down -v
```

## 安装依赖

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 启动服务

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
