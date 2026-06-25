<template>
  <div class="monitor-dashboard">
    <h1>全局监控看板</h1>

    <!-- 调度器状态概览 -->
    <div class="overview-cards">
      <el-card>
        <template #header>调度器状态</template>
        <el-tag :type="schedulerStatus === 'running' ? 'success' : 'info'">
          {{ schedulerStatus }}
        </el-tag>
      </el-card>
      <el-card>
        <template #header>队列中</template>
        <span class="count">{{ queuedCount }}</span>
      </el-card>
      <el-card>
        <template #header>运行中</template>
        <span class="count">{{ runningCount }}</span>
      </el-card>
      <el-card>
        <template #header>已完成</template>
        <span class="count">{{ completedCount }}</span>
      </el-card>
      <el-card>
        <template #header>WebSocket连接</template>
        <span class="count">{{ wsConnected ? '已连接' : '未连接' }}</span>
      </el-card>
    </div>

    <!-- 运行中任务列表 -->
    <el-card class="running-tasks">
      <template #header>运行中的任务</template>
      <el-table :data="runningTasks" border size="small">
        <el-table-column prop="id" label="实例ID" width="200" />
        <el-table-column prop="task_id" label="任务ID" width="200" />
        <el-table-column prop="session_id" label="会话ID" width="200" />
        <el-table-column prop="priority" label="优先级" width="100" />
        <el-table-column prop="started_at" label="开始时间" />
      </el-table>
    </el-card>

    <!-- 实时日志流 -->
    <el-card class="log-stream">
      <template #header>
        <div class="log-header">
          <span>实时日志</span>
          <el-button size="small" @click="clearLogs">清空</el-button>
        </div>
      </template>
      <div class="log-container" ref="logContainer">
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-entry"
          :class="log.level || 'info'"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-type">[{{ log.type }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-empty">等待日志...</div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { scheduleApi } from '@/api/tauri-api';

/** 调度器状态 */
const schedulerStatus = ref('idle');
const queuedCount = ref(0);
const runningCount = ref(0);
const completedCount = ref(0);
const runningTasks = ref<any[]>([]);
const wsConnected = ref(false);

/** 日志数据 */
const logs = ref<any[]>([]);
const maxLogs = 500;
const logContainer = ref<HTMLElement | null>(null);

/** WebSocket 连接 */
let ws: WebSocket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** 连接 WebSocket */
function connectWebSocket(): void {
  try {
    ws = new WebSocket('ws://127.0.0.1:8900/ws/logs');

    ws.onopen = () => {
      wsConnected.value = true;
      addLog({ type: 'system', level: 'info', message: 'WebSocket 已连接' });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'history') {
          logs.value = data.data || [];
        } else {
          addLog(data);
        }
      } catch {
        // 忽略非 JSON 消息
      }
    };

    ws.onclose = () => {
      wsConnected.value = false;
      addLog({ type: 'system', level: 'warn', message: 'WebSocket 已断开，3秒后重连...' });
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      wsConnected.value = false;
    };
  } catch {
    wsConnected.value = false;
  }
}

/** 添加日志并自动滚动 */
function addLog(log: any): void {
  logs.value.push(log);
  if (logs.value.length > maxLogs) {
    logs.value = logs.value.slice(-maxLogs);
  }
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
}

/** 清空日志 */
function clearLogs(): void {
  logs.value = [];
}

/** 格式化时间 */
function formatTime(ts: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString('zh-CN');
  } catch {
    return ts;
  }
}

/** 轮询调度器状态 */
async function pollSchedulerStatus(): Promise<void> {
  try {
    const result = await scheduleApi.getStatus() as any;
    if (result) {
      schedulerStatus.value = result.status || 'idle';
      queuedCount.value = result.queued || 0;
      runningCount.value = result.running || 0;
      completedCount.value = result.completed || 0;
      runningTasks.value = result.running_tasks || [];
    }
  } catch {
    // 后端未就绪
  }
}

onMounted(() => {
  connectWebSocket();
  pollTimer = setInterval(pollSchedulerStatus, 3000);
});

onUnmounted(() => {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<style scoped>
.monitor-dashboard {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}
.overview-cards {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}
.overview-cards .el-card {
  flex: 1;
  text-align: center;
}
.count {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}
.running-tasks {
  margin-top: 16px;
}
.log-stream {
  margin-top: 16px;
}
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.log-container {
  height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}
.log-entry {
  padding: 2px 0;
  color: #d4d4d4;
}
.log-entry.error { color: #f44747; }
.log-entry.warn { color: #cca700; }
.log-entry.info { color: #d4d4d4; }
.log-time { color: #858585; margin-right: 8px; }
.log-type { color: #569cd6; margin-right: 8px; }
.log-empty { color: #858585; text-align: center; padding: 20px; }
</style>
