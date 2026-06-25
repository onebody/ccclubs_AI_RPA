<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/device'

const authStore = useAuthStore()
const deviceStore = useDeviceStore()

onMounted(async () => {
  // 恢复登录状态
  authStore.restoreFromStorage()
  
  // 初始化设备信息
  await deviceStore.initDevice()
})
</script>
