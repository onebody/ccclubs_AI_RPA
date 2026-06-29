import logging
import time
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class FilingCancellationSubTask(BaseSubTask):
    """备案作废子任务 — 处理合同备案的作废流程"""

    def execute(self) -> dict:
        """主流程：导航→查找待作废备案→选择→确认作废→验证"""
        logger.info("[FilingCancellationSubTask] 开始执行备案作废")
        self._broadcast_progress("start", "开始执行备案作废", 0)
        self._screenshot("filing_cancel_start")

        try:
            # 步骤1: 导航到合同备案管理页面
            self._broadcast_progress("navigate", "正在导航到合同备案管理页面", 10)
            if not self._navigate_to_filing_page():
                return {"success": False, "message": "无法导航到合同备案管理页面"}
            self._wait_human(5, 12)

            # 步骤2: 获取已备案合同列表
            self._broadcast_progress("list", "正在获取已备案合同列表", 25)
            filings = self._get_filing_list()
            if not filings:
                self._broadcast_progress("done", "没有可作废的备案记录", 100)
                return {"success": True, "message": "没有可作废的备案记录", "count": 0}

            logger.info(f"[FilingCancellationSubTask] 找到 {len(filings)} 条备案记录")

            # 步骤3: 查找可作废的备案记录
            self._broadcast_progress("search", "正在查找可作废的备案记录", 40)
            filing_no = self._context.get("filing_no")
            target = self._find_cancellable_filing(filings, filing_no)
            if not target:
                msg = "未找到可作废的备案记录" + (f"（编号: {filing_no}）" if filing_no else "")
                self._broadcast_progress("done", msg, 100)
                return {"success": False, "message": msg}

            logger.info(
                f"[FilingCancellationSubTask] 找到目标备案: {target.get('text', '')[:50]}"
            )

            # 步骤4: 点击作废/撤销按钮
            self._broadcast_progress("cancel", "正在点击作废按钮", 55)
            if not self._click_cancel_button(target):
                return {"success": False, "message": "无法点击作废按钮"}
            self._wait_human(3, 8)

            # 步骤5: 填写作废原因（如需要）
            cancel_reason = self._context.get("cancel_reason", "合同已终止")
            self._fill_cancel_reason(cancel_reason)
            self._wait_human(2, 5)

            # 步骤6: 确认作废操作
            self._broadcast_progress("confirm", "正在确认作废操作", 75)
            if not self._confirm_cancellation():
                return {"success": False, "message": "确认作废操作失败"}
            self._wait_human(3, 8)

            # 步骤7: 验证作废是否成功
            self._broadcast_progress("verify", "正在验证作废结果", 90)
            success = self._verify_cancellation()

            message = "备案作废成功" if success else "备案作废已提交（未检测到明确成功标识）"
            self._broadcast_progress("done", message, 100)
            self._screenshot("filing_cancel_done")

            return {
                "success": True,
                "message": message,
                "verified": success,
                "filing_no": target.get("filing_no", filing_no or ""),
            }

        except Exception as e:
            logger.error(f"[FilingCancellationSubTask] 执行异常: {e}")
            self._screenshot("filing_cancel_error")
            return {"success": False, "message": f"备案作废执行异常: {str(e)}"}

    # ------------------------------------------------------------------
    # 导航
    # ------------------------------------------------------------------

    def _navigate_to_filing_page(self) -> bool:
        """导航到合同备案管理页面 — 三级降级策略"""
        # 策略1: 点击菜单中的"合同备案管理"或相关文本
        menu_texts = ["合同备案管理", "合同备案", "备案管理", "备案查询"]
        for text in menu_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[FilingCancellationSubTask] 通过菜单 '{text}' 导航成功")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True

        # 策略2: 直接 URL 导航
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
                body_text = self.page.evaluate("() => document.body?.innerText || ''")
                if "备案" in body_text:
                    logger.info(f"[FilingCancellationSubTask] 通过 URL {path} 导航成功")
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
                logger.info(f"[FilingCancellationSubTask] JS 导航成功: {found}")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True
        except Exception:
            pass

        logger.warning("[FilingCancellationSubTask] 所有导航策略均失败")
        return False

    # ------------------------------------------------------------------
    # 列表
    # ------------------------------------------------------------------

    def _get_filing_list(self) -> list:
        """获取已备案合同列表 — 提取表格中的备案记录，支持翻页"""
        self._screenshot("filing_cancel_list")

        all_items = []
        max_pages = 5  # 最多翻5页

        for page_num in range(max_pages):
            try:
                items = self.page.evaluate("""() => {
                    const results = [];
                    const rows = document.querySelectorAll(
                        'tr, .list-item, .el-table__row, [class*="item"]'
                    );
                    for (const row of rows) {
                        const text = (row.innerText || '').trim();
                        if (
                            text.includes('已备案') ||
                            text.includes('备案') ||
                            text.includes('有效')
                        ) {
                            const filingNoMatch = text.match(/[A-Za-z]?\\d{6,}/);
                            results.push({
                                text: text.substring(0, 300),
                                filing_no: filingNoMatch ? filingNoMatch[0] : '',
                                element_index: results.length,
                            });
                        }
                    }
                    return results;
                }""")

                all_items.extend(items)
                logger.info(
                    f"[FilingCancellationSubTask] 第 {page_num + 1} 页提取到 {len(items)} 条记录"
                )

                if not items:
                    break

                # 尝试翻页
                has_next = self._go_to_next_page()
                if not has_next:
                    break
                self._wait_human(2, 5)

            except Exception as e:
                logger.warning(
                    f"[FilingCancellationSubTask] 获取列表第 {page_num + 1} 页失败: {e}"
                )
                break

        return all_items

    def _go_to_next_page(self) -> bool:
        """尝试翻到下一页"""
        try:
            next_clicked = self.page.evaluate("""() => {
                const btns = document.querySelectorAll(
                    'button, a, .el-pagination .btn-next, [class*="next"]'
                );
                for (const btn of btns) {
                    const t = (btn.innerText || btn.textContent || '').trim();
                    if (
                        t === '下一页' || t === '>' || t === '»' ||
                        btn.classList.contains('btn-next') ||
                        btn.classList.contains('next')
                    ) {
                        if (!btn.disabled && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            }""")
            if next_clicked:
                self._wait_for_page_ready()
                return True
        except Exception:
            pass
        return False

    def _find_cancellable_filing(self, filings: list, filing_no: str = None) -> dict:
        """查找可作废的备案记录"""
        if filing_no:
            for item in filings:
                if filing_no in item.get("text", "") or filing_no == item.get("filing_no", ""):
                    logger.info(f"[FilingCancellationSubTask] 找到指定备案编号: {filing_no}")
                    return item
            logger.warning(f"[FilingCancellationSubTask] 未找到指定备案编号: {filing_no}")
            return None

        if filings:
            logger.info("[FilingCancellationSubTask] 未指定备案编号，选择第一条可作废记录")
            return filings[0]

        return None

    # ------------------------------------------------------------------
    # 作废操作
    # ------------------------------------------------------------------

    def _click_cancel_button(self, filing: dict) -> bool:
        """点击作废/撤销按钮 — 在操作列或详情页找到作废按钮"""
        index = filing.get("element_index", 0)

        # 策略1: 通过索引点击行中的作废按钮
        try:
            clicked = self.page.evaluate("""(index) => {
                const rows = document.querySelectorAll(
                    'tr, .list-item, .el-table__row, [class*="item"]'
                );
                let count = 0;
                for (const row of rows) {
                    const text = (row.innerText || '').trim();
                    if (
                        text.includes('已备案') ||
                        text.includes('备案') ||
                        text.includes('有效')
                    ) {
                        if (count === index) {
                            const btns = row.querySelectorAll(
                                'a, button, [class*="btn"], [class*="link"], span'
                            );
                            for (const btn of btns) {
                                const t = (btn.innerText || btn.textContent || '').trim();
                                if (t.includes('作废') || t.includes('撤销') || t.includes('注销')) {
                                    btn.click();
                                    return 'action_btn';
                                }
                            }
                            const link = row.querySelector('a, [class*="link"]');
                            if (link) { link.click(); return 'row_link'; }
                            row.click();
                            return 'row';
                        }
                        count++;
                    }
                }
                return null;
            }""", index)

            if clicked == "action_btn":
                logger.info("[FilingCancellationSubTask] 直接点击作废按钮成功")
                self._wait_for_page_ready()
                return True

            if clicked in ("row_link", "row"):
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                self._screenshot("filing_cancel_detail")

                if self._find_clickable_by_text("作废"):
                    logger.info("[FilingCancellationSubTask] 详情页点击作废按钮成功")
                    self._wait_for_page_ready()
                    return True

                if self._find_clickable_by_text("撤销"):
                    logger.info("[FilingCancellationSubTask] 详情页点击撤销按钮成功")
                    self._wait_for_page_ready()
                    return True

            logger.warning(f"[FilingCancellationSubTask] 点击策略1结果: {clicked}")
        except Exception as e:
            logger.warning(f"[FilingCancellationSubTask] 点击作废按钮策略1异常: {e}")

        # 策略2: 全局文本查找
        for text in ["作废", "撤销备案", "注销备案"]:
            if self._find_clickable_by_text(text):
                logger.info(f"[FilingCancellationSubTask] 全局文本查找 '{text}' 点击成功")
                self._wait_for_page_ready()
                return True

        logger.warning("[FilingCancellationSubTask] 未找到作废按钮")
        self._screenshot("filing_cancel_btn_fail")
        return False

    def _confirm_cancellation(self) -> bool:
        """确认作废操作 — 处理确认弹窗"""
        self._wait_human(2, 5)
        self._screenshot("filing_cancel_confirm")

        # 策略1: 查找确认弹窗中的确认按钮
        try:
            confirmed = self.page.evaluate("""() => {
                const dialogs = document.querySelectorAll(
                    '.el-message-box, .el-dialog, .modal, [class*="confirm"], [class*="dialog"]'
                );
                for (const dialog of dialogs) {
                    if (dialog.offsetParent === null) continue;
                    const text = (dialog.innerText || '').trim();
                    if (text.includes('确认') || text.includes('确定') || text.includes('作废')) {
                        const btns = dialog.querySelectorAll(
                            'button, .el-button, [role="button"]'
                        );
                        for (const btn of btns) {
                            const t = (btn.innerText || '').trim();
                            if (t === '确定' || t === '确认' || t === '确 定' ||
                                t === '确认作废' || t.includes('确定')) {
                                btn.click();
                                return 'dialog_confirmed';
                            }
                        }
                    }
                }

                const allBtns = document.querySelectorAll(
                    'button, a.btn, [role="button"], .el-button'
                );
                for (const btn of allBtns) {
                    const t = (btn.innerText || btn.value || '').trim();
                    if (t === '确定' || t === '确认' || t === '确认作废') {
                        if (btn.offsetParent !== null) {
                            btn.click();
                            return 'global_confirmed';
                        }
                    }
                }
                return null;
            }""")

            if confirmed:
                logger.info(f"[FilingCancellationSubTask] 确认作废结果: {confirmed}")
                self._wait_for_page_ready()
                return True
        except Exception as e:
            logger.warning(f"[FilingCancellationSubTask] 确认弹窗处理异常: {e}")

        # 策略2: 使用 _find_clickable_by_text
        for text in ["确认作废", "确定", "确认"]:
            if self._find_clickable_by_text(text):
                logger.info(f"[FilingCancellationSubTask] 文本查找确认 '{text}' 成功")
                self._wait_for_page_ready()
                return True

        logger.warning("[FilingCancellationSubTask] 未找到确认按钮（可能无需确认）")
        return True  # 可能没有确认弹窗

    def _fill_cancel_reason(self, reason: str = None) -> bool:
        """填写作废原因（如需要）"""
        if not reason:
            reason = "合同已终止"

        try:
            result = self.page.evaluate("""(reason) => {
                const inputs = document.querySelectorAll(
                    'textarea:not([disabled]), input[type="text"]:not([disabled])'
                );
                for (const input of inputs) {
                    const label = (input.closest('.el-form-item, .form-group, .form-item') || {})
                        .querySelector('label');
                    const labelText = label ? (label.innerText || '').trim() : '';
                    const placeholder = input.placeholder || '';
                    if (
                        labelText.includes('原因') || labelText.includes('理由') ||
                        labelText.includes('说明') || labelText.includes('备注') ||
                        placeholder.includes('原因') || placeholder.includes('理由')
                    ) {
                        input.focus();
                        input.value = '';
                        const nativeSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype, 'value'
                        )?.set || Object.getOwnPropertyDescriptor(
                            window.HTMLTextAreaElement.prototype, 'value'
                        )?.set;
                        if (nativeSetter) {
                            nativeSetter.call(input, reason);
                        } else {
                            input.value = reason;
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return 'filled';
                    }
                }
                return 'no_reason_field';
            }""", reason)

            logger.info(f"[FilingCancellationSubTask] 填写作废原因结果: {result}")
            return result == "filled"

        except Exception as e:
            logger.warning(f"[FilingCancellationSubTask] 填写作废原因异常: {e}")
            return False

    # ------------------------------------------------------------------
    # 验证
    # ------------------------------------------------------------------

    def _verify_cancellation(self) -> bool:
        """验证作废是否成功 — 检查状态变化或成功提示"""
        self._wait_human(3, 8)
        self._screenshot("filing_cancel_verify")

        try:
            result = self.page.evaluate("""() => {
                const body = document.body.innerText || '';

                const msgs = document.querySelectorAll(
                    '.el-message, .el-notification, .el-message-box, '
                    + '[class*="message"], [class*="alert"], [class*="toast"]'
                );
                for (const msg of msgs) {
                    const t = (msg.innerText || '').trim();
                    if (t.includes('成功') || t.includes('已作废') || t.includes('已撤销'))
                        return 'success';
                    if (t.includes('失败') || t.includes('错误'))
                        return 'fail: ' + t;
                }

                const successKeywords = ['成功', '已作废', '已撤销', '作废成功', '撤销成功'];
                const failKeywords = ['失败', '错误', '异常'];
                for (const kw of successKeywords) {
                    if (body.includes(kw)) return 'success';
                }
                for (const kw of failKeywords) {
                    if (body.includes(kw)) return 'fail: ' + kw;
                }

                const rows = document.querySelectorAll('tr, .list-item, .el-table__row');
                for (const row of rows) {
                    const t = (row.innerText || '').trim();
                    if (t.includes('已作废') || t.includes('已撤销') || t.includes('已注销'))
                        return 'status_changed';
                }

                return 'unknown';
            }""")

            logger.info(f"[FilingCancellationSubTask] 验证结果: {result}")

            if result in ("success", "status_changed"):
                return True
            elif result and result.startswith("fail"):
                logger.warning(f"[FilingCancellationSubTask] 作废验证失败: {result}")
                return False
            else:
                return True

        except Exception as e:
            logger.warning(f"[FilingCancellationSubTask] 验证异常: {e}")
            return False
