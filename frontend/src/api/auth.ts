import axios from './axios'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    username: string
    role: string
    tenantId: string
  }
}

export function login(data: LoginRequest) {
  return axios.post<LoginResponse>('/auth/login', data)
}