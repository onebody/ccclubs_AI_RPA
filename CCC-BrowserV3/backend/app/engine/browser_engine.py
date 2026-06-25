"""
Playwright 浏览器引擎核心封装
负责管理 Chromium 浏览器实例、BrowserContext 会话隔离、页面操作
"""
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from loguru import logger

from app.config import settings


class SessionInfo:
    """浏览器会话信息"""
    def __init__(self, session_id: str, context: BrowserContext, page: Page):
        self.session_id = session_id
        self.context = context
        self.page = page
        self.created_at = datetime.now()
        self.status = "active"  # active | closed | expired


class BrowserEngine:
    """
    Playwright 浏览器引擎管理器
    
    核心职责：
    1. 管理 Chromium 浏览器实例的生命周期
    2. 通过 BrowserContext 实现多会话隔离
    3. 提供页面操作的统一接口
    """

    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._sessions: Dict[str, SessionInfo] = {}

    async def _ensure_browser(self) -> Browser:
        """确保浏览器实例已启动（懒加载单例）"""
        if self._browser is None or not self._browser.is_connected():
            logger.info("正在启动 Chromium 浏览器...")
            self._playwright = await async_playwright().start()

            # 构建浏览器启动参数
            launch_args = {
                "headless": settings.BROWSER_HEADLESS,
                "slow_mo": settings.BROWSER_SLOW_MO,
                "args": [
                    # 禁用自动化特征检测
                    "--disable-blink-features=AutomationControlled",
                    # 禁用-infobars 提示条
                    "--disable-infobars",
                    # 禁用扩展
                    "--disable-extensions",
                ],
            }

            # 如果配置了自定义 Chromium 路径
            if settings.CHROMIUM_PATH:
                launch_args["executable_path"] = settings.CHROMIUM_PATH

            self._browser = await self._playwright.chromium.launch(**launch_args)
            logger.info("Chromium 浏览器启动成功")

        return self._browser

    async def launch(
        self,
        url: Optional[str] = None,
        headless: Optional[bool] = None,
        storage_state_path: Optional[str] = None,
    ) -> str:
        """
        启动新的浏览器会话（BrowserContext）
        
        每个会话拥有独立的 Cookie、LocalStorage、缓存，互不干扰。
        
        Args:
            url: 可选的初始导航 URL
            headless: 是否无头模式（覆盖全局配置）
            storage_state_path: 可选的 storage_state 文件路径（用于恢复登录态）
        
        Returns:
            session_id: 会话唯一标识
        """
        browser = await self._ensure_browser()
        session_id = str(uuid.uuid4())

        # 构建 BrowserContext 参数
        context_args: Dict[str, Any] = {
            "viewport": {"width": 1280, "height": 800},
            "user_agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }

        # 如果提供了 storage_state，则加载已有登录态
        if storage_state_path:
            context_args["storage_state"] = storage_state_path
            logger.info(f"加载登录态: {storage_state_path}")

        # 创建独立的浏览器上下文
        context = await browser.new_context(**context_args)
        page = await context.new_page()

        # 注入反检测脚本（隐藏自动化特征）
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

        # 如果指定了初始 URL，则导航
        if url:
            await page.goto(url, wait_until="domcontentloaded")
            logger.info(f"页面已导航至: {url}")

        # 注册会话
        self._sessions[session_id] = SessionInfo(session_id, context, page)
        logger.info(f"浏览器会话已创建: {session_id}")

        return session_id

    async def close(self, session_id: str) -> None:
        """
        关闭指定的浏览器会话
        
        Args:
            session_id: 会话唯一标识
            
        Raises:
            KeyError: 会话ID不存在
        """
        if session_id not in self._sessions:
            raise KeyError(f"会话不存在: {session_id}")

        session = self._sessions[session_id]
        try:
            await session.context.close()
            logger.info(f"浏览器会话已关闭: {session_id}")
        except Exception as e:
            logger.warning(f"关闭会话时出错: {session_id}, {e}")
        finally:
            session.status = "closed"
            del self._sessions[session_id]

    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """
        获取会话状态信息
        
        Args:
            session_id: 会话唯一标识
            
        Returns:
            会话状态字典
        """
        if session_id not in self._sessions:
            raise KeyError(f"会话不存在: {session_id}")

        session = self._sessions[session_id]
        return {
            "status": session.status,
            "created_at": session.created_at.isoformat(),
            "url": session.page.url,
        }

    def get_page(self, session_id: str) -> Page:
        """
        获取会话对应的 Page 对象（供其他模块调用）
        
        Args:
            session_id: 会话唯一标识
            
        Returns:
            Playwright Page 对象
        """
        if session_id not in self._sessions:
            raise KeyError(f"会话不存在: {session_id}")
        return self._sessions[session_id].page

    def get_context(self, session_id: str) -> BrowserContext:
        """
        获取会话对应的 BrowserContext 对象
        
        Args:
            session_id: 会话唯一标识
            
        Returns:
            Playwright BrowserContext 对象
        """
        if session_id not in self._sessions:
            raise KeyError(f"会话不存在: {session_id}")
        return self._sessions[session_id].context

    async def shutdown(self) -> None:
        """关闭所有会话并释放浏览器资源"""
        logger.info("正在关闭所有浏览器会话...")
        session_ids = list(self._sessions.keys())
        for sid in session_ids:
            try:
                await self.close(sid)
            except Exception as e:
                logger.warning(f"关闭会话 {sid} 时出错: {e}")

        if self._browser:
            await self._browser.close()
            self._browser = None

        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

        logger.info("浏览器引擎已完全关闭")
