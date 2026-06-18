<template>
  <div class="tasks-page">
    <div class="page-header">
      <h2>任务记录</h2>
    </div>

    <el-card>
      <el-table :data="tasks" border style="width: 100%">
        <el-table-column prop="id" label="任务ID" width="80" />
        <el-table-column prop="type" label="任务类型" width="120">
          <template #default="scope">
            <el-tag>{{ getTypeText(scope.row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sessionId" label="会话ID" width="150" />
        <el-table-column prop="input" label="输入" width="250" show-overflow-tooltip />
        <el-table-column prop="output" label="输出" width="300" show-overflow-tooltip />
        <el-table-column prop="duration" label="耗时(ms)" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

interface Task {
  id: string
  type: string
  status: string
  sessionId: string
  input: string
  output: string
  duration: number
  createdAt: string
}

const tasks = ref<Task[]>([])

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getTypeText(type: string): string {
  switch (type) {
    case 'AI_PARSE':
      return 'AI解析'
    case 'NAVIGATE':
      return '导航'
    case 'CLICK':
      return '点击'
    case 'EXTRACT':
      return '数据抽取'
    default:
      return type
  }
}

function getStatusType(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'RUNNING':
      return 'warning'
    case 'FAILED':
      return 'danger'
    default:
      return 'info'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return '已完成'
    case 'RUNNING':
      return '运行中'
    case 'FAILED':
      return '失败'
    default:
      return status
  }
}

async function loadTasks() {
  try {
    tasks.value = [
      {
        id: '1',
        type: 'AI_PARSE',
        status: 'COMPLETED',
        sessionId: 'sess_abc123',
        input: '打开百度首页并搜索"人工智能"',
        output: '[步骤1]导航到百度首页...[步骤2]输入搜索关键词...',
        duration: 2340,
        createdAt: '2024-01-15T10:30:00Z',
      },
      {
        id: '2',
        type: 'EXTRACT',
        status: 'COMPLETED',
        sessionId: 'sess_abc123',
        input: '抽取页面表格数据',
        output: '[{"name":"xxx","value":"xxx"},...]',
        duration: 1560,
        createdAt: '2024-01-15T10:35:00Z',
      },
      {
        id: '3',
        type: 'NAVIGATE',
        status: 'RUNNING',
        sessionId: 'sess_def456',
        input: '访问 https://example.com',
        output: '',
        duration: 0,
        createdAt: '2024-01-15T10:40:00Z',
      },
    ]
  } catch {
    ElMessage.error('加载任务列表失败')
  }
}

onMounted(loadTasks)
</script>

<style scoped>
.tasks-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>