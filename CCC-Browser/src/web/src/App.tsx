import { useAppStore } from './store/useAppStore'
import LoginPage from './pages/LoginPage'
import CompanySelectPage from './pages/CompanySelectPage'
import ContractFilingPage from './pages/ContractFilingPage'
import SuccessPage from './pages/SuccessPage'
import { CheckCircle, Users, FileText, ArrowRight } from 'lucide-react'

export default function App() {
  const { currentStep, reset } = useAppStore()

  const renderStepIndicator = () => {
    const steps = [
      { key: 'login', label: '登录', icon: Users },
      { key: 'company-select', label: '选择单位', icon: Users },
      { key: 'contract-filing', label: '合同备案', icon: FileText },
    ]

    const currentIndex = steps.findIndex(s => s.key === currentStep)

    return (
      <div className="step-indicator-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem 0'
      }}>
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = index <= currentIndex
          const isCurrent = step.key === currentStep

          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--primary)' : 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isCurrent ? '3px solid var(--primary-light)' : 'none',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  {isActive ? (
                    <CheckCircle size={24} color="white" />
                  ) : (
                    <Icon size={24} color="var(--text-secondary)" />
                  )}
                </div>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div style={{
                  width: '60px',
                  height: '2px',
                  background: index < currentIndex ? 'var(--primary)' : 'var(--border)',
                  margin: '0 0.5rem',
                  marginBottom: '2rem',
                  transition: 'background 0.3s'
                }} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="app" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {currentStep !== 'completed' && (
        <div style={{
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          padding: '1rem 2rem'
        }}>
          <div className="container">
            <div className="flex flex-between">
              <div className="flex gap-3">
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--primary)',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={24} color="white" />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>合同备案系统</h1>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    浙江交警122平台
                  </p>
                </div>
              </div>
              {currentStep !== 'login' && (
                <button
                  onClick={reset}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  重新开始
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep !== 'completed' && renderStepIndicator()}

      {currentStep === 'login' && <LoginPage />}
      {currentStep === 'company-select' && <CompanySelectPage />}
      {currentStep === 'contract-filing' && <ContractFilingPage />}
      {currentStep === 'completed' && <SuccessPage />}
    </div>
  )
}
