import { tauriBridge } from '@/utils/tauri-bridge'
import { listen } from '@tauri-apps/api/event'

/**
 * 执行登录流程
 * @param onCallback 登录回调处理函数
 * @returns 回调监听器取消函数
 */
export async function performLogin(
  onCallback: (payload: { status: string; userId: string; username: string }) => void
): Promise<() => void> {
  try {
    // 1. 获取 device_id
    const deviceId = await tauriBridge.getDeviceId()
    console.log('设备ID:', deviceId)

    // 2. 生成 client_id 和 token
    const clientId = await tauriBridge.generateClientId()
    const token = await tauriBridge.generateToken()
    console.log('客户端ID:', clientId)
    console.log('Token:', token)

    // 3. 启动本地回调服务器
    const port = await tauriBridge.startLoginCallbackServer()
    console.log('回调服务器端口:', port)

    // 4. 构造登录 URL
    const loginUrl = `https://login.ai.ccclubs.com/?clientid=${clientId}&token=${token}&callback=http://127.0.0.1:${port}/auth/callback`

    // 5. 设置事件监听
    const unlisten = await listen<{ status: string; user_id: string; username: string }>(
      'login-callback',
      (event) => {
        onCallback({
          status: event.payload.status,
          userId: event.payload.user_id,
          username: event.payload.username,
        })
      }
    )

    // 6. 打开外部浏览器
    await tauriBridge.openLoginBrowser(loginUrl)

    return unlisten
  } catch (error) {
    console.error('登录流程失败:', error)
    throw error
  }
}
