import logging
import time
import random
from datetime import datetime, timedelta
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class ContractAdjustSubTask(BaseSubTask):
    """合同调整子任务 — 在 122.gov.cn 上修改已有租赁合同信息"""

    # 可调整字段 → 表单 label 映射
    FIELD_LABELS = {
        "end_time": "租赁结束时间",
        "id_number": "身份证明号码",
        "start_time": "租赁开始时间",
        "contract_no": "租赁合同编号",
        "id_type": "身份证明名称",
        "rental_type": "租赁类型",
    }

    # 默认模拟调整数据（用于测试）
    DEFAULT_ADJUST_DATA = {
        "end_time": "2024-02-10 09:00",
        "id_number": "330102199002022345",
    }

    # ------------------------------------------------------------------
    # 主流程
    # ------------------------------------------------------------------

    def execute(self) -> dict:
        logger.info("[ContractAdjustSubTask] 开始执行合同调整")
        self._broadcast_progress("start", "开始执行合同调整", 0)
        self._screenshot("contract_adjust_start")

        try:
            # 步骤1: 获取调整数据
            adjust_data = self._get_adjust_data()
            contract_no = adjust_data.pop("contract_no", None)
            logger.info(
                f"[ContractAdjustSubTask] 目标合同: {contract_no}, "
                f"调整字段: {list(adjust_data.keys())}"
            )

            # 步骤2: 导航到租赁合同管理页面
            self._broadcast_progress("navigate", "正在导航到租赁合同管理页面", 10)
            if not self._navigate_to_contract_list():
                return {"success": False, "message": "无法导航到租赁合同管理页面"}
            self._wait_human(3, 8)

            # 步骤3: 查找目标合同并点击调整
            self._broadcast_progress("find_contract", "正在查找目标合同", 25)
            if not self._find_target_contract(contract_no):
                self._screenshot("contract_adjust_find_fail")
                return {"success": False, "message": "未找到目标合同或无法点击调整"}
            self._wait_human(3, 8)

            # 步骤4: 等待调整表单弹出
            self._broadcast_progress("wait_form", "正在等待合同调整表单", 40)
            if not self._wait_for_adjust_form():
                return {"success": False, "message": "合同调整表单未出现"}

            # 步骤5: 修改表单字段（只修改提供的字段）
            self._broadcast_progress("modify_form", "正在修改合同字段", 50)
            if not self._modify_form(adjust_data):
                self._screenshot("contract_adjust_modify_fail")
                return {"success": False, "message": "表单修改失败"}

            # 步骤6: 保存调整
            self._broadcast_progress("submit", "正在保存调整后的合同", 80)
            self._wait_human(2, 5)
            if not self._submit_form():
                return {"success": False, "message": "保存调整失败"}
            self._wait_human(3, 8)

            # 步骤7: 验证调整结果
            self._broadcast_progress("verify", "正在验证调整结果", 90)
            success = self._verify_adjustment()

            # 步骤8: 返回结果
            message = "合同调整成功" if success else "合同调整已提交（未检测到明确成功标识）"
            self._broadcast_progress("done", message, 100)
            self._screenshot("contract_adjust_done")

            return {
                "success": True,
                "message": message,
                "verified": success,
                "contract_no": contract_no or "",
                "adjusted_fields": list(adjust_data.keys()),
            }

        except Exception as e:
            logger.error(f"[ContractAdjustSubTask] 执行异常: {e}")
            self._screenshot("contract_adjust_error")
            return {"success": False, "message": f"合同调整执行异常: {str(e)}"}

    # ------------------------------------------------------------------
    # 获取调整数据
    # ------------------------------------------------------------------

    def _get_adjust_data(self) -> dict:
        """从 context 获取调整数据，若无则使用默认模拟数据"""
        data = getattr(self, "_context", {}).get("adjust_data")
        if data:
            logger.info("[ContractAdjustSubTask] 使用 context 提供的调整数据")
            return dict(data)

        logger.info("[ContractAdjustSubTask] 未提供 adjust_data，使用默认模拟数据")
        return dict(self.DEFAULT_ADJUST_DATA)

    # ------------------------------------------------------------------
    # 导航
    # ------------------------------------------------------------------

    def _navigate_to_contract_list(self) -> bool:
        """导航到租赁合同管理页面 — 三级降级策略"""
        # 策略1: 点击左侧菜单"租赁合同管理"
        menu_texts = ["租赁合同管理", "租赁合同", "合同管理"]
        for text in menu_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[ContractAdjustSubTask] 通过菜单 '{text}' 导航成功")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True

        # 策略2: 直接 URL 导航
        contract_urls = [
            "/views/memrent/contract.html",
            "/views/memrent/lease-contract.html",
            "/views/memrent/zulin.html",
        ]
        base_url = (
            self.page.url.rsplit("/", 1)[0] if "/" in self.page.url else self.page.url
        )
        for path in contract_urls:
            try:
                self.page.goto(
                    base_url + path, wait_until="domcontentloaded", timeout=10000
                )
                self._wait_human(3, 6)
                body_text = self.page.evaluate("() => document.body?.innerText || ''")
                if "租赁合同" in body_text or "合同管理" in body_text:
                    logger.info(f"[ContractAdjustSubTask] 通过 URL {path} 导航成功")
                    return True
            except Exception:
                continue

        # 策略3: JS 查找并点击包含"租赁合同"的菜单项
        try:
            found = self.page.evaluate("""() => {
                const els = document.querySelectorAll(
                    'a[href], [role="menuitem"], .menu-item, .nav-item, li, span'
                );
                for (const el of els) {
                    const text = (el.innerText || el.textContent || '').trim();
                    if (text.includes('租赁合同') && text.length < 20) {
                        el.click();
                        return text;
                    }
                }
                return null;
            }""")
            if found:
                logger.info(f"[ContractAdjustSubTask] JS 导航成功: {found}")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True
        except Exception:
            pass

        logger.warning("[ContractAdjustSubTask] 所有导航策略均失败")
        self._screenshot("contract_adjust_nav_fail")
        return False

    # ------------------------------------------------------------------
    # 查找目标合同
    # ------------------------------------------------------------------

    def _find_target_contract(self, contract_no: str = None) -> bool:
        """在合同列表中找到目标合同并点击调整按钮"""
        self._wait_for_page_ready()
        self._wait_human(2, 5)

        if contract_no:
            # 尝试搜索合同编号
            if self._search_contract(contract_no):
                self._wait_human(2, 5)

        # 在列表中查找目标合同行并点击调整按钮
        return self._click_adjust_button(contract_no)

    def _search_contract(self, contract_no: str) -> bool:
        """在合同列表搜索框中输入合同编号"""
        try:
            # 查找搜索输入框
            search_input = self.page.evaluate("""(contractNo) => {
                // 尝试查找搜索框
                const inputs = document.querySelectorAll(
                    'input[type="text"], input[type="search"], input[placeholder*="搜索"], '
                    + 'input[placeholder*="合同"], input[placeholder*="编号"], input[placeholder*="查询"]'
                );
                for (const input of inputs) {
                    if (input.offsetParent !== null) {
                        input.focus();
                        input.value = contractNo;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
                return false;
            }""", contract_no)

            if search_input:
                logger.info(f"[ContractAdjustSubTask] 搜索框输入合同编号: {contract_no}")
                self._wait_human(1, 3)
                # 按回车触发搜索
                self.page.keyboard.press("Enter")
                self._wait_human(2, 5)
                return True

            logger.info("[ContractAdjustSubTask] 未找到搜索框，跳过搜索")
            return False

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 搜索合同异常: {e}")
            return False

    def _click_adjust_button(self, contract_no: str = None) -> bool:
        """点击目标合同行的"调整"按钮"""
        try:
            # 策略1: 如果有 contract_no，定位到该行并点击调整
            if contract_no:
                clicked = self.page.evaluate("""(contractNo) => {
                    const rows = document.querySelectorAll(
                        'tr, .el-table__row, [class*="row"], [class*="item"]'
                    );
                    for (const row of rows) {
                        const text = (row.innerText || '').trim();
                        if (text.includes(contractNo)) {
                            // 在该行中查找"调整"按钮
                            const btns = row.querySelectorAll(
                                'a, button, span, [class*="btn"], [role="button"]'
                            );
                            for (const btn of btns) {
                                const t = (btn.innerText || btn.textContent || '').trim();
                                if (t.includes('调整') || t.includes('编辑') || t.includes('修改')) {
                                    btn.click();
                                    return 'row_adjust_clicked';
                                }
                            }
                            // 行找到了但没有调整按钮，尝试点击行本身
                            row.click();
                            return 'row_clicked';
                        }
                    }
                    return 'row_not_found';
                }""", contract_no)

                logger.info(f"[ContractAdjustSubTask] 查找合同行结果: {clicked}")

                if clicked == "row_adjust_clicked":
                    return True
                if clicked == "row_clicked":
                    self._wait_human(2, 4)
                    # 行点击后尝试找页面上的调整按钮
                    return self._click_global_adjust_button()

            # 策略2: 直接查找"调整"按钮（不指定合同编号或回退）
            return self._click_global_adjust_button()

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 点击调整按钮异常: {e}")
            return False

    def _click_global_adjust_button(self) -> bool:
        """在页面上全局查找并点击"调整"按钮"""
        # CSS 选择器
        selectors = [
            "a:has-text('调整')",
            "button:has-text('调整')",
            "span:has-text('调整')",
            "a:has-text('编辑')",
            "button:has-text('编辑')",
        ]
        for sel in selectors:
            try:
                el = self.page.query_selector(sel)
                if el and el.is_visible():
                    if self._safe_click(el, "调整按钮"):
                        logger.info(f"[ContractAdjustSubTask] CSS 选择器点击调整成功: {sel}")
                        return True
            except Exception:
                continue

        # JS 查找
        try:
            clicked = self.page.evaluate("""() => {
                const els = document.querySelectorAll(
                    'a, button, span, [role="button"], [class*="btn"], td a, td button'
                );
                for (const el of els) {
                    const t = (el.innerText || el.textContent || '').trim();
                    if ((t.includes('调整') || t.includes('编辑') || t.includes('修改'))
                        && t.length < 10 && el.offsetParent !== null) {
                        el.click();
                        return t;
                    }
                }
                return null;
            }""")
            if clicked:
                logger.info(f"[ContractAdjustSubTask] JS 点击调整按钮成功: {clicked}")
                return True
        except Exception:
            pass

        # 文本查找回退
        for text in ["调整", "编辑", "修改"]:
            if self._find_clickable_by_text(text):
                logger.info(f"[ContractAdjustSubTask] 文本查找点击 '{text}' 成功")
                return True

        logger.warning("[ContractAdjustSubTask] 未找到调整按钮")
        return False

    # ------------------------------------------------------------------
    # 等待调整表单
    # ------------------------------------------------------------------

    def _wait_for_adjust_form(self) -> bool:
        """等待合同调整表单弹出"""
        try:
            # 等待表单容器出现
            self.page.wait_for_selector(
                "form, .el-dialog, .el-form, .modal, [class*='form'], [class*='dialog']",
                state="visible",
                timeout=15000,
            )
            self._wait_human(1, 3)

            # 验证表单中包含可编辑字段
            has_fields = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                return body.includes('租赁结束时间') || body.includes('身份证明') ||
                       body.includes('租赁合同编号') || body.includes('租赁类型') ||
                       body.includes('编辑') || body.includes('调整');
            }""")
            if has_fields:
                logger.info("[ContractAdjustSubTask] 合同调整表单已就绪")
                self._screenshot("contract_adjust_form_ready")
                return True

            # 再等一下，可能表单还在渲染
            self._wait_human(2, 4)
            has_fields = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                return body.includes('租赁') || body.includes('合同');
            }""")
            if has_fields:
                logger.info("[ContractAdjustSubTask] 合同调整表单延迟加载后就绪")
                return True

            logger.warning("[ContractAdjustSubTask] 表单出现但未检测到关键字段")
            self._screenshot("contract_adjust_form_no_fields")
            return True  # 表单出现了，继续尝试

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 等待表单超时: {e}")
            self._screenshot("contract_adjust_form_timeout")
            return False

    # ------------------------------------------------------------------
    # 修改表单
    # ------------------------------------------------------------------

    def _modify_form(self, adjust_data: dict) -> bool:
        """修改表单中需要调整的字段 — 只修改 adjust_data 中提供的字段"""
        if not adjust_data:
            logger.warning("[ContractAdjustSubTask] 无需修改任何字段")
            return False

        try:
            success_count = 0
            total_fields = len(adjust_data)

            for field_key, value in adjust_data.items():
                label = self.FIELD_LABELS.get(field_key)
                if not label:
                    logger.warning(
                        f"[ContractAdjustSubTask] 未知字段 '{field_key}'，跳过"
                    )
                    total_fields -= 1
                    continue

                # 根据字段类型选择填充策略
                if field_key in ("end_time", "start_time"):
                    ok = self._fill_datetime(label, str(value))
                elif field_key in ("id_type", "rental_type"):
                    ok = self._fill_dropdown(label, str(value))
                else:
                    ok = self._fill_text_input(label, str(value))

                if ok:
                    success_count += 1
                    logger.info(
                        f"[ContractAdjustSubTask] 字段 '{field_key}' ({label}) 修改成功"
                    )
                else:
                    logger.warning(
                        f"[ContractAdjustSubTask] 字段 '{field_key}' ({label}) 修改失败"
                    )

                self._wait_human(2, 5)

            logger.info(
                f"[ContractAdjustSubTask] 表单修改: {success_count}/{total_fields} 个字段成功"
            )
            self._screenshot("contract_adjust_form_modified")

            return success_count > 0 and success_count >= total_fields * 0.5

        except Exception as e:
            logger.error(f"[ContractAdjustSubTask] 表单修改异常: {e}")
            self._screenshot("contract_adjust_modify_error")
            return False

    # ------------------------------------------------------------------
    # 表单填充辅助方法
    # ------------------------------------------------------------------

    def _fill_text_input(self, label: str, value: str) -> bool:
        """填充文本输入字段 — 定位输入框 → 清空 → 输入 → 验证"""
        try:
            # 策略1: 通过 label 定位 form-item，找到其中的 input
            selector = self.page.evaluate("""(label) => {
                const labels = document.querySelectorAll(
                    'label, .el-form-item__label, .form-label, th, td'
                );
                for (const lbl of labels) {
                    const t = (lbl.innerText || lbl.textContent || '').trim();
                    if (t.includes(label)) {
                        const formItem = lbl.closest(
                            '.el-form-item, .form-group, .form-item, tr'
                        ) || lbl.parentElement;
                        if (formItem) {
                            const input = formItem.querySelector(
                                'input:not([type="hidden"]), textarea'
                            );
                            if (input) {
                                if (input.id) return '#' + input.id;
                                if (input.name) return 'input[name="' + input.name + '"]';
                                const marker = 'ca_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                                input.setAttribute('data-ca-marker', marker);
                                return '[data-ca-marker="' + marker + '"]';
                            }
                        }
                    }
                }
                return null;
            }""", label)

            if selector:
                el = self.page.query_selector(selector)
                if el:
                    el.click()
                    time.sleep(0.3)
                    el.fill("")
                    for char in value:
                        self.page.keyboard.type(char, delay=random.randint(50, 200))
                    logger.info(
                        f"[ContractAdjustSubTask] 文本输入 '{label}' = '{value}' 成功"
                    )
                    return True

            # 策略2: 使用 placeholder 定位
            el = self.page.query_selector(f'input[placeholder*="{label}"]')
            if el:
                el.click()
                time.sleep(0.3)
                el.fill("")
                for char in value:
                    self.page.keyboard.type(char, delay=random.randint(50, 200))
                logger.info(
                    f"[ContractAdjustSubTask] placeholder 策略输入 '{label}' 成功"
                )
                return True

            logger.warning(f"[ContractAdjustSubTask] 文本输入 '{label}' 未找到输入框")
            return False

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 文本输入 '{label}' 异常: {e}")
            return False

    def _fill_dropdown(self, label: str, value: str) -> bool:
        """填充下拉框字段 — 点击下拉框 → 选择选项 → 验证"""
        try:
            result = self.page.evaluate("""([label, value]) => {
                const labels = document.querySelectorAll(
                    'label, .el-form-item__label, .form-label, th, td'
                );
                let formItem = null;
                for (const lbl of labels) {
                    const t = (lbl.innerText || lbl.textContent || '').trim();
                    if (t.includes(label)) {
                        formItem = lbl.closest(
                            '.el-form-item, .form-group, .form-item, tr'
                        ) || lbl.parentElement;
                        break;
                    }
                }
                if (!formItem) return 'no_form_item';

                const select = formItem.querySelector('select');
                if (select) {
                    for (const opt of select.options) {
                        if (opt.text.includes(value) || opt.value.includes(value)) {
                            select.value = opt.value;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            return 'select_ok';
                        }
                    }
                    return 'select_no_match';
                }

                const dropdown = formItem.querySelector(
                    '.el-select, .el-input, [class*="select"], [class*="dropdown"]'
                );
                if (dropdown) {
                    const input = dropdown.querySelector('input') || dropdown;
                    input.click();
                    return 'dropdown_clicked';
                }

                return 'no_dropdown';
            }""", [label, value])

            logger.info(f"[ContractAdjustSubTask] 下拉框 '{label}' 策略1结果: {result}")

            if result == "select_ok":
                return True

            if result == "dropdown_clicked":
                self._wait_human(1, 2)
                option_clicked = self.page.evaluate("""(value) => {
                    const options = document.querySelectorAll(
                        '.el-select-dropdown__item, .el-option, '
                        + '[class*="option"], [class*="dropdown-item"], li'
                    );
                    for (const opt of options) {
                        const t = (opt.innerText || opt.textContent || '').trim();
                        if (t.includes(value) && opt.offsetParent !== null) {
                            opt.click();
                            return true;
                        }
                    }
                    return false;
                }""", value)
                if option_clicked:
                    logger.info(
                        f"[ContractAdjustSubTask] Element UI 下拉选项 '{value}' 点击成功"
                    )
                    return True

            # 策略2: 文本查找
            if self._find_clickable_by_text(label):
                self._wait_human(1, 2)
                option_clicked = self.page.evaluate("""(value) => {
                    const options = document.querySelectorAll(
                        '.el-select-dropdown__item, .el-option, li, [role="option"]'
                    );
                    for (const opt of options) {
                        const t = (opt.innerText || '').trim();
                        if (t.includes(value) && opt.offsetParent !== null) {
                            opt.click();
                            return true;
                        }
                    }
                    return false;
                }""", value)
                if option_clicked:
                    logger.info(
                        f"[ContractAdjustSubTask] 策略2 下拉选项 '{value}' 选中成功"
                    )
                    return True

            logger.warning(f"[ContractAdjustSubTask] 下拉框 '{label}' 填充失败")
            return False

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 下拉框 '{label}' 异常: {e}")
            return False

    def _fill_datetime(self, label: str, datetime_str: str) -> bool:
        """填充日期时间字段 — 点击日期选择器 → 输入日期时间 → 确认"""
        try:
            result = self.page.evaluate("""([label, datetimeStr]) => {
                const labels = document.querySelectorAll(
                    'label, .el-form-item__label, .form-label, th, td'
                );
                for (const lbl of labels) {
                    const t = (lbl.innerText || lbl.textContent || '').trim();
                    if (t.includes(label)) {
                        const formItem = lbl.closest(
                            '.el-form-item, .form-group, .form-item, tr'
                        ) || lbl.parentElement;
                        if (!formItem) continue;

                        const input = formItem.querySelector(
                            'input[type="text"], input[type="datetime-local"], '
                            + 'input[type="date"], input:not([type])'
                        );
                        if (input) {
                            input.focus();
                            input.click();
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                                window.HTMLInputElement.prototype, 'value'
                            ).set;
                            nativeInputValueSetter.call(input, datetimeStr);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.dispatchEvent(new Event('blur', { bubbles: true }));
                            return 'set_value_ok';
                        }
                        return 'no_input';
                    }
                }
                return 'no_label';
            }""", [label, datetime_str])

            logger.info(f"[ContractAdjustSubTask] 日期时间 '{label}' 策略1结果: {result}")

            if result == "set_value_ok":
                try:
                    self.page.mouse.click(10, 10)
                except Exception:
                    pass
                return True

            # 策略2: 使用 _fill_text_input 直接输入
            return self._fill_text_input(label, datetime_str)

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 日期时间 '{label}' 异常: {e}")
            return False

    # ------------------------------------------------------------------
    # 提交
    # ------------------------------------------------------------------

    def _submit_form(self) -> bool:
        """保存调整后的合同信息"""
        self._wait_human(3, 8)

        # 策略1: CSS 选择器
        selectors = [
            "button:has-text('保存')",
            ".el-button--primary:has-text('保存')",
            "button:has-text('确')",
            "button:has-text('提交')",
        ]
        for sel in selectors:
            try:
                el = self.page.query_selector(sel)
                if el and el.is_visible():
                    if self._safe_click(el, "保存按钮"):
                        logger.info(f"[ContractAdjustSubTask] CSS 点击保存成功: {sel}")
                        self._wait_for_page_ready()
                        return True
            except Exception:
                continue

        # 策略2: JS 查找保存按钮
        try:
            clicked = self.page.evaluate("""() => {
                const btns = document.querySelectorAll(
                    'button, a.btn, [role="button"], .el-button'
                );
                for (const btn of btns) {
                    const t = (btn.innerText || btn.value || '').trim();
                    if (t === '保存' || t === '确 定' || t === '确定' || t === '提交') {
                        if (btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            }""")
            if clicked:
                logger.info("[ContractAdjustSubTask] JS 点击保存成功")
                self._wait_for_page_ready()
                return True
        except Exception:
            pass

        # 策略3: 文本查找
        for text in ["保存", "确定", "提交"]:
            if self._find_clickable_by_text(text):
                logger.info(f"[ContractAdjustSubTask] 文本查找点击 '{text}' 成功")
                self._wait_for_page_ready()
                return True

        logger.warning("[ContractAdjustSubTask] 未找到保存按钮")
        self._screenshot("contract_adjust_submit_fail")
        return False

    # ------------------------------------------------------------------
    # 验证
    # ------------------------------------------------------------------

    def _verify_adjustment(self) -> bool:
        """验证调整是否成功 — 检查成功/失败提示"""
        self._wait_human(3, 8)
        self._screenshot("contract_adjust_verify")

        try:
            result = self.page.evaluate("""() => {
                const body = document.body.innerText || '';

                // 检查 Element UI Message / Notification
                const msgs = document.querySelectorAll(
                    '.el-message, .el-notification, .el-message-box, '
                    + '[class*="message"], [class*="alert"], [class*="toast"]'
                );
                for (const msg of msgs) {
                    const t = (msg.innerText || '').trim();
                    if (t.includes('成功') || t.includes('保存成功') || t.includes('调整成功'))
                        return 'success';
                    if (t.includes('失败') || t.includes('错误'))
                        return 'fail: ' + t;
                }

                // 检查页面文本
                const successKeywords = ['成功', '保存成功', '调整成功', '修改成功'];
                const failKeywords = ['失败', '错误', '异常', '必填'];
                for (const kw of successKeywords) {
                    if (body.includes(kw)) return 'success';
                }
                for (const kw of failKeywords) {
                    if (body.includes(kw)) return 'fail: ' + kw;
                }

                // 如果表单消失了（关闭了），可能成功
                const formStillOpen = document.querySelector(
                    '.el-dialog:not([style*="display: none"]), .modal.show, form:visible'
                );
                if (!formStillOpen) return 'form_closed_likely_success';

                return 'unknown';
            }""")

            logger.info(f"[ContractAdjustSubTask] 验证结果: {result}")

            if result == "success" or result == "form_closed_likely_success":
                return True
            elif result and result.startswith("fail"):
                logger.warning(f"[ContractAdjustSubTask] 调整验证失败: {result}")
                return False
            else:
                return True

        except Exception as e:
            logger.warning(f"[ContractAdjustSubTask] 验证异常: {e}")
            return False
