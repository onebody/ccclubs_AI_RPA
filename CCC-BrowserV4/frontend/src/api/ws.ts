type WsMessage = {
  type: string
  data: any
}

type WsHandler = (msg: WsMessage) => void

class TaskWebSocket {
  private ws: WebSocket | null = null
  private handlers: WsHandler[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 3000
  private shouldConnect = false

  private get wsUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${location.host}/ws`
  }

  connect() {
    if (this.shouldConnect) return
    this.shouldConnect = true
    this._doConnect()
  }

  private _doConnect() {
    if (!this.shouldConnect) return
    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        console.log('[WS] 已连接')
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: WsMessage = JSON.parse(event.data)
          this.handlers.forEach(h => h(msg))
        } catch (e) {
          console.error('[WS] 消息解析失败:', e)
        }
      }

      this.ws.onclose = () => {
        console.log('[WS] 连接断开')
        this._scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        console.error('[WS] 连接错误:', err)
      }
    } catch (e) {
      console.error('[WS] 创建连接失败:', e)
      this._scheduleReconnect()
    }
  }

  private _scheduleReconnect() {
    if (!this.shouldConnect || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this._doConnect()
    }, this.reconnectDelay)
  }

  disconnect() {
    this.shouldConnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  onMessage(handler: WsHandler) {
    this.handlers.push(handler)
  }

  offMessage(handler: WsHandler) {
    this.handlers = this.handlers.filter(h => h !== handler)
  }
}

export const taskWs = new TaskWebSocket()
