// 登录状态类型
export interface AuthState {
  isLoggedIn: boolean
  userId: string | null
  username: string | null
  token: string | null        // 服务端返回的 session token
  clientToken: string | null  // 客户端生成的登录 token
}

// 设备信息类型
export interface DeviceState {
  deviceId: string | null     // 设备唯一标识，持久化
  clientId: string | null     // 客户端标识，每次登录会话生成
}

// 菜单项类型
export interface MenuItem {
  index: string
  icon: string
  title: string
}

// 任务信息类型
export interface TaskInfo {
  id: number
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  tenantId: string | null
  deviceId: string | null
  customerName: string | null
  handlerAccount: string | null
  subTasks: string[] | null
  province: string | null
  lastExecutedAt: string | null
  nextExecutedAt: string | null
  lastResult: string | null
  remark: string | null
  deleted: boolean
  createdAt: string
  updatedAt: string
}
