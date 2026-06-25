import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuthState } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean>(false)
  const userId = ref<string | null>(null)
  const username = ref<string | null>(null)
  const token = ref<string | null>(null)
  const clientToken = ref<string | null>(null)

  /**
   * 设置登录状态
   */
  function setLoggedIn(uid: string, uname: string, tok?: string) {
    isLoggedIn.value = true
    userId.value = uid
    username.value = uname
    if (tok) token.value = tok
    
    // 持久化到 localStorage
    localStorage.setItem('auth_state', JSON.stringify({
      isLoggedIn: true,
      userId: uid,
      username: uname,
    }))
  }

  /**
   * 登出
   */
  function logout() {
    isLoggedIn.value = false
    userId.value = null
    username.value = null
    token.value = null
    clientToken.value = null
    localStorage.removeItem('auth_state')
  }

  /**
   * 从 localStorage 恢复登录状态
   */
  function restoreFromStorage() {
    const saved = localStorage.getItem('auth_state')
    if (saved) {
      try {
        const state: Partial<AuthState> = JSON.parse(saved)
        if (state.isLoggedIn) {
          isLoggedIn.value = state.isLoggedIn
          userId.value = state.userId || null
          username.value = state.username || null
        }
      } catch (e) {
        console.error('恢复登录状态失败:', e)
      }
    }
  }

  /**
   * 开发模式虚拟登录
   */
  function devLogin() {
    setLoggedIn('dev-user-001', '开发者')
  }

  return {
    isLoggedIn,
    userId,
    username,
    token,
    clientToken,
    setLoggedIn,
    devLogin,
    logout,
    restoreFromStorage,
  }
})
