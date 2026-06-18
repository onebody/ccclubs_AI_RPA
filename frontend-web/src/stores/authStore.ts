import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  
  // Actions
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: async (username: string, password: string) => {
        // TODO: 替换为实际的 API 调用
        // const response = await api.post('/auth/login', { username, password })
        
        // 模拟登录成功
        if (username && password) {
          const mockUser: User = {
            id: '1',
            username,
            email: `${username}@example.com`,
            role: 'user',
          }
          const mockToken = 'mock-jwt-token'
          
          set({
            isAuthenticated: true,
            user: mockUser,
            token: mockToken,
          })
        } else {
          throw new Error('用户名和密码不能为空')
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        })
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
