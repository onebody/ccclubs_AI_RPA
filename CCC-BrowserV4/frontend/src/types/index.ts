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

// 站点信息类型
export interface SiteInfo {
  id: number
  name: string
  url: string
  type: '政务网站' | '企业查询' | '司法查询' | '信用服务' | '其他'
  remark: string
  enabled: boolean
  createdAt: string
}
