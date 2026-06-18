import axios from './axios'

export interface Tenant {
  id: string
  name: string
  quota: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTenantRequest {
  name: string
  quota?: number
}

export interface UpdateTenantRequest {
  name?: string
  quota?: number
  enabled?: boolean
}

export function getTenants() {
  return axios.get<Tenant[]>('/tenant')
}

export function getTenant(id: string) {
  return axios.get<Tenant>(`/tenant/${id}`)
}

export function createTenant(data: CreateTenantRequest) {
  return axios.post<Tenant>('/tenant', data)
}

export function updateTenant(id: string, data: UpdateTenantRequest) {
  return axios.patch<Tenant>(`/tenant/${id}`, data)
}

export function deleteTenant(id: string) {
  return axios.delete(`/tenant/${id}`)
}