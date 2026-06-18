# AI Browser API 文档

## 基础信息

- **基础 URL**: `http://localhost:3000/api`
- **认证方式**: JWT Token (Bearer)
- **Content-Type**: `application/json`

## 认证接口

### POST /auth/login

用户登录

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "accessToken": "string",
  "user": {
    "id": "string",
    "username": "string",
    "role": "string",
    "tenantId": "string"
  }
}
```

## 租户接口

### GET /tenant

获取所有租户列表

**响应**:
```json
[
  {
    "id": "string",
    "name": "string",
    "quota": "number",
    "enabled": "boolean",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### POST /tenant

创建租户

**请求体**:
```json
{
  "name": "string",
  "quota": "number (optional, default: 10)"
}
```

### GET /tenant/:id

获取单个租户信息

### PATCH /tenant/:id

更新租户信息

**请求体**:
```json
{
  "name": "string (optional)",
  "quota": "number (optional)",
  "enabled": "boolean (optional)"
}
```

### DELETE /tenant/:id

删除租户

## 会话接口

### POST /session/create

创建浏览器会话

**请求体**:
```json
{
  "memoryLimit": "string (optional, e.g., '512m')",
  "cpuLimit": "string (optional, e.g., '0.5')",
  "maxLifetime": "number (optional, default: 3600)"
}
```

**响应**:
```json
{
  "sessionId": "string",
  "cdpPort": "number",
  "proxyUrl": "string"
}
```

### GET /session

获取会话列表

### GET /session/:sessionId

获取单个会话信息

### POST /session/:sessionId/close

关闭会话

### POST /session/:sessionId/execute

执行操作步骤

**请求体**:
```json
{
  "step": {
    "type": "string (NAVIGATE|CLICK|TYPE|EXTRACT|SCREENSHOT)",
    "url": "string (optional)",
    "selector": "string (optional)",
    "value": "string (optional)"
  }
}
```

## 任务接口

### POST /task

创建任务

**请求体**:
```json
{
  "type": "string (NAVIGATE|CLICK|TYPE|EXTRACT|AI_PARSE)",
  "input": "string",
  "sessionId": "string"
}
```

### GET /task

获取任务列表

### GET /task/:id

获取单个任务信息

## 脚本接口

### POST /script/parse

AI 解析页面任务

**请求体**:
```json
{
  "sessionId": "string",
  "task": "string"
}
```

**响应**:
```json
{
  "steps": [
    {
      "type": "string",
      "url": "string",
      "selector": "string",
      "value": "string"
    }
  ]
}
```

### POST /script/run

运行脚本

**请求体**:
```json
{
  "sessionId": "string",
  "script": "string"
}
```

## AI 接口

### POST /ai/parse

AI 解析任务

### POST /ai/ocr

OCR 图片识别

**请求体**:
```json
{
  "image": "base64 string"
}
```

**响应**:
```json
{
  "text": "string"
}
```

### POST /ai/extract

结构化数据抽取

## 统计接口

### GET /stats/overview

获取统计概览

**响应**:
```json
{
  "totalTenants": "number",
  "activeSessions": "number",
  "todayTasks": "number",
  "totalStorage": "number"
}
```

### GET /stats/sessions

会话统计

### GET /stats/tasks

任务统计

## 审计接口

### GET /audit

获取审计日志

## 配置接口

### GET /config

获取系统配置

### PUT /config

更新系统配置

**请求体**:
```json
{
  "sessionLimit": "number",
  "defaultQuota": "number"
}
```

## 错误响应格式

```json
{
  "statusCode": "number",
  "message": "string",
  "error": "string"
}
```

## 权限说明

| 角色 | 权限 |
|------|------|
| super_admin | 所有接口 |
| tenant_admin | 租户下所有资源管理 |
| operator | 创建会话、执行任务 |
| readonly | 只读访问 |