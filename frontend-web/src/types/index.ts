// API 响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页请求参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 用户类型 (从 authStore 重新导出以便统一使用)
export type { User } from '../stores/authStore'

// RPA 任务相关类型 (预留)
export interface RPATask {
  id: string
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

// 浏览器实例类型 (预留)
export interface BrowserInstance {
  id: string
  name: string
  status: 'idle' | 'running' | 'error'
  url?: string
}
