<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>仪表盘</h2>
      <span class="date">{{ currentDate }}</span>
    </div>

    <div class="stats-grid">
      <el-card class="stat-card">
        <div class="stat-icon tenants">
          <el-icon><component :is="OfficeBuilding" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalTenants }}</div>
          <div class="stat-label">租户数量</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon sessions">
          <el-icon><component :is="Monitor" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.activeSessions }}</div>
          <div class="stat-label">活跃会话</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon tasks">
          <el-icon><component :is="List" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.todayTasks }}</div>
          <div class="stat-label">今日任务</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon storage">
          <el-icon><component :is="HardDrive" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ formatStorage(stats.totalStorage) }}</div>
          <div class="stat-label">存储使用</div>
        </div>
      </el-card>
    </div>

    <div class="charts-row">
      <el-card class="chart-card">
        <template #header>
          <span>会话趋势</span>
        </template>
        <div ref="sessionChartRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span>任务成功率</span>
        </template>
        <div ref="taskChartRef" class="chart"></div>
      </el-card>
    </div>

    <div class="activity-section">
      <el-card>
        <template #header>
          <span>最近活动</span>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="(activity, index) in recentActivities"
            :key="index"
            :timestamp="activity.time"
            placement="top"
          >
            <el-card size="small">
              <div class="activity-content">
                <span class="activity-type" :class="activity.type">{{ activity.type }}</span>
                <span class="activity-desc">{{ activity.description }}</span>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as echarts from 'echarts'
import { OfficeBuilding, Monitor, List, HardDrive } from '@element-plus/icons-vue'

const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
})

const stats = ref({
  totalTenants: 12,
  activeSessions: 28,
  todayTasks: 156,
  totalStorage: 8563210240,
})

const recentActivities = ref([
  { time: '10:30', type: 'SESSION_CREATE', description: '租户 default 创建了新会话' },
  { time: '10:25', type: 'TASK_COMPLETE', description: '任务执行完成，耗时 2.3s' },
  { time: '10:20', type: 'SESSION_DESTROY', description: '会话超时自动销毁' },
  { time: '10:15', type: 'USER_LOGIN', description: '用户 tenantadmin 登录系统' },
  { time: '10:10', type: 'TASK_CREATE', description: '创建 AI 解析任务' },
])

const sessionChartRef = ref()
const taskChartRef = ref()

function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(bytes / 1024).toFixed(2)} KB`
}

function initCharts() {
  if (sessionChartRef.value) {
    const sessionChart = echarts.init(sessionChartRef.value)
    sessionChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] },
      yAxis: { type: 'value' },
      series: [
        {
          name: '会话数',
          type: 'line',
          data: [12, 18, 25, 32, 28, 24],
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 3 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
          ]) },
        },
      ],
    })
  }

  if (taskChartRef.value) {
    const taskChart = echarts.init(taskChartRef.value)
    taskChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          name: '任务状态',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: 85, name: '成功', itemStyle: { color: '#22c55e' } },
            { value: 12, name: '失败', itemStyle: { color: '#ef4444' } },
            { value: 3, name: '运行中', itemStyle: { color: '#f59e0b' } },
          ],
        },
      ],
    })
  }
}

onMounted(() => {
  initCharts()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.date {
  color: #64748b;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.tenants {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: white;
}

.stat-icon.sessions {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  color: white;
}

.stat-icon.tasks {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: white;
}

.stat-icon.storage {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  color: white;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.chart-card {
  height: 300px;
}

.chart {
  height: calc(100% - 48px);
}

.activity-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-type {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.activity-type.SESSION_CREATE {
  background: #dbeafe;
  color: #2563eb;
}

.activity-type.TASK_COMPLETE {
  background: #dcfce7;
  color: #16a34a;
}

.activity-type.SESSION_DESTROY {
  background: #fee2e2;
  color: #dc2626;
}

.activity-type.USER_LOGIN {
  background: #fef3c7;
  color: #d97706;
}

.activity-type.TASK_CREATE {
  background: #e9d5ff;
  color: #7c3aed;
}

.activity-desc {
  font-size: 13px;
  color: #475569;
}
</style>