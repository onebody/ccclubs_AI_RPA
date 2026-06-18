import { create } from 'zustand'

interface AppState {
  isLoading: boolean
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  
  // Actions
  setLoading: (loading: boolean) => void
  toggleTheme: () => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  theme: 'light',
  sidebarCollapsed: false,

  setLoading: (loading) => set({ isLoading: loading }),
  
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),
}))
