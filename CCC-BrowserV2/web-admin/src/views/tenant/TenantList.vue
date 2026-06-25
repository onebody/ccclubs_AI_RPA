<template>
  <div class="tenant-list">
    <div class="page-header">
      <h3>租户管理</h3>
      <el-button type="primary" @click="handleAdd">添加租户</el-button>
    </div>
    <el-card>
      <el-table :data="tenantList" border>
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="name" label="租户名称" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
              {{ scope.row.status === 'active' ? '正常' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="concurrentLimit" label="并发上限" width="120" />
        <el-table-column prop="expireTime" label="过期时间" width="180" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="text" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>
    <el-dialog v-model="dialogVisible" title="添加租户" width="500px">
      <el-form :model="tenantForm" ref="tenantFormRef" :rules="rules" label-width="100px">
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="tenantForm.name" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="并发上限" prop="concurrentLimit">
          <el-input-number v-model="tenantForm.concurrentLimit" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="过期时间" prop="expireTime">
          <el-date-picker v-model="tenantForm.expireTime" type="datetime" placeholder="选择过期时间" />
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
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const tenantList = ref([
  {
    id: '1',
    name: '测试租户',
    status: 'active',
    concurrentLimit: 5,
    expireTime: '2026-12-31 23:59:59',
    createTime: '2026-06-23 10:00:00'
  }
])

const dialogVisible = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(1)

const tenantFormRef = ref()
const tenantForm = reactive({
  name: '',
  concurrentLimit: 5,
  expireTime: ''
})

const rules = {
  name: [
    { required: true, message: '请输入租户名称', trigger: 'blur' }
  ],
  concurrentLimit: [
    { required: true, message: '请输入并发上限', trigger: 'blur' }
  ]
}

const handleAdd = () => {
  dialogVisible.value = true
}

const handleEdit = (row: Record<string, unknown>) => {
  ElMessage.info(`编辑租户: ${row.name}`)
}

const handleDelete = (row: Record<string, unknown>) => {
  ElMessage.info(`删除租户: ${row.name}`)
}

const handleSubmit = () => {
  dialogVisible.value = false
  ElMessage.success('添加成功')
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
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

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>