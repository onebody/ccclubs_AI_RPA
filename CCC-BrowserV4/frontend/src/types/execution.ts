export type ExecutionStep = 'idle' | 'checking_login' | 'qr_scanning' | 'waiting_company' | 'executing' | 'keeping_alive' | 'completed' | 'failed' | 'cancelled'

export interface CompanyInfo {
  id: string
  name: string
  creditCode: string
}

export interface ExecutionState {
  taskId: number | null
  step: ExecutionStep
  message: string
  qrImage: string | null
  companies: CompanyInfo[]
  selectedCompany: CompanyInfo | null
}
