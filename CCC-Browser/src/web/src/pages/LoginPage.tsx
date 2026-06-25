import { useEffect } from 'react'
import { QrCode, CheckCircle, XCircle, Loader2, Smartphone } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function LoginPage() {
  const { 
    loginStatus, 
    loginMessage, 
    qrCodeUrl, 
    setLoginStatus, 
    setQrCodeUrl,
    setCompanies,
    setCurrentStep 
  } = useAppStore()

  useEffect(() => {
    if (loginStatus === 'idle') {
      initQRCode()
    }
  }, [loginStatus])

  const initQRCode = async () => {
    setLoginStatus('scanning', '正在生成二维码...')
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const mockQrCode = 'data:image/svg+xml,' + encodeURIComponent(`
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
    setQrCodeUrl(mockQrCode)
    setLoginStatus('scanning', '请使用浙政钉扫描二维码')
  }

  const simulateScan = async () => {
    setLoginStatus('scanned', '二维码已扫描，请在手机端确认')
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setLoginStatus('authenticating', '正在验证身份...')
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setLoginStatus('success', '登录成功')
    
    setCompanies([
      { id: '1', name: '杭州科技有限公司', code: '91330100MA2XXXXXX' },
      { id: '2', name: '宁波工业集团有限公司', code: '91330200MA2YYYYYY' },
      { id: '3', name: '温州贸易有限公司', code: '91330300MA2ZZZZZZ' }
    ])
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    setCurrentStep('company-select')
  }

  const getStatusDisplay = () => {
    switch (loginStatus) {
      case 'idle':
        return { icon: Loader2, text: '初始化中...', color: 'text-gray-500', animate: true }
      case 'scanning':
        return { icon: QrCode, text: loginMessage || '请使用浙政钉扫描二维码', color: 'text-blue-600', animate: true }
      case 'scanned':
        return { icon: Smartphone, text: loginMessage, color: 'text-yellow-600', animate: false }
      case 'authenticating':
        return { icon: Loader2, text: loginMessage, color: 'text-blue-600', animate: true }
      case 'success':
        return { icon: CheckCircle, text: loginMessage, color: 'text-green-600', animate: false }
      case 'error':
        return { icon: XCircle, text: loginMessage, color: 'text-red-600', animate: false }
      default:
        return { icon: QrCode, text: '', color: 'text-gray-500', animate: false }
    }
  }

  const statusDisplay = getStatusDisplay()
  const StatusIcon = statusDisplay.icon

  return (
    <div className="container">
      <div className="page-card">
        <div className="page-header">
          <h1 className="page-title">单位登录</h1>
          <p className="page-subtitle">通过浙政钉扫码完成身份验证</p>
        </div>

        <div className="flex flex-center" style={{ marginTop: '3rem' }}>
          <div className="login-container" style={{ textAlign: 'center' }}>
            <div 
              className="qrcode-wrapper"
              style={{
                width: '240px',
                height: '240px',
                margin: '0 auto',
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="登录二维码" 
                  style={{ 
                    width: '200px', 
                    height: '200px',
                    animation: loginStatus === 'scanning' ? 'pulse 2s infinite' : 'none'
                  }} 
                />
              )}
              {loginStatus === 'success' && (
                <div 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CheckCircle size={80} color="#10b981" />
                </div>
              )}
            </div>

            <div className="status-display mt-4">
              <div className={`flex flex-center gap-2 ${statusDisplay.color}`}>
                <StatusIcon 
                  size={24} 
                  className={statusDisplay.animate ? 'animate-spin' : ''}
                />
                <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                  {statusDisplay.text}
                </span>
              </div>
            </div>

            <div className="login-hint mt-4" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <p>打开浙政钉 APP</p>
              <p>点击「扫一扫」扫描上方二维码</p>
            </div>

            {loginStatus !== 'success' && loginStatus !== 'error' && (
              <button 
                className="btn btn-primary mt-4"
                onClick={simulateScan}
                style={{ minWidth: '200px' }}
              >
                模拟扫码（演示用）
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
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
