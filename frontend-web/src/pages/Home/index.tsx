import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        AI RPA 浏览器系统
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        欢迎使用 AI 驱动的 RPA 浏览器自动化系统
      </p>
      <div className="space-x-4">
        <Link
          to="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          登录
        </Link>
        <Link
          to="/dashboard"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          控制台
        </Link>
      </div>
    </div>
  )
}

export default Home
