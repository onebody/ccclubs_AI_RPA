import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskInfo } from '@/types'
import { fetchTasks, fetchTask, createTask, updateTask, deleteTask, executeTask } from '@/api/tasks'
import { taskWs } from '@/api/ws'
import { useExecutionStore } from './execution'

export const useTaskStore = defineStore('task', () => {
  const taskList = ref<TaskInfo[]>([])
  const total = ref(0)
  const loading = ref(false)

  async function loadTasks(keyword = '', status = '', page = 1, pageSize = 20) {
    loading.value = true
    try {
      const res = await fetchTasks(keyword, status, page, pageSize) as any
      taskList.value = res.items || []
      total.value = res.total || 0
    } catch (error) {
      console.error('加载任务列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function getTaskById(id: number): Promise<TaskInfo | undefined> {
    try {
      return await fetchTask(id) as any
    } catch {
      return undefined
    }
  }

  async function addTask(data: { name: string; sub_tasks?: string[] | null; province?: string | null; remark?: string }) {
    return await createTask(data) as any
  }

  async function updateTaskById(id: number, data: Partial<TaskInfo>) {
    return await updateTask(id, data) as any
  }

  async function deleteTaskById(id: number) {
    await deleteTask(id)
  }

  async function executeTaskById(id: number) {
    return await executeTask(id) as any
  }

  function initWebSocket() {
    taskWs.connect()
    taskWs.onMessage(handleWsMessage)
  }

  function destroyWebSocket() {
    taskWs.offMessage(handleWsMessage)
    taskWs.disconnect()
  }

  function handleWsMessage(msg: { type: string; data: any }) {
    if (msg.type === 'task_status_update') {
      const { taskId, status, lastResult, lastExecutedAt } = msg.data
      const idx = taskList.value.findIndex(t => t.id === taskId)
      if (idx !== -1) {
        taskList.value[idx].status = status
        taskList.value[idx].lastResult = lastResult
        taskList.value[idx].lastExecutedAt = lastExecutedAt
      }
    }
    // 转发所有消息给 execution store
    const executionStore = useExecutionStore()
    executionStore.handleWsMessage(msg)
  }

  return { taskList, total, loading, loadTasks, getTaskById, addTask, updateTaskById, deleteTaskById, executeTaskById, initWebSocket, destroyWebSocket }
})
