import { CheckCircle, FileText, Building2, Calendar, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function SuccessPage() {
  const { selectedCompany, reset } = useAppStore()

  return (
    <div className="container">
      <div className="page-card">
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div 
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem'
            }}
          >
            <CheckCircle size={64} color="#10b981" />
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            合同备案提交成功
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            您的合同备案申请已成功提交，请等待审核
          </p>

          <div 
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '500px',
              margin: '0 auto 2rem',
              textAlign: 'left'
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              备案信息
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="info-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Building2 size={20} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>备案单位</p>
                  <p style={{ fontWeight: 500 }}>{selectedCompany?.name}</p>
                </div>
              </div>

              <div className="info-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <FileText size={20} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>备案编号</p>
                  <p style={{ fontWeight: 500, fontFamily: 'monospace' }}>BA20260622001</p>
                </div>
              </div>

              <div className="info-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Calendar size={20} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>提交时间</p>
                  <p style={{ fontWeight: 500 }}>2026年6月22日 18:30</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              className="btn"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={20} />
              下载备案凭证
            </button>
            <button 
              className="btn btn-primary"
              onClick={reset}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
