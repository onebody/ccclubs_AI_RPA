# 前端认证模块文档

## 概述

本文档描述 AI RPA 浏览器系统的前端认证模块实现，包括登录、注册、路由守卫和状态管理。

## 文件结构

```
frontend-web/src/
├── api/
│   └── auth.ts              # 认证 API 封装
├── stores/
│   └── authStore.ts         # Zustand 认证状态管理
├── pages/
│   ├── Login/
│   │   └── index.tsx       # 登录页面
│   └── Register/
│       └── index.tsx        # 注册页面
├── components/
│   └── PrivateRoute.tsx     # 路由守卫组件
└── App.tsx                  # 路由配置
```

## 技术栈

- **状态管理**: Zustand (with persist middleware)
- **表单验证**: react-hook-form + zod
- **HTTP 客户端**: Axios (已配置拦截器)
- **路由**: React Router v6
- **样式**: Tailwind CSS

## 使用说明

### 1. 登录流程

```typescript
// 在组件中使用
import { useAuthStore } from '../stores/authStore'

const login = useAuthStore((state) => state.login)

// 调用登录
await login('tenant_001', 'admin', 'password123')
// 登录成功后会自动：
// 1. 存储 Token 到 localStorage
// 2. 更新 authStore 状态
// 3. 跳转到 Dashboard 或之前访问的页面
```

### 2. 注册流程

```typescript
// 注册页面自动处理表单验证
// 密码强度要求：
// - 至少 8 位
// - 包含大写字母
// - 包含小写字母
// - 包含数字

// 注册成功后提示用户登录
```

### 3. 检查认证状态

```typescript
import { useAuthStore } from '../stores/authStore'

// 获取认证状态
const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
const user = useAuthStore((state) => state.user)
const token = useAuthStore((state) => state.token)

// 检查 Token 是否有效（调用后端接口）
const checkAuth = useAuthStore((state) => state.checkAuth)
const isValid = await checkAuth()
```

### 4. 路由守卫

```typescript
// PrivateRoute 组件自动处理：
// - 未登录用户访问 /dashboard 自动跳转 /login
// - Token 过期自动跳转到登录页
// - 登录后跳转回原页面（使用 redirect 参数）

// 使用示例（已在 App.tsx 配置）：
<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
/>
```

### 5. API 请求拦截器

在 `src/api/index.ts` 中已配置：

- **请求拦截器**: 自动在 Header 中添加 `Authorization: Bearer <token>`
- **响应拦截器**: 统一处理 401 错误，清除 Token 并跳转登录页

## 表单验证规则

### 登录表单

| 字段 | 验证规则 |
|------|----------|
| tenant_id | 必填 |
| username | 必填 |
| password | 必填 |
| remember_me | 可选（布尔值） |

### 注册表单

| 字段 | 验证规则 |
|------|----------|
| tenant_id | 必填 |
| username | 3-20 位字符 |
| email | 有效邮箱格式 |
| password | 至少 8 位，含大小写字母和数字 |
| confirm_password | 必须与 password 一致 |

## Token 管理

- **存储位置**: localStorage (通过 Zustand persist)
- **存储键**: `auth-storage`
- **存储内容**:
  ```json
  {
    "isAuthenticated": true,
    "user": { "id": "...", "username": "...", "email": "...", "role": "..." },
    "token": "eyJ..."
  }
  ```

## API 接口

### POST /api/auth/login

**请求体**:
```json
{
  "tenant_id": "string",
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "admin | user | guest",
    "tenant_id": "string"
  }
}
```

### POST /api/auth/register

**请求体**:
```json
{
  "tenant_id": "string",
  "username": "string",
  "email": "string",
  "password": "string",
  "confirm_password": "string"
}
```

### POST /api/auth/logout

登出接口（清除服务端 Session）

### GET /api/auth/profile

获取当前用户信息（用于 Token 验证）

## 开发指南

### 启动开发服务器

```bash
cd frontend-web
npm install
npm run dev
```

访问 `http://localhost:3000`

### Mock 登录（后端未就绪时）

在 `authStore.ts` 中，登录方法暂时使用模拟数据：

```typescript
login: async (tenantId, username, password) => {
  // TODO: 替换为实际的 API 调用
  const response = await authApi.login({ tenant_id: tenantId, username, password })
  // ...
}
```

### 对接真实后端

1. 确保后端服务运行在 `localhost:8080`
2. 检查 `vite.config.ts` 中的代理配置
3. 更新 `authStore.ts` 中的登录逻辑（已对接 `authApi.login`）

## 注意事项

1. **Token 过期处理**: 响应拦截器会自动处理 401 错误
2. **多租户**: 登录时需要提供 `tenant_id`
3. **密码安全**: 注册时密码需满足强度要求
4. **持久化**: 刷新页面后认证状态会保留（localStorage）

## 测试账号

（待后端实现后添加）

## 相关文件

- 认证 API: `src/api/auth.ts`
- 状态管理: `src/stores/authStore.ts`
- 登录页面: `src/pages/Login/index.tsx`
- 注册页面: `src/pages/Register/index.tsx`
- 路由守卫: `src/components/PrivateRoute.tsx`
