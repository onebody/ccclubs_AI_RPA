import request from './request'

export interface TenantInfo {
  id: string
  name: string
}

export interface DeviceInfo {
  id: string
  name: string
}

/** 获取租户列表 */
export function getTenantList(): Promise<TenantInfo[]> {
  return request.get('/tenants') as Promise<TenantInfo[]>
}

/** 获取设备列表 */
export function getDeviceList(): Promise<DeviceInfo[]> {
  return request.get('/devices') as Promise<DeviceInfo[]>
}
