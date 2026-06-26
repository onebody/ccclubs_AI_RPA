import request from './request'

// 用户扫码完成后通知后端
export function scanComplete(taskId: number) {
  return request.post(`/tasks/${taskId}/scan-complete`)
}

// 用户选择单位后通知后端
export function selectCompany(taskId: number, companyId: string, companyName: string) {
  return request.post(`/tasks/${taskId}/select-company`, {
    company_id: companyId,
    company_name: companyName,
  })
}

// 取消执行
export function cancelExecution(taskId: number) {
  return request.post(`/tasks/${taskId}/cancel-execution`)
}
