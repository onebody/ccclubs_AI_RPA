<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>AI Browser Admin</h1>
        <p>商用级 AI 浏览器系统</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <span>默认账号：superadmin / admin123</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref()

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  if (!(await formRef.value.validate())) return

  try {
    await authStore.doLogin(form)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch {
    ElMessage.error('用户名或密码错误')
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
}

.login-card {
  width: 400px;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e3a5f;
}

.login-header p {
  margin: 0;
  color: #64748b;
}

.login-form {
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  background: #3b82f6;
  border-color: #3b82f6;
}

.login-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.login-footer {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}
</style>