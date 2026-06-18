<template>
  <div class="tenants-page">
    <div class="page-header">
      <h2>租户管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><component :is="Plus" /></el-icon>
        新增租户
      </el-button>
    </div>

    <el-card>
      <el-table :data="tenants" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="租户名称" />
        <el-table-column prop="quota" label="并发配额" width="120" />
        <el-table-column prop="enabled" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'danger'">
              {{ scope.row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button
              size="small"
              :type="scope.row.enabled ? 'warning' : 'success'"
              @click="handleToggle(scope.row)"
            >
              {{ scope.row.enabled ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="并发配额" prop="quota">
          <el-input-number v-model="form.quota" :min="1" :max="100" />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  type Tenant,
  type CreateTenantRequest,
  type UpdateTenantRequest,
} from '@/api/tenant'

const tenants = ref<Tenant[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const formRef = ref()

const form = reactive({
  name: '',
  quota: 10,
})

const rules = {
  name: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  quota: [{ required: true, message: '请输入并发配额', trigger: 'blur' }],
}

const dialogTitle = ref('新增租户')

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function loadTenants() {
  try {
    const response = await getTenants()
    tenants.value = response.data
  } catch {
    ElMessage.error('加载租户列表失败')
  }
}

function handleAdd() {
  isEdit.value = false
  editingId.value = ''
  form.name = ''
  form.quota = 10
  dialogTitle.value = '新增租户'
  dialogVisible.value = true
}

function handleEdit(row: Tenant) {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.quota = row.quota
  dialogTitle.value = '编辑租户'
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!(await formRef.value.validate())) return

  try {
    if (isEdit.value) {
      const data: UpdateTenantRequest = { name: form.name, quota: form.quota }
      await updateTenant(editingId.value, data)
      ElMessage.success('租户更新成功')
    } else {
      const data: CreateTenantRequest = { name: form.name, quota: form.quota }
      await createTenant(data)
      ElMessage.success('租户创建成功')
    }
    dialogVisible.value = false
    await loadTenants()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleToggle(row: Tenant) {
  try {
    await updateTenant(row.id, { enabled: !row.enabled })
    ElMessage.success(row.enabled ? '租户已禁用' : '租户已启用')
    await loadTenants()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleDelete(row: Tenant) {
  try {
    await ElMessageBox.confirm('确定要删除该租户吗？', '确认删除', {
      type: 'warning',
    })
    await deleteTenant(row.id)
    ElMessage.success('租户删除成功')
    await loadTenants()
  } catch {
    // 用户取消
  }
}

onMounted(loadTenants)
</script>

<style scoped>
.tenants-page {
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