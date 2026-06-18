import axios from './axios'

export interface Session {
  id: string
  sessionId: string
  tenantId: string
  status: string
  startTime?: string
  destroyTime?: string
  createdAt: string
}

export interface CreateSessionRequest {
  memoryLimit?: string
  cpuLimit?: string
  maxLifetime?: number
}

export function getSessions() {
  return axios.get<Session[]>('/session')
}

export function getSession(sessionId: string) {
  return axios.get<Session>(`/session/${sessionId}`)
}

export function createSession(data: CreateSessionRequest) {
  return axios.post<{ sessionId: string; cdpPort: number; proxyUrl: string }>('/session/create', data)
}

export function closeSession(sessionId: string) {
  return axios.post(`/session/${sessionId}/close`)
}