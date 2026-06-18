import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'

export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user' | 'guest'
  tenant_id?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  
  // Actions
  login: (tenantId: string, username: string, password: string) => Promise<void>
  register: (data: {
    tenant_id: string
    username: string
    email: string
    password: string
    confirm_password: string
  }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<boolean>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: async (tenantId: string, username: string, password: string) => {
        const response = await authApi.login({ tenant_id: tenantId, username, password })
        
        set({
          isAuthenticated: true,
          user: {
            id: response.user.id,
            username: response.user.username,
            email: response.user.email,
            role: response.user.role,
            tenant_id: response.user.tenant_id,
          },
          token: response.access_token,
        })
      },

      register: async (data) => {
        await authApi.register(data)
      },

      logout: () => {
        // 调用后端登出接口（忽略错误）
        authApi.logout().catch(() => {})
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        })
      },

      checkAuth: async () => {
        const token = get().token
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null })
          return false
        }

        try {
          const user = await authApi.getProfile()
          set({
            isAuthenticated: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              tenant_id: user.tenant_id,
            },
          })
          return true
        } catch {
          set({ isAuthenticated: false, user: null, token: null })
          return false
        }
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token, isAuthenticated: !!token }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
)
