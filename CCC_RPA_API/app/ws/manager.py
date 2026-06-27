from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect
from typing import Dict
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """管理所有 WebSocket 连接，支持广播消息"""
    def __init__(self):
        self._connections: Dict[WebSocket, int] = {}  # ws -> fail_count

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._connections[websocket] = 0

    def disconnect(self, websocket: WebSocket):
        self._connections.pop(websocket, None)

    async def broadcast(self, message: dict):
        data = json.dumps(message, ensure_ascii=False)
        dead = []
        for ws in list(self._connections.keys()):
            try:
                await ws.send_text(data)
                # 成功后重置失败计数
                self._connections[ws] = 0
            except WebSocketDisconnect:
                dead.append(ws)
            except Exception as e:
                # 临时错误，增加失败计数
                self._connections[ws] = self._connections.get(ws, 0) + 1
                fail_count = self._connections[ws]
                logger.warning(f"WebSocket send failed ({fail_count}/3): {e}")
                if fail_count >= 3:
                    dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()
