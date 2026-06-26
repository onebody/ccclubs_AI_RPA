"""
真人行为模拟工具类 - 用于绕过 WZWS 行为分析
注意：所有 Page 操作必须在后台线程中调用，避免与 asyncio 事件循环冲突
"""
import random
import time
import logging

logger = logging.getLogger(__name__)


class HumanBehavior:
    """模拟真人操作行为，绕过 WZWS 行为分析"""

    @staticmethod
    def random_delay(min_sec: float = 0.5, max_sec: float = 2.0):
        """随机延迟"""
        time.sleep(random.uniform(min_sec, max_sec))

    @staticmethod
    def human_click(page, selector: str, timeout: int = 10000):
        """
        模拟真人点击
        - 使用 first 匹配多个元素的情况
        - 等待元素可见后，鼠标移动到元素中心附近（带随机偏移）再点击
        - 若 bounding_box 不可用，降级为直接 click()
        """
        from playwright.sync_api import Page  # 延迟导入，避免模块加载时依赖 playwright

        elem = page.locator(selector).first
        elem.wait_for(state="visible", timeout=timeout)
        box = elem.bounding_box()
        if box:
            x = box['x'] + box['width'] * random.uniform(0.3, 0.7)
            y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
            page.mouse.move(x, y, steps=random.randint(5, 15))
            HumanBehavior.random_delay(0.1, 0.3)
            page.mouse.click(x, y)
            logger.debug(f"human_click: 点击 ({x:.0f}, {y:.0f}) via selector '{selector}'")
        else:
            logger.debug(f"human_click: bounding_box 不可用，降级为直接点击 '{selector}'")
            elem.click()
        HumanBehavior.random_delay(0.3, 0.8)

    @staticmethod
    def human_type(page, selector: str, text: str, timeout: int = 10000):
        """
        模拟真人打字
        - 使用 first 匹配多个元素的情况
        - 等待元素可见后，逐字符输入，每个字符间随机延迟 50~200ms
        """
        elem = page.locator(selector).first
        elem.wait_for(state="visible", timeout=timeout)
        elem.click()
        for char in text:
            page.keyboard.type(char, delay=random.randint(50, 200))
        HumanBehavior.random_delay(0.2, 0.5)

    @staticmethod
    def random_scroll(page, selector: str = None):
        """
        随机滚动页面，模拟浏览行为
        - 若提供 selector，先滚动到该元素可见
        - 否则随机滚动当前视口
        """
        if selector:
            try:
                elem = page.locator(selector).first
                elem.scroll_into_view_if_needed(timeout=5000)
                logger.debug(f"random_scroll: 已滚动到 selector '{selector}'")
            except Exception as e:
                logger.debug(f"random_scroll: 滚动到 '{selector}' 失败: {e}，降级为随机滚动")

        for i in range(random.randint(1, 3)):
            scroll_y = random.randint(100, 400)
            page.mouse.wheel(0, scroll_y)
            logger.debug(f"random_scroll: 第 {i+1} 次滚动 {scroll_y}px")
            HumanBehavior.random_delay(0.3, 0.8)

    @staticmethod
    def wait_like_human(page, min_sec: float = 1.0, max_sec: float = 3.0):
        """模拟人类阅读等待"""
        delay = random.uniform(min_sec, max_sec)
        logger.debug(f"wait_like_human: 等待 {delay:.1f}s")
        time.sleep(delay)
