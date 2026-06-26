import request from './request'
import type { TaskInfo } from '@/types'
import type { ExecutionLog } from '@/types/execution-log'

export function fetchTasks(keyword = '', status = '', page = 1, pageSize = 20) {
  return request.get('/tasks', { params: { keyword, status, page, page_size: pageSize } })
}

export function fetchTask(id: number) {
  return request.get(`/tasks/${id}`)
}

export function createTask(data: {
  name: string
  tenant_id?: string | null
  device_id?: string | null
  sub_tasks?: string[] | null
  province?: string | null
  remark?: string
}) {
  return request.post('/tasks', data)
}

export function updateTask(id: number, data: Partial<TaskInfo>) {
  return request.put(`/tasks/${id}`, data)
}

export function deleteTask(id: number) {
  return request.delete(`/tasks/${id}`)
}

export function executeTask(id: number) {
  return request.post(`/tasks/${id}/execute`)
}

export function fetchTaskLogs(taskId: number, page = 1, pageSize = 20) {
  return request.get(`/tasks/${taskId}/logs`, {
    params: { page, page_size: pageSize }
  }) as Promise<{ items: ExecutionLog[]; total: number }>
}
