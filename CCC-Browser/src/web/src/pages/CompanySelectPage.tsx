import { Building2, Check, ArrowRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function CompanySelectPage() {
  const { 
    companies, 
    selectedCompany, 
    selectCompany, 
    setCurrentStep 
  } = useAppStore()

  const handleContinue = () => {
    if (selectedCompany) {
      setCurrentStep('contract-filing')
    }
  }

  return (
    <div className="container">
      <div className="page-card">
        <div className="page-header">
          <h1 className="page-title">选择单位</h1>
          <p className="page-subtitle">请选择需要办理业务的单位</p>
        </div>

        <div className="grid grid-3">
          {companies.map((company) => (
            <div 
              key={company.id}
              className="company-card card"
              onClick={() => selectCompany(company)}
              style={{
                cursor: 'pointer',
                border: selectedCompany?.id === company.id 
                  ? '2px solid var(--primary)' 
                  : '1px solid var(--border)',
                background: selectedCompany?.id === company.id 
                  ? 'rgba(37, 99, 235, 0.05)' 
                  : 'var(--bg-primary)'
              }}
            >
              <div className="flex gap-3">
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Building2 size={24} color="var(--text-secondary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="card-title" style={{ 
                    fontSize: '1rem',
                    marginBottom: '0.25rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {company.name}
                  </h3>
                  <p className="card-text" style={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.75rem'
                  }}>
                    {company.code}
                  </p>
                </div>
                {selectedCompany?.id === company.id && (
                  <div 
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Check size={16} color="white" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-between mt-6" style={{ marginTop: '2rem' }}>
          <div></div>
          <button 
            className="btn btn-primary"
            disabled={!selectedCompany}
            onClick={handleContinue}
            style={{ minWidth: '160px' }}
          >
            <span>继续</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
