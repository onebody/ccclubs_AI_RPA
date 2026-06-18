import { http } from './index'

export interface LoginDto {
  tenant_id: string
  username: string
  password: string
  remember_me?: boolean
}

export interface RegisterDto {
  tenant_id: string
  username: string
  email: string
  password: string
  confirm_password: string
}

export interface AuthResponse {
  access_token: string
  user: {
    id: string
    username: string
    email: string
    role: 'admin' | 'user' | 'guest'
    tenant_id: string
  }
}

export const authApi = {
  /**
   * 登录
   */
  login: (data: LoginDto): Promise<AuthResponse> =>
    http.post('/auth/login', data),

  /**
   * 注册
   */
  register: (data: RegisterDto): Promise<void> =>
    http.post('/auth/register', data),

  /**
   * 登出
   */
  logout: (): Promise<void> =>
    http.post('/auth/logout'),

  /**
   * 获取当前用户信息
   */
  getProfile: (): Promise<AuthResponse['user']> =>
    http.get('/auth/profile'),

  /**
   * 刷新 Token
   */
  refreshToken: (): Promise<{ access_token: string }> =>
    http.post('/auth/refresh'),
}
