<template>
  <div class="monitor">
    <div class="page-header">
      <h3>任务监控大盘</h3>
    </div>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon success">
            <i class="el-icon-circle-check"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.successCount }}</div>
            <div class="stat-label">成功任务</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon danger">
            <i class="el-icon-circle-close"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.failedCount }}</div>
            <div class="stat-label">失败任务</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon warning">
            <i class="el-icon-loading"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.runningCount }}</div>
            <div class="stat-label">运行中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon info">
            <i class="el-icon-time"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pendingCount }}</div>
            <div class="stat-label">排队中</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>任务状态分布</span>
          </template>
          <div class="chart-container">
            <el-progress type="circle" :percentage="stats.successRate" :size="120" status="success">
              <template #default>成功率</template>
            </el-progress>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>实时任务日志</span>
          </template>
          <div class="log-container">
            <div v-for="log in logs" :key="log.id" class="log-item">
              <span class="log-time">{{ log.time }}</span>
              <span :class="['log-level', log.level]">[{{ log.level }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const stats = ref({
  successCount: 128,
  failedCount: 5,
  runningCount: 3,
  pendingCount: 12,
  successRate: 96
})

const logs = ref([
  { id: 1, time: '14:30:25', level: 'INFO', message: '任务 TASK-001 执行成功' },
  { id: 2, time: '14:30:18', level: 'INFO', message: '任务 TASK-002 开始执行' },
  { id: 3, time: '14:30:15', level: 'WARN', message: '任务 TASK-003 重试第1次' },
  { id: 4, time: '14:30:10', level: 'ERROR', message: '任务 TASK-004 执行失败: 网络超时' },
  { id: 5, time: '14:30:05', level: 'INFO', message: '沙箱会话创建成功' }
])
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.page-header h3 {
  font-size: 18px;
  color: #1f2937;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-right: 16px;
}

.stat-icon.success {
  background-color: #d1fae5;
  color: #059669;
}

.stat-icon.danger {
  background-color: #fee2e2;
  color: #dc2626;
}

.stat-icon.warning {
  background-color: #fef3c7;
  color: #d97706;
}

.stat-icon.info {
  background-color: #dbeafe;
  color: #2563eb;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.chart-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  font-size: 13px;
  line-height: 24px;
}

.log-time {
  color: #9ca3af;
  margin-right: 8px;
}

.log-level {
  font-weight: bold;
  margin-right: 8px;
  width: 50px;
}

.log-level.INFO {
  color: #2563eb;
}

.log-level.WARN {
  color: #d97706;
}

.log-level.ERROR {
  color: #dc2626;
}

.log-message {
  flex: 1;
  color: #374151;
}
</style>