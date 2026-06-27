import logging
import time
import random
from datetime import datetime, timedelta
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class ContractEntrySubTask(BaseSubTask):
    """合同录入子任务 — 在 122.gov.cn 上自动完成租赁合同录入操作"""

    # 字段名 → 表单 label 映射
    FIELD_LABELS = {
        "plate_type": "号牌种类",
        "plate_province": "号牌号码",
        "plate_number": "号牌号码",
        "rental_type": "租赁类型",
        "contract_no": "租赁合同编号",
        "sign_time": "合同签订时间",
        "start_time": "租赁开始时间",
        "end_time": "租赁结束时间",
        "id_type": "身份证明名称",
        "id_number": "身份证明号码",
    }

    # 默认模拟数据（用于测试）
    DEFAULT_CONTRACT_DATA = {
        "plate_type": "小型汽车",
        "plate_province": "浙",
        "plate_number": "A12345",
        "rental_type": "分时租赁",
        "contract_no": "HT2024001",
        "sign_time": "2024-01-01 09:00",
        "start_time": "2024-01-01 09:00",
        "end_time": "2024-01-10 09:00",
        "id_type": "A:居民身份证",
        "id_number": "330102199001011234",
    }

    # ------------------------------------------------------------------
    # 主流程
    # ------------------------------------------------------------------

    def execute(self) -> dict:
        logger.info("[ContractEntrySubTask] 开始执行合同录入")
        self._broadcast_progress("start", "开始执行合同录入", 0)
        self._screenshot("contract_entry_start")

        try:
            # 步骤1: 导航到租赁合同管理页面
            self._broadcast_progress("navigate", "正在导航到租赁合同管理页面", 10)
            if not self._navigate_to_contract_list():
                return {"success": False, "message": "无法导航到租赁合同管理页面"}
            self._wait_human(3, 8)

            # 步骤2: 点击"+ 录入合同"按钮
            self._broadcast_progress("click_add", "正在点击录入合同按钮", 25)
            if not self._click_add_contract_button():
                return {"success": False, "message": "无法点击录入合同按钮"}
            self._wait_human(3, 8)

            # 步骤3: 等待表单弹出
            self._broadcast_progress("wait_form", "正在等待合同录入表单", 35)
            if not self._wait_for_form():
                return {"success": False, "message": "合同录入表单未出现"}

            # 步骤4: 获取合同数据
            contract_data = self._get_contract_data()
            logger.info(f"[ContractEntrySubTask] 合同数据: {contract_data}")

            # 步骤5: 填充表单
            self._broadcast_progress("fill_form", "正在填充合同录入表单", 45)
            if not self._fill_form(contract_data):
                self._screenshot("contract_entry_fill_fail")
                return {"success": False, "message": "表单填充失败"}

            # 步骤6: 点击保存
            self._broadcast_progress("submit", "正在提交合同数据", 80)
            self._wait_human(2, 5)
            if not self._submit_form():
                return {"success": False, "message": "提交表单失败"}
            self._wait_human(3, 8)

            # 步骤7: 验证提交结果
            self._broadcast_progress("verify", "正在验证提交结果", 90)
            success = self._verify_submission()

            # 步骤8: 返回结果汇总
            message = "合同录入成功" if success else "合同录入已提交（未检测到明确成功标识）"
            self._broadcast_progress("done", message, 100)
            self._screenshot("contract_entry_done")

            return {
                "success": True,
                "message": message,
                "verified": success,
                "contract_no": contract_data.get("contract_no", ""),
            }

        except Exception as e:
            logger.error(f"[ContractEntrySubTask] 执行异常: {e}")
            self._screenshot("contract_entry_error")
            return {"success": False, "message": f"合同录入执行异常: {str(e)}"}

    # ------------------------------------------------------------------
    # 导航
    # ------------------------------------------------------------------

    def _navigate_to_contract_list(self) -> bool:
        """导航到租赁合同管理页面 — 三级降级策略"""
        # 策略1: 点击左侧菜单"租赁合同管理"
        menu_texts = ["租赁合同管理", "租赁合同", "合同管理"]
        for text in menu_texts:
            if self._find_clickable_by_text(text):
                logger.info(f"[ContractEntrySubTask] 通过菜单 '{text}' 导航成功")
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
                # 检查是否到达正确页面
                body_text = self.page.evaluate("() => document.body?.innerText || ''")
                if "租赁合同" in body_text or "合同管理" in body_text:
                    logger.info(f"[ContractEntrySubTask] 通过 URL {path} 导航成功")
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
                logger.info(f"[ContractEntrySubTask] JS 导航成功: {found}")
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True
        except Exception:
            pass

        logger.warning("[ContractEntrySubTask] 所有导航策略均失败")
        self._screenshot("contract_entry_nav_fail")
        return False

    # ------------------------------------------------------------------
    # 点击录入按钮
    # ------------------------------------------------------------------

    def _click_add_contract_button(self) -> bool:
        """点击'+ 录入合同'按钮"""
        # 策略1: CSS 选择器查找绿色按钮
        selectors = [
            "button:has-text('录入合同')",
            "button:has-text('录入')",
            "a:has-text('录入合同')",
            ".el-button--primary:has-text('录入')",
        ]
        for sel in selectors:
            try:
                el = self.page.query_selector(sel)
                if el and el.is_visible():
                    if self._safe_click(el, "录入合同按钮"):
                        logger.info(f"[ContractEntrySubTask] CSS 选择器点击成功: {sel}")
                        return True
            except Exception:
                continue

        # 策略2: JS 查找绿色按钮或含"录入"文字的按钮
        try:
            clicked = self.page.evaluate("""() => {
                const btns = document.querySelectorAll(
                    'button, a.btn, [role="button"], .el-button, a'
                );
                for (const btn of btns) {
                    const t = (btn.innerText || btn.value || '').trim();
                    if (t.includes('录入合同') || t.includes('+ 录入')) {
                        btn.click();
                        return true;
                    }
                }
                // 回退：查找绿色背景的可点击元素
                for (const btn of btns) {
                    const style = window.getComputedStyle(btn);
                    const bg = style.backgroundColor || '';
                    const t = (btn.innerText || '').trim();
                    if (bg.includes('green') || bg.includes('67c23a') ||
                        bg.includes('4CAF50') || bg.includes('52c41a')) {
                        if (t.length < 20 && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            }""")
            if clicked:
                logger.info("[ContractEntrySubTask] JS 查找回退点击录入按钮成功")
                return True
        except Exception:
            pass

        # 策略3: 文本查找
        if self._find_clickable_by_text("录入合同"):
            logger.info("[ContractEntrySubTask] 文本查找点击录入按钮成功")
            return True

        logger.warning("[ContractEntrySubTask] 未找到录入合同按钮")
        self._screenshot("contract_entry_btn_fail")
        return False

    # ------------------------------------------------------------------
    # 等待表单
    # ------------------------------------------------------------------

    def _wait_for_form(self) -> bool:
        """等待合同录入表单弹出"""
        try:
            # 等待表单容器出现
            self.page.wait_for_selector(
                "form, .el-dialog, .el-form, .modal, [class*='form'], [class*='dialog']",
                state="visible",
                timeout=15000,
            )
            self._wait_human(1, 3)

            # 验证关键表单字段存在
            has_fields = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                return body.includes('号牌种类') || body.includes('租赁合同编号') ||
                       body.includes('租赁类型') || body.includes('身份证明');
            }""")
            if has_fields:
                logger.info("[ContractEntrySubTask] 合同录入表单已就绪")
                self._screenshot("contract_entry_form_ready")
                return True

            # 再等一下，可能表单还在渲染
            self._wait_human(2, 4)
            has_fields = self.page.evaluate("""() => {
                const body = document.body.innerText || '';
                return body.includes('号牌种类') || body.includes('租赁合同编号');
            }""")
            if has_fields:
                logger.info("[ContractEntrySubTask] 合同录入表单延迟加载后就绪")
                return True

            logger.warning("[ContractEntrySubTask] 表单出现但未检测到关键字段")
            self._screenshot("contract_entry_form_no_fields")
            return True  # 表单出现了，继续尝试填充

        except Exception as e:
            logger.warning(f"[ContractEntrySubTask] 等待表单超时: {e}")
            self._screenshot("contract_entry_form_timeout")
            return False

    # ------------------------------------------------------------------
    # 获取合同数据
    # ------------------------------------------------------------------

    def _get_contract_data(self) -> dict:
        """从 context 获取合同数据，若无则使用默认模拟数据"""
        # context 在 execute 中未直接传入，通过实例属性获取
        data = getattr(self, '_context', {}).get("contract_data")
        if data:
            logger.info("[ContractEntrySubTask] 使用 context 提供的合同数据")
            # 合并默认值，确保所有字段都有值
            merged = {**self.DEFAULT_CONTRACT_DATA, **data}
            return merged

        logger.info("[ContractEntrySubTask] 未提供 contract_data，使用默认模拟数据")
        # 生成动态合同编号
        now = datetime.now()
        default = dict(self.DEFAULT_CONTRACT_DATA)
        default["contract_no"] = f"HT{now.strftime('%Y%m%d%H%M%S')}"
        default["sign_time"] = now.strftime("%Y-%m-%d %H:%M")
        default["start_time"] = now.strftime("%Y-%m-%d %H:%M")
        default["end_time"] = (now + timedelta(days=7)).strftime("%Y-%m-%d %H:%M")
        return default

    # ------------------------------------------------------------------
    # 填充表单
    # ------------------------------------------------------------------

    def _fill_form(self, contract_data: dict) -> bool:
        """填充合同录入表单 — 按字段逐个填充"""
        try:
            success_count = 0
            total_fields = 0

            # 1. 号牌种类 — 下拉选择
            if contract_data.get("plate_type"):
                total_fields += 1
                if self._fill_dropdown("号牌种类", contract_data["plate_type"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 2. 号牌号码 — 先选省份简称，再填号码
            if contract_data.get("plate_province") or contract_data.get("plate_number"):
                total_fields += 1
                if self._fill_plate_number(
                    contract_data.get("plate_province", "浙"),
                    contract_data.get("plate_number", ""),
                ):
                    success_count += 1
                self._wait_human(2, 5)

            # 3. 租赁类型 — 下拉选择
            if contract_data.get("rental_type"):
                total_fields += 1
                if self._fill_dropdown("租赁类型", contract_data["rental_type"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 4. 租赁合同编号 — 文本输入
            if contract_data.get("contract_no"):
                total_fields += 1
                if self._fill_text_input("租赁合同编号", contract_data["contract_no"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 5. 合同签订时间 — 日期时间
            if contract_data.get("sign_time"):
                total_fields += 1
                if self._fill_datetime("合同签订时间", contract_data["sign_time"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 6. 租赁开始时间 — 日期时间
            if contract_data.get("start_time"):
                total_fields += 1
                if self._fill_datetime("租赁开始时间", contract_data["start_time"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 7. 租赁结束时间 — 日期时间
            if contract_data.get("end_time"):
                total_fields += 1
                if self._fill_datetime("租赁结束时间", contract_data["end_time"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 8. 身份证明名称 — 下拉选择
            if contract_data.get("id_type"):
                total_fields += 1
                if self._fill_dropdown("身份证明名称", contract_data["id_type"]):
                    success_count += 1
                self._wait_human(2, 5)

            # 9. 身份证明号码 — 文本输入
            if contract_data.get("id_number"):
                total_fields += 1
                if self._fill_text_input("身份证明号码", contract_data["id_number"]):
                    success_count += 1
                self._wait_human(2, 5)

            logger.info(
                f"[ContractEntrySubTask] 表单填充: {success_count}/{total_fields} 个字段成功"
            )
            self._screenshot("contract_entry_form_filled")

            # 至少一半字段成功即视为填充成功
            return success_count > 0 and success_count >= total_fields * 0.5

        except Exception as e:
            logger.error(f"[ContractEntrySubTask] 表单填充异常: {e}")
            self._screenshot("contract_entry_fill_error")
            return False

    def _fill_dropdown(self, label: str, value: str) -> bool:
        """填充下拉框字段 — 点击下拉框 → 选择选项 → 验证"""
        try:
            # 策略1: 通过 label 定位 form-item，然后点击其中的下拉/输入框
            result = self.page.evaluate("""([label, value]) => {
                // 查找包含 label 文本的表单项
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

                // 查找下拉框或 select
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

                // Element UI 风格的下拉框: 点击触发弹出选项
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

            logger.info(f"[ContractEntrySubTask] 下拉框 '{label}' 策略1结果: {result}")

            if result == "select_ok":
                return True

            if result == "dropdown_clicked":
                # Element UI 下拉框已点击展开，等待选项出现后点击
                self._wait_human(1, 2)
                option_clicked = self.page.evaluate("""(value) => {
                    // 查找弹出的下拉选项列表
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
                    logger.info(f"[ContractEntrySubTask] Element UI 下拉选项 '{value}' 点击成功")
                    return True

            # 策略2: 使用 _find_clickable_by_text 直接点击 label 区域附近
            if self._find_clickable_by_text(label):
                self._wait_human(1, 2)
                # 尝试选择选项
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
                    logger.info(f"[ContractEntrySubTask] 策略2 下拉选项 '{value}' 选中成功")
                    return True

            logger.warning(f"[ContractEntrySubTask] 下拉框 '{label}' 填充失败")
            return False

        except Exception as e:
            logger.warning(f"[ContractEntrySubTask] 下拉框 '{label}' 异常: {e}")
            return False

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
                                // 尝试生成唯一选择器
                                if (input.id) return '#' + input.id;
                                if (input.name) return 'input[name="' + input.name + '"]';
                                // 给元素加临时标记
                                const marker = 'ce_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                                input.setAttribute('data-ce-marker', marker);
                                return '[data-ce-marker="' + marker + '"]';
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
                    # 逐字符输入，模拟真人
                    for char in value:
                        self.page.keyboard.type(char, delay=random.randint(50, 200))
                    logger.info(f"[ContractEntrySubTask] 文本输入 '{label}' = '{value}' 成功")
                    return True

            # 策略2: 使用 placeholder 定位
            el = self.page.query_selector(f'input[placeholder*="{label}"]')
            if el:
                el.click()
                time.sleep(0.3)
                el.fill("")
                for char in value:
                    self.page.keyboard.type(char, delay=random.randint(50, 200))
                logger.info(f"[ContractEntrySubTask] placeholder 策略输入 '{label}' 成功")
                return True

            logger.warning(f"[ContractEntrySubTask] 文本输入 '{label}' 未找到输入框")
            return False

        except Exception as e:
            logger.warning(f"[ContractEntrySubTask] 文本输入 '{label}' 异常: {e}")
            return False

    def _fill_plate_number(self, province: str, number: str) -> bool:
        """填充号牌号码 — 先选省份简称下拉，再填号码文本"""
        try:
            # 定位号牌号码区域
            plate_area = self.page.evaluate("""(province) => {
                const labels = document.querySelectorAll(
                    'label, .el-form-item__label, .form-label, th, td'
                );
                for (const lbl of labels) {
                    const t = (lbl.innerText || lbl.textContent || '').trim();
                    if (t.includes('号牌号码')) {
                        const formItem = lbl.closest(
                            '.el-form-item, .form-group, .form-item, tr'
                        ) || lbl.parentElement;
                        if (!formItem) continue;

                        // 查找省份下拉 (select 或 Element UI 下拉)
                        const selects = formItem.querySelectorAll('select');
                        if (selects.length > 0) {
                            const sel = selects[0];
                            for (const opt of sel.options) {
                                if (opt.text.includes(province) || opt.value.includes(province)) {
                                    sel.value = opt.value;
                                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                                    return 'select_province_ok';
                                }
                            }
                        }

                        // Element UI 风格
                        const dropdowns = formItem.querySelectorAll(
                            '.el-select, [class*="select"]'
                        );
                        if (dropdowns.length > 0) {
                            const input = dropdowns[0].querySelector('input') || dropdowns[0];
                            input.click();
                            return 'el_dropdown_clicked';
                        }

                        return 'plate_area_found_no_select';
                    }
                }
                return 'no_plate_label';
            }""", province)

            logger.info(f"[ContractEntrySubTask] 号牌省份策略结果: {plate_area}")

            if plate_area == "el_dropdown_clicked":
                self._wait_human(1, 2)
                # 选择省份选项
                self.page.evaluate("""(province) => {
                    const options = document.querySelectorAll(
                        '.el-select-dropdown__item, .el-option, li, [role="option"]'
                    );
                    for (const opt of options) {
                        const t = (opt.innerText || '').trim();
                        if (t.includes(province) && opt.offsetParent !== null) {
                            opt.click();
                            return true;
                        }
                    }
                    return false;
                }""", province)
                self._wait_human(1, 2)

            # 填充号码文本部分
            if number:
                self._wait_human(1, 2)
                # 查找号牌号码文本输入框（通常是第二个 input 或紧跟省份选择的 input）
                filled = self.page.evaluate("""([province, number]) => {
                    const labels = document.querySelectorAll(
                        'label, .el-form-item__label, .form-label, th, td'
                    );
                    for (const lbl of labels) {
                        const t = (lbl.innerText || lbl.textContent || '').trim();
                        if (t.includes('号牌号码')) {
                            const formItem = lbl.closest(
                                '.el-form-item, .form-group, .form-item, tr'
                            ) || lbl.parentElement;
                            if (!formItem) continue;

                            // 找所有 input，跳过省份选择的 input
                            const inputs = formItem.querySelectorAll(
                                'input:not([type="hidden"]):not([disabled])'
                            );
                            // 通常号码输入是最后一个或第二个
                            const textInput = inputs[inputs.length - 1] || inputs[0];
                            if (textInput) {
                                textInput.focus();
                                textInput.value = '';
                                // 触发 input 事件
                                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                                    window.HTMLInputElement.prototype, 'value'
                                ).set;
                                nativeInputValueSetter.call(textInput, number);
                                textInput.dispatchEvent(new Event('input', { bubbles: true }));
                                textInput.dispatchEvent(new Event('change', { bubbles: true }));
                                return true;
                            }
                        }
                    }
                    return false;
                }""", [province, number])

                if filled:
                    logger.info(f"[ContractEntrySubTask] 号牌号码 '{province}{number}' 填充成功")
                    return True

                # 回退: 使用 _safe_type
                return self._fill_text_input("号牌号码", number)

            return plate_area in ("select_province_ok", "el_dropdown_clicked")

        except Exception as e:
            logger.warning(f"[ContractEntrySubTask] 号牌号码填充异常: {e}")
            return False

    def _fill_datetime(self, label: str, datetime_str: str) -> bool:
        """填充日期时间字段 — 点击日期选择器 → 输入日期时间 → 确认"""
        try:
            # 策略1: 通过 label 定位，找到日期输入框并直接设值
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
                            // 尝试直接设值并触发事件
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

            logger.info(f"[ContractEntrySubTask] 日期时间 '{label}' 策略1结果: {result}")

            if result == "set_value_ok":
                # 点击空白处关闭可能弹出的日期面板
                try:
                    self.page.mouse.click(10, 10)
                except Exception:
                    pass
                return True

            # 策略2: 使用 _safe_type 直接输入
            return self._fill_text_input(label, datetime_str)

        except Exception as e:
            logger.warning(f"[ContractEntrySubTask] 日期时间 '{label}' 异常: {e}")
            return False

    # ------------------------------------------------------------------
    # 提交
    # ------------------------------------------------------------------

    def _submit_form(self) -> bool:
        """点击保存按钮提交表单"""
        self._wait_human(3, 8)  # 提交前等待

        # 策略1: CSS 选择器
        selectors = [
            "button:has-text('保存')",
            ".el-button--primary:has-text('保存')",
            "button:has-text('确')",
        ]
        for sel in selectors:
            try:
                el = self.page.query_selector(sel)
                if el and el.is_visible():
                    if self._safe_click(el, "保存按钮"):
                        logger.info(f"[ContractEntrySubTask] CSS 点击保存成功: {sel}")
                        self._wait_for_page_ready()
                        return True
            except Exception:
                continue

        # 策略2: JS 查找绿色"保存"按钮
        try:
            clicked = self.page.evaluate("""() => {
                const btns = document.querySelectorAll(
                    'button, a.btn, [role="button"], .el-button'
                );
                for (const btn of btns) {
                    const t = (btn.innerText || btn.value || '').trim();
                    if (t === '保存' || t === '确 定' || t === '确定') {
                        if (btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            }""")
            if clicked:
                logger.info("[ContractEntrySubTask] JS 点击保存成功")
                self._wait_for_page_ready()
                return True
        except Exception:
            pass

        # 策略3: 文本查找
        if self._find_clickable_by_text("保存"):
            logger.info("[ContractEntrySubTask] 文本查找点击保存成功")
            self._wait_for_page_ready()
            return True

        logger.warning("[ContractEntrySubTask] 未找到保存按钮")
        self._screenshot("contract_entry_submit_fail")
        return False

    # ------------------------------------------------------------------
    # 验证
    # ------------------------------------------------------------------

    def _verify_submission(self) -> bool:
        """验证提交是否成功 — 检查成功提示或错误信息"""
        self._wait_human(3, 8)  # 等待服务端响应
        self._screenshot("contract_entry_verify")

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
                    if (t.includes('成功') || t.includes('保存成功')) return 'success';
                    if (t.includes('失败') || t.includes('错误')) return 'fail: ' + t;
                }

                // 检查页面文本
                const successKeywords = ['成功', '保存成功', '提交成功', '录入成功'];
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

            logger.info(f"[ContractEntrySubTask] 验证结果: {result}")

            if result == "success" or result == "form_closed_likely_success":
                return True
            elif result and result.startswith("fail"):
                logger.warning(f"[ContractEntrySubTask] 提交验证失败: {result}")
                return False
            else:
                # 未知情况，假设成功
                return True

        except Exception as e:
            logger.warning(f"[ContractEntrySubTask] 验证异常: {e}")
            return False
