<template>
  <aside class="sidebar">
    <div class="logo">
      <h1>RPA系统</h1>
    </div>
    <el-menu :default-active="activeMenu" class="sidebar-menu" router>
      <el-menu-item index="/">
        <el-icon><component :is="HomeFilled" /></el-icon>
        <span>仪表盘</span>
      </el-menu-item>
      <el-menu-item index="/process-templates">
        <el-icon><component :is="Document" /></el-icon>
        <span>流程模板</span>
      </el-menu-item>
      <el-menu-item index="/tasks">
        <el-icon><component :is="List" /></el-icon>
        <span>任务管理</span>
      </el-menu-item>
      <el-menu-item index="/config">
        <el-icon><component :is="Setting" /></el-icon>
        <span>系统配置</span>
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { HomeFilled, Document, List, Setting } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const activeMenu = computed(() => router.currentRoute.value.path);
</script>

<style scoped>
.sidebar {
  width: 200px;
  height: 100vh;
  background: #25262b;
  color: white;
  position: fixed;
  left: 0;
  top: 0;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #333;
}

.logo h1 {
  font-size: 18px;
  margin: 0;
  color: #667eea;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu :deep(.el-menu-item) {
  color: #a0a0a0;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.05);
}
</style>