import logging
import random
import re
import time
from pathlib import Path
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class ViolationQuerySubTask(BaseSubTask):
    """违章查询子任务 - 增强版

    支持两种查询模式：
    - all  : 全量同步所有违章记录（含翻页、详情、图片）
    - plate: 按车牌号精确查询违章记录

    通过 self._context 获取参数：
        query_mode   : "all" | "plate"
        plate_number : 车牌号（仅 plate 模式）
        plate_type   : 号牌种类（可选）
        save_images  : 是否保存违章图片截图（默认 False）
    """

    SUB_TASK_TYPE = "ViolationQuerySubTask"

    # 图片保存根目录（相对于 CCC_RPA_API 工作目录）
    IMAGE_DIR = Path("data/violation_images")

    def __init__(self, page, broadcast_fn=None, task_id=None,
                 sub_task_id=None, sub_task_type=None, context=None):
        super().__init__(page, broadcast_fn=broadcast_fn, task_id=task_id, context=context)
        self._sub_task_id = sub_task_id
        self._sub_task_type = sub_task_type
        # 累计翻页计数
        self._pages_fetched = 0

    # ------------------------------------------------------------------
    # 广播
    # ------------------------------------------------------------------

    def _broadcast_progress(self, step: str, message: str, progress: int = 0,
                            data: dict = None):
        """广播子任务进度（支持附加 data 字段）"""
        if self._broadcast and self._sub_task_id:
            payload = {
                "type": "sub_task_progress",
                "data": {
                    "sub_task_id": self._sub_task_id,
                    "subTaskName": self.__class__.__name__,
                    "step": step,
                    "message": message,
                    "progress": progress,
                },
            }
            if data:
                payload["data"]["result"] = data
            self._broadcast(payload)

    def _broadcast_results(self, violations: list):
        """广播违章数据事件"""
        try:
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

    # ------------------------------------------------------------------
    # 入口
    # ------------------------------------------------------------------

    def execute(self) -> dict:
        """根据 query_mode 选择全量同步或指定车牌查询"""
        if self._sub_task_type and self._sub_task_type != self.SUB_TASK_TYPE:
            msg = (f"sub_task_type 不匹配: 期望 {self.SUB_TASK_TYPE}, "
                   f"实际 {self._sub_task_type}")
            logger.warning(f"[ViolationQuerySubTask] {msg}")
            return {"success": False, "message": msg}

        query_mode = self._context.get("query_mode", "all")
        plate_number = self._context.get("plate_number", "")
        plate_type = self._context.get("plate_type")
        save_images = self._context.get("save_images", False)

        logger.info(f"[ViolationQuerySubTask] 开始执行违章查询，模式={query_mode}")
        self._broadcast_progress("start", f"开始执行违章查询（模式: {query_mode}）", 0)
        self._screenshot("violation_start")

        try:
            # 步骤1: 回到首页
            self._broadcast_progress("home", "正在回到首页", 5)
            if not self._navigate_to_home():
                return {"success": False, "message": "无法回到首页"}
            self._wait_human(2, 5)

            # 步骤2: 导航到违章查询页面
            self._broadcast_progress("navigate", "正在导航到交通违法查询页面", 10)
            if not self._navigate_to_violation_page():
                return {"success": False, "message": "无法导航到交通违法查询页面"}
            self._wait_human(3, 8)

            # 步骤3: 根据模式分发
            if query_mode == "plate" and plate_number:
                result = self._query_by_plate(plate_number, plate_type, save_images)
            else:
                result = self._sync_all_violations(save_images)

            # 步骤4: 广播最终结果
            self._broadcast_progress("done", result.get("message", "查询完成"), 100,
                                     data=result.get("data"))
            self._screenshot("violation_done")
            self._broadcast_results(result.get("data", {}).get("violations", []))
            return result

        except Exception as e:
            logger.error(f"[ViolationQuerySubTask] 执行异常: {e}")
            self._screenshot("violation_error")
            return {"success": False, "message": f"违章查询异常: {str(e)}"}

    # ------------------------------------------------------------------
    # 全量同步
    # ------------------------------------------------------------------

    def _sync_all_violations(self, save_images: bool = False) -> dict:
        """同步所有违章记录，含自动翻页"""
        logger.info("[ViolationQuerySubTask] 开始全量同步违章记录")
        self._broadcast_progress("query", "正在查询所有违章记录", 20)

        # 触发初始查询
        self._trigger_query()
        self._wait_human(3, 8)
        self._wait_for_page_ready()
        self._screenshot("violation_all_initial")

        all_violations = []
        self._pages_fetched = 0

        # 翻页循环提取
        while True:
            self._pages_fetched += 1
            page_violations = self._extract_violation_list()
            logger.info(
                f"[ViolationQuerySubTask] 第 {self._pages_fetched} 页，"
                f"提取 {len(page_violations)} 条"
            )

            if not page_violations:
                break

            all_violations.extend(page_violations)

            progress = min(20 + self._pages_fetched * 10, 60)
            self._broadcast_progress(
                "syncing",
                f"正在同步第 {self._pages_fetched} 页（已累计 {len(all_violations)} 条）...",
                progress,
            )

            if not self._has_next_page():
                break

            if not self._click_next_page():
                logger.info("[ViolationQuerySubTask] 翻页失败或已到最后一页")
                break

            self._wait_human(3, 8)
            self._wait_for_page_ready()

        # 提取每条违章的详情
        detailed_violations = self._fetch_all_details(all_violations, save_images)

        return self._build_result(detailed_violations)

    # ------------------------------------------------------------------
    # 指定车牌查询
    # ------------------------------------------------------------------

    def _query_by_plate(self, plate_number: str, plate_type: str = None,
                        save_images: bool = False) -> dict:
        """按车牌号精确查询违章"""
        logger.info(
            f"[ViolationQuerySubTask] 按车牌查询: {plate_number} ({plate_type or '不限'})"
        )
        self._broadcast_progress("plate", f"正在查询车牌 {plate_number} 的违章", 20)

        # 在页面中搜索指定车牌
        if not self._search_plate(plate_number, plate_type):
            self._screenshot("violation_plate_search_fail")
            return {
                "success": False,
                "message": f"无法在页面中定位车牌 {plate_number}",
                "data": {"violations": [], "total_count": 0,
                         "unprocessed_count": 0, "processed_count": 0,
                         "pages_fetched": 0},
            }

        self._wait_human(3, 8)
        self._wait_for_page_ready()
        self._screenshot("violation_plate_found")

        # 提取该车辆的违章列表（含翻页）
        all_violations = []
        self._pages_fetched = 0

        while True:
            self._pages_fetched += 1
            page_violations = self._extract_violation_list()
            if not page_violations:
                break
            # 为每条记录附加车牌号
            for v in page_violations:
                v["plate_number"] = plate_number
            all_violations.extend(page_violations)

            progress = min(30 + self._pages_fetched * 10, 60)
            self._broadcast_progress(
                "syncing",
                f"正在同步车牌 {plate_number} 第 {self._pages_fetched} 页...",
                progress,
            )

            if not self._has_next_page():
                break
            if not self._click_next_page():
                break
            self._wait_human(3, 8)
            self._wait_for_page_ready()

        detailed_violations = self._fetch_all_details(all_violations, save_images)
        return self._build_result(detailed_violations)

    def _search_plate(self, plate_number: str, plate_type: str = None) -> bool:
        """在违章查询页面搜索指定车牌

        策略1: 使用页面搜索框输入车牌号并点击搜索
        策略2: 使用筛选下拉选择号牌种类，再输入车牌搜索
        策略3: 直接 JS 在列表中高亮定位并点击对应行
        """
        self._screenshot("violation_search_plate_before")

        # 策略1: 查找搜索输入框并输入车牌号
        search_selectors = [
            'input[placeholder*="车牌"]',
            'input[placeholder*="号牌"]',
            'input[placeholder*="搜索"]',
            'input[type="search"]',
            '.el-input input',
            'input[name*="plate"]',
            'input[name*="search"]',
        ]
        for sel in search_selectors:
            try:
                el = self.page.query_selector(sel)
                if el and el.is_visible():
                    self._safe_click(el, f"点击搜索框: {sel}")
                    self._wait_human(0.5, 1)
                    el.fill("")
                    for ch in plate_number:
                        self.page.keyboard.type(ch, delay=random.randint(50, 150))
                    logger.info(
                        f"[ViolationQuerySubTask] 在搜索框输入车牌: {plate_number}"
                    )
                    self._wait_human(1, 2)

                    # 如果有号牌种类筛选，先选择
                    if plate_type:
                        self._select_plate_type(plate_type)
                        self._wait_human(1, 2)

                    # 按回车或点击搜索按钮
                    self._trigger_search_action()
                    self._wait_human(3, 6)
                    self._wait_for_page_ready()
                    self._screenshot("violation_search_plate_after")
                    return True
            except Exception as e:
                logger.debug(f"[ViolationQuerySubTask] 搜索框 {sel} 失败: {e}")
                continue

        # 策略2: JS 查找页面中是否有车牌筛选功能
        try:
            filtered = self.page.evaluate("""(plate) => {
                // 尝试查找筛选区域并触发
                const selects = document.querySelectorAll(
                    'select, .el-select, [class*="filter"], [class*="select"]'
                );
                for (const s of selects) {
                    const text = (s.innerText || '').trim();
                    if (text.includes('号牌') || text.includes('车牌')) {
                        return 'found_filter';
                    }
                }
                // 在表格中直接查找包含该车牌的行并点击
                const rows = document.querySelectorAll(
                    'table tbody tr, .el-table__row, [class*="table"] tr'
                );
                for (const row of rows) {
                    const text = (row.innerText || '').trim();
                    if (text.includes(plate)) {
                        row.click();
                        return 'clicked_row';
                    }
                }
                return null;
            }""", plate_number)

            if filtered == "clicked_row":
                logger.info("[ViolationQuerySubTask] JS 直接点击车牌所在行")
                self._wait_human(2, 5)
                return True
            if filtered == "found_filter":
                logger.info("[ViolationQuerySubTask] 找到筛选器，尝试 JS 触发")
        except Exception as e:
            logger.debug(f"[ViolationQuerySubTask] JS 搜索车牌失败: {e}")

        # 策略3: 使用 JS 直接定位并点击含车牌号的表格行
        try:
            clicked = self.page.evaluate("""(plate) => {
                const all = document.querySelectorAll(
                    'tr, .list-item, [class*="item"], [class*="row"]'
                );
                for (const el of all) {
                    if ((el.innerText || '').includes(plate)) {
                        const link = el.querySelector('a, button, [class*="link"]');
                        if (link) { link.click(); return true; }
                        el.click();
                        return true;
                    }
                }
                return false;
            }""", plate_number)
            if clicked:
                logger.info(f"[ViolationQuerySubTask] JS 点击含车牌 {plate_number} 的行")
                self._wait_human(2, 5)
                return True
        except Exception:
            pass

        logger.warning(f"[ViolationQuerySubTask] 所有车牌搜索策略失败: {plate_number}")
        return False

    def _select_plate_type(self, plate_type: str):
        """选择号牌种类下拉"""
        try:
            self.page.evaluate("""(plateType) => {
                const selects = document.querySelectorAll(
                    'select, .el-select, [class*="select"]'
                );
                for (const sel of selects) {
                    const label = sel.closest('.el-form-item, .form-group')
                        ?.querySelector('label')?.innerText || '';
                    const text = (sel.innerText || '').trim();
                    if (label.includes('号牌') || label.includes('种类')
                        || text.includes('号牌种类')) {
                        // el-select 点击展开
                        const trigger = sel.querySelector(
                            '.el-input, .el-select__input, input'
                        ) || sel;
                        trigger.click();
                        break;
                    }
                }
            }""", plate_type)
            self._wait_human(0.5, 1)
            # 在下拉选项中查找
            self._find_clickable_by_text(plate_type)
        except Exception as e:
            logger.debug(f"[ViolationQuerySubTask] 选择号牌种类失败: {e}")

    def _trigger_search_action(self):
        """触发搜索动作（回车或点击搜索按钮）"""
        # 先尝试按回车
        try:
            self.page.keyboard.press("Enter")
            logger.info("[ViolationQuerySubTask] 按下回车触发搜索")
        except Exception:
            pass

        # 同时尝试点击搜索按钮
        search_btns = ["搜索", "查询", "Search"]
        for text in search_btns:
            try:
                clicked = self.page.evaluate("""(text) => {
                    const btns = document.querySelectorAll(
                        'button, a.btn, .el-button, [role="button"], '
                        + 'input[type="button"], input[type="submit"], '
                        + '[class*="search-btn"], [class*="icon-search"]'
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
                    logger.info(f"[ViolationQuerySubTask] 点击搜索按钮: '{text}'")
                    return
            except Exception:
                continue

    # ------------------------------------------------------------------
    # 通用：列表提取
    # ------------------------------------------------------------------

    def _extract_violation_list(self) -> list:
        """从当前页面提取违章列表（表格行 / 列表项 / 关键词区域）"""
        self._screenshot("violation_extract_list")
        try:
            items = self.page.evaluate("""() => {
                const results = [];

                // 策略1: 表格行
                const rows = document.querySelectorAll(
                    'table tbody tr, .el-table__body-wrapper tr, '
                    + '.el-table__row, [class*="table"] tbody tr'
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
                            raw: text.substring(0, 500),
                            cells: [],
                            element_index: results.length,
                            source: 'list',
                        });
                    }
                }
                if (results.length > 0) return results;

                // 策略3: 关键词区域
                const body = document.body.innerText || '';
                const keywords = ['违法时间', '违法地点', '违法行为', '违章',
                                  '扣分', '罚款', '未处理', '已处理'];
                if (keywords.some(kw => body.includes(kw))) {
                    const main = document.querySelector(
                        '.main-content, #content, .content, main, '
                        + '[class*="main"], [class*="content"]'
                    );
                    if (main) {
                        results.push({
                            raw: (main.innerText || '').substring(0, 2000),
                            cells: [],
                            element_index: 0,
                            source: 'page_text',
                        });
                    }
                }
                return results;
            }""")
            logger.info(
                f"[ViolationQuerySubTask] 提取到 {len(items)} 条违章（当前页）"
            )
            return items or []
        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 提取违章列表失败: {e}")
            return []

    # ------------------------------------------------------------------
    # 通用：详情提取
    # ------------------------------------------------------------------

    def _fetch_all_details(self, violations: list, save_images: bool) -> list:
        """批量提取违章详情（点击进入详情 → 提取 → 返回列表）"""
        detailed = []
        total = len(violations)

        for i, v in enumerate(violations):
            progress = 60 + int((i / max(total, 1)) * 25)
            self._broadcast_progress(
                "detail",
                f"正在提取第 {i + 1}/{total} 条违章详情...",
                progress,
            )

            detail = self._extract_violation_detail(v)
            if not detail:
                detail = {"raw": v.get("raw", "")}

            # 继承列表中已有的车牌号
            if "plate_number" in v and "plate_number" not in detail:
                detail["plate_number"] = v["plate_number"]

            # 尝试点击进入详情页获取更多信息
            detail = self._enter_detail_page(v, detail, i)

            # 图片截图
            if save_images and detail:
                img_progress = 85 + int((i / max(total, 1)) * 10)
                self._broadcast_progress(
                    "image",
                    f"正在保存第 {i + 1} 条违章图片...",
                    img_progress,
                )
                violation_id = (
                    detail.get("time", "").replace(" ", "_").replace(":", "-")
                    or f"v_{i}"
                )
                img_path = self._capture_violation_image(violation_id)
                if img_path:
                    detail["has_image"] = True
                    detail["image_path"] = img_path
                else:
                    detail["has_image"] = False

            detailed.append(detail)
            self._wait_human(2, 4)

        return detailed

    def _extract_violation_detail(self, item: dict) -> dict:
        """从单条违章数据中提取结构化信息"""
        try:
            raw = item.get("raw", "")
            cells = item.get("cells", [])

            detail = {
                "time": "",
                "location": "",
                "violation": "",
                "points": 0,
                "fine": 0,
                "status": "",
                "plate_number": "",
                "detail_url": "",
                "has_image": False,
                "image_path": "",
            }

            if cells and len(cells) >= 2:
                detail = self._parse_cells(cells, detail)
            else:
                detail = self._parse_raw_text(raw, detail)

            return detail

        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 提取违章详情失败: {e}")
            return {"raw": item.get("raw", ""), "error": str(e)}

    def _enter_detail_page(self, item: dict, detail: dict, index: int) -> dict:
        """点击进入违章详情页，提取更多信息后返回列表"""
        try:
            element_index = item.get("element_index", index)
            source = item.get("source", "table")

            # 尝试点击行中的链接进入详情
            clicked = self.page.evaluate("""(args) => {
                const {index, source} = args;
                let rows;
                if (source === 'table') {
                    rows = document.querySelectorAll(
                        'table tbody tr, .el-table__body-wrapper tr, '
                        + '.el-table__row, [class*="table"] tbody tr'
                    );
                } else {
                    rows = document.querySelectorAll(
                        '.list-item, .violation-item, [class*="violation"], '
                        + '[class*="wz-item"], .item'
                    );
                }
                if (index < rows.length) {
                    const row = rows[index];
                    const link = row.querySelector(
                        'a[href], [class*="link"], [class*="detail"]'
                    );
                    if (link) {
                        const href = link.getAttribute('href') || '';
                        link.click();
                        return href;
                    }
                    // 尝试点击整行
                    row.click();
                    return 'clicked_row';
                }
                return null;
            }""", {"index": element_index, "source": source})

            if not clicked:
                return detail

            self._wait_human(3, 6)
            self._wait_for_page_ready()
            self._screenshot(f"violation_detail_{index}")

            # 从详情页提取更多信息
            detail_page_info = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                const result = {text: body.substring(0, 3000)};
                // 提取详情 URL
                result.url = window.location.href;
                // 提取图片（如有）
                const imgs = document.querySelectorAll(
                    'img[src*="violation"], img[src*="wz"], '
                    + 'img[src*="photo"], img[class*="evidence"], '
                    + '.violation-img, .photo-img'
                );
                result.images = Array.from(imgs).map(i => i.src).slice(0, 5);
                return result;
            }""")

            if detail_page_info:
                if detail_page_info.get("url"):
                    detail["detail_url"] = detail_page_info["url"]
                # 从详情页文本中补充字段
                page_text = detail_page_info.get("text", "")
                if not detail.get("time"):
                    m = re.search(
                        r"(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*\d{1,2}:\d{2})",
                        page_text,
                    )
                    if m:
                        detail["time"] = m.group(1)
                if not detail.get("location"):
                    m = re.search(
                        r"([\u4e00-\u9fa5]{2,}(?:省|市)[\u4e00-\u9fa5]{2,}"
                        r"(?:区|县|路|街|道|高速|国道|省道)[\u4e00-\u9fa5\d]*)",
                        page_text,
                    )
                    if m:
                        detail["location"] = m.group(1)
                # 违章行为
                behavior_kws = [
                    "超速", "闯红灯", "违停", "违规变道", "未系安全带",
                    "逆行", "压线", "不按规定", "违反禁令", "占用",
                    "不按导向", "违反交通信号", "不礼让",
                ]
                if not detail.get("violation"):
                    for kw in behavior_kws:
                        if kw in page_text:
                            idx = page_text.index(kw)
                            start = max(0, idx - 5)
                            end = min(len(page_text), idx + len(kw) + 15)
                            detail["violation"] = page_text[start:end].strip()
                            break
                # 图片标记
                if detail_page_info.get("images"):
                    detail["has_image"] = True

            # 返回列表页
            self._navigate_back()
            self._wait_human(2, 4)
            self._wait_for_page_ready()

        except Exception as e:
            logger.debug(f"[ViolationQuerySubTask] 进入详情页失败: {e}")
            # 确保回到列表
            self._navigate_back()

        return detail

    def _navigate_back(self):
        """返回列表页"""
        back_texts = ["返回", "返回列表", "← 返回", "返回上级"]
        for text in back_texts:
            if self._find_clickable_by_text(text):
                self._wait_human(1, 3)
                return
        # 兜底：浏览器后退
        try:
            self.page.go_back(wait_until="domcontentloaded", timeout=10000)
        except Exception:
            pass

    # ------------------------------------------------------------------
    # 图片截图
    # ------------------------------------------------------------------

    def _capture_violation_image(self, violation_id: str) -> str:
        """截取违章相关图片，保存到 data/violation_images/ 目录"""
        try:
            self.IMAGE_DIR.mkdir(parents=True, exist_ok=True)
            safe_id = re.sub(r'[^\w\-]', '_', violation_id)
            image_path = str(self.IMAGE_DIR / f"{safe_id}.png")
            self.page.screenshot(path=image_path)
            logger.info(f"[ViolationQuerySubTask] 违章图片保存: {image_path}")
            return image_path
        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 截图失败: {e}")
            return ""

    # ------------------------------------------------------------------
    # 翻页
    # ------------------------------------------------------------------

    def _handle_pagination(self) -> bool:
        """处理翻页，返回是否成功翻到下一页"""
        if not self._has_next_page():
            return False
        return self._click_next_page()

    def _has_next_page(self) -> bool:
        """检测是否还有下一页"""
        try:
            result = self.page.evaluate("""() => {
                // el-pagination 的 btn-next 是否可用
                const nextBtn = document.querySelector(
                    '.el-pagination .btn-next:not([disabled]), '
                    + '.el-pagination button.btn-next:not(.disabled)'
                );
                if (nextBtn && !nextBtn.disabled
                    && !nextBtn.classList.contains('disabled')) {
                    return true;
                }
                // 通用: "下一页" 链接/按钮
                const links = document.querySelectorAll(
                    'a, button, .page-next, [class*="next"], [aria-label="Next"]'
                );
                for (const link of links) {
                    const text = (link.innerText || link.textContent || '').trim();
                    const ariaLabel = link.getAttribute('aria-label') || '';
                    if ((text === '下一页' || text === '>'
                         || text === '»' || ariaLabel.includes('next'))
                        && !link.disabled
                        && !link.classList.contains('disabled')
                        && link.offsetParent !== null) {
                        return true;
                    }
                }
                // 页码数字: 当前页 < 最大页
                const pageNums = document.querySelectorAll(
                    '.el-pager li, .pagination a, .page-num, [class*="pager"] li'
                );
                const nums = [];
                for (const li of pageNums) {
                    const n = parseInt((li.innerText || '').trim(), 10);
                    if (!isNaN(n)) nums.push(n);
                }
                if (nums.length >= 2) {
                    const active = document.querySelector(
                        '.el-pager li.active, .pagination .active, '
                        + '.page-num.active, [class*="pager"] .active'
                    );
                    const currentPage = active
                        ? parseInt((active.innerText || '').trim(), 10)
                        : 0;
                    const maxPage = Math.max(...nums);
                    return currentPage < maxPage;
                }
                return false;
            }""")
            return bool(result)
        except Exception:
            return False

    def _click_next_page(self) -> bool:
        """点击下一页按钮"""
        try:
            clicked = self.page.evaluate("""() => {
                // el-pagination 的 btn-next
                const nextBtn = document.querySelector(
                    '.el-pagination .btn-next:not([disabled]), '
                    + '.el-pagination button.btn-next:not(.disabled)'
                );
                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                    return 'el-pagination';
                }
                // 通用下一页按钮
                const links = document.querySelectorAll(
                    'a, button, .page-next, [class*="next"], [aria-label="Next"]'
                );
                for (const link of links) {
                    const text = (link.innerText || link.textContent || '').trim();
                    const ariaLabel = link.getAttribute('aria-label') || '';
                    if ((text === '下一页' || text === '>'
                         || text === '»' || ariaLabel.includes('next'))
                        && !link.disabled
                        && !link.classList.contains('disabled')
                        && link.offsetParent !== null) {
                        link.click();
                        return 'generic: ' + text;
                    }
                }
                return null;
            }""")
            if clicked:
                logger.info(
                    f"[ViolationQuerySubTask] 点击下一页: {clicked}"
                )
                return True
            return False
        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 点击下一页失败: {e}")
            return False

    # ------------------------------------------------------------------
    # 解析
    # ------------------------------------------------------------------

    def _parse_cells(self, cells: list, detail: dict) -> dict:
        """从表格单元格列表中解析违章信息"""
        for cell in cells:
            cell = cell.strip()
            if not cell:
                continue
            # 时间
            if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", cell) and not detail["time"]:
                detail["time"] = cell
            # 地点
            elif (re.search(r"(省|市|区|县|路|街|道|高速|国道|省道)", cell)
                  and not detail["location"]):
                detail["location"] = cell
            # 扣分
            elif re.search(r"(\d+)\s*分", cell):
                m = re.search(r"(\d+)", cell)
                detail["points"] = int(m.group(1)) if m else 0
            # 罚款
            elif re.search(r"(\d+)\s*元", cell):
                m = re.search(r"(\d+)", cell)
                detail["fine"] = int(m.group(1)) if m else 0
            # 状态
            elif cell in ("未处理", "已处理", "未缴款", "已缴款", "已交款"):
                detail["status"] = cell
            # 车牌号
            elif re.search(r"[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁]"
                           r"[A-Z][A-Z0-9]{5}", cell):
                detail["plate_number"] = cell
            # 违章行为
            elif (len(cell) > 3 and not detail["violation"]
                  and cell not in (detail.get("time"), detail.get("location"),
                                   detail.get("plate_number"))):
                detail["violation"] = cell
        return detail

    def _parse_raw_text(self, raw: str, detail: dict) -> dict:
        """从原始文本中正则提取违章信息"""
        # 时间
        m = re.search(
            r"(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*\d{1,2}:\d{2}(?::\d{2})?)", raw
        )
        if m:
            detail["time"] = m.group(1)

        # 地点
        m = re.search(
            r"([\u4e00-\u9fa5]{2,}(?:省|市)[\u4e00-\u9fa5]{2,}"
            r"(?:区|县|路|街|道|高速|国道|省道)[\u4e00-\u9fa5\d]*)", raw,
        )
        if m:
            detail["location"] = m.group(1)

        # 扣分
        m = re.search(r"(\d+)\s*分", raw)
        if m:
            detail["points"] = int(m.group(1))

        # 罚款
        m = re.search(r"(?:罚款|罚金)\s*(\d+)\s*元", raw)
        if m:
            detail["fine"] = int(m.group(1))

        # 状态
        for status in ("未处理", "已处理", "未缴款", "已缴款"):
            if status in raw:
                detail["status"] = status
                break

        # 车牌号
        m = re.search(
            r"([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁]"
            r"[A-Z][A-Z0-9]{5})", raw,
        )
        if m:
            detail["plate_number"] = m.group(1)

        # 违章行为
        behavior_kws = [
            "超速", "闯红灯", "违停", "违规变道", "未系安全带",
            "逆行", "压线", "不按规定", "违反禁令", "占用",
        ]
        for kw in behavior_kws:
            if kw in raw:
                idx = raw.index(kw)
                start = max(0, idx - 5)
                end = min(len(raw), idx + len(kw) + 10)
                detail["violation"] = raw[start:end].strip()
                break

        return detail

    # ------------------------------------------------------------------
    # 结果构建
    # ------------------------------------------------------------------

    def _build_result(self, violations: list) -> dict:
        """构建标准化返回结果"""
        unprocessed = sum(
            1 for v in violations
            if v.get("status", "") in ("未处理", "未缴款", "")
        )
        processed = len(violations) - unprocessed

        # 保存结果到文件
        result_path = self._save_results(violations)

        result = {
            "success": True,
            "message": f"违章查询完成，共 {len(violations)} 条违章记录",
            "data": {
                "total_count": len(violations),
                "unprocessed_count": unprocessed,
                "processed_count": processed,
                "violations": violations,
                "pages_fetched": self._pages_fetched,
            },
        }
        if result_path:
            result["data"]["result_file"] = result_path

        logger.info(
            f"[ViolationQuerySubTask] 结果: {len(violations)} 条, "
            f"未处理 {unprocessed}, 已处理 {processed}, "
            f"翻页 {self._pages_fetched} 页"
        )
        return result

    def _save_results(self, violations: list) -> str:
        """将查询结果保存为 JSON 文件"""
        try:
            import json
            from datetime import datetime
            result_dir = Path("data/violation_results")
            result_dir.mkdir(parents=True, exist_ok=True)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = str(result_dir / f"violations_{ts}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(violations, f, ensure_ascii=False, indent=2)
            logger.info(f"[ViolationQuerySubTask] 结果保存: {path}")
            return path
        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] 保存结果失败: {e}")
            return ""

    # ------------------------------------------------------------------
    # 导航（保留原有实现）
    # ------------------------------------------------------------------

    def _navigate_to_home(self) -> bool:
        """回到122.gov.cn首页"""
        home_texts = ["首页", "我的主页"]
        for text in home_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[ViolationQuerySubTask] 通过 '{text}' 回到首页")
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        try:
            found = self.page.evaluate("""() => {
                const links = document.querySelectorAll(
                    'a[href], .logo, [class*="logo"], [class*="home"]'
                );
                for (const link of links) {
                    const href = link.getAttribute('href') || '';
                    const text = (link.innerText || link.textContent || '').trim();
                    if (href.includes('/index') || href.endswith('/')
                        || text.includes('首页') || text.includes('主页')) {
                        link.click();
                        return text || href;
                    }
                }
                return null;
            }""")
            if found:
                logger.info(f"[ViolationQuerySubTask] JS 回到首页: {found}")
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True
        except Exception:
            pass

        try:
            base_url = self.page.url.split("/")[0] + "//" + self.page.url.split("/")[2]
            self.page.goto(base_url + "/", wait_until="domcontentloaded", timeout=15000)
            self._wait_human(3, 6)
            logger.info("[ViolationQuerySubTask] URL 直接导航回首页")
            return True
        except Exception:
            pass

        logger.warning("[ViolationQuerySubTask] 回到首页失败")
        self._screenshot("violation_home_fail")
        return False

    def _navigate_to_violation_page(self) -> bool:
        """在首页通过 hover 菜单进入车辆违法页面"""
        self._screenshot("violation_home_before_nav")

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
                    f"[ViolationQuerySubTask] hover 导航成功: {trigger} → {target}"
                )
                return True
            self._wait_human(1, 2)

        direct_texts = [
            "机动车违法", "机动车违法查询", "违法处理",
            "交通违法", "违法查询",
        ]
        for text in direct_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[ViolationQuerySubTask] 直接点击 '{text}' 进入")
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        for trigger, target in hover_pairs[:2]:
            if self._hover_then_safe_click(trigger, target):
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                logger.info(
                    f"[ViolationQuerySubTask] hover+safe_click 成功: "
                    f"{trigger} → {target}"
                )
                return True

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
                        f"[ViolationQuerySubTask] URL {path} 导航成功"
                    )
                    return True
            except Exception:
                continue

        logger.warning("[ViolationQuerySubTask] 所有导航策略均失败")
        self._screenshot("violation_nav_fail")
        return False

    # ------------------------------------------------------------------
    # hover 交互
    # ------------------------------------------------------------------

    def _hover_and_click(self, trigger_text: str, target_text: str,
                         description: str = "") -> bool:
        """先 hover 触发 tooltip/popover，再点击子菜单项"""
        desc = description or f"hover '{trigger_text}' → click '{target_text}'"
        try:
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
                    width: rect.width, height: rect.height,
                    text: (best.innerText || '').trim().substring(0, 30),
                };
            }""", trigger_text)

            if not trigger_info:
                return False

            tx = trigger_info['x'] + random.uniform(-3, 3)
            ty = trigger_info['y'] + random.uniform(-3, 3)
            self.page.mouse.move(tx, ty, steps=random.randint(8, 20))
            time.sleep(random.uniform(0.8, 1.5))

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

            if self._click_in_popover(target_text):
                logger.info(f"[ViolationQuerySubTask] {desc} 成功")
                return True

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
                logger.info(f"[ViolationQuerySubTask] {desc} 回退成功")
                return True
            return False

        except Exception as e:
            logger.warning(f"[ViolationQuerySubTask] hover_and_click 异常: {desc}, {e}")
            return False

    def _click_in_popover(self, target_text: str) -> bool:
        """在已展开的 popover/tooltip 中查找并点击目标项"""
        try:
            return self.page.evaluate("""(targetText) => {
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

    def _hover_then_safe_click(self, trigger_text: str,
                                target_text: str) -> bool:
        """hover 触发菜单后，用 Playwright _safe_click 点击目标"""
        try:
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

    # ------------------------------------------------------------------
    # 触发查询
    # ------------------------------------------------------------------

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
                    logger.info(f"[ViolationQuerySubTask] 点击查询按钮: '{text}'")
                    return
            except Exception:
                continue
