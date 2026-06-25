<template>
  <div class="dashboard">
    <h1>RPA 自动化浏览器 - 控制台</h1>
    <div class="status-cards">
      <el-card class="status-card">
        <template #header>后端状态</template>
        <el-tag :type="backendHealthy ? 'success' : 'danger'">
          {{ backendHealthy ? '已连接' : '未连接' }}
        </el-tag>
      </el-card>
      <el-card class="status-card">
        <template #header>活跃会话</template>
        <span class="count">{{ activeSessions }}</span>
      </el-card>
      <el-card class="status-card">
        <template #header>运行中任务</template>
        <span class="count">{{ runningTasks }}</span>
      </el-card>
    </div>
    <div class="quick-actions">
      <h2>快捷操作</h2>
      <el-button type="primary" @click="$router.push('/login')">录制登录流程</el-button>
      <el-button type="success" @click="$router.push('/tasks')">管理任务</el-button>
      <el-button type="warning" @click="$router.push('/flow')">流程编排</el-button>
      <el-button type="info" @click="$router.push('/monitor')">监控看板</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { systemApi } from '@/api/tauri-api';

/** 后端健康状态 */
const backendHealthy = ref(false);
/** 活跃会话数 */
const activeSessions = ref(0);
/** 运行中任务数 */
const runningTasks = ref(0);

/** 检查后端健康状态 */
async function checkHealth(): Promise<void> {
  try {
    const result = await systemApi.health() as any;
    backendHealthy.value = result?.status === 'ok';
  } catch {
    backendHealthy.value = false;
  }
}

onMounted(() => {
  checkHealth();
});
</script>

<style scoped>
.dashboard {
  padding: 24px;
}
.status-cards {
  display: flex;
  gap: 16px;
  margin: 24px 0;
}
.status-card {
  flex: 1;
  text-align: center;
}
.count {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
}
.quick-actions {
  margin-top: 24px;
}
</style>
