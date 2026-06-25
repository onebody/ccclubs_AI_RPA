<template>
  <div class="api-source-list">
    <div class="page-header">
      <h3>API数据源管理</h3>
      <el-button type="primary" @click="handleAdd">添加数据源</el-button>
    </div>
    <el-card>
      <el-table :data="apiSourceList" border>
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="name" label="数据源名称" />
        <el-table-column prop="method" label="请求方式" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.method === 'POST' ? 'danger' : 'success'">
              {{ scope.row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="请求地址" />
        <el-table-column prop="dataPath" label="数据路径" width="120" />
        <el-table-column prop="batchSize" label="批量大小" width="100" />
        <el-table-column prop="tenantName" label="所属租户" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="text" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" @click="handleDelete(scope.row)">删除</el-button>
            <el-button type="text" @click="handleTest(scope.row)">测试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const apiSourceList = ref([
  {
    id: '1',
    name: '用户数据API',
    method: 'GET',
    url: 'https://api.example.com/users',
    dataPath: 'data.list',
    batchSize: 50,
    tenantName: '测试租户',
    createTime: '2026-06-23 10:00:00'
  }
])

const handleAdd = () => {
  ElMessage.info('添加数据源')
}

const handleEdit = (row: Record<string, unknown>) => {
  ElMessage.info(`编辑数据源: ${row.name}`)
}

const handleDelete = (row: Record<string, unknown>) => {
  ElMessage.info(`删除数据源: ${row.name}`)
}

const handleTest = (row: Record<string, unknown>) => {
  ElMessage.info(`测试数据源: ${row.name}`)
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