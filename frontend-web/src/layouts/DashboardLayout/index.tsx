import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface MenuItem {
  key: string
  label: string
  path: string
  icon: string
  roles?: ('admin' | 'user' | 'guest')[]
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '仪表盘', path: '/dashboard', icon: '📊', roles: ['admin', 'user', 'guest'] },
  { key: 'competitions', label: '比赛管理', path: '/competitions', icon: '🏆', roles: ['admin', 'user'] },
  { key: 'participants', label: '选手管理', path: '/participants', icon: '👥', roles: ['admin', 'user'] },
  { key: 'announcements', label: '公告管理', path: '/announcements', icon: '📢', roles: ['admin'] },
  { key: 'settings', label: '系统设置', path: '/settings', icon: '⚙️', roles: ['admin'] },
]

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className={`bg-gray-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          {sidebarOpen ? (
            <h1 className="text-xl font-bold">AI RPA 系统</h1>
          ) : (
            <span className="text-2xl">🤖</span>
          )}
        </div>

        {/* 菜单 */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredMenuItems.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-gray-400">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
                title="退出登录"
              >
                🚪
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-gray-400 hover:text-white transition-colors"
              title="退出登录"
            >
              🚪
            </button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              租户: {user?.tenant_id || '-'}
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
