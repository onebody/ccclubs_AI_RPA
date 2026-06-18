import { useAuthStore } from '../../stores/authStore'

const Settings = () => {
  const { user, token } = useAuthStore()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h1>

      {/* 用户信息 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">用户信息</h2>
        <div className="space-y-3">
          <div className="flex">
            <span className="w-24 text-gray-600">用户名</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-gray-600">邮箱</span>
            <span className="font-medium">{user?.email || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-gray-600">角色</span>
            <span className="font-medium">{user?.role}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-gray-600">租户 ID</span>
            <span className="font-medium">{user?.tenant_id || '-'}</span>
          </div>
        </div>
      </div>

      {/* Token 信息 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">认证信息</h2>
        <div className="space-y-3">
          <div>
            <span className="text-gray-600">Token 状态</span>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs rounded-full ${token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {token ? '已认证' : '未认证'}
              </span>
            </div>
          </div>
          {token && (
            <div>
              <span className="text-gray-600">Token (前20位)</span>
              <div className="mt-1 px-3 py-2 bg-gray-50 rounded text-sm font-mono">
                {token.slice(0, 20)}...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">操作</h2>
        <div className="space-y-3">
          <button
            onClick={() => {
              localStorage.clear()
              window.location.href = '/login'
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            清除本地数据并退出
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
