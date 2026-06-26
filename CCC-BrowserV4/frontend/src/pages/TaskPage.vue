<template>
  <div class="task-page">
    <div class="page-header">
      <h2 class="page-title">站点任务</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索任务名称"
          clearable
          style="width: 200px"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 130px">
          <el-option label="全部" value="" />
          <el-option label="待执行" value="pending" />
          <el-option label="执行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="已失败" value="failed" />
        </el-select>
        <el-button type="primary" @click="handleAdd">新增任务</el-button>
      </div>
    </div>

    <div v-loading="taskStore.loading" class="task-grid" style="margin-top: 16px">
      <el-card
        v-for="(task, index) in taskStore.taskList"
        :key="task.id"
        class="task-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <span class="card-index">#{{ (currentPage - 1) * pageSize + index + 1 }}</span>
            <span class="card-name">{{ task.name }}</span>
            <el-button
              type="success"
              size="small"
              :disabled="executionStore.activeTaskId === task.id"
              :loading="executionStore.activeTaskId === task.id && executionStore.step === 'checking_login'"
              @click.stop="handleExecute(task)"
              style="margin-left: auto"
            >{{ executionStore.activeTaskId === task.id ? '执行中' : '执行' }}</el-button>
          </div>
        </template>

        <div class="card-body">
          <div class="card-row">
            <span class="row-label">任务状态：</span>
            <el-tag
              :type="statusTagType(task.status)"
              :effect="task.status === 'running' ? 'light' : 'light'"
              class="status-tag"
            >
              <el-icon v-if="task.status === 'running'" class="is-loading-icon"><Loading /></el-icon>
              {{ statusLabel(task.status) }}
            </el-tag>
          </div>
          <div class="card-row" v-if="task.customerName">
            <span class="row-label">所属客户：</span>
            <span>{{ task.customerName }}</span>
          </div>
          <div class="card-row" v-if="task.handlerAccount">
            <span class="row-label">经手人：</span>
            <span>{{ task.handlerAccount }}</span>
          </div>
          <div class="card-row" v-if="task.province">
            <span class="row-label">省份：</span>
            <span>{{ task.province }}</span>
          </div>
          <div class="card-row" v-if="task.subTasks && task.subTasks.length > 0">
            <span class="row-label">子任务：</span>
            <div class="sub-tasks-wrap">
              <el-tag
                v-for="(st, si) in task.subTasks"
                :key="si"
                size="small"
                type="info"
                class="sub-task-tag"
              >{{ st }}</el-tag>
            </div>
          </div>
          <div class="card-row">
            <span class="row-label">最后执行：</span>
            <span>{{ formatTime(task.lastExecutedAt) }}</span>
          </div>
          <div class="card-row">
            <span class="row-label">下次执行：</span>
            <span>{{ formatTime(task.nextExecutedAt) }}</span>
          </div>
          <div class="card-row">
            <span class="row-label">执行结果：</span>
            <span :class="resultClass(task.lastResult)">{{ resultLabel(task.lastResult) }}</span>
          </div>
        </div>

        <div class="card-footer">
          <el-button type="primary" link size="small" @click="handleEdit(task)">编辑</el-button>
          <el-button type="warning" link size="small" @click="handleDemo(task)">演示</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(task)">删除</el-button>
          <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, task)">
            <el-button type="info" link size="small">
              更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="detail">查看详情</el-dropdown-item>
                <el-dropdown-item command="copy">复制任务</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 内联执行面板：当该任务正在执行时显示 -->
        <ExecutionPanel
          v-if="executionStore.activeTaskId === task.id"
          :task-id="task.id"
        />
      </el-card>

      <el-empty v-if="!taskStore.loading && taskStore.taskList.length === 0" description="暂无任务数据" />
    </div>

    <div class="pagination-wrap" v-if="taskStore.total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="taskStore.total"
        :page-sizes="[12, 24, 48]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import type { TaskInfo } from '@/types'
import { useTaskStore } from '@/stores/task'
import { useExecutionStore } from '@/stores/execution'
import ExecutionPanel from '@/components/ExecutionPanel.vue'

const router = useRouter()
const taskStore = useTaskStore()
const executionStore = useExecutionStore()

const searchKeyword = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(12)


onMounted(() => {
  reload()
  taskStore.initWebSocket()
})

onUnmounted(() => {
  taskStore.destroyWebSocket()
})

// 搜索防抖
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchKeyword, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    reload()
  }, 300)
})

// 状态筛选变化
watch(statusFilter, () => {
  currentPage.value = 1
  reload()
})

function reload() {
  taskStore.loadTasks(
    searchKeyword.value.trim(),
    statusFilter.value,
    currentPage.value,
    pageSize.value
  )
}

function handlePageChange() {
  reload()
}

function handleSizeChange() {
  currentPage.value = 1
  reload()
}

// 状态 Tag 颜色
function statusTagType(status: TaskInfo['status']): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return map[status] || 'info'
}

function statusLabel(status: TaskInfo['status']): string {
  const map: Record<string, string> = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '已失败',
  }
  return map[status] || status
}

function formatTime(val: string | null): string {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return val
  }
}

function resultLabel(val: string | null): string {
  if (!val) return '-'
  if (val === 'success') return '成功'
  if (val === 'failed') return '失败'
  return val
}

function resultClass(val: string | null): string {
  if (val === 'success') return 'result-success'
  if (val === 'failed') return 'result-failed'
  return ''
}

function handleAdd() {
  router.push('/tasks/add')
}

function handleEdit(task: TaskInfo) {
  router.push(`/tasks/edit/${task.id}`)
}

async function handleExecute(task: TaskInfo) {
  try {
    await taskStore.executeTaskById(task.id)
    executionStore.startExecution(task.id)
    ElMessage.success(`任务「${task.name}」已启动执行`)
    // 乐观更新
    task.status = 'running'
    task.lastResult = null
  } catch (error: any) {
    const detail = error?.response?.data?.detail || '执行失败'
    ElMessage.warning(detail)
  }
}

function handleDemo(task: TaskInfo) {
  executionStore.startDemo(task.id)
}

function handleDelete(task: TaskInfo) {
  ElMessageBox.confirm(`确认删除任务「${task.name}」吗？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await taskStore.deleteTaskById(task.id)
      ElMessage.success('删除成功')
      reload()
    } catch {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

function handleCommand(cmd: string, _task: TaskInfo) {
  if (cmd === 'detail' || cmd === 'copy') {
    ElMessage.info('功能开发中')
  }
}
</script>

<style scoped>
.task-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  min-height: 100px;
}

.task-card {
  display: flex;
  flex-direction: column;
}

.task-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-index {
  color: #909399;
  font-size: 13px;
  flex-shrink: 0;
}

.card-name {
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-row {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #606266;
}

.row-label {
  color: #909399;
  flex-shrink: 0;
  width: 78px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.is-loading-icon {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.sub-tasks-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.sub-task-tag {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-success {
  color: #67c23a;
  font-weight: 500;
}

.result-failed {
  color: #f56c6c;
  font-weight: 500;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
