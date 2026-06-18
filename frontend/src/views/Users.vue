<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><component :is="Plus" /></el-icon>
        新增用户
      </el-button>
    </div>

    <el-card>
      <el-table :data="users" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="scope">
            <el-tag :type="getRoleType(scope.row.role)">
              {{ getRoleText(scope.row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tenantId" label="租户ID" width="150" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="租户管理员" value="tenant_admin" />
            <el-option label="操作员" value="operator" />
            <el-option label="只读用户" value="readonly" />
          </el-select>
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

interface User {
  id: string
  username: string
  email: string
  role: string
  tenantId: string
  createdAt: string
}

const users = ref<User[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const formRef = ref()

const form = reactive({
  username: '',
  password: '',
  email: '',
  role: 'operator',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const dialogTitle = ref('新增用户')

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function getRoleType(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'danger'
    case 'tenant_admin':
      return 'primary'
    case 'operator':
      return 'warning'
    case 'readonly':
      return 'info'
    default:
      return 'info'
  }
}

function getRoleText(role: string): string {
  switch (role) {
    case 'super_admin':
      return '超级管理员'
    case 'tenant_admin':
      return '租户管理员'
    case 'operator':
      return '操作员'
    case 'readonly':
      return '只读用户'
    default:
      return role
  }
}

async function loadUsers() {
  try {
    users.value = [
      { id: '1', username: 'superadmin', email: 'super@example.com', role: 'super_admin', tenantId: '', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', username: 'tenantadmin', email: 'tenant@example.com', role: 'tenant_admin', tenantId: 'default', createdAt: '2024-01-02T00:00:00Z' },
      { id: '3', username: 'operator1', email: 'op1@example.com', role: 'operator', tenantId: 'default', createdAt: '2024-01-03T00:00:00Z' },
    ]
  } catch {
    ElMessage.error('加载用户列表失败')
  }
}

function handleAdd() {
  isEdit.value = false
  editingId.value = ''
  form.username = ''
  form.password = ''
  form.email = ''
  form.role = 'operator'
  dialogTitle.value = '新增用户'
  dialogVisible.value = true
}

function handleEdit(row: User) {
  isEdit.value = true
  editingId.value = row.id
  form.username = row.username
  form.password = ''
  form.email = row.email
  form.role = row.role
  dialogTitle.value = '编辑用户'
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!(await formRef.value.validate())) return

  try {
    ElMessage.success(isEdit.value ? '用户更新成功' : '用户创建成功')
    dialogVisible.value = false
    await loadUsers()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleDelete(row: User) {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '确认删除', { type: 'warning' })
    ElMessage.success('用户删除成功')
    await loadUsers()
  } catch {
    // 用户取消
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.users-page {
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