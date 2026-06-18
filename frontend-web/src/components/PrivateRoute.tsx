import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const PrivateRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

export default PrivateRoute
