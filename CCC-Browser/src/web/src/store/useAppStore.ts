import { create } from 'zustand'

export type FlowStep = 'login' | 'company-select' | 'contract-filing' | 'completed'
export type LoginStatus = 'idle' | 'scanning' | 'scanned' | 'authenticating' | 'success' | 'error'
export type Company = {
  id: string
  name: string
  code: string
}
export type ContractStep = {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  progress: number
  message?: string
}

interface AppState {
  currentStep: FlowStep
  loginStatus: LoginStatus
  loginMessage: string
  qrCodeUrl: string
  selectedCompany: Company | null
  companies: Company[]
  contractSteps: ContractStep[]
  contractProgress: number
  
  setLoginStatus: (status: LoginStatus, message?: string) => void
  setQrCodeUrl: (url: string) => void
  setCompanies: (companies: Company[]) => void
  selectCompany: (company: Company) => void
  setContractSteps: (steps: ContractStep[]) => void
  updateContractStep: (stepId: string, updates: Partial<ContractStep>) => void
  setContractProgress: (progress: number) => void
  setCurrentStep: (step: FlowStep) => void
  reset: () => void
}

const initialState = {
  currentStep: 'login' as FlowStep,
  loginStatus: 'idle' as LoginStatus,
  loginMessage: '',
  qrCodeUrl: '',
  selectedCompany: null,
  companies: [],
  contractSteps: [],
  contractProgress: 0
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setLoginStatus: (status, message = '') => 
    set({ loginStatus: status, loginMessage: message }),
  
  setQrCodeUrl: (url) => set({ qrCodeUrl: url }),
  
  setCompanies: (companies) => set({ companies }),
  
  selectCompany: (company) => set({ selectedCompany: company }),
  
  setContractSteps: (steps) => set({ contractSteps: steps }),
  
  updateContractStep: (stepId, updates) =>
    set((state) => ({
      contractSteps: state.contractSteps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    })),
  
  setContractProgress: (progress) => set({ contractProgress: progress }),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  reset: () => set(initialState)
}))
