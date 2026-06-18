<template>
  <div class="layout-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>AI Browser</h2>
      </div>
      <el-menu :default-active="activeMenu" mode="vertical" class="sidebar-menu">
        <el-menu-item index="/dashboard">
          <el-icon><component :is="HomeFilled" /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/tenants">
          <el-icon><component :is="OfficeBuilding" /></el-icon>
          <span>租户管理</span>
        </el-menu-item>
        <el-menu-item index="/sessions">
          <el-icon><component :is="Monitor" /></el-icon>
          <span>会话管理</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <el-icon><component :is="List" /></el-icon>
          <span>任务记录</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><component :is="User" /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/audit">
          <el-icon><component :is="Document" /></el-icon>
          <span>审计日志</span>
        </el-menu-item>
        <el-menu-item index="/stats">
          <el-icon><component :is="TrendCharts" /></el-icon>
          <span>统计分析</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <main class="main-content">
      <header class="header">
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-icon><component :is="User" /></el-icon>
              <span>{{ authStore.user?.username }}</span>
              <el-icon><component :is="ArrowDown" /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <div class="content-wrapper">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  HomeFilled,
  OfficeBuilding,
  Monitor,
  List,
  User,
  Document,
  TrendCharts,
  ArrowDown,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 220px;
  background: #0f172a;
  color: white;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #334155;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f7fa;
}

.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>