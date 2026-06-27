## 1. 核心样式系统
- **UI 框架**：采用 `Element Plus` (v2.9.0) 作为核心组件库，提供基础的 UI 交互元素（如 `el-card`, `el-button`, `el-menu`, `el-alert` 等）。
- **CSS 方案**：使用 Vue 3 的 `<style scoped>` 进行局部样式隔离，配合全局 CSS (`main.css`) 处理基础重置和滚动条美化。
- **图标库**：集成 `@element-plus/icons-vue`，通过动态组件 `<component :is="item.icon" />` 实现菜单图标的灵活配置。

## 2. 视觉风格与设计规范
- **配色方案**：
  - **主色调**：沿用 Element Plus 默认的主题色（蓝色系，如 `#409EFF`）。
  - **侧边栏**：采用深色主题背景 `#304156`，文字颜色为 `#bfcbd9`，激活项高亮为 `#409EFF`，营造出专业的管理后台氛围。
  - **内容区**：背景色为浅灰 `#f0f2f5`，与白色卡片形成对比，突出核心内容。
  - **登录页**：使用蓝紫渐变背景 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`，增强视觉吸引力。
- **布局结构**：
  - 采用经典的 **Admin 布局**：左侧固定宽度侧边栏 (`el-aside`, 200px)，右侧垂直分布主内容区 (`el-main`) 和底部状态栏 (`el-footer`, 32px)。
  - 全局字体栈优先使用系统原生字体（`-apple-system`, `BlinkMacSystemFont` 等），确保跨平台一致性。

## 3. 关键文件与约定
- **全局样式**：`CCC-BrowserV4/frontend/src/assets/styles/main.css` 定义了全局重置、字体以及自定义的 Webkit 滚动条样式（圆角、悬停变色）。
- **布局组件**：`AppLayout.vue` 封装了整体框架，`SideMenu.vue` 负责导航逻辑与深色样式，`StatusBar.vue` 处理底部信息展示。
- **开发约束**：
  - 避免在组件中硬编码大面积的颜色值，应优先使用 Element Plus 提供的 Props（如 `type="primary"`）或 CSS 变量。
  - 滚动条样式已通过全局 CSS 统一美化，无需在各组件中重复定义。
  - 响应式策略主要依赖 Element Plus 组件自身的弹性布局能力，目前未引入复杂的媒体查询断点系统。