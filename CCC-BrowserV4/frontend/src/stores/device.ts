import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tauriBridge } from '@/utils/tauri-bridge'

export const useDeviceStore = defineStore('device', () => {
  const deviceId = ref<string | null>(null)
  const clientId = ref<string | null>(null)

  /**
   * 初始化设备信息
   */
  async function initDevice() {
    if (!deviceId.value) {
      deviceId.value = await tauriBridge.getDeviceId()
    }
  }

  /**
   * 设置客户端 ID
   */
  function setClientId(id: string) {
    clientId.value = id
  }

  /**
   * 重置客户端 ID
   */
  function resetClientId() {
    clientId.value = null
  }

  return {
    deviceId,
    clientId,
    initDevice,
    setClientId,
    resetClientId,
  }
})
