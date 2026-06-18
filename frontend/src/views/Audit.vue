<template>
  <div class="audit-page">
    <div class="page-header">
      <h2>审计日志</h2>
    </div>

    <el-card>
      <el-table :data="logs" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="scope">
            <el-tag>{{ getActionText(scope.row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetType" label="目标类型" width="100" />
        <el-table-column prop="targetId" label="目标ID" width="120" />
        <el-table-column prop="userId" label="操作用户" width="120" />
        <el-table-column prop="tenantId" label="租户ID" width="120" />
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column prop="details" label="详情" width="300" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="180">
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

interface AuditLog {
  id: string
  action: string
  targetType: string
  targetId: string
  userId: string
  tenantId: string
  ip: string
  details: string
  createdAt: string
}

const logs = ref<AuditLog[]>([])

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getActionText(action: string): string {
  switch (action) {
    case 'CREATE':
      return '创建'
    case 'READ':
      return '读取'
    case 'UPDATE':
      return '更新'
    case 'DELETE':
      return '删除'
    case 'LOGIN':
      return '登录'
    case 'LOGOUT':
      return '登出'
    default:
      return action
  }
}

async function loadLogs() {
  logs.value = [
    { id: '1', action: 'LOGIN', targetType: 'USER', targetId: '1', userId: '1', tenantId: '', ip: '192.168.1.100', details: '用户登录成功', createdAt: '2024-01-15T10:30:00Z' },
    { id: '2', action: 'CREATE', targetType: 'SESSION', targetId: 'sess_abc123', userId: '2', tenantId: 'default', ip: '192.168.1.101', details: '创建浏览器会话', createdAt: '2024-01-15T10:35:00Z' },
    { id: '3', action: 'CREATE', targetType: 'TASK', targetId: 'task_1', userId: '2', tenantId: 'default', ip: '192.168.1.101', details: '创建AI解析任务', createdAt: '2024-01-15T10:36:00Z' },
    { id: '4', action: 'UPDATE', targetType: 'SESSION', targetId: 'sess_abc123', userId: '2', tenantId: 'default', ip: '192.168.1.101', details: '关闭浏览器会话', createdAt: '2024-01-15T10:45:00Z' },
  ]
}

onMounted(loadLogs)
</script>

<style scoped>
.audit-page {
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