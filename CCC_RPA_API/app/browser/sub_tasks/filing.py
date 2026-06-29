import logging
import time
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)

# 待备案状态关键词
PENDING_KEYWORDS = ("待备案", "未备案", "待处理")


class FilingSubTask(BaseSubTask):
    """合同备案子任务 — 在 122.gov.cn 上自动完成合同备案操作"""

    # ------------------------------------------------------------------
    # 主流程
    # ------------------------------------------------------------------

    def execute(self) -> dict:
        logger.info("[FilingSubTask] 开始执行合同备案")
        self._broadcast_progress("start", "开始执行合同备案", 0)
        self._screenshot("filing_start")

        try:
            # 步骤1: 导航到备案管理页面
            self._broadcast_progress("navigate", "正在导航到备案管理页面", 10)
            if not self._navigate_to_filing():
                return {"success": False, "message": "无法导航到备案管理页面"}
            self._wait_human(5, 12)

            # 步骤1.5: 验证页面状态
            self._broadcast_progress("verify_page", "正在验证备案页面状态", 15)
            if not self._verify_filing_page():
                logger.warning("[FilingSubTask] 页面状态验证未通过，但继续尝试")
            self._wait_human(2, 5)

            # 步骤2: 获取待备案列表（支持翻页）
            self._broadcast_progress("list", "正在获取待备案合同列表", 20)
            pending = self._get_all_pending_filings()
            if not pending:
                self._broadcast_progress("done", "没有待备案的合同", 100)
                return {"success": True, "message": "没有待备案的合同", "total": 0,
                        "success_count": 0, "fail_count": 0}

            logger.info(f"[FilingSubTask] 找到 {len(pending)} 条待备案合同")

            # 步骤3: 逐条处理备案
            results = []
            for i, item in enumerate(pending):
                progress = 30 + int((i / len(pending)) * 60)
                self._broadcast_progress(
                    "processing",
                    f"正在处理第 {i + 1}/{len(pending)} 条备案",
                    progress,
                )
                result = self._process_single_filing(item)
                results.append(result)
                if not result.get("success"):
                    logger.warning(
                        f"[FilingSubTask] 第 {i + 1} 条备案失败: {result.get('message')}"
                    )
                    self._screenshot(f"filing_fail_{i}")
                    # 失败后尝试返回列表页继续
                    self._navigate_back_to_list()
                else:
                    logger.info(f"[FilingSubTask] 第 {i + 1} 条备案成功")
                self._wait_human(5, 15)  # 操作间等待，控制 PPM

            # 步骤4: 汇总结果
            success_count = sum(1 for r in results if r.get("success"))
            fail_count = len(results) - success_count
            message = f"备案完成: 成功 {success_count} 条, 失败 {fail_count} 条"

            self._broadcast_progress("done", message, 100)
            self._screenshot("filing_done")

            return {
                "success": fail_count == 0,
                "message": message,
                "total": len(results),
                "success_count": success_count,
                "fail_count": fail_count,
            }

        except Exception as e:
            logger.error(f"[FilingSubTask] 执行异常: {e}")
            self._screenshot("filing_error")
            return {"success": False, "message": f"备案执行异常: {str(e)}"}

    # ------------------------------------------------------------------
    # 导航
    # ------------------------------------------------------------------

    def _navigate_to_filing(self) -> bool:
        """导航到备案管理页面 — 三级降级策略（菜单→URL→JS）"""
        # 策略1: 尝试点击菜单中的"合同备案"或"备案管理"
        menu_texts = ["合同备案", "备案管理", "备案查询", "合同备案管理"]
        for text in menu_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[FilingSubTask] 通过菜单文本 '{text}' 导航成功")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True

        # 策略2: 尝试常见 URL 路径
        filing_urls = [
            "/views/memrent/filing.html",
            "/views/memrent/contract-filing.html",
            "/views/memrent/ba.html",
        ]
        base_url = (
            self.page.url.rsplit("/", 1)[0] if "/" in self.page.url else self.page.url
        )
        for path in filing_urls:
            try:
                self.page.goto(
                    base_url + path, wait_until="domcontentloaded", timeout=10000
                )
                self._wait_human(3, 6)
                # 检查是否到达了正确页面
                if self._verify_filing_page():
                    logger.info(f"[FilingSubTask] 通过 URL {path} 导航成功")
                    return True
            except Exception:
                continue

        # 策略3: JS 查找包含"备案"的链接并点击
        try:
            found = self.page.evaluate("""() => {
                const links = document.querySelectorAll(
                    'a[href], [role="menuitem"], .menu-item, .nav-item'
                );
                for (const link of links) {
                    const text = (link.innerText || link.textContent || '').trim();
                    if (text.includes('备案')) {
                        link.click();
                        return text;
                    }
                }
                return null;
            }""")
            if found:
                logger.info(f"[FilingSubTask] JS 导航成功: {found}")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True
        except Exception:
            pass

        logger.warning("[FilingSubTask] 所有导航策略均失败")
        self._screenshot("filing_nav_fail")
        return False

    def _verify_filing_page(self) -> bool:
        """验证当前页面是否为备案管理页面"""
        try:
            result = self.page.evaluate("""() => {
                const title = document.title || '';
                const body = document.body?.innerText || '';
                const keywords = ['备案', '合同备案', '备案管理', '备案查询'];
                for (const kw of keywords) {
                    if (title.includes(kw) || body.includes(kw)) return true;
                }
                // 检查页面中是否存在表格或列表（备案页面通常有列表）
                const tables = document.querySelectorAll(
                    'table, .el-table, [class*="table"], [class*="list"]'
                );
                return tables.length > 0 && body.length > 50;
            }""")
            if result:
                logger.info("[FilingSubTask] 页面状态验证通过")
            else:
                logger.warning("[FilingSubTask] 页面状态验证未通过")
            return bool(result)
        except Exception as e:
            logger.warning(f"[FilingSubTask] 页面状态验证异常: {e}")
            return False

    # ------------------------------------------------------------------
    # 列表获取（含翻页）
    # ------------------------------------------------------------------

    def _get_all_pending_filings(self) -> list:
        """获取所有页面的待备案合同列表（支持翻页）"""
        all_items = []
        max_pages = 20  # 安全上限，防止无限翻页
        page_num = 1

        while page_num <= max_pages:
            items = self._get_pending_filings_current_page()
            if not items:
                if page_num == 1:
                    logger.info("[FilingSubTask] 当前页无待备案项")
                break

            # 为每个 item 记录来源页码
            for item in items:
                item["page_num"] = page_num
            all_items.extend(items)
            logger.info(
                f"[FilingSubTask] 第 {page_num} 页提取到 {len(items)} 条待备案项"
            )

            # 尝试翻到下一页
            if not self._go_to_next_page():
                logger.info(f"[FilingSubTask] 无更多页面，共采集 {page_num} 页")
                break

            self._wait_human(3, 8)
            page_num += 1

        # 采集完毕后回到第一页，方便后续逐条处理
        if page_num > 1:
            self._go_to_first_page()
            self._wait_human(2, 5)

        logger.info(f"[FilingSubTask] 共获取 {len(all_items)} 条待备案合同")
        return all_items

    def _get_pending_filings_current_page(self) -> list:
        """获取当前页面的待备案合同列表"""
        self._screenshot("filing_list")

        try:
            items = self.page.evaluate("""(keywords) => {
                const results = [];
                const rows = document.querySelectorAll(
                    'tr, .list-item, .el-table__row, [class*="item"]'
                );
                for (const row of rows) {
                    const text = (row.innerText || '').trim();
                    let matched = false;
                    for (const kw of keywords) {
                        if (text.includes(kw)) { matched = true; break; }
                    }
                    if (matched) {
                        results.push({
                            text: text.substring(0, 200),
                            element_index: results.length,
                        });
                    }
                }
                return results;
            }""", list(PENDING_KEYWORDS))
            logger.info(
                f"[FilingSubTask] JS 提取到 {len(items)} 条待备案项（当前页）"
            )
            return items
        except Exception as e:
            logger.warning(f"[FilingSubTask] 获取待备案列表失败: {e}")
            return []

    def _go_to_next_page(self) -> bool:
        """尝试翻到下一页，返回是否成功翻页"""
        try:
            result = self.page.evaluate("""() => {
                // 策略1: Element UI 分页 — 点击 "下一页" 按钮
                const nextBtn = document.querySelector(
                    '.el-pagination .btn-next:not([disabled]), '
                    + 'button.btn-next:not([disabled]), '
                    + '[class*="pagination"] .next:not(.disabled)'
                );
                if (nextBtn) {
                    nextBtn.click();
                    return 'next_btn';
                }

                // 策略2: 查找包含 "下一页" 或 ">" 的可点击元素
                const els = document.querySelectorAll(
                    'a, button, span, li, [role="button"]'
                );
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if ((t === '下一页' || t === '>' || t === '»' || t === '›')
                        && el.offsetParent !== null) {
                        el.click();
                        return 'text_next';
                    }
                }

                // 策略3: 查找下一页的数字页码按钮（当前页+1）
                const activePage = document.querySelector(
                    '.el-pagination .is-active, .pagination .active, '
                    + '[class*="page-item"].active, [class*="current"]'
                );
                if (activePage) {
                    const currentNum = parseInt(
                        (activePage.innerText || activePage.textContent || '').trim()
                    );
                    if (!isNaN(currentNum)) {
                        const nextNum = currentNum + 1;
                        const allPages = document.querySelectorAll(
                            '.el-pager li, .pagination li a, [class*="page-item"]'
                        );
                        for (const p of allPages) {
                            const num = parseInt(
                                (p.innerText || p.textContent || '').trim()
                            );
                            if (num === nextNum) {
                                p.click();
                                return 'page_num_' + nextNum;
                            }
                        }
                    }
                }

                return null;
            }""")

            if result:
                logger.info(f"[FilingSubTask] 翻页成功: {result}")
                self._wait_for_page_ready()
                return True

            logger.info("[FilingSubTask] 无下一页")
            return False
        except Exception as e:
            logger.warning(f"[FilingSubTask] 翻页异常: {e}")
            return False

    def _go_to_first_page(self) -> bool:
        """回到第一页"""
        try:
            result = self.page.evaluate("""() => {
                // 策略1: 首页按钮
                const firstBtn = document.querySelector(
                    '.el-pagination .btn-prev, button.btn-first, '
                    + '[class*="pagination"] .first'
                );
                if (firstBtn) { firstBtn.click(); return 'first_btn'; }

                // 策略2: 点击页码 1
                const pages = document.querySelectorAll(
                    '.el-pager li, .pagination li a, [class*="page-item"]'
                );
                for (const p of pages) {
                    const num = parseInt(
                        (p.innerText || p.textContent || '').trim()
                    );
                    if (num === 1) { p.click(); return 'page_1'; }
                }

                return null;
            }""")
            if result:
                logger.info(f"[FilingSubTask] 回到第一页: {result}")
                self._wait_for_page_ready()
                return True
            return False
        except Exception:
            return False

    # ------------------------------------------------------------------
    # 逐条备案处理
    # ------------------------------------------------------------------

    def _process_single_filing(self, item: dict) -> dict:
        """处理单条备案 — 进入详情→填表→提交→验证"""
        try:
            index = item.get("element_index", 0)
            page_num = item.get("page_num", 1)

            self._broadcast_progress(
                "detail",
                f"正在处理 (第{page_num}页): {item.get('text', '')[:30]}...",
                50,
            )

            # 如果需要，先翻到对应页
            if page_num > 1:
                self._go_to_page(page_num)
                self._wait_human(2, 5)

            # 尝试通过索引点击行
            clicked = self.page.evaluate("""([index, keywords]) => {
                const rows = document.querySelectorAll(
                    'tr, .list-item, .el-table__row, [class*="item"]'
                );
                let count = 0;
                for (const row of rows) {
                    const text = (row.innerText || '').trim();
                    let matched = false;
                    for (const kw of keywords) {
                        if (text.includes(kw)) { matched = true; break; }
                    }
                    if (matched) {
                        if (count === index) {
                            const btn = row.querySelector(
                                'a, button, [class*="btn"], [class*="link"]'
                            );
                            if (btn) { btn.click(); return 'btn'; }
                            row.click();
                            return 'row';
                        }
                        count++;
                    }
                }
                return null;
            }""", [index, list(PENDING_KEYWORDS)])

            if not clicked:
                return {"success": False,
                        "message": f"无法点击第 {page_num} 页第 {index + 1} 条备案项"}

            self._wait_for_page_ready()
            self._wait_human(5, 12)
            self._screenshot(f"filing_detail_p{page_num}_{index}")

            # 尝试填写备案表单（如有）
            self._fill_filing_form()
            self._wait_human(3, 8)

            # 提交备案
            self._broadcast_progress("submit", "正在提交备案", 80)
            submitted = self._submit_filing()
            if not submitted:
                return {"success": False, "message": "提交备案失败"}

            self._wait_human(3, 8)

            # 验证成功
            verify_result = self._verify_success()
            if verify_result == "success":
                return {"success": True, "message": "备案提交成功"}
            elif verify_result == "fail":
                return {"success": False, "message": "备案提交失败（页面显示失败信息）"}
            else:
                # 未检测到明确标识，可能页面已跳转，视为成功
                return {"success": True, "message": "备案已提交（未检测到明确成功标识）"}

        except Exception as e:
            logger.error(f"[FilingSubTask] 处理单条备案异常: {e}")
            return {"success": False, "message": f"处理异常: {str(e)}"}

    def _go_to_page(self, target_page: int) -> bool:
        """翻到指定页码"""
        try:
            result = self.page.evaluate("""(targetPage) => {
                const pages = document.querySelectorAll(
                    '.el-pager li, .pagination li a, [class*="page-item"]'
                );
                for (const p of pages) {
                    const num = parseInt(
                        (p.innerText || p.textContent || '').trim()
                    );
                    if (num === targetPage) {
                        p.click();
                        return true;
                    }
                }
                return false;
            }""", target_page)
            if result:
                self._wait_for_page_ready()
                logger.info(f"[FilingSubTask] 翻到第 {target_page} 页成功")
            return bool(result)
        except Exception:
            return False

    # ------------------------------------------------------------------
    # 表单填写
    # ------------------------------------------------------------------

    def _fill_filing_form(self):
        """填写备案表单（如果存在表单字段）"""
        try:
            form_fields = self.page.evaluate("""() => {
                const inputs = document.querySelectorAll(
                    'input:not([type="hidden"]):not([disabled]), '
                    + 'textarea:not([disabled]), select:not([disabled])'
                );
                return Array.from(inputs).map(i => ({
                    tag: i.tagName,
                    type: i.type || '',
                    name: i.name || '',
                    placeholder: i.placeholder || '',
                    label: (i.closest('.el-form-item, .form-group, .form-item') || {})
                        .querySelector('label')?.innerText || '',
                }));
            }""")
            logger.info(f"[FilingSubTask] 检测到 {len(form_fields)} 个表单字段")

            if not form_fields:
                logger.info("[FilingSubTask] 无需填写表单字段")
                return

            # 如果有日期字段，填写当前日期
            from datetime import date

            today = date.today().strftime("%Y-%m-%d")
            filled_count = 0
            for field in form_fields:
                f_type = field.get("type", "")
                f_label = field.get("label", "")
                f_placeholder = field.get("placeholder", "")
                f_name = field.get("name", "")
                if (
                    "date" in f_type
                    or "日期" in f_label
                    or "日期" in f_placeholder
                    or "备案日期" in f_label
                    or "签订日期" in f_label
                ):
                    if f_name:
                        try:
                            self.page.fill(f"input[name='{f_name}']", today)
                            logger.info(f"[FilingSubTask] 填写日期字段 '{f_label}': {today}")
                            filled_count += 1
                            self._wait_human(1, 3)
                        except Exception:
                            pass
                    elif f_placeholder:
                        try:
                            self.page.fill(f"input[placeholder*='{f_placeholder}']", today)
                            logger.info(f"[FilingSubTask] 填写日期字段 (placeholder): {today}")
                            filled_count += 1
                            self._wait_human(1, 3)
                        except Exception:
                            pass

            # 如果有备注/说明类 textarea，填写默认文本
            for field in form_fields:
                if field.get("tag") == "TEXTAREA":
                    f_name = field.get("name", "")
                    f_label = field.get("label", "")
                    if "备注" in f_label or "说明" in f_label or "remark" in f_name.lower():
                        try:
                            selector = f"textarea[name='{f_name}']" if f_name else "textarea"
                            self.page.fill(selector, "合同备案自动提交")
                            logger.info(f"[FilingSubTask] 填写备注字段: {f_label}")
                            filled_count += 1
                            self._wait_human(1, 3)
                        except Exception:
                            pass

            logger.info(f"[FilingSubTask] 表单填写完成: {filled_count} 个字段已填写")
            self._screenshot("filing_form_filled")

        except Exception as e:
            logger.warning(f"[FilingSubTask] 表单填写异常: {e}")

    # ------------------------------------------------------------------
    # 提交
    # ------------------------------------------------------------------

    def _submit_filing(self) -> bool:
        """提交备案 — 多策略查找提交按钮"""
        submit_texts = ["提交", "确认提交", "保存", "确定", "备案", "提交备案"]
        for text in submit_texts:
            try:
                clicked = self.page.evaluate("""(text) => {
                    const btns = document.querySelectorAll(
                        'button, a.btn, [role="button"], .el-button'
                    );
                    for (const btn of btns) {
                        const t = (btn.innerText || btn.value || '').trim();
                        if ((t === text || t.includes(text)) && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                }""", text)
                if clicked:
                    logger.info(f"[FilingSubTask] 点击提交按钮: '{text}'")
                    self._wait_for_page_ready()
                    return True
            except Exception:
                continue

        logger.warning("[FilingSubTask] 未找到提交按钮")
        self._screenshot("filing_submit_fail")
        return False

    # ------------------------------------------------------------------
    # 验证
    # ------------------------------------------------------------------

    def _verify_success(self) -> str:
        """验证备案提交结果，返回 'success' / 'fail' / 'unknown'"""
        self._wait_human(2, 5)  # 等待服务端响应
        self._screenshot("filing_verify")

        try:
            result = self.page.evaluate("""() => {
                // 策略1: 检查 Element UI Message / Notification 弹窗
                const msgs = document.querySelectorAll(
                    '.el-message, .el-notification, .el-message-box, '
                    + '[class*="message"], [class*="alert"], [class*="toast"]'
                );
                for (const msg of msgs) {
                    const t = (msg.innerText || '').trim();
                    if (t.includes('成功') || t.includes('已备案')) return 'success';
                    if (t.includes('失败') || t.includes('错误')) return 'fail';
                }

                // 策略2: 检查页面文本
                const body = document.body.innerText || '';
                const successKeywords = ['成功', '完成', '已提交', '已备案', '备案成功'];
                const failKeywords = ['失败', '错误', '异常', '必填'];
                for (const kw of successKeywords) {
                    if (body.includes(kw)) return 'success';
                }
                for (const kw of failKeywords) {
                    if (body.includes(kw)) return 'fail';
                }

                // 策略3: 检查表单/对话框是否已关闭（关闭通常表示操作成功）
                const formStillOpen = document.querySelector(
                    '.el-dialog:not([style*="display: none"]), .modal.show, '
                    + 'form:not([style*="display: none"])'
                );
                if (!formStillOpen) return 'form_closed_likely_success';

                return 'unknown';
            }""")

            logger.info(f"[FilingSubTask] 验证结果: {result}")

            if result == "success" or result == "form_closed_likely_success":
                return "success"
            elif result == "fail":
                return "fail"
            else:
                return "unknown"

        except Exception as e:
            logger.warning(f"[FilingSubTask] 验证异常: {e}")
            return "unknown"

    # ------------------------------------------------------------------
    # 返回列表
    # ------------------------------------------------------------------

    def _navigate_back_to_list(self):
        """尝试返回备案列表页 — 多策略回退"""
        try:
            # 策略1: 点击"返回"按钮
            back_texts = ["返回", "返回列表", "← 返回", "返回列表页"]
            for text in back_texts:
                if self._find_clickable_by_text(text):
                    self._wait_for_page_ready()
                    self._wait_human(2, 5)
                    logger.info(f"[FilingSubTask] 通过 '{text}' 返回列表成功")
                    return

            # 策略2: JS 查找返回相关元素
            try:
                found = self.page.evaluate("""() => {
                    const els = document.querySelectorAll(
                        'a, button, span, [role="button"], .el-button'
                    );
                    for (const el of els) {
                        const t = (el.innerText || el.textContent || '').trim();
                        if (t.includes('返回') && el.offsetParent !== null) {
                            el.click();
                            return t;
                        }
                    }
                    return null;
                }""")
                if found:
                    self._wait_for_page_ready()
                    self._wait_human(2, 5)
                    logger.info(f"[FilingSubTask] JS 返回成功: {found}")
                    return
            except Exception:
                pass

            # 策略3: 浏览器后退
            self.page.go_back(wait_until="domcontentloaded", timeout=10000)
            self._wait_human(2, 5)
            logger.info("[FilingSubTask] 通过浏览器后退返回列表")

        except Exception as e:
            logger.warning(f"[FilingSubTask] 返回列表页失败: {e}")
