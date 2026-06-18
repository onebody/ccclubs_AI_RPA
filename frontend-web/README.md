# AI RPA 浏览器系统 - 前端

基于 Vite + React + TypeScript + Tailwind CSS 构建的前端项目。

## 技术栈

- **构建工具**: Vite
- **UI 框架**: React 18+
- **类型检查**: TypeScript
- **样式框架**: Tailwind CSS
- **路由**: React Router v6
- **状态管理**: Zustand
- **HTTP 客户端**: Axios

## 项目结构

```
frontend-web/
├── src/
│   ├── App.tsx              # 根组件
│   ├── main.tsx             # 入口文件
│   ├── routes/              # 路由配置
│   ├── pages/               # 页面组件
│   │   ├── Home/           # 首页
│   │   ├── Login/          # 登录页
│   │   └── Dashboard/      # 控制台页
│   ├── components/          # 共享组件
│   ├── stores/              # Zustand 状态管理
│   ├── api/                 # API 调用层
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型定义
│   └── styles/              # 全局样式
├── public/                  # 静态资源
├── index.html               # HTML 模板
├── package.json             # 依赖配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── tailwind.config.js       # Tailwind 配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 环境变量

- `.env.development` - 开发环境变量
- `.env.production` - 生产环境变量

主要变量：
- `VITE_API_BASE_URL` - API 基础 URL
- `VITE_APP_TITLE` - 应用标题
- `VITE_APP_ENV` - 应用环境

## 代码规范

项目使用 ESLint 和 Prettier 进行代码规范检查。

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 路由说明

- `/` - 首页
- `/login` - 登录页
- `/dashboard` - 控制台（需要认证）

## 状态管理

- `authStore` - 认证状态（用户登录信息、Token）
- `appStore` - 应用状态（主题、加载状态等）

## API 层

Axios 实例已配置请求/响应拦截器，自动处理：
- 请求时添加 Token
- 响应时统一错误处理
- 401 状态码自动跳转登录页
