# Redis 存储结构设计文档

> **项目**: AI Browser RPA 系统  
> **模块**: 后端 API 模块  
> **作者**: redis-engineer  
> **日期**: 2026-06-18  
> **版本**: v1.0

---

## 目录

1. [设计原则](#1-设计原则)
2. [Key 命名规范](#2-key-命名规范)
3. [会话存储设计 (Session Storage)](#3-会话存储设计)
4. [热点缓存设计 (Hot Cache)](#4-热点缓存设计)
5. [任务队列设计 (Task Queue)](#5-任务队列设计)
6. [其他存储设计](#6-其他存储设计)
7. [TTL 策略](#7-ttl-策略)
8. [内存优化建议](#8-内存优化建议)
9. [示例 Redis 命令](#9-示例-redis-命令)
10. [附录：完整 Key 规范表格](#10-附录完整-key-规范表格)

---

## 1. 设计原则

### 1.1 多租户隔离

所有 Redis Key 必须包含 `tenant_id`，确保数据在租户维度完全隔离：

```
{module}:{tenant_id}:{entity_id}
```

### 1.2 命名空间规范

| 前缀 | 用途 |
|------|------|
| `session:` | 用户会话存储 |
| `cache:` | 热点数据缓存 |
| `queue:` | 任务队列 |
| `ratelimit:` | 限流计数器 |
| `browser:` | 浏览器实例状态 |
| `metrics:` | 实时监控数据 |
| `lock:` | 分布式锁 |

### 1.3 数据结构选择原则

| 数据结构 | 适用场景 |
|----------|----------|
| `String` | 简单键值、计数器、分布式锁 |
| `Hash` | 对象存储（用户信息、会话详情） |
| `List` | 先进先出队列、最近操作记录 |
| `Set` | 唯一成员集合、标签、在线用户 |
| `Sorted Set` | 优先级队列、时间排序、排行榜 |
| `HyperLogLog` | 基数估算（UV 统计） |
| `Time Series` | 时序监控数据（RedisTimeSeries 模块） |

---

## 2. Key 命名规范

### 2.1 通用格式

```
{module}:{tenant_id}:{sub_type}:{identifier}
```

### 2.2 命名约定

- 全部使用**小写字母 + 下划线**
- 多个单词用 `_` 分隔
- `{tenant_id}` 为短横线分隔的 UUID 或短标识
- `{identifier}` 优先使用数据库主键

---

## 3. 会话存储设计

### 3.1 会话信息存储

**Key 格式**: `session:{tenant_id}:{user_id}` 或 `session:{token}`

**数据结构**: `Hash`

**字段定义**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | String | 用户 ID |
| `tenant_id` | String | 租户 ID |
| `username` | String | 用户名 |
| `role` | String | 角色 (super_admin/tenant_admin/operator/readonly) |
| `token` | String | JWT Token |
| `created_at` | Integer | 登录时间戳 (秒) |
| `last_active` | Integer | 最后活跃时间戳 (秒) |
| `ip_address` | String | 登录 IP |
| `user_agent` | String | User Agent |

**TTL**: 7 天 (604800 秒)

**示例**:

```redis
HSET session:tenant_001:user_123 \
  user_id "user_123" \
  tenant_id "tenant_001" \
  username "zhangsan" \
  role "operator" \
  token "eyJhbG..." \
  created_at 1718700000 \
  last_active 1718700000 \
  ip_address "180.200.134.171"

EXPIRE session:tenant_001:user_123 604800
```

### 3.2 Token 反向索引

**Key 格式**: `session:token:{token_hash}`

**数据结构**: `String`

**Value**: `{tenant_id}:{user_id}`

**TTL**: 与会话一致 (7 天)

**用途**: 通过 Token 快速查找会话，用于鉴权中间件。

```redis
SET session:token:a1b2c3d4 "tenant_001:user_123" EX 604800
```

### 3.3 多设备登录控制

**Key 格式**: `session:active:{tenant_id}:{user_id}`

**数据结构**: `Set`

**成员**: `token_hash` 列表

**用途**: 限制用户同时在线设备数量。

```redis
SADD session:active:tenant_001:user_123 "a1b2c3d4"
SADD session:active:tenant_001:user_123 "e5f6a7b8"
SCARD session:active:tenant_001:user_123  # 查看活跃会话数
```

---

## 4. 热点缓存设计

### 4.1 缓存更新策略

采用 **Cache-Aside（旁路缓存）** 模式：

- **读流程**: 先读缓存 → 命中返回 → 未命中读 DB → 写入缓存
- **写流程**: 先更新 DB → 再删除缓存（避免不一致）

### 4.2 租户信息缓存

**Key 格式**: `cache:tenant:{tenant_id}`

**数据结构**: `String` (JSON 序列化)

**TTL**: 30 分钟

**Value 结构**:

```json
{
  "id": "tenant_001",
  "name": "示例租户",
  "quota": 100,
  "used_quota": 45,
  "enabled": true,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-06-01T00:00:00Z"
}
```

### 4.3 用户信息缓存

**Key 格式**: `cache:user:{tenant_id}:{user_id}`

**数据结构**: `String` (JSON 序列化)

**TTL**: 15 分钟

**Value 结构**:

```json
{
  "id": "user_123",
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "role": "operator",
  "tenant_id": "tenant_001",
  "enabled": true,
  "last_login": "2026-06-18T10:00:00Z"
}
```

### 4.4 配额信息缓存

**Key 格式**: `cache:quota:{tenant_id}`

**数据结构**: `Hash`

**字段定义**:

| 字段 | 说明 |
|------|------|
| `total` | 总配额 |
| `used` | 已用配额 |
| `remaining` | 剩余配额 |
| `reset_at` | 配额重置时间 |

**TTL**: 5 分钟

```redis
HSET cache:quota:tenant_001 \
  total 100 \
  used 45 \
  remaining 55 \
  reset_at "2026-07-01T00:00:00Z"

EXPIRE cache:quota:tenant_001 300
```

### 4.5 浏览器会话元数据缓存

**Key 格式**: `cache:browser_session:{tenant_id}:{session_id}`

**数据结构**: `String` (JSON 序列化)

**TTL**: 跟随会话生命周期

**Value 结构**:

```json
{
  "session_id": "sess_abc123",
  "tenant_id": "tenant_001",
  "user_id": "user_123",
  "cdp_port": 9222,
  "status": "running",
  "created_at": "2026-06-18T10:00:00Z",
  "memory_limit": "512m",
  "cpu_limit": "0.5"
}
```

### 4.6 缓存预热与失效

| 操作 | 触发条件 | 处理方式 |
|------|----------|----------|
| 缓存预热 | 服务启动、租户创建 | 懒加载（首次访问时加载） |
| 缓存失效 | 数据更新、删除 | 主动删除 (`DEL`) |
| 缓存穿透 | 查询不存在的数据 | 缓存空值 (TTL 短) |
| 缓存雪崩 | 大量 Key 同时过期 | TTL 加随机偏移 (±30s) |
| 缓存击穿 | 热点 Key 过期 | 使用 `SETNX` 加锁重建 |

---

## 5. 任务队列设计

### 5.1 等待队列 (Waiting Queue)

**Key 格式**: `queue:tasks:waiting:{tenant_id}`

**数据结构**: `Sorted Set`

**Score**: 优先级 (priority, 数值越大优先级越高)

**Member**: `{task_id}:{created_at}`

**用途**: 按优先级排序的待执行任务队列。

```redis
# 添加任务 (priority = 10)
ZADD queue:tasks:waiting:tenant_001 10 "task_001:1718700000"

# 取出最高优先级任务
ZREVRANGEBYSCORE queue:tasks:waiting:tenant_001 +inf -inf WITHSCORES LIMIT 0 1
```

### 5.2 执行中队列 (Processing Queue)

**Key 格式**: `queue:tasks:processing:{tenant_id}`

**数据结构**: `Set`

**成员**: `{task_id}:{started_at}:{worker_id}`

**用途**: 记录正在执行的任务，用于监控和超时检测。

```redis
SADD queue:tasks:processing:tenant_001 "task_001:1718700100:worker_3"
SMEMBERS queue:tasks:processing:tenant_001
```

### 5.3 已完成队列 (Completed Queue)

**Key 格式**: `queue:tasks:completed:{tenant_id}`

**数据结构**: `List`

**限制长度**: 最多保留 1000 条 (LRTRIM)

**用途**: 最近完成的任务记录，用于结果查询。

```redis
LPUSH queue:tasks:completed:tenant_001 "task_001:success:1718700200"
LTRIM queue:tasks:completed:tenant_001 0 999
LRANGE queue:tasks:completed:tenant_001 0 9
```

### 5.4 任务超时处理

**Key 格式**: `queue:tasks:timeout:{tenant_id}`

**数据结构**: `Sorted Set`

**Score**: 超时时间戳 (秒)

**Member**: `task_id`

**用途**: 定期扫描超时的任务并重新入队或标记为失败。

```redis
# 添加任务时设置超时 (30 分钟后超时)
ZADD queue:tasks:timeout:tenant_001 1718702100 "task_001"

# 扫描超时任务
ZRANGEBYSCORE queue:tasks:timeout:tenant_001 0 1718702000
```

### 5.5 死信队列 (Dead Letter Queue)

**Key 格式**: `queue:tasks:dead:{tenant_id}`

**数据结构**: `List`

**用途**: 多次重试失败的任务，进入死信队列等待人工处理。

```redis
LPUSH queue:tasks:dead:tenant_001 "task_001:max_retries_exceeded:1718700300"
```

### 5.6 任务状态存储

**Key 格式**: `task:{tenant_id}:{task_id}`

**数据结构**: `Hash`

**字段定义**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 任务 ID |
| `type` | String | 任务类型 (NAVIGATE/CLICK/TYPE/EXTRACT/AI_PARSE) |
| `status` | String | 状态 (waiting/processing/completed/failed/timeout) |
| `input` | String | 输入参数 (JSON) |
| `result` | String | 执行结果 (JSON) |
| `session_id` | String | 关联的浏览器会话 ID |
| `priority` | Integer | 优先级 (1-100) |
| `retry_count` | Integer | 重试次数 |
| `max_retries` | Integer | 最大重试次数 |
| `created_at` | Integer | 创建时间戳 |
| `started_at` | Integer | 开始执行时间戳 |
| `completed_at` | Integer | 完成时间戳 |
| `error` | String | 错误信息 |
| `worker_id` | String | 执行该任务的 Worker ID |

```redis
HSET task:tenant_001:task_001 \
  id "task_001" \
  type "NAVIGATE" \
  status "processing" \
  input "{\"url\": \"https://example.com\"}" \
  session_id "sess_abc123" \
  priority 10 \
  retry_count 0 \
  max_retries 3 \
  created_at 1718700000 \
  started_at 1718700100 \
  worker_id "worker_3"

EXPIRE task:tenant_001:task_001 86400  # 保留 24 小时
```

---

## 6. 其他存储设计

### 6.1 限流计数器

**Key 格式**: `ratelimit:{tenant_id}:{api_endpoint}` 或 `ratelimit:{tenant_id}:{user_id}:{api_endpoint}`

**数据结构**: `String` (计数器)

**TTL**: 时间窗口大小

**用途**: API 粒度限流，防止滥用。

**滑动窗口限流示例** (使用 Sorted Set):

```
Key: ratelimit:tenant_001:/api/session/create
Score: 请求时间戳 (毫秒)
Member: 唯一请求 ID
```

```redis
# 清理时间窗口外的请求 (窗口 60 秒)
ZREMRANGEBYSCORE ratelimit:tenant_001:/api/session/create 0 1718700000000

# 统计窗口内请求数
ZCARD ratelimit:tenant_001:/api/session/create

# 添加当前请求
ZADD ratelimit:tenant_001:/api/session/create 1718700060000 "req_unique_id"
EXPIRE ratelimit:tenant_001:/api/session/create 60
```

**固定窗口限流示例** (使用 String + INCR):

```redis
# 每秒最多 10 次请求
INCR ratelimit:tenant_001:user_123:/api/task
EXPIRE ratelimit:tenant_001:user_123:/api/task 1
```

### 6.2 浏览器实例状态

**Key 格式**: `browser:instance:{instance_id}`

**数据结构**: `Hash`

**字段定义**:

| 字段 | 说明 |
|------|------|
| `instance_id` | 实例 ID |
| `tenant_id` | 所属租户 |
| `session_id` | 关联的会话 ID |
| `status` | 状态 (initializing/running/idle/error/stopped) |
| `cdp_port` | CDP 端口 |
| `proxy_url` | 代理地址 |
| `memory_usage` | 内存使用 (MB) |
| `cpu_usage` | CPU 使用率 (%) |
| `created_at` | 创建时间 |
| `last_heartbeat` | 最后心跳时间 |
| `task_count` | 已处理任务数 |

```redis
HSET browser:instance:inst_001 \
  instance_id "inst_001" \
  tenant_id "tenant_001" \
  session_id "sess_abc123" \
  status "running" \
  cdp_port 9222 \
  proxy_url "http://proxy.example.com:8080" \
  memory_usage 256 \
  cpu_usage 15.5 \
  created_at 1718700000 \
  last_heartbeat 1718700200 \
  task_count 42

EXPIRE browser:instance:inst_001 3600  # 1 小时
```

### 6.3 实时监控数据

**Key 格式**: `metrics:{tenant_id}:{metric_type}:{time_bucket}`

**数据结构**: `Time Series` (RedisTimeSeries 模块) 或 `Sorted Set`

**Metric 类型**:

| 类型 | 说明 |
|------|------|
| `req_count` | 请求计数 |
| `req_duration` | 请求耗时 |
| `task_count` | 任务计数 |
| `task_duration` | 任务耗时 |
| `session_count` | 会话数 |
| `error_count` | 错误计数 |
| `quota_usage` | 配额使用量 |

**时间分桶**: `{YYYYMMDDHH}` (按小时) 或 `{YYYYMMDD}` (按天)

**使用 RedisTimeSeries**:

```redis
# 创建时间序列
TS.CREATE metrics:tenant_001:req_count:hour \
  RETENTION 86400000 \
  LABELS tenant_id tenant_001 metric_type req_count

# 添加数据点
TS.ADD metrics:tenant_001:req_count:hour * 42

# 查询最近 1 小时数据
TS.RANGE metrics:tenant_001:req_count:hour - + AGGREGATION avg 60000
```

**降级方案 (使用 Sorted Set)**:

```redis
# Score: 时间戳 (秒), Member: 指标值
ZADD metrics:tenant_001:req_count:20260618 1718700000 42
```

### 6.4 分布式锁

**Key 格式**: `lock:{resource_type}:{resource_id}`

**数据结构**: `String`

**Value**: `{worker_id}:{timestamp}:{uuid}`

**TTL**: 5-30 秒 (根据操作耗时设定)

**用途**: 防止并发操作同一资源（如同一会话被多个 Worker 同时操作）。

```redis
# 获取锁 (SET if Not eXists)
SET lock:session:sess_abc123 "worker_3:1718700000:uuid_xyz" NX EX 10

# 释放锁 (使用 Lua 脚本保证原子性)
-- Lua script
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

### 6.5 浏览器会话分配池

**Key 格式**: `pool:session:{tenant_id}`

**数据结构**: `Set`

**成员**: 空闲会话 ID 列表

**用途**: 快速分配空闲浏览器会话给新任务。

```redis
SADD pool:session:tenant_001 "sess_abc123"
SADD pool:session:tenant_001 "sess_def456"
SPOP pool:session:tenant_001  # 分配一个会话
```

### 6.6 在线用户统计

**Key 格式**: `online:tenant:{tenant_id}` 或 `online:global`

**数据结构**: `HyperLogLog` (UV 统计) + `Set` (精确在线用户)

```redis
# 精确在线用户 (用于强制下线)
SADD online:tenant:tenant_001 "user_123"
SADD online:tenant:tenant_001 "user_456"
SREM online:tenant:tenant_001 "user_123"  # 用户下线

# UV 统计 (用于大盘展示，允许误差)
PFADD online:uv:20260618 "user_123"
PFADD online:uv:20260618 "user_456"
PFCOUNT online:uv:20260618
```

---

## 7. TTL 策略

### 7.1 TTL 对照表

| Key 类型 | 推荐 TTL | 说明 |
|----------|----------|------|
| `session:*` | 7 天 (604800s) | 用户会话，支持"记住我" |
| `session:token:*` | 7 天 | 与会话同步 |
| `cache:tenant:*` | 30 分钟 | 租户信息变更不频繁 |
| `cache:user:*` | 15 分钟 | 用户信息可能变更 |
| `cache:quota:*` | 5 分钟 | 配额变化较频繁 |
| `cache:browser_session:*` | 跟随会话 | 会话结束后删除 |
| `queue:tasks:waiting:*` | 永久 | 队列本身不设置 TTL |
| `queue:tasks:processing:*` | 永久 | 由超时机制清理 |
| `queue:tasks:completed:*` | 永久 | List 长度限制代替 TTL |
| `queue:tasks:timeout:*` | 永久 | 由扫描任务清理 |
| `queue:tasks:dead:*` | 7 天 | 死信保留一周 |
| `task:*` | 24 小时 | 任务详情查询窗口 |
| `ratelimit:*` | 时间窗口大小 | 与限流窗口一致 |
| `browser:instance:*` | 1 小时 | 心跳更新，失联后自动过期 |
| `metrics:*` | 7 天 (TimeSeries RETENTION) | 监控数据保留周期 |
| `lock:*` | 5-30 秒 | 操作完成后立即释放 |
| `pool:session:*` | 永久 | 会话池状态 |
| `online:*` | 永久 | 用户下线时主动删除 |

### 7.2 TTL 随机偏移

为防止缓存雪崩，设置 TTL 时增加随机偏移：

```lua
-- Lua script for setting cache with jitter
local base_ttl = 1800  -- 30 minutes
local jitter = math.random(0, 60)  -- ±30 seconds
local final_ttl = base_ttl + jitter - 30
redis.call("EXPIRE", KEYS[1], final_ttl)
```

---

## 8. 内存优化建议

### 8.1 数据结构优化

| 优化项 | 建议 |
|--------|------|
| 小 Hash 压缩 | 设置 `hash-max-ziplist-entries 512`、`hash-max-ziplist-value 64` |
| 小 List 压缩 | 设置 `list-max-ziplist-size -2` |
| 小 Set 压缩 | 设置 `set-max-intset-entries 512` |
| 小 ZSet 压缩 | 设置 `zset-max-ziplist-entries 128`、`zset-max-ziplist-value 64` |
| 短 Key | Key 名尽量短，但保持可读性 |
| 数字存储 | 使用 Integer 编码 (Redis 自动优化) |

### 8.2 内存淘汰策略

```
maxmemory-policy allkeys-lru
```

当内存达到上限时，淘汰最近最少使用的 Key。

### 8.3 大 Key 拆分

避免单个 Key 过大（> 10KB），拆分方案：

- **大 Hash**: 按字段前缀拆分 `cache:user:{tenant_id}:{user_id}:profile`、`cache:user:{tenant_id}:{user_id}:prefs`
- **大 List**: 分片存储 `queue:tasks:completed:{tenant_id}:shard_1`
- **大 Set**: 分桶存储 `online:tenant:{tenant_id}:bucket_{0-15}` (按 user_id hash 分桶)

### 8.4 过期 Key 清理

```
# 主动过期扫描配置
hz 10  # 后台任务频率 (1-500, 默认 10)
```

---

## 9. 示例 Redis 命令

### 9.1 用户登录流程

```redis
# 1. 创建会话
HSET session:tenant_001:user_123 \
  user_id "user_123" \
  tenant_id "tenant_001" \
  username "zhangsan" \
  role "operator" \
  token "eyJhbG..." \
  created_at 1718700000 \
  last_active 1718700000
EXPIRE session:tenant_001:user_123 604800

# 2. 创建 Token 反向索引
SET session:token:a1b2c3d4 "tenant_001:user_123" EX 604800

# 3. 加入活跃会话 Set
SADD session:active:tenant_001:user_123 "a1b2c3d4"

# 4. 更新最后活跃时间 (每次请求)
HSET session:tenant_001:user_123 last_active 1718700200
EXPIRE session:tenant_001:user_123 604800
```

### 9.2 任务创建与执行流程

```redis
# 1. 创建任务
HSET task:tenant_001:task_001 \
  id "task_001" \
  type "NAVIGATE" \
  status "waiting" \
  input "{\"url\": \"https://example.com\"}" \
  priority 10 \
  retry_count 0 \
  max_retries 3 \
  created_at 1718700000
EXPIRE task:tenant_001:task_001 86400

# 2. 加入等待队列
ZADD queue:tasks:waiting:tenant_001 10 "task_001:1718700000"

# 3. Worker 取出任务
ZREVRANGEBYSCORE queue:tasks:waiting:tenant_001 +inf -inf WITHSCORES LIMIT 0 1
ZREM queue:tasks:waiting:tenant_001 "task_001:1718700000"

# 4. 加入执行中队列
SADD queue:tasks:processing:tenant_001 "task_001:1718700100:worker_3"
HSET task:tenant_001:task_001 status "processing" started_at 1718700100 worker_id "worker_3"

# 5. 设置超时
ZADD queue:tasks:timeout:tenant_001 1718702100 "task_001"

# 6. 任务完成
HSET task:tenant_001:task_001 status "completed" completed_at 1718700200 result "{\"status\": \"success\"}"
SREM queue:tasks:processing:tenant_001 "task_001:1718700100:worker_3"
ZREM queue:tasks:timeout:tenant_001 "task_001"
LPUSH queue:tasks:completed:tenant_001 "task_001:success:1718700200"
LTRIM queue:tasks:completed:tenant_001 0 999
```

### 9.3 缓存读写流程

```redis
# 读: Cache-Aside
GET cache:tenant:tenant_001
# 如果返回 nil，从 DB 读取，然后写入缓存
SET cache:tenant:tenant_001 "{\"id\":\"tenant_001\",...}" EX 1800

# 写: 先更新 DB，再删除缓存
DEL cache:tenant:tenant_001
# (DB 更新操作)
```

### 9.4 限流检查

```redis
# 固定窗口限流 (每秒 10 次)
INCR ratelimit:tenant_001:user_123:/api/task
EXPIRE ratelimit:tenant_001:user_123:/api/task 1
# 如果返回值 > 10，拒绝请求

# 滑动窗口限流 (60 秒内最多 100 次)
ZREMRANGEBYSCORE ratelimit:tenant_001:/api/task 0 1718700000000
ZCARD ratelimit:tenant_001:/api/task
# 如果返回值 >= 100，拒绝请求
ZADD ratelimit:tenant_001:/api/task 1718700060000 "req_xyz"
EXPIRE ratelimit:tenant_001:/api/task 60
```

---

## 10. 附录：完整 Key 规范表格

### 10.1 会话存储

| Key 格式 | 数据结构 | TTL | 说明 |
|----------|----------|-----|------|
| `session:{tenant_id}:{user_id}` | Hash | 7 天 | 用户会话详情 |
| `session:token:{token_hash}` | String | 7 天 | Token 反向索引 |
| `session:active:{tenant_id}:{user_id}` | Set | 7 天 | 用户活跃会话列表 |

### 10.2 热点缓存

| Key 格式 | 数据结构 | TTL | 说明 |
|----------|----------|-----|------|
| `cache:tenant:{tenant_id}` | String (JSON) | 30 分钟 | 租户信息 |
| `cache:user:{tenant_id}:{user_id}` | String (JSON) | 15 分钟 | 用户信息 |
| `cache:quota:{tenant_id}` | Hash | 5 分钟 | 配额信息 |
| `cache:browser_session:{tenant_id}:{session_id}` | String (JSON) | 跟随会话 | 浏览器会话元数据 |

### 10.3 任务队列

| Key 格式 | 数据结构 | TTL | 说明 |
|----------|----------|-----|------|
| `queue:tasks:waiting:{tenant_id}` | Sorted Set | 永久 | 等待执行队列 |
| `queue:tasks:processing:{tenant_id}` | Set | 永久 | 执行中任务集合 |
| `queue:tasks:completed:{tenant_id}` | List | 永久 (长度限制) | 已完成任务列表 |
| `queue:tasks:timeout:{tenant_id}` | Sorted Set | 永久 | 超时任务扫描 |
| `queue:tasks:dead:{tenant_id}` | List | 7 天 | 死信队列 |
| `task:{tenant_id}:{task_id}` | Hash | 24 小时 | 任务详情 |

### 10.4 其他存储

| Key 格式 | 数据结构 | TTL | 说明 |
|----------|----------|-----|------|
| `ratelimit:{tenant_id}:{endpoint}` | Sorted Set | 时间窗口 | API 限流 |
| `browser:instance:{instance_id}` | Hash | 1 小时 | 浏览器实例状态 |
| `metrics:{tenant_id}:{type}:{bucket}` | TimeSeries/Sorted Set | 7 天 | 监控指标 |
| `lock:{resource}:{id}` | String | 5-30 秒 | 分布式锁 |
| `pool:session:{tenant_id}` | Set | 永久 | 空闲会话池 |
| `online:tenant:{tenant_id}` | Set | 永久 | 在线用户 |
| `online:uv:{date}` | HyperLogLog | 30 天 | UV 统计 |

---

## 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-06-18 | redis-engineer | 初始版本，完整 Redis 存储结构设计 |

---
