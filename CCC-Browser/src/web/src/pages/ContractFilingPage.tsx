import { useEffect, useState } from 'react'
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Circle, 
  Loader2, 
  AlertCircle,
  File,
  Shield,
  Clock,
  ArrowRight
} from 'lucide-react'
import { useAppStore, ContractStep } from '../store/useAppStore'

const CONTRACT_STEPS: Omit<ContractStep, 'status' | 'progress' | 'message'>[] = [
  { id: 'info', name: '基本信息填写' },
  { id: 'upload', name: '合同文件上传' },
  { id: 'validate', name: '数据校验' },
  { id: 'review', name: '信息确认' },
  { id: 'submit', name: '提交备案' }
]

export default function ContractFilingPage() {
  const { 
    selectedCompany, 
    contractSteps, 
    setContractSteps,
    updateContractStep,
    contractProgress,
    setContractProgress,
    setCurrentStep 
  } = useAppStore()
  
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (contractSteps.length === 0) {
      setContractSteps(
        CONTRACT_STEPS.map(step => ({
          ...step,
          status: 'pending' as const,
          progress: 0
        }))
      )
    }
  }, [])

  const simulateProcess = async () => {
    if (isRunning) return
    setIsRunning(true)

    for (let i = 0; i < CONTRACT_STEPS.length; i++) {
      const step = CONTRACT_STEPS[i]
      
      updateContractStep(step.id, { 
        status: 'in-progress', 
        progress: 0,
        message: '正在初始化...'
      })
      setContractProgress((i / CONTRACT_STEPS.length) * 100)

      await new Promise(resolve => setTimeout(resolve, 800))

      if (step.id === 'info') {
        updateContractStep(step.id, { 
          progress: 25,
          message: '正在填写企业信息...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 50,
          message: '正在验证信息格式...'
        })
        await new Promise(resolve => setTimeout(resolve, 800))
        
        updateContractStep(step.id, { 
          progress: 75,
          message: '正在保存基本信息...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 100,
          status: 'completed',
          message: '基本信息填写完成'
        })
      }

      if (step.id === 'upload') {
        updateContractStep(step.id, { 
          progress: 20,
          message: '正在连接文件服务器...'
        })
        await new Promise(resolve => setTimeout(resolve, 800))
        
        updateContractStep(step.id, { 
          progress: 40,
          message: '正在上传合同扫描件...'
        })
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        updateContractStep(step.id, { 
          progress: 60,
          message: '正在上传附件材料...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 80,
          message: '正在验证文件完整性...'
        })
        await new Promise(resolve => setTimeout(resolve, 800))
        
        updateContractStep(step.id, { 
          progress: 100,
          status: 'completed',
          message: '文件上传完成'
        })
      }

      if (step.id === 'validate') {
        updateContractStep(step.id, { 
          progress: 20,
          message: '正在校验企业资质...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 40,
          message: '正在校验合同内容...'
        })
        await new Promise(resolve => setTimeout(resolve, 800))
        
        updateContractStep(step.id, { 
          progress: 60,
          message: '正在校验日期有效期...'
        })
        await new Promise(resolve => setTimeout(resolve, 600))
        
        updateContractStep(step.id, { 
          progress: 80,
          message: '正在校验金额信息...'
        })
        await new Promise(resolve => setTimeout(resolve, 800))
        
        updateContractStep(step.id, { 
          progress: 100,
          status: 'completed',
          message: '数据校验通过'
        })
      }

      if (step.id === 'review') {
        updateContractStep(step.id, { 
          progress: 33,
          message: '正在生成预览...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 66,
          message: '请确认信息准确性...'
        })
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        updateContractStep(step.id, { 
          progress: 100,
          status: 'completed',
          message: '信息确认完成'
        })
      }

      if (step.id === 'submit') {
        updateContractStep(step.id, { 
          progress: 20,
          message: '正在提交备案申请...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 50,
          message: '正在处理备案信息...'
        })
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        updateContractStep(step.id, { 
          progress: 80,
          message: '正在生成备案编号...'
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updateContractStep(step.id, { 
          progress: 100,
          status: 'completed',
          message: '备案提交成功'
        })
        
        setContractProgress(100)
        setCurrentStep('completed')
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const getStepIcon = (step: ContractStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={24} color="#10b981" />
      case 'in-progress':
        return <Loader2 size={24} color="#2563eb" className="animate-spin" />
      case 'error':
        return <AlertCircle size={24} color="#ef4444" />
      default:
        return <Circle size={24} color="#94a3b8" />
    }
  }

  return (
    <div className="container">
      <div className="page-card">
        <div className="page-header">
          <h1 className="page-title">合同备案</h1>
          <p className="page-subtitle">
            当前单位：{selectedCompany?.name} ({selectedCompany?.code})
          </p>
        </div>

        <div className="progress-overview mb-6">
          <div className="flex flex-between mb-2">
            <span style={{ fontWeight: 500 }}>整体进度</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {Math.round(contractProgress)}%
            </span>
          </div>
          <div 
            style={{
              height: '8px',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                height: '100%',
                width: `${contractProgress}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>

        <div className="steps-timeline">
          {contractSteps.map((step, index) => (
            <div 
              key={step.id}
              className="step-item"
              style={{
                display: 'flex',
                gap: '1.5rem',
                paddingBottom: index < contractSteps.length - 1 ? '2rem' : 0,
                position: 'relative'
              }}
            >
              <div 
                className="step-indicator"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 
                      step.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' :
                      step.status === 'in-progress' ? 'rgba(37, 99, 235, 0.1)' :
                      'var(--bg-tertiary)',
                    border: 
                      step.status === 'completed' ? '2px solid #10b981' :
                      step.status === 'in-progress' ? '2px solid var(--primary)' :
                      '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                  }}
                >
                  {getStepIcon(step)}
                </div>
                {index < contractSteps.length - 1 && (
                  <div 
                    style={{
                      width: '2px',
                      height: 'calc(100% + 1rem)',
                      background: 
                        step.status === 'completed' ? '#10b981' : 'var(--border)',
                      marginTop: '0.5rem',
                      transition: 'background 0.3s'
                    }}
                  />
                )}
              </div>

              <div 
                className="step-content"
                style={{
                  flex: 1,
                  paddingBottom: '1rem'
                }}
              >
                <div className="flex flex-between mb-2">
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: 600,
                    color: step.status === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)'
                  }}>
                    {step.name}
                  </h3>
                  {step.status !== 'pending' && (
                    <span style={{ 
                      fontSize: '0.875rem',
                      color: 
                        step.status === 'completed' ? '#10b981' :
                        step.status === 'in-progress' ? 'var(--primary)' :
                        'var(--error)'
                    }}>
                      {step.status === 'completed' ? '已完成' : 
                       step.status === 'in-progress' ? '进行中' : '错误'}
                    </span>
                  )}
                </div>

                {step.status === 'in-progress' && (
                  <div className="step-progress mb-2">
                    <div 
                      style={{
                        height: '4px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        style={{
                          height: '100%',
                          width: `${step.progress}%`,
                          background: 'var(--primary)',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="step-message" style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  {step.message || '等待执行'}
                </div>

                {step.status === 'in-progress' && (
                  <div className="step-details mt-2">
                    <div className="detail-card" style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)',
                      padding: '1rem',
                      marginTop: '0.5rem'
                    }}>
                      {step.id === 'info' && (
                        <div className="flex gap-3">
                          <FileText size={20} color="var(--text-secondary)" />
                          <div>
                            <p style={{ fontWeight: 500 }}>企业信息</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {selectedCompany?.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {step.id === 'upload' && (
                        <div className="flex gap-3">
                          <Upload size={20} color="var(--text-secondary)" />
                          <div>
                            <p style={{ fontWeight: 500 }}>合同文件</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              contract.pdf - 2.4 MB
                            </p>
                          </div>
                        </div>
                      )}
                      {step.id === 'validate' && (
                        <div className="flex gap-3">
                          <Shield size={20} color="var(--text-secondary)" />
                          <div>
                            <p style={{ fontWeight: 500 }}>校验项目</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              企业资质 | 合同内容 | 日期有效期 | 金额信息
                            </p>
                          </div>
                        </div>
                      )}
                      {step.id === 'review' && (
                        <div className="flex gap-3">
                          <Clock size={20} color="var(--text-secondary)" />
                          <div>
                            <p style={{ fontWeight: 500 }}>预览确认</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              请核对所有信息，确保准确无误
                            </p>
                          </div>
                        </div>
                      )}
                      {step.id === 'submit' && (
                        <div className="flex gap-3">
                          <File size={20} color="var(--text-secondary)" />
                          <div>
                            <p style={{ fontWeight: 500 }}>备案申请</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              提交至浙江省交通运输管理局
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isRunning && contractSteps.every(s => s.status !== 'completed') && (
          <div className="flex flex-center mt-6" style={{ marginTop: '2rem' }}>
            <button 
              className="btn btn-primary"
              onClick={simulateProcess}
              style={{ minWidth: '200px' }}
            >
              <span>开始合同备案流程</span>
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        <style>{`
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
