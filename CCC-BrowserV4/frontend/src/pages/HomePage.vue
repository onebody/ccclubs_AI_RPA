<template>
  <div class="home-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>欢迎使用 CCC-Browser V4</h2>
        </div>
      </template>
      
      <div class="welcome-content">
        <el-empty description="功能开发中..." />
        
        <div class="info-section">
          <h3>当前用户信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="用户名">
              {{ authStore.username || '未登录' }}
            </el-descriptions-item>
            <el-descriptions-item label="设备ID">
              {{ deviceStore.deviceId || '未知' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/device'

const authStore = useAuthStore()
const deviceStore = useDeviceStore()
</script>

<style scoped>
.home-page {
  max-width: 800px;
  margin: 0 auto;
}

.card-header h2 {
  margin: 0;
  color: #303133;
}

.welcome-content {
  padding: 20px 0;
}

.info-section {
  margin-top: 30px;
}

.info-section h3 {
  margin-bottom: 16px;
  color: #606266;
  font-size: 16px;
}
</style>
