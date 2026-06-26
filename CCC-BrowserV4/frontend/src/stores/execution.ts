import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ExecutionStep, CompanyInfo } from '../types/execution'
import * as executionApi from '../api/execution'

export const useExecutionStore = defineStore('execution', () => {
  const taskId = ref<number | null>(null)
  const step = ref<ExecutionStep>('idle')
  const message = ref('')
  const qrImage = ref<string | null>(null)
  const companies = ref<CompanyInfo[]>([])
  const selectedCompany = ref<CompanyInfo | null>(null)

  const activeTaskId = ref<number | null>(null)  // 当前正在执行的任务ID，null表示无执行中任务
  const isDemo = ref(false)     // 是否为演示模式

  // 判断某任务是否正在执行
  const isExecuting = computed(() => {
    return (taskId: number) => activeTaskId.value === taskId
  })

  // 处理 WebSocket 消息
  function handleWsMessage(msg: { type: string; data: any }) {
    // 只处理与当前 taskId 相关的消息
    if (msg.data?.taskId && taskId.value && msg.data.taskId !== taskId.value) return

    switch (msg.type) {
      case 'qr_code':
        step.value = 'qr_scanning'
        qrImage.value = msg.data.qrImage
        message.value = '请使用交管12123 APP扫描二维码'
        break
      case 'company_list':
        step.value = 'waiting_company'
        companies.value = msg.data.companies
        message.value = '请选择要办理业务的单位'
        break
      case 'execution_progress':
        step.value = msg.data.step || 'executing'
        message.value = msg.data.message || ''
        break
      case 'login_result':
        if (msg.data.success) {
          message.value = '登录成功'
        } else {
          step.value = 'failed'
          message.value = msg.data.message || '登录失败'
        }
        break
      case 'execution_error':
        step.value = 'failed'
        message.value = msg.data.message || '执行异常'
        break
      case 'task_status_update':
        if (msg.data.status === 'completed') {
          step.value = 'completed'
          message.value = '任务执行完成'
        } else if (msg.data.status === 'failed') {
          step.value = 'failed'
          // 仅当没有具体错误消息时才设置默认值，避免覆盖 execution_error 中的详细信息
          if (!message.value) {
            message.value = '任务执行失败'
          }
        }
        break
    }
  }

  // 通知后端扫码完成
  async function doScanComplete() {
    if (!taskId.value) return
    step.value = 'checking_login'
    message.value = '正在验证登录状态...'

    // 演示模式：直接走模拟流程
    if (isDemo.value) {
      await simulateAfterScan()
      return
    }

    try {
      await executionApi.scanComplete(taskId.value)
    } catch {
      // API 失败时也模拟后续流程
      await simulateAfterScan()
    }
  }

  // 通知后端用户选择了单位
  async function doSelectCompany(company: CompanyInfo) {
    if (!taskId.value) return
    selectedCompany.value = company
    step.value = 'executing'
    message.value = `正在切换到 ${company.name}...`

    // 演示模式：直接走模拟流程
    if (isDemo.value) {
      await simulateExecution()
      return
    }

    try {
      await executionApi.selectCompany(taskId.value, company.id, company.name)
    } catch {
      // API 失败时也模拟执行过程
      await simulateExecution()
    }
  }

  // 取消执行
  async function doCancel() {
    if (!taskId.value) return
    try {
      await executionApi.cancelExecution(taskId.value)
    } catch {
      // 演示模式：直接取消
    }
    step.value = 'cancelled'
    message.value = '已取消执行'
  }

  // 开始执行（由 TaskPage 调用）
  function startExecution(id: number) {
    taskId.value = id
    step.value = 'checking_login'
    message.value = '正在检查登录状态...'
    qrImage.value = null
    companies.value = []
    selectedCompany.value = null
    activeTaskId.value = id
    isDemo.value = false
  }

  // 演示模式：模拟完整流程（当后端不可用时手动调用）
  async function startDemo(id: number) {
    taskId.value = id
    isDemo.value = true
    step.value = 'checking_login'
    message.value = '正在检查登录状态...'
    qrImage.value = null
    companies.value = []
    selectedCompany.value = null
    activeTaskId.value = id
    await delay(1500)

    step.value = 'qr_scanning'
    qrImage.value = generateMockQRCode()
    message.value = '请使用交管12123 APP扫描二维码'
  }

  // 演示模式：扫码完成后的模拟
  async function simulateAfterScan() {
    isDemo.value = true
    message.value = '登录成功'
    await delay(1000)

    step.value = 'waiting_company'
    companies.value = [
      { id: '0', name: '杭州某机动车检测有限公司', creditCode: '91330100MA2AXXXX01' },
      { id: '1', name: '浙江顺达交通运输有限公司', creditCode: '91330100MA2BXXXX02' },
      { id: '2', name: '杭州安达汽车服务有限公司', creditCode: '91330100MA2CXXXX03' },
    ]
    message.value = '请选择要办理业务的单位'
  }

  // 演示模式：模拟执行过程
  async function simulateExecution() {
    isDemo.value = true
    await delay(1500)
    step.value = 'keeping_alive'
    message.value = '页面保活中，等待业务触发...'
    await delay(3000)
    message.value = '检测到待处理业务：备案查询'
    await delay(2000)
    step.value = 'executing'
    message.value = '正在执行: 备案查询...'
    await delay(2000)
    step.value = 'keeping_alive'
    message.value = '业务处理完成，继续保活...'
  }

  function generateMockQRCode(): string {
    return 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect fill="white" width="200" height="200"/>
        <rect fill="black" x="20" y="20" width="60" height="60"/>
        <rect fill="white" x="30" y="30" width="40" height="40"/>
        <rect fill="black" x="40" y="40" width="20" height="20"/>
        <rect fill="black" x="120" y="20" width="60" height="60"/>
        <rect fill="white" x="130" y="30" width="40" height="40"/>
        <rect fill="black" x="140" y="40" width="20" height="20"/>
        <rect fill="black" x="20" y="120" width="60" height="60"/>
        <rect fill="white" x="30" y="130" width="40" height="40"/>
        <rect fill="black" x="40" y="140" width="20" height="20"/>
        <rect fill="black" x="100" y="100" width="30" height="30"/>
        <rect fill="white" x="105" y="105" width="20" height="20"/>
        <rect fill="black" x="110" y="110" width="10" height="10"/>
      </svg>
    `)
  }

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 清除执行状态
  function clearExecution() {
    activeTaskId.value = null
    reset()
  }

  // 重置状态
  function reset() {
    taskId.value = null
    activeTaskId.value = null
    step.value = 'idle'
    message.value = ''
    qrImage.value = null
    companies.value = []
    selectedCompany.value = null
    isDemo.value = false
  }

  return {
    taskId, step, message, qrImage, companies, selectedCompany, activeTaskId, isExecuting, isDemo,
    handleWsMessage, doScanComplete, doSelectCompany, doCancel, startExecution, startDemo, clearExecution, reset,
  }
})
