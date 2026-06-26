import os
import threading
import queue
import logging
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Playwright

logger = logging.getLogger(__name__)


class BrowserSessionManager:
    """按省份管理 Playwright 浏览器会话，持久化 storage_state。
    所有 Playwright 操作都在专用工作线程中执行，避免线程冲突。
    """

    _playwright: Playwright | None = None
    _browser: Browser | None = None
    _contexts: dict[str, BrowserContext] = {}  # province -> context
    _lock = threading.Lock()
    _storage_dir: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "browser_states",
    )

    # 专用线程相关
    _worker_thread: threading.Thread | None = None
    _task_queue: queue.Queue | None = None
    _ready_event: threading.Event | None = None

    @classmethod
    def _ensure_initialized(cls):
        """启动专用 Playwright 工作线程（幂等）"""
        if cls._browser is not None:
            return
        with cls._lock:
            if cls._browser is not None:
                return
            os.makedirs(cls._storage_dir, exist_ok=True)
            cls._task_queue = queue.Queue()
            cls._ready_event = threading.Event()

            def _worker():
                try:
                    pw = sync_playwright().start()
                    cls._playwright = pw
                    cls._browser = pw.chromium.launch(
                        headless=False,
                        args=[
                            '--disable-blink-features=AutomationControlled',
                            '--no-sandbox',
                        ],
                    )
                    cls._ready_event.set()
                    # 主循环：从队列取任务执行
                    while True:
                        item = cls._task_queue.get()
                        if item is None:  # 退出信号
                            break
                        fn, event, result = item
                        try:
                            result.append(fn())
                        except Exception as e:
                            result.append(e)
                        finally:
                            event.set()
                except Exception as e:
                    print(f"[BrowserSessionManager] Worker error: {e}")
                    cls._ready_event.set()

            cls._worker_thread = threading.Thread(
                target=_worker, daemon=True, name="playwright-worker"
            )
            cls._worker_thread.start()
            cls._ready_event.wait(timeout=30)
            if cls._browser is None:
                raise RuntimeError("Playwright 初始化失败")
            print("[BrowserSessionManager] Playwright + Chromium 初始化完成（专用线程）")

    @classmethod
    def run(cls, fn):
        """在 Playwright 工作线程中执行 callable 并返回结果。
        如果当前线程就是 PW 工作线程，则直接执行（避免死锁）。
        """
        cls._ensure_initialized()
        if threading.current_thread() is cls._worker_thread:
            return fn()
        event = threading.Event()
        result = []
        cls._task_queue.put((fn, event, result))
        event.wait(timeout=120)
        if not result:
            raise TimeoutError("Playwright 操作超时")
        r = result[0]
        if isinstance(r, Exception):
            raise r
        return r

    @classmethod
    def get_context(cls, province: str) -> BrowserContext:
        """获取或创建指定省份的浏览器上下文"""
        def _get():
            if province in cls._contexts:
                ctx = cls._contexts[province]
                try:
                    _ = ctx.pages  # 验证 context 是否仍然存活
                    return ctx
                except Exception:
                    logger.warning(f"省份 {province} 的 BrowserContext 已失效，重新创建")
                    del cls._contexts[province]
            state_file = os.path.join(cls._storage_dir, f"{province}_state.json")
            storage_state = state_file if os.path.exists(state_file) else None
            context = cls._browser.new_context(
                storage_state=storage_state,
                user_agent=(
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/120.0.0.0 Safari/537.36'
                ),
                viewport={'width': 1280, 'height': 800},
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )
            cls._contexts[province] = context
            return context
        return cls.run(_get)

    @classmethod
    def save_state(cls, province: str):
        """保存指定省份的 storage_state"""
        def _save():
            if province in cls._contexts:
                state_file = os.path.join(cls._storage_dir, f"{province}_state.json")
                cls._contexts[province].storage_state(path=state_file)
        cls.run(_save)

    @classmethod
    def close_context(cls, province: str):
        """关闭指定省份的浏览器上下文"""
        def _close():
            if province in cls._contexts:
                cls._contexts[province].close()
                del cls._contexts[province]
        cls.run(_close)

    @classmethod
    def check_alive(cls) -> bool:
        """检查浏览器是否仍然存活"""
        try:
            if cls._browser is None:
                return False
            return cls._browser.is_connected()
        except Exception:
            return False

    @classmethod
    def recover(cls, province: str):
        """恢复浏览器会话：关闭旧会话并重新创建"""
        logger.warning("正在恢复浏览器会话...")
        for prov in list(cls._contexts.keys()):
            try:
                cls._contexts[prov].close()
            except Exception:
                pass
        cls._contexts.clear()
        cls._browser = None
        cls._playwright = None
        cls._ensure_initialized()
        cls.get_context(province)
        logger.info("浏览器会话恢复完成")

    @classmethod
    def close_all(cls):
        """关闭所有浏览器上下文和浏览器"""
        def _close_all():
            for province in list(cls._contexts.keys()):
                cls._contexts[province].close()
                del cls._contexts[province]
            if cls._browser:
                cls._browser.close()
                cls._browser = None
            if cls._playwright:
                cls._playwright.stop()
                cls._playwright = None
        cls.run(_close_all)
