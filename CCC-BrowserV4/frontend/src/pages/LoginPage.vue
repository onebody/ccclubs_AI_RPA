<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>用户登录</h2>
        </div>
      </template>
      
      <div class="login-content">
        <!-- 开发模式提示 -->
        <el-alert
          v-if="isDevMode"
          title="当前为开发模式，将使用虚拟账号登录"
          type="warning"
          :closable="false"
          show-icon
          class="dev-mode-alert"
        />
        
        <p class="device-info" v-if="deviceStore.deviceId">
          <el-icon><Monitor /></el-icon>
          设备标识: {{ deviceStore.deviceId }}
        </p>
        
        <el-button
          type="primary"
          size="large"
          :loading="isLoggingIn"
          @click="handleLogin"
          class="login-button"
        >
          {{ isLoggingIn ? '等待登录完成...' : '点击登录' }}
        </el-button>
        
        <div v-if="isLoggingIn" class="login-hint">
          <el-alert
            title="正在打开浏览器进行登录"
            type="info"
            :closable="false"
            show-icon
          />
          <p class="hint-text">请在浏览器中完成登录后返回应用</p>
        </div>
        
        <div v-if="loginError" class="error-message">
          <el-alert
            :title="loginError"
            type="error"
            :closable="false"
            show-icon
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/device'
import { performLogin } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

// 开发模式标识
const isDevMode = import.meta.env.DEV

const isLoggingIn = ref(false)
const loginError = ref('')
let unlistenCallback: (() => void) | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await deviceStore.initDevice()
})

onUnmounted(() => {
  // 组件卸载时清理
  if (unlistenCallback) {
    unlistenCallback()
  }
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
  }
})

const handleLogin = async () => {
  // 开发模式：直接虚拟登录
  if (isDevMode) {
    try {
      isLoggingIn.value = true
      loginError.value = ''
      
      // 模拟短暂延迟
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 虚拟登录
      authStore.setLoggedIn('dev-user-001', '开发者')
      ElMessage.success('开发模式：已使用虚拟账号登录')
      router.push('/')
      
      isLoggingIn.value = false
    } catch (error) {
      console.error('开发模式登录错误:', error)
      loginError.value = '登录流程出错，请重试'
      ElMessage.error('登录流程出错')
      isLoggingIn.value = false
    }
    return
  }
  
  // 生产模式：真实登录流程（保持不变）
  try {
    isLoggingIn.value = true
    loginError.value = ''
    
    unlistenCallback = await performLogin((payload) => {
      console.log('收到登录回调:', payload)
      
      if (payload.status === 'success') {
        authStore.setLoggedIn(payload.userId, payload.username)
        ElMessage.success(`欢迎，${payload.username}`)
        router.push('/')
      } else {
        loginError.value = '登录失败，请重试'
        ElMessage.error('登录失败')
      }
      
      isLoggingIn.value = false
      unlistenCallback = null
    })
    
    // 超时处理（5分钟）
    timeoutTimer = setTimeout(() => {
      if (isLoggingIn.value) {
        isLoggingIn.value = false
        loginError.value = '登录超时，请重试'
        ElMessage.warning('登录超时，请重试')
        if (unlistenCallback) {
          unlistenCallback()
          unlistenCallback = null
        }
      }
    }, 5 * 60 * 1000)
    
  } catch (error) {
    console.error('登录流程错误:', error)
    loginError.value = '登录流程出错，请重试'
    ElMessage.error('登录流程出错')
    isLoggingIn.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 450px;
}

.card-header h2 {
  margin: 0;
  text-align: center;
  color: #303133;
}

.login-content {
  padding: 20px 0;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #606266;
  word-break: break-all;
}

.login-button {
  width: 100%;
  margin-top: 10px;
}

.login-hint {
  margin-top: 20px;
}

.hint-text {
  margin-top: 12px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.error-message {
  margin-top: 20px;
}
</style>
