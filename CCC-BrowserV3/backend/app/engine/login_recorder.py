"""
登录流程录制模块
负责捕获二维码登录流程、检测登录状态、持久化 storage_state
"""
import json
from typing import Optional, Dict, Any
from pathlib import Path
from loguru import logger

from app.config import settings
from app.engine.browser_engine import BrowserEngine


class LoginRecorder:
    """
    登录流程录制器
    
    核心职责：
    1. 导航至目标网站并等待二维码出现
    2. 捕获二维码 DOM 节点并截图回传
    3. 轮询检测登录是否成功（通过监听 DOM 变化或网络请求）
    4. 登录成功后序列化 storage_state 保存至本地
    """

    def __init__(self, engine: BrowserEngine):
        self.engine = engine

    async def start_recording(
        self,
        session_id: str,
        target_url: str,
    ) -> Dict[str, Any]:
        """
        开始录制登录流程
        
        导航至目标 URL，并启动登录状态检测。
        
        Args:
            session_id: 浏览器会话ID
            target_url: 目标登录页面 URL
            
        Returns:
            录制状态信息
        """
        page = self.engine.get_page(session_id)

        # 导航至目标页面
        await page.goto(target_url, wait_until="domcontentloaded")
        logger.info(f"登录录制开始: {target_url}")

        return {
            "session_id": session_id,
            "status": "recording",
            "target_url": target_url,
            "message": "请在浏览器窗口中完成登录操作",
        }

    async def capture_qr_code(
        self,
        session_id: str,
        qr_selector: str,
    ) -> Optional[str]:
        """
        捕获二维码元素截图
        
        Args:
            session_id: 浏览器会话ID
            qr_selector: 二维码 DOM 元素的 CSS 选择器
            
        Returns:
            截图的 base64 编码字符串，失败返回 None
        """
        page = self.engine.get_page(session_id)

        try:
            # 等待二维码元素出现
            qr_element = await page.wait_for_selector(qr_selector, timeout=15000)
            if qr_element:
                screenshot_bytes = await qr_element.screenshot()
                import base64
                qr_base64 = base64.b64encode(screenshot_bytes).decode("utf-8")
                logger.info("二维码截图已捕获")
                return qr_base64
        except Exception as e:
            logger.warning(f"二维码捕获失败: {e}")

        return None

    async def check_login_status(
        self,
        session_id: str,
        success_selector: Optional[str] = None,
        success_url_pattern: Optional[str] = None,
    ) -> bool:
        """
        检测登录是否成功
        
        支持两种检测方式：
        1. DOM 元素检测：等待特定元素出现（如"退出登录"按钮）
        2. URL 模式匹配：检测页面 URL 是否包含特定模式
        
        Args:
            session_id: 浏览器会话ID
            success_selector: 登录成功后才出现的 DOM 元素选择器
            success_url_pattern: 登录成功后 URL 应包含的模式
            
        Returns:
            是否登录成功
        """
        page = self.engine.get_page(session_id)

        # 方式1：DOM 元素检测
        if success_selector:
            try:
                element = await page.query_selector(success_selector)
                if element:
                    logger.info("登录状态检测成功（DOM元素匹配）")
                    return True
            except Exception:
                pass

        # 方式2：URL 模式匹配
        if success_url_pattern:
            current_url = page.url
            if success_url_pattern in current_url:
                logger.info(f"登录状态检测成功（URL匹配: {current_url}）")
                return True

        return False

    async def save_storage_state(
        self,
        session_id: str,
        filename: Optional[str] = None,
    ) -> str:
        """
        保存当前会话的 storage_state（Cookie + LocalStorage）
        
        登录成功后调用，将登录态序列化保存至本地文件，
        后续任务可直接加载该文件实现免登录。
        
        Args:
            session_id: 浏览器会话ID
            filename: 可选的自定义文件名
            
        Returns:
            保存的文件路径
        """
        context = self.engine.get_context(session_id)

        # 生成文件路径
        if not filename:
            filename = f"session_{session_id}.json"
        save_path = settings.storage_state_path / filename

        # 序列化 storage_state
        storage_state = await context.storage_state(path=str(save_path))
        logger.info(f"登录态已保存至: {save_path}")

        return str(save_path)

    async def stop_recording(
        self,
        session_id: str,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        停止录制并保存登录态
        
        Args:
            session_id: 浏览器会话ID
            filename: 可选的自定义文件名
            
        Returns:
            录制结果信息
        """
        try:
            storage_path = await self.save_storage_state(session_id, filename)
            return {
                "session_id": session_id,
                "status": "saved",
                "storage_state_path": storage_path,
                "message": "登录态已保存",
            }
        except Exception as e:
            logger.error(f"停止录制失败: {e}")
            return {
                "session_id": session_id,
                "status": "error",
                "message": f"保存失败: {str(e)}",
            }
