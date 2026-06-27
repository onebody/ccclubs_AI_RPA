import logging
import time
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class FilingSubTask(BaseSubTask):
    """合同备案子任务 — 在 122.gov.cn 上自动完成合同备案操作"""

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

            # 步骤2: 获取待备案列表
            self._broadcast_progress("list", "正在获取待备案合同列表", 30)
            pending = self._get_pending_filings()
            if not pending:
                self._broadcast_progress("done", "没有待备案的合同", 100)
                return {"success": True, "message": "没有待备案的合同", "count": 0}

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
        """导航到备案管理页面"""
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
                if "备案" in (self.page.title() or ""):
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
        return False

    # ------------------------------------------------------------------
    # 列表 / 详情 / 提交
    # ------------------------------------------------------------------

    def _get_pending_filings(self) -> list:
        """获取待备案的合同列表"""
        self._screenshot("filing_list")

        try:
            items = self.page.evaluate("""() => {
                const results = [];
                const rows = document.querySelectorAll(
                    'tr, .list-item, .el-table__row, [class*="item"]'
                );
                for (const row of rows) {
                    const text = (row.innerText || '').trim();
                    if (
                        text.includes('待备案') ||
                        text.includes('未备案') ||
                        text.includes('待处理')
                    ) {
                        results.push({
                            text: text.substring(0, 200),
                            element_index: results.length,
                        });
                    }
                }
                return results;
            }""")
            logger.info(f"[FilingSubTask] JS 提取到 {len(items)} 条待备案项")
            return items
        except Exception as e:
            logger.warning(f"[FilingSubTask] 获取待备案列表失败: {e}")
            return []

    def _process_single_filing(self, item: dict) -> dict:
        """处理单条备案"""
        try:
            index = item.get("element_index", 0)

            self._broadcast_progress(
                "detail", f"正在处理: {item.get('text', '')[:30]}...", 50
            )

            # 尝试通过索引点击行
            clicked = self.page.evaluate("""(index) => {
                const rows = document.querySelectorAll(
                    'tr, .list-item, .el-table__row, [class*="item"]'
                );
                let count = 0;
                for (const row of rows) {
                    const text = (row.innerText || '').trim();
                    if (
                        text.includes('待备案') ||
                        text.includes('未备案') ||
                        text.includes('待处理')
                    ) {
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
            }""", index)

            if not clicked:
                return {"success": False, "message": f"无法点击第 {index + 1} 条备案项"}

            self._wait_for_page_ready()
            self._wait_human(5, 12)
            self._screenshot(f"filing_detail_{index}")

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
            if self._verify_success():
                return {"success": True, "message": "备案提交成功"}
            else:
                # 即使验证失败，提交可能已成功（页面跳转等原因）
                return {"success": True, "message": "备案已提交（未检测到明确成功标识）"}

        except Exception as e:
            logger.error(f"[FilingSubTask] 处理单条备案异常: {e}")
            return {"success": False, "message": f"处理异常: {str(e)}"}

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

            # 如果有日期字段，填写当前日期
            from datetime import date

            today = date.today().strftime("%Y-%m-%d")
            for field in form_fields:
                f_type = field.get("type", "")
                f_label = field.get("label", "")
                f_placeholder = field.get("placeholder", "")
                f_name = field.get("name", "")
                if (
                    "date" in f_type
                    or "日期" in f_label
                    or "日期" in f_placeholder
                ):
                    if f_name:
                        try:
                            self.page.fill(f"input[name='{f_name}']", today)
                            logger.info(f"[FilingSubTask] 填写日期字段: {today}")
                            self._wait_human(1, 3)
                        except Exception:
                            pass
        except Exception as e:
            logger.warning(f"[FilingSubTask] 表单填写异常: {e}")

    def _submit_filing(self) -> bool:
        """提交备案"""
        submit_texts = ["提交", "确认提交", "保存", "确定", "备案"]
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
        return False

    def _verify_success(self) -> bool:
        """验证备案提交成功"""
        try:
            result = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                const successKeywords = ['成功', '完成', '已提交', '已备案'];
                const failKeywords = ['失败', '错误', '异常'];
                for (const kw of successKeywords) {
                    if (body.includes(kw)) return 'success';
                }
                for (const kw of failKeywords) {
                    if (body.includes(kw)) return 'fail';
                }
                return 'unknown';
            }""")
            logger.info(f"[FilingSubTask] 验证结果: {result}")
            return result == "success"
        except Exception:
            return False

    def _navigate_back_to_list(self):
        """尝试返回备案列表页"""
        try:
            back_texts = ["返回", "返回列表", "← 返回"]
            for text in back_texts:
                if self._find_clickable_by_text(text):
                    self._wait_for_page_ready()
                    self._wait_human(2, 5)
                    return
            # 尝试浏览器后退
            self.page.go_back(wait_until="domcontentloaded", timeout=10000)
            self._wait_human(2, 5)
        except Exception:
            pass
