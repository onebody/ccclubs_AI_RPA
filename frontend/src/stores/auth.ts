import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, type LoginRequest } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<{ id: string; username: string; role: string; tenantId: string } | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  )

  async function doLogin(data: LoginRequest) {
    const response = await login(data)
    token.value = response.data.accessToken
    user.value = response.data.user
    localStorage.setItem('token', token.value)
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, doLogin, logout }
})