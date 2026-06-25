<template>
  <div class="task-list">
    <div class="page-header">
      <h3>任务调度管理</h3>
      <div class="header-actions">
        <el-button type="primary" @click="handleCreate">创建任务</el-button>
        <el-button @click="handleBatchRun">批量执行</el-button>
        <el-button @click="handleRefresh">刷新</el-button>
      </div>
    </div>
    <el-card>
      <el-table :data="taskList" border>
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="processName" label="流程名称" />
        <el-table-column prop="sceneName" label="场景名称" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="scope">
            <el-progress :percentage="scope.row.progress" :stroke-width="10" />
          </template>
        </el-table-column>
        <el-table-column prop="retryCount" label="重试次数" width="100" />
        <el-table-column prop="startTime" label="开始时间" width="180" />
        <el-table-column prop="endTime" label="结束时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button v-if="scope.row.status === 'pending'" type="text" @click="handleRun(scope.row)">执行</el-button>
            <el-button v-if="scope.row.status === 'running'" type="text" @click="handleCancel(scope.row)">取消</el-button>
            <el-button v-if="scope.row.status === 'failed'" type="text" @click="handleRetry(scope.row)">重试</el-button>
            <el-button type="text" @click="handleView(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const taskList = ref([
  {
    id: '1',
    processName: '场景1自动化流程',
    sceneName: '场景1',
    status: 'success',
    progress: 100,
    retryCount: 0,
    startTime: '2026-06-23 10:00:00',
    endTime: '2026-06-23 10:05:00'
  },
  {
    id: '2',
    processName: '场景1自动化流程',
    sceneName: '场景2',
    status: 'running',
    progress: 50,
    retryCount: 0,
    startTime: '2026-06-23 11:00:00',
    endTime: ''
  },
  {
    id: '3',
    processName: '场景1自动化流程',
    sceneName: '场景1',
    status: 'failed',
    progress: 0,
    retryCount: 2,
    startTime: '2026-06-23 09:00:00',
    endTime: '2026-06-23 09:02:00'
  },
  {
    id: '4',
    processName: '场景1自动化流程',
    sceneName: '场景1',
    status: 'pending',
    progress: 0,
    retryCount: 0,
    startTime: '',
    endTime: ''
  }
])

const statusMap: Record<string, { text: string; type: string }> = {
  pending: { text: '排队中', type: 'info' },
  running: { text: '运行中', type: 'warning' },
  success: { text: '成功', type: 'success' },
  failed: { text: '失败', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' }
}

const getStatusText = (status: string) => {
  return statusMap[status]?.text || status
}

const getStatusType = (status: string) => {
  return statusMap[status]?.type || 'info'
}

const handleCreate = () => {
  ElMessage.info('创建任务')
}

const handleBatchRun = () => {
  ElMessage.info('批量执行任务')
}

const handleRefresh = () => {
  ElMessage.success('刷新成功')
}

const handleRun = (row: Record<string, unknown>) => {
  ElMessage.info(`执行任务: ${row.id}`)
}

const handleCancel = (row: Record<string, unknown>) => {
  ElMessage.info(`取消任务: ${row.id}`)
}

const handleRetry = (row: Record<string, unknown>) => {
  ElMessage.info(`重试任务: ${row.id}`)
}

const handleView = (row: Record<string, unknown>) => {
  ElMessage.info(`查看任务详情: ${row.id}`)
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h3 {
  font-size: 18px;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>