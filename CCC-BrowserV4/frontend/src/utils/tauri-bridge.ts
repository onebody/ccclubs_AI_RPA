import { invoke } from '@tauri-apps/api/core'

/**
 * Tauri 命令封装
 */
export const tauriBridge = {
  /**
   * 获取设备唯一标识（持久化）
   */
  getDeviceId: () => invoke<string>('get_device_id'),

  /**
   * 生成客户端标识（每次登录会话唯一）
   */
  generateClientId: () => invoke<string>('generate_client_id'),

  /**
   * 生成随机 token（32位 hex）
   */
  generateToken: () => invoke<string>('generate_token'),

  /**
   * 打开外部浏览器
   */
  openLoginBrowser: (url: string) => invoke('open_login_browser', { url }),

  /**
   * 启动登录回调服务器
   * @returns 本地端口号
   */
  startLoginCallbackServer: () => invoke<number>('start_login_callback_server'),
}
