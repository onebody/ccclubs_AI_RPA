<template>
  <div class="status-bar">
    <div class="status-left">
      <span v-if="deviceStore.deviceId" class="device-info">
        <el-icon><Monitor /></el-icon>
        设备: {{ deviceStore.deviceId.slice(0, 8) }}...
      </span>
    </div>
    
    <div class="status-center">
      <span v-if="authStore.isLoggedIn" class="user-info">
        <el-icon><User /></el-icon>
        {{ authStore.username }}
      </span>
      <span v-else class="not-logged-in">未登录</span>
    </div>
    
    <div class="status-right">
      <span class="version">v1.0.0</span>
      <el-tag size="small" type="success" class="connection-status">已连接</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/device'

const authStore = useAuthStore()
const deviceStore = useDeviceStore()
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  font-size: 12px;
  color: #606266;
}

.status-left,
.status-center,
.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-info,
.user-info,
.not-logged-in {
  display: flex;
  align-items: center;
  gap: 4px;
}

.version {
  color: #909399;
}

.connection-status {
  font-size: 12px;
}
</style>
