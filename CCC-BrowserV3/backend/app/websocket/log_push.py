"""
WebSocket 实时日志推送模块
基于 FastAPI WebSocket 实现服务端到前端的实时日志流推送
"""
import asyncio
import json
from typing import Set, Dict, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

router = APIRouter()


class LogManager:
    """
    日志管理器
    
    核心职责：
    1. 维护所有 WebSocket 客户端连接
    2. 提供统一的日志广播接口
    3. 支持按会话/任务过滤推送
    """

    def __init__(self):
        # 所有活跃的 WebSocket 连接
        self._connections: Set[WebSocket] = set()
        # 日志历史记录（最近 1000 条）
        self._history: list = []
        self._max_history = 1000

    async def connect(self, websocket: WebSocket):
        """接受新的 WebSocket 连接"""
        await websocket.accept()
        self._connections.add(websocket)
        logger.info(f"WebSocket 客户端已连接, 当前连接数: {len(self._connections)}")

        # 发送历史日志（最近 50 条）
        recent = self._history[-50:] if self._history else []
        await websocket.send_json({
            "type": "history",
            "data": recent,
        })

    def disconnect(self, websocket: WebSocket):
        """移除断开的 WebSocket 连接"""
        self._connections.discard(websocket)
        logger.info(f"WebSocket 客户端已断开, 当前连接数: {len(self._connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        广播日志消息给所有连接的客户端
        
        Args:
            message: 日志消息字典，包含 type、level、message、timestamp 等字段
        """
        # 添加时间戳
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        # 保存到历史记录
        self._history.append(message)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        # 广播给所有连接
        dead_connections = set()
        for conn in self._connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead_connections.add(conn)

        # 清理失效连接
        self._connections -= dead_connections

    async def log_task_event(
        self,
        task_id: str,
        instance_id: str,
        event_type: str,
        message: str,
        data: Dict[str, Any] = None,
    ):
        """
        推送任务执行事件日志
        
        Args:
            task_id: 任务ID
            instance_id: 执行实例ID
            event_type: 事件类型 (step_start/step_complete/error/progress)
            message: 日志消息
            data: 附加数据
        """
        await self.broadcast({
            "type": "task_event",
            "task_id": task_id,
            "instance_id": instance_id,
            "event_type": event_type,
            "message": message,
            "data": data or {},
        })

    async def log_system(self, level: str, message: str):
        """推送系统级日志"""
        await self.broadcast({
            "type": "system_log",
            "level": level,
            "message": message,
        })

    @property
    def connection_count(self) -> int:
        """当前连接数"""
        return len(self._connections)


# 全局日志管理器单例
log_manager = LogManager()


# ============================
# WebSocket 端点
# ============================

@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """
    WebSocket 日志推送端点
    
    客户端连接后可实时接收：
    - 任务执行事件（步骤开始/完成/错误/进度）
    - 系统级日志
    - 会话状态变更
    """
    await log_manager.connect(websocket)
    try:
        while True:
            # 保持连接，接收客户端心跳或指令
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # 支持客户端发送 ping 心跳
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        log_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket 异常: {e}")
        log_manager.disconnect(websocket)
