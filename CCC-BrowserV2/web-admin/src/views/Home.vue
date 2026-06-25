<template>
  <div class="home-container">
    <el-container>
      <el-aside width="220px" class="sidebar">
        <div class="logo">
          <i class="el-icon-s-tools"></i>
          <span>RPA自动化系统</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          mode="vertical"
          background-color="#1f2937"
          text-color="#e5e7eb"
          active-text-color="#60a5fa"
          router
        >
          <el-menu-item index="/">
            <i class="el-icon-s-home"></i>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/tenants">
            <i class="el-icon-user"></i>
            <span>租户管理</span>
          </el-menu-item>
          <el-menu-item index="/processes">
            <i class="el-icon-s-data"></i>
            <span>流程模板</span>
          </el-menu-item>
          <el-menu-item index="/api-sources">
            <i class="el-icon-s-connection"></i>
            <span>API数据源</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <i class="el-icon-s-todo"></i>
            <span>任务调度</span>
          </el-menu-item>
          <el-menu-item index="/monitor">
            <i class="el-icon-s-view"></i>
            <span>任务监控</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <span class="title">{{ currentPageTitle }}</span>
          </div>
          <div class="header-right">
            <el-button type="text" @click="handleLogout">退出登录</el-button>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = ref('/')

const pageTitles: Record<string, string> = {
  '/': '系统首页',
  '/tenants': '租户管理',
  '/processes': '流程模板',
  '/api-sources': 'API数据源',
  '/tasks': '任务调度',
  '/monitor': '任务监控'
}

const currentPageTitle = computed(() => {
  return pageTitles[route.path] || 'RPA自动化系统'
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  window.location.href = '/login'
}
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100%;
}

.sidebar {
  background-color: #1f2937;
  display: flex;
  flex-direction: column;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: #60a5fa;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #374151;
}

.logo i {
  font-size: 24px;
  margin-right: 8px;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.main-content {
  background-color: #f3f4f6;
  padding: 20px;
}
</style>