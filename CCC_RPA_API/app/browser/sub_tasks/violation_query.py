import logging
import random
import time
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class ViolationQuerySubTask(BaseSubTask):
    """违章查询子任务 — 在 122.gov.cn 上查询车辆违章信息"""

    # 本子任务对应的 sub_task_type 标识
    SUB_TASK_TYPE = "ViolationQuerySubTask"

    def __init__(self, page, broadcast_fn=None, task_id=None,
                 sub_task_id=None, sub_task_type=None):
        super().__init__(page, broadcast_fn=broadcast_fn, task_id=task_id)
        self._sub_task_id = sub_task_id
        self._sub_task_type = sub_task_type

    def _broadcast_progress(self, step: str, message: str, progress: int = 0):
        """重写广播方法，使用 sub_task_id 作为子任务唯一标识"""
        if self._broadcast and self._sub_task_id:
            self._broadcast({"type": "sub_task_progress", "data": {
                "sub_task_id": self._sub_task_id,
                "subTaskName": self.__class__.__name__,
                "step": step,
                "message": message,
                "progress": progress,
            }})

    def execute(self) -> dict:
        """主流程：校验类型→回到首页→点击车辆菜单→导航违章页面→查询列表→提取信息→返回结果"""
        # 校验 sub_task_type 是否匹配
        if self._sub_task_type and self._sub_task_type != self.SUB_TASK_TYPE:
            msg = (f"sub_task_type 不匹配: 期望 {self.SUB_TASK_TYPE}, "
                   f"实际 {self._sub_task_type}")
            logger.warning(f"[ViolationQuerySubTask] {msg}")
            return {"success": False, "message": msg}

        logger.info("[ViolationQuerySubTask] 开始执行违章查询")
        self._broadcast_progress("start", "开始执行违章查询", 0)
        self._screenshot("violation_start")

        try:
            # 步骤1: 先回到首页
            self._broadcast_progress("home", "正在回到首页", 5)
            if not self._navigate_to_home():
                return {"success": False, "message": "无法回到首页"}
            self._wait_human(2, 5)

            # 步骤2: 在首页点击车辆菜单，进入交通违法页面
            self._broadcast_progress("navigate", "正在导航到交通违法查询页面", 10)
            if not self._navigate_to_violation_page():
                return {"success": False, "message": "无法导航到交通违法查询页面"}
            self._wait_human(3, 8)

            # 步骤2: 获取违章列表
            self._broadcast_progress("query", "正在查询违章记录", 30)
            violations = self._get_violation_list()

            if not violations:
                self._broadcast_progress("done", "未查询到违章记录", 100)
                self._screenshot("violation_empty")
                return {
                    "success": True,
                    "message": "未查询到违章记录",
                    "total": 0,
                    "unprocessed": 0,
                    "data": [],
                }

            logger.info(f"[ViolationQuerySubTask] 查询到 {len(violations)} 条违章记录")

            # 步骤3: 提取每条违章的详细信息
            self._broadcast_progress("extract", "正在提取违章详情", 50)
            details = []
            for i, v in enumerate(violations):
                progress = 50 + int((i / len(violations)) * 30)
                self._broadcast_progress(
                    "extract",
                    f"正在提取第 {i + 1}/{len(violations)} 条违章详情",
                    progress,
                )
                detail = self._extract_violation_details(v)
                if detail:
                    details.append(detail)
                self._wait_human(2, 5)

            # 步骤4: 汇总并广播结果
            unprocessed = sum(
                1 for d in details if d.get("status", "") in ("未处理", "未缴款", "")
            )
            message = f"违章查询完成: 共 {len(details)} 条记录, 未处理 {unprocessed} 条"

            self._broadcast_progress("done", message, 100)
            self._screenshot("violation_done")

            # 广播违章数据
            self._broadcast_results(details)

            return {
                "success": True,
                "message": message,
                "total": len(details),
                "unprocessed": unprocessed,
                "data": details,
            }

        except Exception as e:
            logger.error(f"[ViolationQuerySubTask] 执行异常: {e}")
            self._screenshot("violation_error")
            return {"success": False, "message": f"违章查询异常: {str(e)}"}

    # ------------------------------------------------------------------
    # hover 交互（122.gov.cn 菜单为 hover 触发的 tooltip/popover）
    # ------------------------------------------------------------------

    def _hover_and_click(self, trigger_text: str, target_text: str,
                         description: str = "") -> bool:
        """先 hover 触发 tooltip/popover，再点击展开后的子菜单项。

        适用于 122.gov.cn 首页的 hover 弹出菜单（车辆业务、驾驶人业务等）。
        流程：JS 定位触发元素 → Playwright mouse.move 触发 hover →
              等待 popover 渲染 → 在 popover 中查找并点击目标项。
        """
        desc = description or f"hover '{trigger_text}' → click '{target_text}'"
        try:
            # 步骤1: JS 定位触发元素并获取其位置信息
            trigger_info = self.page.evaluate("""(text) => {
                const els = document.querySelectorAll(
                    'a, button, div, span, li, td, [role="menuitem"], '
                    + '.menu-item, .nav-item, [class*="menu"], [class*="nav"]'
                );
                let best = null, bestLen = Infinity;
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t.includes(text) && t.length < bestLen
                        && el.children.length < 10) {
                        best = el; bestLen = t.length;
                    }
                }
                if (!best) return null;
                const rect = best.getBoundingClientRect();
                return {
                    x: rect.x + rect.width / 2,
                    y: rect.y + rect.height / 2,
                    width: rect.width,
                    height: rect.height,
                    text: (best.innerText || '').trim().substring(0, 30),
                };
            }""", trigger_text)

            if not trigger_info:
                logger.debug(
                    f"[ViolationQuerySubTask] hover 触发元素未找到: {trigger_text}"
                )
                return False

            # 步骤2: Playwright mouse.move 触发真实 hover 事件
            tx = trigger_info['x'] + random.uniform(-3, 3)
            ty = trigger_info['y'] + random.uniform(-3, 3)
            self.page.mouse.move(tx, ty, steps=random.randint(8, 20))
            logger.info(
                f"[ViolationQuerySubTask] hover 到 '{trigger_info['text']}' "
                f"({tx:.0f}, {ty:.0f})"
            )
            # 等待 popover/tooltip 渲染
            time.sleep(random.uniform(0.8, 1.5))

            # 步骤3: JS dispatch mouseenter/mouseover 双重保险
            self.page.evaluate("""(text) => {
                const els = document.querySelectorAll(
                    'a, button, div, span, li, [role="menuitem"], '
                    + '.menu-item, .nav-item, [class*="menu"]'
                );
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t.includes(text) && t.length < 30) {
                        el.dispatchEvent(new MouseEvent('mouseenter',
                            {bubbles: true, cancelable: true}));
                        el.dispatchEvent(new MouseEvent('mouseover',
                            {bubbles: true, cancelable: true}));
                        break;
                    }
                }
            }""", trigger_text)
            time.sleep(random.uniform(0.3, 0.6))

            # 步骤4: 在 popover/tooltip 中查找并点击目标项
            clicked = self._click_in_popover(target_text)
            if clicked:
                logger.info(f"[ViolationQuerySubTask] {desc} 成功")
                return True

            # 步骤5: 回退 — 直接在页面中查找目标（可能 popover 没有层级区分）
            clicked = self.page.evaluate("""(targetText) => {
                const els = document.querySelectorAll(
                    'a, button, div, span, li, td, [role="menuitem"], '
                    + '.popover a, .tooltip a, [class*="popup"] a, '
                    + '[class*="dropdown"] a, [class*="popover"] a'
                );
                let best = null, bestLen = Infinity;
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t.includes(targetText) && t.length < bestLen
                        && el.children.length < 8
                        && el.offsetParent !== null) {
                        best = el; bestLen = t.length;
                    }
                }
                if (best) { best.click(); return true; }
                return false;
            }""", target_text)

            if clicked:
                logger.info(
                    f"[ViolationQuerySubTask] {desc} 回退点击成功"
                )
                return True

            logger.debug(
                f"[ViolationQuerySubTask] hover 后未找到目标: {target_text}"
            )
            return False

        except Exception as e:
            logger.warning(
                f"[ViolationQuerySubTask] hover_and_click 异常: {desc}, {e}"
            )
            return False

    def _click_in_popover(self, target_text: str) -> bool:
        """在已展开的 popover/tooltip 中查找并点击目标项"""
        try:
            return self.page.evaluate("""(targetText) => {
                // 查找常见的 popover/tooltip/dropdown 容器
                const containers = document.querySelectorAll(
                    '.popover, .tooltip, .el-popover, .el-tooltip__popper, '
                    + '[class*="popup"], [class*="popover"], [class*="tooltip"], '
                    + '[class*="dropdown"], [class*="overlay"], [class*="layer"], '
                    + '[role="tooltip"], [role="dialog"]'
                );
                for (const container of containers) {
                    if (container.offsetParent === null
                        && container.style.display === 'none') continue;
                    const els = container.querySelectorAll(
                        'a, button, li, span, div, [role="menuitem"]'
                    );
                    for (const el of els) {
                        const t = (el.innerText || el.textContent || '').trim();
                        if (t.includes(targetText) && t.length < 30) {
                            el.click();
                            return true;
                        }
                    }
                }
                return false;
            }""", target_text)
        except Exception:
            return False

    # ------------------------------------------------------------------
    # 导航
    # ------------------------------------------------------------------

    def _navigate_to_home(self) -> bool:
        """回到122.gov.cn首页"""
        # 策略1: 点击首页链接或 Logo
        home_texts = ["首页", "我的主页"]
        for text in home_texts:
            if self._find_clickable_by_text(text):
                logger.info(
                    f"[ViolationQuerySubTask] 通过 '{text}' 回到首页"
                )
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        # 策略2: JS 查找首页链接
        try:
            found = self.page.evaluate("""() => {
                const links = document.querySelectorAll(
                    'a[href], .logo, [class*="logo"], [class*="home"]'
                );
                for (const link of links) {
                    const href = link.getAttribute('href') || '';
                    const text = (link.innerText || link.textContent || '').trim();
                    if (href.includes('/index') || href.endsWith('/')
                        || text.includes('首页') || text.includes('主页')) {
                        link.click();
                        return text || href;
                    }
                }
                return null;
            }""")
            if found:
                logger.info(
                    f"[ViolationQuerySubTask] JS 回到首页: {found}"
                )
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True
        except Exception:
            pass

        # 策略3: 直接导航到根路径
        try:
            base_url = self.page.url.split("/")[0] + "//" + self.page.url.split("/")[2]
            self.page.goto(
                base_url + "/",
                wait_until="domcontentloaded",
                timeout=15000,
            )
            self._wait_human(3, 6)
            logger.info("[ViolationQuerySubTask] URL 直接导航回首页")
            return True
        except Exception:
            pass

        logger.warning("[ViolationQuerySubTask] 回到首页失败")
        self._screenshot("violation_home_fail")
        return False

    def _navigate_to_violation_page(self) -> bool:
        """在首页通过 hover 菜单进入车辆违法页面。

        122.gov.cn 首页菜单结构（hover 触发的 tooltip/popover）：
        - 车辆业务 → 机动车违法
        - 违法处理业务 → ...
        本方法使用真实鼠标 hover 展开菜单，再点击子菜单项。
        """
        self._screenshot("violation_home_before_nav")

        # 策略1（核心）: hover 触发菜单 → 点击子菜单项
        # 122.gov.cn 首页的「车辆业务」菜单 hover 后展开，
        # 其中「机动车违法」是车辆违章查询的入口
        hover_pairs = [
            ("车辆业务", "机动车违法"),
            ("车辆业务", "违法处理"),
            ("违法处理业务", "机动车违法"),
            ("违法处理业务", "违法查询"),
        ]
        for trigger, target in hover_pairs:
            if self._hover_and_click(trigger, target,
                                     f"hover '{trigger}' → '{target}'"):
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                self._screenshot("violation_after_hover_nav")
                logger.info(
                    f"[ViolationQuerySubTask] 通过 hover 菜单导航成功: "
                    f"{trigger} → {target}"
                )
                return True
            self._wait_human(1, 2)  # 失败后短暂等待再试下一对

        # 策略2: 直接查找「机动车违法」/「违法处理」可点击元素
        # （可能页面已展开菜单或菜单项本身就是固定链接）
        direct_texts = [
            "机动车违法", "机动车违法查询", "违法处理",
            "交通违法", "违法查询",
        ]
        for text in direct_texts:
            if self._find_clickable_by_text(text):
                logger.info(
                    f"[ViolationQuerySubTask] 直接点击 '{text}' 进入"
                )
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        # 策略3: hover 触发后用 Playwright safe_click 点击（非 JS click）
        for trigger, target in hover_pairs[:2]:
            if self._hover_then_safe_click(trigger, target):
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                logger.info(
                    f"[ViolationQuerySubTask] hover+safe_click 导航成功: "
                    f"{trigger} → {target}"
                )
                return True

        # 策略4: URL 直接导航（兜底）
        violation_urls = [
            "/views/violation/list.html",
            "/views/wzcx/list.html",
            "/views/violation/index.html",
            "/views/user/violation.html",
        ]
        base_url = (
            self.page.url.rsplit("/", 1)[0]
            if "/" in self.page.url
            else self.page.url
        )
        for path in violation_urls:
            try:
                self.page.goto(
                    base_url + path,
                    wait_until="domcontentloaded",
                    timeout=10000,
                )
                self._wait_human(3, 6)
                title = self.page.title() or ""
                if any(kw in title for kw in ("违法", "违章", "violation")):
                    logger.info(
                        f"[ViolationQuerySubTask] 通过 URL {path} 导航成功"
                    )
                    return True
            except Exception:
                continue

        logger.warning("[ViolationQuerySubTask] 所有导航策略均失败")
        self._screenshot("violation_nav_fail")
        return False

    def _hover_then_safe_click(self, trigger_text: str,
                                target_text: str) -> bool:
        """hover 触发菜单后，用 Playwright _safe_click 点击目标（非 JS click）"""
        try:
            # hover 触发
            trigger_info = self.page.evaluate("""(text) => {
                const els = document.querySelectorAll(
                    'a, button, div, span, li, [role="menuitem"], '
                    + '.menu-item, .nav-item, [class*="menu"]'
                );
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if (t.includes(text) && t.length < 30) {
                        const rect = el.getBoundingClientRect();
                        return {x: rect.x + rect.width / 2,
                                y: rect.y + rect.height / 2};
                    }
                }
                return null;
            }""", trigger_text)

            if not trigger_info:
                return False

            self.page.mouse.move(
                trigger_info['x'], trigger_info['y'],
                steps=random.randint(8, 20),
            )
            time.sleep(random.uniform(0.8, 1.5))

            # 用 JS 定位目标元素，然后用 _safe_click 进行真实鼠标点击
            target_selector = self.page.evaluate("""(targetText) => {
                const containers = document.querySelectorAll(
                    '.popover, .tooltip, .el-popover, [class*="popup"], '
                    + '[class*="popover"], [class*="dropdown"], [class*="layer"]'
                );
                for (const c of containers) {
                    const els = c.querySelectorAll(
                        'a, button, li, span, [role="menuitem"]'
                    );
                    for (const el of els) {
                        const t = (el.innerText || '').trim();
                        if (t.includes(targetText) && t.length < 30) {
                            const marker = 'vq_' + Date.now();
                            el.setAttribute('data-vq-marker', marker);
                            return '[data-vq-marker="' + marker + '"]';
                        }
                    }
                }
                return null;
            }""", target_text)

            if target_selector:
                el = self.page.query_selector(target_selector)
                if el:
                    return self._safe_click(
                        el, f"hover 后 safe_click '{target_text}'"
                    )
            return False
        except Exception:
            return False

    def _click_violation_entry(self) -> bool:
        """在车辆页面中查找并点击违法/违章入口（支持 hover 和普通点击）"""
        # 先尝试直接点击
        violation_texts = [
            "机动车违法", "交通违法", "违法处理",
            "违法查询", "违章查询", "违法记录",
        ]
        for text in violation_texts:
            if self._find_clickable_by_text(text):
                logger.info(
                    f"[ViolationQuerySubTask] 点击违法入口 '{text}'"
                )
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        # 回退：hover 方式
        hover_pairs = [
            ("车辆业务", "机动车违法"),
            ("车辆业务", "违法处理"),
        ]
        for trigger, target in hover_pairs:
            if self._hover_and_click(trigger, target):
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        return False

    # ------------------------------------------------------------------
    # 违章列表
    # ------------------------------------------------------------------

    def _get_violation_list(self) -> list:
        """获取违章列表"""
        self._screenshot("violation_list")

        # 尝试点击查询按钮（部分页面需要先触发查询）
        self._trigger_query()
        self._wait_human(3, 8)
        self._wait_for_page_ready()
        self._screenshot("violation_after_query")

        try:
            items = self.page.evaluate("""() => {
                const results = [];

                // 策略1: 表格行
                const rows = document.querySelectorAll(
                    'table tbody tr, .el-table__body-wrapper tr, '
                    + '.el-table__row, [class*="table"] tr'
                );
                if (rows.length > 0) {
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            const texts = Array.from(cells).map(
                                c => (c.innerText || '').trim()
                            );
                            results.push({
                                raw: texts.join(' | '),
                                cells: texts,
                                element_index: results.length,
                                source: 'table',
                            });
                        }
                    }
                    if (results.length > 0) return results;
                }

                // 策略2: 列表项
                const listItems = document.querySelectorAll(
                    '.list-item, .violation-item, [class*="violation"], '
                    + '[class*="wz-item"], .item'
                );
                for (const item of listItems) {
                    const text = (item.innerText || '').trim();
                    if (text.length > 5) {
                        results.push({
                            raw: text.substring(0, 300),
                            cells: [],
                            element_index: results.length,
                            source: 'list',
                        });
                    }
                }
                if (results.length > 0) return results;

                // 策略3: 查找包含违章关键词的区域
                const body = document.body.innerText || '';
                const keywords = ['违法时间', '违法地点', '违法行为', '违章',
                                  '扣分', '罚款', '未处理', '已处理'];
                const hasViolationContent = keywords.some(kw => body.includes(kw));
                if (hasViolationContent) {
                    // 尝试获取主要内容区域
                    const main = document.querySelector(
                        '.main-content, #content, .content, main, '
                        + '[class*="main"], [class*="content"]'
                    );
                    if (main) {
                        results.push({
                            raw: (main.innerText || '').substring(0, 1000),
                            cells: [],
                            element_index: 0,
                            source: 'page_text',
                        });
                    }
                }

                return results;
            }""")
            logger.info(
                f"[ViolationQuerySubTask] 提取到 {len(items)} 条违章记录"
            )
            return items
        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 获取违章列表失败: {e}")
            return []

    def _trigger_query(self):
        """尝试触发查询（点击查询按钮）"""
        query_texts = ["查询", "搜索", "开始查询", "违法查询"]
        for text in query_texts:
            try:
                clicked = self.page.evaluate("""(text) => {
                    const btns = document.querySelectorAll(
                        'button, a.btn, [role="button"], .el-button, '
                        + 'input[type="button"], input[type="submit"]'
                    );
                    for (const btn of btns) {
                        const t = (btn.innerText || btn.value || '').trim();
                        if ((t === text || t.includes(text))
                            && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                }""", text)
                if clicked:
                    logger.info(
                        f"[ViolationQuerySubTask] 点击查询按钮: '{text}'"
                    )
                    return
            except Exception:
                continue

    # ------------------------------------------------------------------
    # 详情提取
    # ------------------------------------------------------------------

    def _extract_violation_details(self, item: dict) -> dict:
        """提取单条违章的结构化信息"""
        try:
            raw = item.get("raw", "")
            cells = item.get("cells", [])

            detail = {
                "raw": raw,
                "time": "",
                "location": "",
                "behavior": "",
                "points": "",
                "fine": "",
                "status": "",
            }

            if cells and len(cells) >= 2:
                # 从表格单元格中按常见顺序提取
                detail = self._parse_cells(cells, detail)
            else:
                # 从原始文本中正则提取
                detail = self._parse_raw_text(raw, detail)

            logger.info(
                f"[ViolationQuerySubTask] 提取违章: "
                f"时间={detail.get('time', '')[:15]}, "
                f"状态={detail.get('status', '')}"
            )
            return detail

        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 提取违章详情失败: {e}")
            return {"raw": item.get("raw", ""), "error": str(e)}

    def _parse_cells(self, cells: list, detail: dict) -> dict:
        """从表格单元格列表中解析违章信息"""
        import re

        for cell in cells:
            cell = cell.strip()
            # 时间
            if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", cell) and not detail["time"]:
                detail["time"] = cell
            # 地点（包含省/市/路/街/道等）
            elif (
                re.search(r"(省|市|区|县|路|街|道|高速|国道|省道)", cell)
                and not detail["location"]
            ):
                detail["location"] = cell
            # 扣分
            elif re.search(r"(\d+)\s*分", cell):
                detail["points"] = cell
            # 罚款
            elif re.search(r"(\d+)\s*元", cell):
                detail["fine"] = cell
            # 状态
            elif cell in ("未处理", "已处理", "未缴款", "已缴款", "已交款"):
                detail["status"] = cell
            # 违章行为（排除已匹配字段）
            elif (
                len(cell) > 4
                and not detail["behavior"]
                and cell not in (detail["time"], detail["location"],
                                 detail["points"], detail["fine"])
            ):
                detail["behavior"] = cell

        return detail

    def _parse_raw_text(self, raw: str, detail: dict) -> dict:
        """从原始文本中正则提取违章信息"""
        import re

        # 时间
        time_match = re.search(
            r"(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*\d{1,2}:\d{2}(?::\d{2})?)", raw
        )
        if time_match:
            detail["time"] = time_match.group(1)

        # 地点
        loc_match = re.search(
            r"([\u4e00-\u9fa5]{2,}(?:省|市)[\u4e00-\u9fa5]{2,}"
            r"(?:区|县|路|街|道|高速|国道|省道)[\u4e00-\u9fa5\d]*)",
            raw,
        )
        if loc_match:
            detail["location"] = loc_match.group(1)

        # 扣分
        points_match = re.search(r"(\d+)\s*分", raw)
        if points_match:
            detail["points"] = points_match.group(0)

        # 罚款
        fine_match = re.search(r"(?:罚款|罚金)\s*(\d+)\s*元", raw)
        if fine_match:
            detail["fine"] = fine_match.group(0)

        # 状态
        for status in ("未处理", "已处理", "未缴款", "已缴款"):
            if status in raw:
                detail["status"] = status
                break

        # 违章行为 — 常见违章关键词
        behavior_keywords = [
            "超速", "闯红灯", "违停", "违规变道", "未系安全带",
            "逆行", "压线", "不按规定", "违反禁令", "占用",
        ]
        for kw in behavior_keywords:
            if kw in raw:
                # 提取包含关键词的上下文
                idx = raw.index(kw)
                start = max(0, idx - 5)
                end = min(len(raw), idx + len(kw) + 10)
                detail["behavior"] = raw[start:end].strip()
                break

        return detail

    # ------------------------------------------------------------------
    # 广播
    # ------------------------------------------------------------------

    def _broadcast_results(self, violations: list):
        """广播违章查询结果"""
        try:
            self._broadcast_progress(
                "results",
                f"违章查询结果: 共 {len(violations)} 条",
                95,
            )
            if self._broadcast and self._sub_task_id:
                self._broadcast({
                    "type": "violation_data",
                    "data": {
                        "sub_task_id": self._sub_task_id,
                        "subTaskName": "ViolationQuerySubTask",
                        "violations": violations,
                    },
                })
        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 广播结果失败: {e}")
