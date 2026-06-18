import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">AI RPA 控制台</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.username || '用户'}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                欢迎回来，{user?.username || '用户'}！
              </h2>
              <p className="text-gray-600">
                这里是控制台页面，可以管理 RPA 任务和查看执行状态。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
