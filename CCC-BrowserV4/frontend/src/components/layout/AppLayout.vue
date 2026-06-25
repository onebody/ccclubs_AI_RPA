<template>
  <el-container class="app-layout">
    <!-- 左侧菜单栏 -->
    <el-aside width="200px">
      <SideMenu />
    </el-aside>
    
    <!-- 右侧内容区 -->
    <el-container direction="vertical">
      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
      
      <!-- 底部状态栏 -->
      <el-footer height="32px">
        <StatusBar />
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import SideMenu from './SideMenu.vue'
import StatusBar from './StatusBar.vue'
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.el-aside {
  background-color: #304156;
}

.main-content {
  padding: 20px;
  background-color: #f0f2f5;
  overflow-y: auto;
}

.el-footer {
  padding: 0;
}
</style>
