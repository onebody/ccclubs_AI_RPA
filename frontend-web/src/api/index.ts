import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '../stores/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 创建 axios 实例
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response.data
    },
    (error) => {
      // 统一错误处理
      if (error.response) {
        const { status, data } = error.response
        
        if (status === 401) {
          // Token 过期，清除认证状态
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
        
        return Promise.reject({
          status,
          message: data.message || '请求失败',
          data,
        })
      }
      
      if (error.request) {
        return Promise.reject({
          status: 0,
          message: '网络错误，请检查网络连接',
        })
      }
      
      return Promise.reject({
        status: -1,
        message: error.message || '未知错误',
      })
    }
  )

  return instance
}

// 导出配置好的 axios 实例
export const api = createApiInstance()

// 通用请求方法
export const request = async <T = any>(config: AxiosRequestConfig): Promise<T> => {
  return api(config)
}

// 常用的 HTTP 方法封装
export const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url }),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data }),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data }),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data }),
}

export default api
