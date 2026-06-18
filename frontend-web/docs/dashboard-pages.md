# 前端控制台页面文档

## 概述

本文档描述 AI RPA 浏览器系统的前端控制台页面实现，包括布局、仪表盘、比赛管理、选手管理、公告管理等页面。

## 文件结构

```
frontend-web/src/
├── layouts/
│   └── DashboardLayout/
│       └── index.tsx       # 控制台布局（侧边栏 + 顶部栏 + 主内容区）
├── pages/
│   ├── Dashboard/
│   │   └── index.tsx       # 仪表盘首页
│   ├── Competitions/
│   │   └── index.tsx       # 比赛管理页面
│   ├── Participants/
│   │   └── index.tsx       # 选手管理页面
│   ├── Announcements/
│   │   └── index.tsx       # 公告管理页面
│   ├── Settings/
│   │   └── index.tsx       # 系统设置页面
│   └── Login/
│       └── index.tsx       # 登录页面（T008 已实现）
├── api/
│   ├── competition.ts        # 比赛管理 API
│   ├── participant.ts        # 选手管理 API
│   └── announcement.ts      # 公告管理 API
├── components/
│   └── PrivateRoute.tsx     # 路由守卫（T008 已实现）
└── App.tsx                  # 路由配置
```

## 页面说明

### 1. DashboardLayout（控制台布局）

**文件路径**: `src/layouts/DashboardLayout/index.tsx`

**功能**:
- 侧边栏导航（根据角色动态显示菜单）
- 顶部导航栏（显示租户信息、用户头像、退出按钮）
- 主内容区（使用 React Router Outlet 渲染子路由）
- 响应式设计（侧边栏可收起）

**菜单项**:
| 菜单 | 路径 | 权限 |
|------|------|------|
| 仪表盘 | `/dashboard` | 所有角色 |
| 比赛管理 | `/competitions` | admin, user |
| 选手管理 | `/participants` | admin, user |
| 公告管理 | `/announcements` | admin |
| 系统设置 | `/settings` | admin |

### 2. Dashboard（仪表盘首页）

**文件路径**: `src/pages/Dashboard/index.tsx`

**功能**:
- 欢迎信息（显示用户名）
- 统计卡片（比赛数、选手数、报名数、签到率）
- 快捷操作按钮（创建比赛、发布公告、管理选手）
- 最近比赛列表（表格展示）

**Mock 数据**: 当前使用 Mock 数据，后端完成后需对接真实 API

### 3. Competitions（比赛管理）

**文件路径**: `src/pages/Competitions/index.tsx`

**功能**:
- 比赛列表（表格展示）
- 搜索/筛选（按名称、状态筛选）
- 创建比赛（弹窗表单）
- 编辑/删除操作
- 状态标签（草稿、即将开始、进行中、已结束、已取消）

**表单字段**:
| 字段 | 类型 | 验证规则 |
|------|------|----------|
| name | string | 必填 |
| description | string | 可选 |
| startDate | date | 必填 |
| endDate | date | 必填 |
| location | string | 可选 |
| category | select | 可选（体育/学术/艺术） |
| maxParticipants | number | 可选 |
| registrationDeadline | date | 可选 |

### 4. Participants（选手管理）

**文件路径**: `src/pages/Participants/index.tsx`

**功能**:
- 选手列表（表格展示）
- 搜索/筛选（按姓名、编号、状态筛选）
- 报名审核操作（通过/拒绝）
- 导入/导出功能（待后端实现）

**状态**:
| 状态 | 标签 | 颜色 |
|------|------|------|
| pending | 待审核 | 黄色 |
| approved | 已通过 | 绿色 |
| rejected | 已拒绝 | 红色 |

### 5. Announcements（公告管理）

**文件路径**: `src/pages/Announcements/index.tsx`

**功能**:
- 公告列表（卡片展示）
- 创建公告（弹窗表单）
- 发布/撤回操作
- 删除公告

**状态**:
| 状态 | 标签 | 颜色 |
|------|------|------|
| draft | 草稿 | 灰色 |
| published | 已发布 | 绿色 |
| withdrawn | 已撤回 | 黄色 |

### 6. Settings（系统设置）

**文件路径**: `src/pages/Settings/index.tsx`

**功能**:
- 用户信息展示（用户名、邮箱、角色、租户 ID）
- 认证信息展示（Token 状态）
- 操作按钮（清除本地数据并退出）

## API 接口

### competitionApi

```typescript
competitionApi.list(params)           // 获取比赛列表
competitionApi.detail(id)             // 获取比赛详情
competitionApi.create(data)           // 创建比赛
competitionApi.update(id, data)       // 更新比赛
competitionApi.delete(id)             // 删除比赛
competitionApi.updateStatus(id, status) // 更新比赛状态
```

### participantApi

```typescript
participantApi.list(params)           // 获取选手列表
participantApi.detail(id)             // 获取选手详情
participantApi.create(data)           // 创建选手
participantApi.update(id, data)       // 更新选手
participantApi.delete(id)             // 删除选手
participantApi.review(id, status)     // 审核选手
participantApi.import(file, compId)   // 导入选手
participantApi.export(compId)         // 导出选手
```

### announcementApi

```typescript
announcementApi.list(params)          // 获取公告列表
announcementApi.detail(id)            // 获取公告详情
announcementApi.create(data)          // 创建公告
announcementApi.update(id, data)      // 更新公告
announcementApi.delete(id)            // 删除公告
announcementApi.publish(id)           // 发布公告
announcementApi.withdraw(id)          // 撤回公告
```

## 路由配置

```typescript
// 公开路由
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

// 需要认证的路由
<Route element={<PrivateRoute />}>
  <Route element={<DashboardLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/competitions" element={<Competitions />} />
    <Route path="/participants" element={<Participants />} />
    <Route path="/announcements" element={<Announcements />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
</Route>
```

## 如何启动前端并查看控制台页面

### 1. 安装依赖

```bash
cd frontend-web
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

### 3. 登录后进入控制台

- 访问 `/login` 页面
- 输入租户 ID、用户名、密码
- 登录成功后自动跳转到 `/dashboard`

### 4. 测试各页面

- **仪表盘**: `/dashboard` - 查看统计和最近比赛
- **比赛管理**: `/competitions` - 创建、编辑、删除比赛
- **选手管理**: `/participants` - 审核、导入、导出选手
- **公告管理**: `/announcements` - 创建、发布、撤回公告
- **系统设置**: `/settings` - 查看用户信息

## 注意事项

1. **Mock 数据**: 当前所有页面使用 Mock 数据，后端完成后需对接真实 API
2. **权限控制**: 侧边栏菜单根据角色动态显示，需要在后端返回正确的角色信息
3. **多租户**: 所有 API 请求会自动携带 `tenant_id`（从 Token 中解析）
4. **表单验证**: 使用 `react-hook-form` + `zod` 进行类型安全的表单验证

## 待完成功能

1. **后端对接**: 等待 T005（身份认证与权限模块）完成后，对接真实 API
2. **富文本编辑器**: 公告内容当前是 textarea，可升级为富文本编辑器
3. **文件导入/导出**: 选手导入/导出功能待后端实现
4. **分页**: 列表页面当前没有分页，数据量大时需要添加分页功能
5. **Ant Design**: 可考虑使用 Ant Design 组件库替换自定义表格（当前使用 Tailwind CSS）

## 相关文件

- 布局组件: `src/layouts/DashboardLayout/index.tsx`
- 仪表盘: `src/pages/Dashboard/index.tsx`
- 比赛管理: `src/pages/Competitions/index.tsx`
- 选手管理: `src/pages/Participants/index.tsx`
- 公告管理: `src/pages/Announcements/index.tsx`
- 系统设置: `src/pages/Settings/index.tsx`
- 比赛 API: `src/api/competition.ts`
- 选手 API: `src/api/participant.ts`
- 公告 API: `src/api/announcement.ts`
- 路由配置: `src/App.tsx`
