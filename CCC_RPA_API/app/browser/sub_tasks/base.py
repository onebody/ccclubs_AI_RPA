import logging
import time
import random

logger = logging.getLogger(__name__)


class BaseSubTask:
    """子任务基类 — 所有子任务继承此类"""

    def __init__(self, page, broadcast_fn=None, task_id=None):
        self.page = page
        self._broadcast = broadcast_fn
        self._task_id = task_id

    def execute(self) -> dict:
        """子类必须实现"""
        raise NotImplementedError

    def _broadcast_progress(self, step: str, message: str, progress: int = 0):
        if self._broadcast and self._task_id:
            self._broadcast("sub_task_progress", {
                "taskId": self._task_id,
                "subTaskType": self.__class__.__name__,
                "step": step,
                "message": message,
                "progress": progress,
            })

    def _wait_human(self, min_s: float = 3.0, max_s: float = 10.0):
        """模拟人类思考时间，PPM 控制"""
        delay = random.uniform(min_s, max_s)
        logger.info(f"[{self.__class__.__name__}] 模拟等待 {delay:.1f}s")
        time.sleep(delay)

    def _safe_click(self, selector_or_element, description: str = ""):
        """安全点击，带人类行为模拟和截图"""
        from app.browser.human_behavior import HumanBehavior
        try:
            if isinstance(selector_or_element, str):
                el = self.page.query_selector(selector_or_element)
                if el:
                    box = el.bounding_box()
                    if box:
                        x = box['x'] + box['width'] * random.uniform(0.3, 0.7)
                        y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
                        self.page.mouse.move(x, y, steps=random.randint(5, 15))
                        HumanBehavior.random_delay(0.1, 0.3)
                        self.page.mouse.click(x, y)
                    else:
                        el.click()
                    logger.info(f"[{self.__class__.__name__}] 点击成功: {description or selector_or_element}")
                    return True
            else:
                # ElementHandle: 尝试 bounding_box 点击
                box = selector_or_element.bounding_box()
                if box:
                    x = box['x'] + box['width'] * random.uniform(0.3, 0.7)
                    y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
                    self.page.mouse.move(x, y, steps=random.randint(5, 15))
                    HumanBehavior.random_delay(0.1, 0.3)
                    self.page.mouse.click(x, y)
                else:
                    selector_or_element.click()
                return True
        except Exception as e:
            logger.warning(f"[{self.__class__.__name__}] 点击失败: {description or selector_or_element}, {e}")
            return False

    def _safe_type(self, selector: str, text: str, description: str = ""):
        """安全输入文本"""
        try:
            el = self.page.query_selector(selector)
            if el:
                el.click()
                time.sleep(0.3)
                el.fill("")
                # 逐字符输入，模拟真人
                for char in text:
                    self.page.keyboard.type(char, delay=random.randint(50, 200))
                logger.info(f"[{self.__class__.__name__}] 输入成功: {description or selector}")
                return True
        except Exception as e:
            logger.warning(f"[{self.__class__.__name__}] 输入失败: {description}, {e}")
        return False

    def _screenshot(self, name: str):
        """保存调试截图"""
        try:
            path = f"/tmp/subtask_{name}.png"
            self.page.screenshot(path=path)
            logger.info(f"[{self.__class__.__name__}] 截图保存: {path}")
        except Exception:
            pass

    def _find_clickable_by_text(self, text: str, tag: str = "*") -> bool:
        """通过文本查找并点击元素（JS 回退）"""
        try:
            clicked = self.page.evaluate("""(text) => {
                const els = document.querySelectorAll('a, button, div, span, li, td');
                let best = null, bestLen = Infinity;
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t.includes(text) && t.length < bestLen && el.children.length < 8) {
                        best = el; bestLen = t.length;
                    }
                }
                if (best) { best.click(); return true; }
                return false;
            }""", text)
            return clicked
        except Exception:
            return False

    def _wait_for_page_ready(self, timeout: int = 15000):
        """等待页面就绪"""
        try:
            self.page.wait_for_load_state("domcontentloaded", timeout=timeout)
        except Exception:
            pass
