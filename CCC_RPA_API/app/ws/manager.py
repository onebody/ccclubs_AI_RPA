from fastapi import WebSocket
from typing import Dict
import json

class ConnectionManager:
    """管理所有 WebSocket 连接，支持广播消息"""
    def __init__(self):
        self._connections: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._connections[websocket] = {}

    def disconnect(self, websocket: WebSocket):
        self._connections.pop(websocket, None)

    async def broadcast(self, message: dict):
        data = json.dumps(message, ensure_ascii=False)
        dead = []
        for ws in list(self._connections.keys()):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()
