<template>
  <div class="sessions-page">
    <div class="page-header">
      <h2>会话管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><component :is="Plus" /></el-icon>
        创建会话
      </el-button>
    </div>

    <el-card>
      <el-table :data="sessions" border style="width: 100%">
        <el-table-column prop="sessionId" label="会话ID" width="150" />
        <el-table-column prop="tenantId" label="租户ID" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="启动时间" width="180">
          <template #default="scope">
            {{ scope.row.startTime ? formatDate(scope.row.startTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button
              size="small"
              type="danger"
              :disabled="scope.row.status === 'DESTROYED'"
              @click="handleClose(scope.row)"
            >
              关闭
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="创建会话" width="400px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="内存限制" prop="memoryLimit">
          <el-input v-model="form.memoryLimit" placeholder="例如: 512m" />
        </el-form-item>
        <el-form-item label="CPU限制" prop="cpuLimit">
          <el-input v-model="form.cpuLimit" placeholder="例如: 0.5" />
        </el-form-item>
        <el-form-item label="最大生命周期(秒)">
          <el-input-number v-model="form.maxLifetime" :min="60" :max="86400" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getSessions,
  createSession,
  closeSession,
  type Session,
  type CreateSessionRequest,
} from '@/api/session'

const sessions = ref<Session[]>([])
const dialogVisible = ref(false)
const formRef = ref()

const form = reactive({
  memoryLimit: '',
  cpuLimit: '',
  maxLifetime: 3600,
})

const rules = {
  memoryLimit: [{ pattern: /^\d+[mMgG]$/, message: '格式不正确，例如: 512m', trigger: 'blur' }],
  cpuLimit: [{ pattern: /^\d+(\.\d+)?$/, message: '格式不正确，例如: 0.5', trigger: 'blur' }],
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getStatusType(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'CREATING':
      return 'warning'
    case 'DESTROYED':
      return 'info'
    default:
      return 'info'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '活跃'
    case 'CREATING':
      return '创建中'
    case 'DESTROYED':
      return '已销毁'
    default:
      return status
  }
}

async function loadSessions() {
  try {
    const response = await getSessions()
    sessions.value = response.data
  } catch {
    ElMessage.error('加载会话列表失败')
  }
}

function handleCreate() {
  form.memoryLimit = ''
  form.cpuLimit = ''
  form.maxLifetime = 3600
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!(await formRef.value.validate())) return

  try {
    const data: CreateSessionRequest = {
      memoryLimit: form.memoryLimit || undefined,
      cpuLimit: form.cpuLimit || undefined,
      maxLifetime: form.maxLifetime || undefined,
    }
    await createSession(data)
    ElMessage.success('会话创建成功')
    dialogVisible.value = false
    await loadSessions()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleClose(row: Session) {
  try {
    await closeSession(row.sessionId)
    ElMessage.success('会话已关闭')
    await loadSessions()
  } catch {
    ElMessage.error('操作失败')
  }
}

onMounted(loadSessions)
</script>

<style scoped>
.sessions-page {
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