export interface ExecutionLog {
  id: number
  taskId: number
  taskName: string
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'completed' | 'failed'
  resultMessage: string | null
}
