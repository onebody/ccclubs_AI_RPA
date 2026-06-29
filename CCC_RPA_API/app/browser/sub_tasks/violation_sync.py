import json
import logging
import os
import random
import re
import time
from datetime import datetime
from pathlib import Path

import urllib.request
import urllib.error

from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class ViolationSyncSubTask(BaseSubTask):
    """违章记录数据同步子任务

    核心流程：
    1. 导航到"租赁车管理"→"机动车"页面
    2. 提取车辆列表（车牌号、号牌种类、未处理违法数量）
    3. 筛选出有未处理违章的车辆
    4. 对每辆有违章的车：查询违章详情、截图、本地缓存
    5. 全部采集完成后批量提交到 SaaS API
    6. 返回汇总结果

    context 参数：
        saas_api_url    : SaaS API 批量提交地址
        saas_api_key    : API 密钥（可选）
        save_images     : 是否保存违章图片截图（默认 True）
        only_unprocessed: 是否只查询未处理违章的车辆（默认 True）
    """

    SUB_TASK_TYPE = "ViolationSyncSubTask"

    # 缓存目录（相对于 CCC_RPA_API 工作目录）
    CACHE_DIR = Path("data/violation_sync_cache")
    IMAGE_DIR = CACHE_DIR / "images"

    def __init__(self, page, broadcast_fn=None, task_id=None,
                 sub_task_id=None, sub_task_type=None, context=None):
        super().__init__(page, broadcast_fn=broadcast_fn, task_id=task_id, context=context)
        self._sub_task_id = sub_task_id
        self._sub_task_type = sub_task_type
        self._pages_fetched = 0

    # ------------------------------------------------------------------
    # 广播
    # ------------------------------------------------------------------

    def _broadcast_progress(self, step: str, message: str, progress: int = 0,
                            data: dict = None):
        """广播子任务进度"""
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

    # ------------------------------------------------------------------
    # 入口
    # ------------------------------------------------------------------

    def execute(self) -> dict:
        """主流程"""
        logger.info("[ViolationSyncSubTask] 开始执行违章记录数据同步")
        self._broadcast_progress("start", "开始执行违章记录数据同步", 0)
        self._screenshot("vsync_start")

        save_images = self._context.get("save_images", True)
        only_unprocessed = self._context.get("only_unprocessed", True)

        try:
            # 第一阶段：导航到租赁车管理页面并获取车辆列表
            self._broadcast_progress("navigate", "正在导航到租赁车管理页面", 5)
            if not self._navigate_to_vehicle_list():
                return {"success": False, "message": "无法导航到租赁车管理→机动车页面"}
            self._wait_human(3, 8)
            self._screenshot("vsync_vehicle_list")

            # 获取车辆列表（含翻页）
            vehicles = self._get_vehicle_list()
            if not vehicles:
                return {"success": False, "message": "未能获取到车辆列表"}

            # 筛选有违章的车辆
            filtered = self._filter_vehicles_with_violations(vehicles) if only_unprocessed else vehicles
            self._broadcast_progress(
                "vehicle_list",
                f"获取到 {len(vehicles)} 辆车，{len(filtered)} 辆有违章",
                10,
            )
            logger.info(
                f"[ViolationSyncSubTask] 车辆总数={len(vehicles)}, 有违章={len(filtered)}"
            )

            if not filtered:
                return {
                    "success": True,
                    "message": f"共 {len(vehicles)} 辆车，均无未处理违章",
                    "data": {"total_vehicles": 0, "total_violations": 0, "violations": []},
                }

            # 第二阶段：逐车查询违章
            all_cached = []
            for i, vehicle in enumerate(filtered):
                progress = 10 + int(80 * i / len(filtered))
                self._broadcast_progress(
                    "querying",
                    f"正在查询第 {i + 1}/{len(filtered)} 辆车 ({vehicle['plate_number']}) 的违章...",
                    progress,
                )
                logger.info(
                    f"[ViolationSyncSubTask] 查询车辆 {i + 1}/{len(filtered)}: "
                    f"{vehicle['plate_number']}"
                )

                violations = self._query_vehicle_violations(vehicle, save_images)
                logger.info(
                    f"[ViolationSyncSubTask] {vehicle['plate_number']} 获取到 "
                    f"{len(violations)} 条违章"
                )

                # 第三阶段：本地缓存
                cache_path = self._cache_data(vehicle, violations)
                all_cached.append({
                    "vehicle": vehicle,
                    "violations": violations,
                    "cache_path": cache_path,
                })

                self._wait_human(2, 5)

            # 第四阶段：批量提交到 SaaS API
            self._broadcast_progress("caching", "正在保存违章数据到本地缓存...", 90)
            cached_data = self._load_cached_data()

            total_violations = sum(len(c["violations"]) for c in all_cached)
            total_vehicles = len(all_cached)

            self._broadcast_progress(
                "submitting",
                f"正在批量提交 {total_violations} 条违章到SaaS系统...",
                95,
            )
            submit_result = self._batch_submit_to_saas(all_cached)

            # 完成
            result = {
                "total_vehicles": total_vehicles,
                "total_violations": total_violations,
                "submit_result": submit_result,
            }
            self._broadcast_progress(
                "done",
                f"同步完成：{total_vehicles} 辆车，{total_violations} 条违章",
                100,
                data=result,
            )
            self._screenshot("vsync_done")

            return {
                "success": True,
                "message": f"违章同步完成：{total_vehicles} 辆车，{total_violations} 条违章",
                "data": result,
            }

        except Exception as e:
            logger.error(f"[ViolationSyncSubTask] 执行异常: {e}")
            self._screenshot("vsync_error")
            return {"success": False, "message": f"违章同步异常: {str(e)}"}

    # ==================================================================
    # 第一阶段：车辆列表获取
    # ==================================================================

    def _navigate_to_vehicle_list(self) -> bool:
        """导航到租赁车管理→机动车列表页面"""
        self._screenshot("vsync_nav_before")

        # 策略1：点击左侧"租赁车管理"菜单
        menu_texts = ["租赁车管理", "租赁车", "机动车管理", "机动车"]
        for text in menu_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[ViolationSyncSubTask] 点击菜单: '{text}'")
                self._wait_human(2, 5)
                self._wait_for_page_ready()

                # 如果点击的是父菜单，可能需要点击子菜单
                if text in ("租赁车管理", "租赁车"):
                    self._wait_human(1, 2)
                    sub_texts = ["机动车", "机动车列表", "车辆列表"]
                    for sub in sub_texts:
                        if self._find_clickable_by_text(sub):
                            logger.info(f"[ViolationSyncSubTask] 点击子菜单: '{sub}'")
                            self._wait_human(2, 5)
                            self._wait_for_page_ready()
                            break

                self._screenshot("vsync_nav_after")
                return True

        # 策略2：JS 查找左侧菜单
        try:
            clicked = self.page.evaluate("""() => {
                const menuItems = document.querySelectorAll(
                    '.el-menu-item, .el-submenu__title, .menu-item, '
                    + '[class*="menu"] a, [class*="menu"] li, '
                    + '[class*="sidebar"] a, [class*="nav"] a'
                );
                for (const item of menuItems) {
                    const text = (item.innerText || '').trim();
                    if (text.includes('租赁车') || text.includes('机动车')) {
                        item.click();
                        return text;
                    }
                }
                return null;
            }""")
            if clicked:
                logger.info(f"[ViolationSyncSubTask] JS 点击菜单: '{clicked}'")
                self._wait_human(2, 5)
                self._wait_for_page_ready()

                # 尝试点击子菜单
                if "租赁车" in clicked:
                    self._wait_human(1, 2)
                    sub_clicked = self.page.evaluate("""() => {
                        const items = document.querySelectorAll(
                            '.el-menu-item, .menu-item, [class*="menu"] a'
                        );
                        for (const item of items) {
                            const text = (item.innerText || '').trim();
                            if (text.includes('机动车') && item.offsetParent !== null) {
                                item.click();
                                return text;
                            }
                        }
                        return null;
                    }""")
                    if sub_clicked:
                        logger.info(f"[ViolationSyncSubTask] JS 点击子菜单: '{sub_clicked}'")
                        self._wait_human(2, 5)
                        self._wait_for_page_ready()

                self._screenshot("vsync_nav_after_js")
                return True
        except Exception as e:
            logger.debug(f"[ViolationSyncSubTask] JS 菜单导航失败: {e}")

        # 策略3：URL 直接导航
        try:
            base_url = self.page.url.split("/")[0] + "//" + self.page.url.split("/")[2]
            vehicle_urls = [
                "/views/lease/vehicle.html",
                "/views/vehicle/list.html",
                "/views/lease/motorcar.html",
            ]
            for path in vehicle_urls:
                try:
                    self.page.goto(
                        base_url + path,
                        wait_until="domcontentloaded",
                        timeout=10000,
                    )
                    self._wait_human(3, 6)
                    title = self.page.title() or ""
                    if any(kw in title for kw in ("租赁车", "机动车", "车辆")):
                        logger.info(f"[ViolationSyncSubTask] URL {path} 导航成功")
                        return True
                except Exception:
                    continue
        except Exception:
            pass

        logger.warning("[ViolationSyncSubTask] 所有导航策略均失败")
        self._screenshot("vsync_nav_fail")
        return False

    def _get_vehicle_list(self) -> list:
        """从当前页面提取车辆列表（含翻页）"""
        all_vehicles = []
        self._pages_fetched = 0

        while True:
            self._pages_fetched += 1
            page_vehicles = self._extract_vehicle_table()
            logger.info(
                f"[ViolationSyncSubTask] 第 {self._pages_fetched} 页，"
                f"提取 {len(page_vehicles)} 辆车"
            )

            if not page_vehicles:
                break

            all_vehicles.extend(page_vehicles)

            if not self._has_next_page():
                break
            if not self._click_next_page():
                break
            self._wait_human(3, 8)
            self._wait_for_page_ready()

        return all_vehicles

    def _extract_vehicle_table(self) -> list:
        """从当前页面表格中提取车辆信息"""
        self._screenshot("vsync_extract_table")
        try:
            vehicles = self.page.evaluate("""() => {
                const results = [];
                // 表格行
                const rows = document.querySelectorAll(
                    'table tbody tr, .el-table__body-wrapper tr, '
                    + '.el-table__row, [class*="table"] tbody tr'
                );
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 3) {
                        const texts = Array.from(cells).map(
                            c => (c.innerText || '').trim()
                        );
                        // 提取车牌号
                        let plateNumber = '';
                        let plateType = '';
                        let status = '';
                        let unprocessedCount = 0;
                        for (const t of texts) {
                            // 车牌号匹配
                            if (!plateNumber && /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-Z][A-Z0-9]{5}/.test(t)) {
                                plateNumber = t;
                            }
                            // 号牌种类
                            if (t.includes('小型') || t.includes('大型') || t.includes('新能源') || t.includes('汽车')) {
                                plateType = t;
                            }
                            // 状态
                            if (t.includes('违法') || t.includes('正常') || t.includes('逾期未')) {
                                status = t;
                            }
                            // 未处理违法数量（纯数字）
                            const num = parseInt(t, 10);
                            if (!isNaN(num) && num > 0 && num < 1000 && t === String(num)) {
                                // 可能是未处理数量，取最后匹配到的
                                unprocessedCount = num;
                            }
                        }
                        if (plateNumber) {
                            results.push({
                                plate_number: plateNumber,
                                plate_type: plateType,
                                status: status,
                                unprocessed_count: unprocessedCount,
                                raw_cells: texts,
                            });
                        }
                    }
                }
                return results;
            }""")
            logger.info(f"[ViolationSyncSubTask] 提取到 {len(vehicles)} 辆车（当前页）")
            return vehicles or []
        except Exception as e:
            logger.warning(f"[ViolationSyncSubTask] 提取车辆列表失败: {e}")
            return []

    def _has_next_page(self) -> bool:
        """检测是否有下一页"""
        try:
            result = self.page.evaluate("""() => {
                // el-pagination 的 btn-next
                const nextBtn = document.querySelector(
                    '.el-pagination .btn-next:not([disabled]), '
                    + '.el-pagination button.btn-next:not(.disabled)'
                );
                if (nextBtn && !nextBtn.disabled
                    && !nextBtn.classList.contains('disabled')) {
                    return true;
                }
                // 通用: "下一页" 按钮
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
                // 页码比较
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
        """点击下一页"""
        try:
            clicked = self.page.evaluate("""() => {
                const nextBtn = document.querySelector(
                    '.el-pagination .btn-next:not([disabled]), '
                    + '.el-pagination button.btn-next:not(.disabled)'
                );
                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                    return 'el-pagination';
                }
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
                logger.info(f"[ViolationSyncSubTask] 点击下一页: {clicked}")
                return True
            return False
        except Exception as e:
            logger.warning(f"[ViolationSyncSubTask] 点击下一页失败: {e}")
            return False

    # ==================================================================
    # 第二阶段：逐车违章查询
    # ==================================================================

    def _query_vehicle_violations(self, vehicle: dict,
                                  save_images: bool = True) -> list:
        """查询指定车辆的所有违章记录"""
        plate_number = vehicle.get("plate_number", "")
        plate_type = vehicle.get("plate_type")

        # 导航到违章查询界面
        if not self._navigate_to_violation_query():
            logger.warning(
                f"[ViolationSyncSubTask] 无法导航到违章查询页面: {plate_number}"
            )
            return []

        self._wait_human(2, 5)

        # 搜索指定车牌
        if not self._search_by_plate(plate_number, plate_type):
            logger.warning(
                f"[ViolationSyncSubTask] 无法搜索车牌: {plate_number}"
            )
            return []

        self._wait_human(3, 8)
        self._wait_for_page_ready()
        self._screenshot(f"vsync_search_{plate_number}")

        # 提取违章列表（含翻页）
        all_violations = []
        page_num = 0

        while True:
            page_num += 1
            page_violations = self._extract_violation_list()
            if not page_violations:
                break

            for v in page_violations:
                v["plate_number"] = plate_number

            all_violations.extend(page_violations)

            if not self._has_next_page():
                break
            if not self._click_next_page():
                break
            self._wait_human(3, 8)
            self._wait_for_page_ready()

        # 提取每条违章的详情
        detailed = self._fetch_violation_details(all_violations, save_images,
                                                 plate_number)

        return detailed

    def _navigate_to_violation_query(self) -> bool:
        """导航到违章查询界面"""
        # 策略1：通过左侧菜单
        menu_paths = [
            ("交通违法", "违法查询"),
            ("车辆业务", "机动车违法"),
            ("违法处理业务", "机动车违法"),
        ]
        for trigger, target in menu_paths:
            if self._hover_and_click_menu(trigger, target):
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        # 策略2：直接点击
        direct_texts = [
            "机动车违法", "违法查询", "交通违法查询",
            "违法处理", "交通违法",
        ]
        for text in direct_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[ViolationSyncSubTask] 直接点击 '{text}' 进入违章查询")
                self._wait_for_page_ready()
                self._wait_human(2, 5)
                return True

        # 策略3：返回后通过 URL
        try:
            base_url = self.page.url.split("/")[0] + "//" + self.page.url.split("/")[2]
            violation_urls = [
                "/views/violation/list.html",
                "/views/wzcx/list.html",
                "/views/violation/index.html",
            ]
            for path in violation_urls:
                try:
                    self.page.goto(
                        base_url + path,
                        wait_until="domcontentloaded",
                        timeout=10000,
                    )
                    self._wait_human(2, 5)
                    title = self.page.title() or ""
                    if any(kw in title for kw in ("违法", "违章", "violation")):
                        return True
                except Exception:
                    continue
        except Exception:
            pass

        return False

    def _hover_and_click_menu(self, trigger_text: str, target_text: str) -> bool:
        """hover 触发菜单并点击子项"""
        try:
            trigger_info = self.page.evaluate("""(text) => {
                const els = document.querySelectorAll(
                    'a, button, div, span, li, [role="menuitem"], '
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
                };
            }""", trigger_text)

            if not trigger_info:
                return False

            tx = trigger_info['x'] + random.uniform(-3, 3)
            ty = trigger_info['y'] + random.uniform(-3, 3)
            self.page.mouse.move(tx, ty, steps=random.randint(8, 20))
            time.sleep(random.uniform(0.8, 1.5))

            # 在弹出层中查找目标
            clicked = self.page.evaluate("""(targetText) => {
                const containers = document.querySelectorAll(
                    '.popover, .tooltip, .el-popover, .el-tooltip__popper, '
                    + '[class*="popup"], [class*="popover"], [class*="dropdown"], '
                    + '[role="tooltip"], [role="dialog"]'
                );
                for (const c of containers) {
                    if (c.offsetParent === null) continue;
                    const els = c.querySelectorAll(
                        'a, button, li, span, [role="menuitem"]'
                    );
                    for (const el of els) {
                        const t = (el.innerText || '').trim();
                        if (t.includes(targetText) && t.length < 30) {
                            el.click();
                            return true;
                        }
                    }
                }
                // 全局查找
                const allEls = document.querySelectorAll(
                    'a, button, li, span, [role="menuitem"]'
                );
                for (const el of allEls) {
                    const t = (el.innerText || '').trim();
                    if (t.includes(targetText) && t.length < 30
                        && el.offsetParent !== null) {
                        el.click();
                        return true;
                    }
                }
                return false;
            }""", target_text)

            if clicked:
                logger.info(
                    f"[ViolationSyncSubTask] hover 菜单: '{trigger_text}' → '{target_text}'"
                )
                return True
            return False
        except Exception as e:
            logger.debug(f"[ViolationSyncSubTask] hover 菜单失败: {e}")
            return False

    def _search_by_plate(self, plate_number: str,
                         plate_type: str = None) -> bool:
        """搜索指定车牌的违章"""
        self._screenshot("vsync_search_before")

        # 策略1：使用搜索框
        search_selectors = [
            'input[placeholder*="车牌"]',
            'input[placeholder*="号牌"]',
            'input[placeholder*="搜索"]',
            'input[type="search"]',
            '.el-input input',
            'input[name*="plate"]',
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
                        f"[ViolationSyncSubTask] 输入车牌: {plate_number}"
                    )
                    self._wait_human(1, 2)

                    # 号牌种类筛选
                    if plate_type:
                        self._select_plate_type_filter(plate_type)
                        self._wait_human(1, 2)

                    # 触发搜索
                    self._trigger_search()
                    self._wait_human(3, 6)
                    self._wait_for_page_ready()
                    self._screenshot("vsync_search_after")
                    return True
            except Exception as e:
                logger.debug(f"[ViolationSyncSubTask] 搜索框 {sel} 失败: {e}")
                continue

        # 策略2：JS 查找并点击表格中的车牌行
        try:
            clicked = self.page.evaluate("""(plate) => {
                const rows = document.querySelectorAll(
                    'tr, .list-item, [class*="item"], [class*="row"]'
                );
                for (const el of rows) {
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
                logger.info(f"[ViolationSyncSubTask] JS 点击车牌行: {plate_number}")
                self._wait_human(2, 5)
                return True
        except Exception:
            pass

        logger.warning(f"[ViolationSyncSubTask] 搜索车牌失败: {plate_number}")
        return False

    def _select_plate_type_filter(self, plate_type: str):
        """选择号牌种类筛选"""
        try:
            self.page.evaluate("""(plateType) => {
                const selects = document.querySelectorAll(
                    'select, .el-select, [class*="select"]'
                );
                for (const sel of selects) {
                    const label = sel.closest('.el-form-item, .form-group')
                        ?.querySelector('label')?.innerText || '';
                    if (label.includes('号牌') || label.includes('种类')) {
                        const trigger = sel.querySelector(
                            '.el-input, .el-select__input, input'
                        ) || sel;
                        trigger.click();
                        break;
                    }
                }
            }""", plate_type)
            self._wait_human(0.5, 1)
            self._find_clickable_by_text(plate_type)
        except Exception as e:
            logger.debug(f"[ViolationSyncSubTask] 选择号牌种类失败: {e}")

    def _trigger_search(self):
        """触发搜索"""
        try:
            self.page.keyboard.press("Enter")
        except Exception:
            pass

        search_btns = ["查询", "搜索", "Search"]
        for text in search_btns:
            try:
                clicked = self.page.evaluate("""(text) => {
                    const btns = document.querySelectorAll(
                        'button, a.btn, .el-button, [role="button"], '
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
                    return
            except Exception:
                continue

    def _extract_violation_list(self) -> list:
        """提取当前页面的违章列表"""
        try:
            items = self.page.evaluate("""() => {
                const results = [];
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
                // 列表项
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
                return results;
            }""")
            logger.info(f"[ViolationSyncSubTask] 提取到 {len(items)} 条违章（当前页）")
            return items or []
        except Exception as e:
            logger.warning(f"[ViolationSyncSubTask] 提取违章列表失败: {e}")
            return []

    def _fetch_violation_details(self, violations: list, save_images: bool,
                                 plate_number: str) -> list:
        """批量提取违章详情"""
        detailed = []
        total = len(violations)

        for i, v in enumerate(violations):
            detail = self._extract_violation_detail(v)
            if not detail:
                detail = {"raw": v.get("raw", "")}

            detail["plate_number"] = plate_number

            # 尝试进入详情页
            detail = self._enter_detail_page(v, detail, i)

            # 截图
            if save_images:
                violation_id = (
                    f"{plate_number}_{i + 1:03d}_"
                    f"{detail.get('time', '').replace(' ', '_').replace(':', '-')}"
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
            logger.warning(f"[ViolationSyncSubTask] 提取违章详情失败: {e}")
            return {"raw": item.get("raw", ""), "error": str(e)}

    def _enter_detail_page(self, item: dict, detail: dict, index: int) -> dict:
        """点击进入违章详情页获取更多信息"""
        try:
            element_index = item.get("element_index", index)
            source = item.get("source", "table")

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
                    row.click();
                    return 'clicked_row';
                }
                return null;
            }""", {"index": element_index, "source": source})

            if not clicked:
                return detail

            self._wait_human(3, 6)
            self._wait_for_page_ready()
            self._screenshot(f"vsync_detail_{index}")

            # 从详情页提取更多信息
            detail_page_info = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                const result = {text: body.substring(0, 3000)};
                result.url = window.location.href;
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
                behavior_kws = [
                    "超速", "闯红灯", "违停", "违规变道", "未系安全带",
                    "逆行", "压线", "不按规定", "违反禁令", "占用",
                ]
                if not detail.get("violation"):
                    for kw in behavior_kws:
                        if kw in page_text:
                            idx = page_text.index(kw)
                            start = max(0, idx - 5)
                            end = min(len(page_text), idx + len(kw) + 15)
                            detail["violation"] = page_text[start:end].strip()
                            break
                if detail_page_info.get("images"):
                    detail["has_image"] = True

            # 返回列表页
            self._navigate_back()
            self._wait_human(2, 4)
            self._wait_for_page_ready()

        except Exception as e:
            logger.debug(f"[ViolationSyncSubTask] 进入详情页失败: {e}")
            self._navigate_back()

        return detail

    def _navigate_back(self):
        """返回列表页"""
        back_texts = ["返回", "返回列表", "← 返回", "返回上级"]
        for text in back_texts:
            if self._find_clickable_by_text(text):
                self._wait_human(1, 3)
                return
        try:
            self.page.go_back(wait_until="domcontentloaded", timeout=10000)
        except Exception:
            pass

    def _capture_violation_image(self, violation_id: str) -> str:
        """截取违章相关图片"""
        try:
            self.IMAGE_DIR.mkdir(parents=True, exist_ok=True)
            safe_id = re.sub(r'[^\w\-]', '_', violation_id)
            image_path = str(self.IMAGE_DIR / f"{safe_id}.png")
            self.page.screenshot(path=image_path)
            logger.info(f"[ViolationSyncSubTask] 违章图片保存: {image_path}")
            return image_path
        except Exception as e:
            logger.warning(f"[ViolationSyncSubTask] 截图失败: {e}")
            return ""

    # ==================================================================
    # 第三阶段：本地缓存
    # ==================================================================

    def _cache_data(self, vehicle: dict, violations: list) -> str:
        """缓存违章数据到本地 JSON 文件"""
        try:
            self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
            plate = vehicle.get("plate_number", "unknown")
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{plate}_{ts}.json"
            filepath = self.CACHE_DIR / filename

            data = {
                "vehicle": {
                    "plate_number": plate,
                    "plate_type": vehicle.get("plate_type", ""),
                    "status": vehicle.get("status", ""),
                },
                "violations": violations,
                "total_count": len(violations),
                "pages_fetched": self._pages_fetched,
                "cached_at": datetime.now().isoformat(),
            }

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"[ViolationSyncSubTask] 缓存保存: {filepath}")
            return str(filepath)
        except Exception as e:
            logger.warning(f"[ViolationSyncSubTask] 缓存保存失败: {e}")
            return ""

    def _load_cached_data(self) -> list:
        """加载所有缓存数据"""
        cached = []
        try:
            if not self.CACHE_DIR.exists():
                return cached
            for f in sorted(self.CACHE_DIR.glob("*.json")):
                with open(f, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    cached.append(data)
            logger.info(f"[ViolationSyncSubTask] 加载 {len(cached)} 个缓存文件")
        except Exception as e:
            logger.warning(f"[ViolationSyncSubTask] 加载缓存失败: {e}")
        return cached

    # ==================================================================
    # 第四阶段：SaaS API 提交
    # ==================================================================

    def _batch_submit_to_saas(self, cached_data: list) -> dict:
        """批量提交到 SaaS API"""
        saas_api_url = self._context.get("saas_api_url", "")
        saas_api_key = self._context.get("saas_api_key", "")

        if not saas_api_url:
            logger.info("[ViolationSyncSubTask] 未配置 saas_api_url，跳过批量提交")
            return {"submitted": False, "reason": "未配置 saas_api_url"}

        # 构造批量提交数据
        vehicles_payload = []
        total_violations = 0
        for item in cached_data:
            vehicle = item.get("vehicle", item) if isinstance(item, dict) else {}
            violations = item.get("violations", [])
            plate = vehicle.get("plate_number", "") if isinstance(vehicle, dict) else ""
            vehicles_payload.append({
                "plate_number": plate,
                "violations": violations,
            })
            total_violations += len(violations)

        payload = {
            "vehicles": vehicles_payload,
            "total_vehicles": len(vehicles_payload),
            "total_violations": total_violations,
            "sync_time": datetime.now().isoformat(),
        }

        # 发送请求
        headers = {"Content-Type": "application/json"}
        if saas_api_key:
            headers["Authorization"] = f"Bearer {saas_api_key}"

        try:
            body = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                saas_api_url,
                data=body,
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                status_code = resp.status
                resp_body = resp.read().decode("utf-8")
                try:
                    resp_data = json.loads(resp_body)
                except (json.JSONDecodeError, ValueError):
                    resp_data = {}

            success = 200 <= status_code < 300
            logger.info(
                f"[ViolationSyncSubTask] SaaS 提交结果: "
                f"status={status_code}, success={success}"
            )

            return {
                "submitted": True,
                "success": success,
                "status_code": status_code,
                "response": resp_data,
                "total_vehicles": len(vehicles_payload),
                "total_violations": total_violations,
            }
        except urllib.error.HTTPError as e:
            logger.error(f"[ViolationSyncSubTask] SaaS 提交HTTP错误: {e}")
            return {
                "submitted": True,
                "success": False,
                "status_code": e.code,
                "error": str(e),
                "total_vehicles": len(vehicles_payload),
                "total_violations": total_violations,
            }
        except urllib.error.URLError as e:
            logger.error(f"[ViolationSyncSubTask] SaaS 提交网络错误: {e}")
            return {
                "submitted": True,
                "success": False,
                "error": str(e),
                "total_vehicles": len(vehicles_payload),
                "total_violations": total_violations,
            }

    # ==================================================================
    # 辅助方法
    # ==================================================================

    def _filter_vehicles_with_violations(self, vehicles: list) -> list:
        """筛选有未处理违章的车辆"""
        return [v for v in vehicles if v.get("unprocessed_count", 0) > 0]

    def _parse_cells(self, cells: list, detail: dict) -> dict:
        """从表格单元格列表中解析违章信息"""
        for cell in cells:
            cell = cell.strip()
            if not cell:
                continue
            if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", cell) and not detail["time"]:
                detail["time"] = cell
            elif (re.search(r"(省|市|区|县|路|街|道|高速|国道|省道)", cell)
                  and not detail["location"]):
                detail["location"] = cell
            elif re.search(r"(\d+)\s*分", cell):
                m = re.search(r"(\d+)", cell)
                detail["points"] = int(m.group(1)) if m else 0
            elif re.search(r"(\d+)\s*元", cell):
                m = re.search(r"(\d+)", cell)
                detail["fine"] = int(m.group(1)) if m else 0
            elif cell in ("未处理", "已处理", "未缴款", "已缴款", "已交款"):
                detail["status"] = cell
            elif re.search(
                r"[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁]"
                r"[A-Z][A-Z0-9]{5}", cell
            ):
                detail["plate_number"] = cell
            elif (len(cell) > 3 and not detail["violation"]
                  and cell not in (detail.get("time"), detail.get("location"),
                                   detail.get("plate_number"))):
                detail["violation"] = cell
        return detail

    def _parse_raw_text(self, raw: str, detail: dict) -> dict:
        """从原始文本中正则提取违章信息"""
        m = re.search(
            r"(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*\d{1,2}:\d{2}(?::\d{2})?)", raw
        )
        if m:
            detail["time"] = m.group(1)

        m = re.search(
            r"([\u4e00-\u9fa5]{2,}(?:省|市)[\u4e00-\u9fa5]{2,}"
            r"(?:区|县|路|街|道|高速|国道|省道)[\u4e00-\u9fa5\d]*)", raw,
        )
        if m:
            detail["location"] = m.group(1)

        m = re.search(r"(\d+)\s*分", raw)
        if m:
            detail["points"] = int(m.group(1))

        m = re.search(r"(?:罚款|罚金)\s*(\d+)\s*元", raw)
        if m:
            detail["fine"] = int(m.group(1))

        for status in ("未处理", "已处理", "未缴款", "已缴款"):
            if status in raw:
                detail["status"] = status
                break

        m = re.search(
            r"([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁]"
            r"[A-Z][A-Z0-9]{5})", raw,
        )
        if m:
            detail["plate_number"] = m.group(1)

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
