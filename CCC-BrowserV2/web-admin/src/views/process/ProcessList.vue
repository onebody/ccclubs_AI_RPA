<template>
  <div class="process-list">
    <div class="page-header">
      <h3>流程模板管理</h3>
      <el-button type="primary" @click="handleAdd">添加模板</el-button>
    </div>
    <el-card>
      <el-table :data="processList" border>
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="name" label="模板名称" />
        <el-table-column prop="sessionCacheEnable" label="会话缓存" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.sessionCacheEnable ? 'success' : 'info'">
              {{ scope.row.sessionCacheEnable ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="delayMode" label="延时模式" width="120">
          <template #default="scope">
            <el-tag :type="getDelayModeType(scope.row.delayMode)">
              {{ getDelayModeText(scope.row.delayMode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sceneCount" label="场景数量" width="100" />
        <el-table-column prop="tenantName" label="所属租户" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="text" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" @click="handleDelete(scope.row)">删除</el-button>
            <el-button type="text" @click="handlePreview(scope.row)">预览</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const processList = ref([
  {
    id: '1',
    name: '场景1自动化流程',
    sessionCacheEnable: true,
    delayMode: 'balance',
    sceneCount: 2,
    tenantName: '测试租户',
    createTime: '2026-06-23 10:00:00'
  }
])

const delayModes = {
  fast: { text: '快速', type: 'danger' },
  balance: { text: '平衡', type: 'warning' },
  high_sim: { text: '高仿真', type: 'success' }
}

const getDelayModeText = (mode: string) => {
  return delayModes[mode as keyof typeof delayModes]?.text || mode
}

const getDelayModeType = (mode: string) => {
  return delayModes[mode as keyof typeof delayModes]?.type || 'info'
}

const handleAdd = () => {
  ElMessage.info('添加模板')
}

const handleEdit = (row: Record<string, unknown>) => {
  ElMessage.info(`编辑模板: ${row.name}`)
}

const handleDelete = (row: Record<string, unknown>) => {
  ElMessage.info(`删除模板: ${row.name}`)
}

const handlePreview = (row: Record<string, unknown>) => {
  ElMessage.info(`预览模板: ${row.name}`)
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
</style>