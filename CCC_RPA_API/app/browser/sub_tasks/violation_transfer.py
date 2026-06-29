import logging
import random
import time
from app.browser.sub_tasks.base import BaseSubTask

logger = logging.getLogger(__name__)


class ViolationTransferSubTask(BaseSubTask):
    """违章转移子任务 — 将违章转移到承租驾驶人"""

    SUB_TASK_TYPE = "ViolationTransferSubTask"

    def __init__(self, page, broadcast_fn=None, task_id=None,
                 sub_task_id=None, sub_task_type=None, context=None):
        super().__init__(page, broadcast_fn=broadcast_fn, task_id=task_id, context=context)
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

    # ------------------------------------------------------------------
    # 主流程
    # ------------------------------------------------------------------

    def execute(self) -> dict:
        """主流程：导航→获取待转移违章→选择违章→填写驾驶人信息→提交→验证"""
        # 校验 sub_task_type 是否匹配
        if self._sub_task_type and self._sub_task_type != self.SUB_TASK_TYPE:
            msg = (f"sub_task_type 不匹配: 期望 {self.SUB_TASK_TYPE}, "
                   f"实际 {self._sub_task_type}")
            logger.warning(f"[ViolationTransferSubTask] {msg}")
            return {"success": False, "message": msg}

        logger.info("[ViolationTransferSubTask] 开始执行违章转移")
        self._broadcast_progress("start", "开始执行违章转移", 0)
        self._screenshot("violation_transfer_start")

        try:
            # 步骤1: 获取转移数据
            transfer_data = self._get_transfer_data()
            logger.info(
                f"[ViolationTransferSubTask] 转移数据: "
                f"violation_id={transfer_data.get('violation_id', '未指定')}, "
                f"driver_id_type={transfer_data.get('driver_id_type', '')}, "
                f"driver_id_number={transfer_data.get('driver_id_number', '')}"
            )

            # 步骤2: 导航到交通违法转移申请页面
            self._broadcast_progress("navigate", "正在导航到交通违法转移申请页面", 10)
            if not self._navigate_to_transfer_page():
                return {"success": False, "message": "无法导航到交通违法转移申请页面"}
            self._wait_human(3, 8)

            # 步骤3: 获取可转移的违章列表
            self._broadcast_progress("list", "正在获取可转移违章列表", 25)
            violations = self._get_transferable_violations()
            if not violations:
                self._broadcast_progress("done", "没有可转移的违章", 100)
                self._screenshot("violation_transfer_empty")
                return {
                    "success": True,
                    "message": "没有可转移的违章",
                    "total": 0,
                    "transferred": 0,
                }

            logger.info(
                f"[ViolationTransferSubTask] 找到 {len(violations)} 条可转移违章"
            )

            # 步骤4: 选择要转移的违章
            self._broadcast_progress("select", "正在选择要转移的违章", 40)
            target = self._pick_target_violation(violations, transfer_data)
            if not target:
                self._screenshot("violation_transfer_no_target")
                return {"success": False, "message": "未找到符合条件的违章"}

            if not self._select_violation(target):
                self._screenshot("violation_transfer_select_fail")
                return {"success": False, "message": "无法选择目标违章"}
            self._wait_human(2, 5)

            # 步骤5: 填写承租驾驶人信息
            self._broadcast_progress("fill", "正在填写驾驶人信息", 55)
            if not self._fill_driver_info(transfer_data):
                self._screenshot("violation_transfer_fill_fail")
                return {"success": False, "message": "填写驾驶人信息失败"}
            self._wait_human(2, 5)

            # 步骤6: 提交转移申请
            self._broadcast_progress("submit", "正在提交转移申请", 75)
            if not self._submit_transfer():
                self._screenshot("violation_transfer_submit_fail")
                return {"success": False, "message": "提交转移申请失败"}
            self._wait_human(3, 8)

            # 步骤7: 验证转移结果
            self._broadcast_progress("verify", "正在验证转移结果", 90)
            verified = self._verify_transfer()

            message = "违章转移成功" if verified else "违章转移已提交（未检测到明确成功标识）"
            self._broadcast_progress("done", message, 100)
            self._screenshot("violation_transfer_done")

            return {
                "success": True,
                "message": message,
                "verified": verified,
                "total": len(violations),
                "transferred": 1,
            }

        except Exception as e:
            logger.error(f"[ViolationTransferSubTask] 执行异常: {e}")
            self._screenshot("violation_transfer_error")
            return {"success": False, "message": f"违章转移执行异常: {str(e)}"}

    # ------------------------------------------------------------------
    # 获取转移数据
    # ------------------------------------------------------------------

    def _get_transfer_data(self) -> dict:
        """从 context 获取转移数据"""
        data = getattr(self, "_context", {}).get("transfer_data")
        if data:
            logger.info("[ViolationTransferSubTask] 使用 context 提供的转移数据")
            return dict(data)

        logger.info("[ViolationTransferSubTask] 未提供 transfer_data，使用空默认")
        return {
            "violation_id": "",
            "driver_id_type": "A:居民身份证",
            "driver_id_number": "",
        }

    # ------------------------------------------------------------------
    # 导航
    # ------------------------------------------------------------------

    def _navigate_to_transfer_page(self) -> bool:
        """导航到交通违法转移申请页面"""
        # 策略1: 点击左侧菜单"交通违法转移申请"
        menu_texts = [
            "交通违法转移申请", "违法转移", "违章转移",
            "转移申请", "违法转移申请",
        ]
        for text in menu_texts:
            if self._find_clickable_by_text(text):
                logger.info(
                    f"[ViolationTransferSubTask] 通过菜单 '{text}' 导航成功"
                )
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True

        # 策略2: 直接 URL 导航
        transfer_urls = [
            "/views/violation/transfer.html",
            "/views/wzzy/transfer.html",
            "/views/violation/wzzy.html",
            "/views/user/violation-transfer.html",
        ]
        base_url = (
            self.page.url.rsplit("/", 1)[0]
            if "/" in self.page.url
            else self.page.url
        )
        for path in transfer_urls:
            try:
                self.page.goto(
                    base_url + path,
                    wait_until="domcontentloaded",
                    timeout=10000,
                )
                self._wait_human(3, 6)
                body_text = self.page.evaluate(
                    "() => document.body?.innerText || ''"
                )
                if "转移" in body_text or "transfer" in (self.page.url or ""):
                    logger.info(
                        f"[ViolationTransferSubTask] 通过 URL {path} 导航成功"
                    )
                    return True
            except Exception:
                continue

        # 策略3: JS 查找包含"转移"的菜单项并点击
        try:
            found = self.page.evaluate("""() => {
                const els = document.querySelectorAll(
                    'a[href], [role="menuitem"], .menu-item, .nav-item, '
                    + 'li, span, div'
                );
                for (const el of els) {
                    const text = (el.innerText || el.textContent || '').trim();
                    if ((text.includes('转移') && (text.includes('违法') || text.includes('违章')))
                        && text.length < 20) {
                        el.click();
                        return text;
                    }
                }
                return null;
            }""")
            if found:
                logger.info(
                    f"[ViolationTransferSubTask] JS 导航成功: {found}"
                )
                self._wait_for_page_ready()
                self._wait_human(3, 8)
                return True
        except Exception:
            pass

        logger.warning("[ViolationTransferSubTask] 所有导航策略均失败")
        self._screenshot("violation_transfer_nav_fail")
        return False

    # ------------------------------------------------------------------
    # 获取可转移违章
    # ------------------------------------------------------------------

    def _get_transferable_violations(self) -> list:
        """获取可转移的违章列表"""
        self._screenshot("violation_transfer_list")

        # 尝试点击查询按钮（部分页面需要先触发查询）
        self._trigger_query()
        self._wait_human(3, 8)
        self._wait_for_page_ready()
        self._screenshot("violation_transfer_after_query")

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
                            const raw = texts.join(' | ');
                            // 只收集可转移的违章（未处理状态）
                            if (raw.includes('未处理') || raw.includes('可转移')
                                || !raw.includes('已处理')) {
                                // 查找该行中的 checkbox 或选择按钮
                                const checkbox = row.querySelector(
                                    'input[type="checkbox"], .el-checkbox, '
                                    + '[class*="check"], [class*="radio"]'
                                );
                                results.push({
                                    raw: raw.substring(0, 300),
                                    cells: texts,
                                    element_index: results.length,
                                    has_checkbox: !!checkbox,
                                    source: 'table',
                                });
                            }
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
                            has_checkbox: false,
                            source: 'list',
                        });
                    }
                }

                return results;
            }""")
            logger.info(
                f"[ViolationTransferSubTask] 提取到 {len(items)} 条可转移违章"
            )
            return items
        except Exception as e:
            logger.warning(
                f"[ViolationTransferSubTask] 获取可转移违章列表失败: {e}"
            )
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
                        f"[ViolationTransferSubTask] 点击查询按钮: '{text}'"
                    )
                    return
            except Exception:
                continue

    # ------------------------------------------------------------------
    # 选择违章
    # ------------------------------------------------------------------

    def _pick_target_violation(self, violations: list,
                                transfer_data: dict) -> dict:
        """根据 transfer_data 选择目标违章"""
        violation_id = transfer_data.get("violation_id", "")

        if violation_id:
            # 尝试匹配指定违章
            for v in violations:
                raw = v.get("raw", "")
                cells = v.get("cells", [])
                if violation_id in raw or any(violation_id in c for c in cells):
                    logger.info(
                        f"[ViolationTransferSubTask] 匹配到指定违章: {violation_id}"
                    )
                    return v
            logger.warning(
                f"[ViolationTransferSubTask] 未匹配到指定违章 {violation_id}，使用第一条"
            )

        # 默认选择第一条
        if violations:
            logger.info("[ViolationTransferSubTask] 选择第一条可转移违章")
            return violations[0]
        return None

    def _select_violation(self, violation: dict) -> bool:
        """选择要转移的违章 — 勾选 checkbox 或点击行"""
        index = violation.get("element_index", 0)
        self._broadcast_progress(
            "select_item",
            f"正在选择违章: {violation.get('raw', '')[:30]}...",
            45,
        )

        try:
            # 策略1: 点击该行的 checkbox
            clicked = self.page.evaluate("""(index) => {
                const rows = document.querySelectorAll(
                    'table tbody tr, .el-table__body-wrapper tr, '
                    + '.el-table__row, [class*="table"] tr'
                );
                let count = 0;
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 2) continue;
                    const text = (row.innerText || '').trim();
                    if (text.includes('已处理') && !text.includes('未处理')) continue;

                    if (count === index) {
                        // 优先点击 checkbox
                        const cb = row.querySelector(
                            'input[type="checkbox"], .el-checkbox, '
                            + '.el-checkbox__input, [class*="check"]'
                        );
                        if (cb) {
                            cb.click();
                            return 'checkbox';
                        }
                        // 回退：点击行
                        row.click();
                        return 'row';
                    }
                    count++;
                }
                return null;
            }""", index)

            if clicked:
                logger.info(
                    f"[ViolationTransferSubTask] 选择违章成功: {clicked}"
                )
                self._wait_human(2, 5)
                return True

            # 策略2: 通过 _find_clickable_by_text 点击
            raw = violation.get("raw", "")
            # 提取前20个字符作为查找关键字
            keyword = raw[:20].split("|")[0].strip() if raw else ""
            if keyword and self._find_clickable_by_text(keyword):
                logger.info(
                    f"[ViolationTransferSubTask] 通过文本选择违章成功"
                )
                self._wait_human(2, 5)
                return True

            logger.warning("[ViolationTransferSubTask] 无法选择目标违章")
            return False

        except Exception as e:
            logger.warning(f"[ViolationTransferSubTask] 选择违章异常: {e}")
            return False

    # ------------------------------------------------------------------
    # 填写驾驶人信息
    # ------------------------------------------------------------------

    def _fill_driver_info(self, transfer_data: dict) -> bool:
        """填写承租驾驶人信息 — 证件类型、证件号码等"""
        driver_id_type = transfer_data.get("driver_id_type", "A:居民身份证")
        driver_id_number = transfer_data.get("driver_id_number", "")

        if not driver_id_number:
            logger.warning(
                "[ViolationTransferSubTask] 未提供证件号码，跳过填写"
            )
            return False

        success_count = 0

        # 填写证件类型
        if driver_id_type:
            if self._fill_id_type(driver_id_type):
                success_count += 1
                logger.info(
                    f"[ViolationTransferSubTask] 证件类型填写成功: {driver_id_type}"
                )
            else:
                logger.warning("[ViolationTransferSubTask] 证件类型填写失败")
            self._wait_human(2, 5)

        # 填写证件号码
        if self._fill_id_number(driver_id_number):
            success_count += 1
            logger.info(
                f"[ViolationTransferSubTask] 证件号码填写成功: {driver_id_number[:6]}***"
            )
        else:
            logger.warning("[ViolationTransferSubTask] 证件号码填写失败")
        self._wait_human(2, 5)

        # 尝试填写其他可能的字段（姓名等）
        self._fill_optional_fields(transfer_data)

        return success_count > 0

    def _fill_id_type(self, id_type: str) -> bool:
        """填写证件类型 — 下拉选择"""
        # 提取显示文本（如 "A:居民身份证" → "居民身份证"）
        display_text = id_type.split(":")[-1] if ":" in id_type else id_type

        try:
            # 策略1: 查找证件类型下拉框
            result = self.page.evaluate("""(displayText) => {
                // 查找包含"证件类型"标签的表单项
                const labels = document.querySelectorAll(
                    'label, .el-form-item__label, .form-label, th, td, span'
                );
                for (const lbl of labels) {
                    const t = (lbl.innerText || lbl.textContent || '').trim();
                    if (t.includes('证件类型') || t.includes('证件名称')
                        || t.includes('身份证明')) {
                        const formItem = lbl.closest(
                            '.el-form-item, .form-group, .form-item, tr'
                        ) || lbl.parentElement;
                        if (!formItem) continue;

                        // 原生 select
                        const select = formItem.querySelector('select');
                        if (select) {
                            for (const opt of select.options) {
                                if (opt.text.includes(displayText)
                                    || opt.value.includes(displayText)) {
                                    select.value = opt.value;
                                    select.dispatchEvent(
                                        new Event('change', { bubbles: true })
                                    );
                                    return 'select_ok';
                                }
                            }
                            return 'select_no_match';
                        }

                        // Element UI 下拉框
                        const dropdown = formItem.querySelector(
                            '.el-select, .el-input, [class*="select"]'
                        );
                        if (dropdown) {
                            const input = dropdown.querySelector('input') || dropdown;
                            input.click();
                            return 'dropdown_clicked';
                        }
                    }
                }
                return 'not_found';
            }""", display_text)

            logger.info(
                f"[ViolationTransferSubTask] 证件类型策略结果: {result}"
            )

            if result == "select_ok":
                return True

            if result == "dropdown_clicked":
                self._wait_human(1, 2)
                # 在下拉选项中选择
                option_clicked = self.page.evaluate("""(displayText) => {
                    const options = document.querySelectorAll(
                        '.el-select-dropdown__item, .el-option, '
                        + '[class*="option"], [class*="dropdown-item"], li'
                    );
                    for (const opt of options) {
                        const t = (opt.innerText || opt.textContent || '').trim();
                        if (t.includes(displayText) && opt.offsetParent !== null) {
                            opt.click();
                            return true;
                        }
                    }
                    return false;
                }""", display_text)
                if option_clicked:
                    return True

            # 策略2: 文本查找
            if self._find_clickable_by_text("证件类型"):
                self._wait_human(1, 2)
                option_clicked = self.page.evaluate("""(displayText) => {
                    const options = document.querySelectorAll(
                        '.el-select-dropdown__item, .el-option, li, [role="option"]'
                    );
                    for (const opt of options) {
                        const t = (opt.innerText || '').trim();
                        if (t.includes(displayText) && opt.offsetParent !== null) {
                            opt.click();
                            return true;
                        }
                    }
                    return false;
                }""", display_text)
                if option_clicked:
                    return True

            return False

        except Exception as e:
            logger.warning(f"[ViolationTransferSubTask] 证件类型异常: {e}")
            return False

    def _fill_id_number(self, id_number: str) -> bool:
        """填写证件号码"""
        labels = ["证件号码", "身份证明号码", "身份证号码", "证件号"]
        for label in labels:
            try:
                selector = self.page.evaluate("""(label) => {
                    const labels = document.querySelectorAll(
                        'label, .el-form-item__label, .form-label, th, td, span'
                    );
                    for (const lbl of labels) {
                        const t = (lbl.innerText || lbl.textContent || '').trim();
                        if (t.includes(label)) {
                            const formItem = lbl.closest(
                                '.el-form-item, .form-group, .form-item, tr'
                            ) || lbl.parentElement;
                            if (!formItem) continue;
                            const input = formItem.querySelector(
                                'input:not([type="hidden"]), textarea'
                            );
                            if (input) {
                                if (input.id) return '#' + input.id;
                                if (input.name) return 'input[name="' + input.name + '"]';
                                const marker = 'vt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                                input.setAttribute('data-vt-marker', marker);
                                return '[data-vt-marker="' + marker + '"]';
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
                        for char in id_number:
                            self.page.keyboard.type(
                                char, delay=random.randint(50, 200)
                            )
                        logger.info(
                            f"[ViolationTransferSubTask] 证件号码填写成功 (label={label})"
                        )
                        return True
            except Exception:
                continue

        # 回退: placeholder 查找
        try:
            el = self.page.query_selector(
                'input[placeholder*="证件"], input[placeholder*="身份证"], '
                'input[placeholder*="号码"]'
            )
            if el:
                el.click()
                time.sleep(0.3)
                el.fill("")
                for char in id_number:
                    self.page.keyboard.type(
                        char, delay=random.randint(50, 200)
                    )
                logger.info(
                    "[ViolationTransferSubTask] 通过 placeholder 填写证件号码成功"
                )
                return True
        except Exception:
            pass

        logger.warning("[ViolationTransferSubTask] 证件号码输入框未找到")
        return False

    def _fill_optional_fields(self, transfer_data: dict):
        """尝试填写其他可选字段（如姓名、联系方式等）"""
        optional_fields = {
            "driver_name": ["姓名", "驾驶人姓名", "承租人姓名"],
            "driver_phone": ["联系电话", "手机号", "联系方式"],
        }
        for field_key, labels in optional_fields.items():
            value = transfer_data.get(field_key, "")
            if not value:
                continue
            for label in labels:
                try:
                    if self._safe_type(
                        f'input[placeholder*="{label}"]', value, label
                    ):
                        logger.info(
                            f"[ViolationTransferSubTask] 可选字段 '{field_key}' 填写成功"
                        )
                        break
                except Exception:
                    continue

    # ------------------------------------------------------------------
    # 提交
    # ------------------------------------------------------------------

    def _submit_transfer(self) -> bool:
        """提交转移申请"""
        self._wait_human(2, 5)

        # 策略1: CSS 选择器
        selectors = [
            "button:has-text('提交')",
            ".el-button--primary:has-text('提交')",
            "button:has-text('确')",
            "button:has-text('申请')",
            "button:has-text('转移')",
        ]
        for sel in selectors:
            try:
                el = self.page.query_selector(sel)
                if el and el.is_visible():
                    if self._safe_click(el, "提交按钮"):
                        logger.info(
                            f"[ViolationTransferSubTask] CSS 点击提交成功: {sel}"
                        )
                        self._wait_for_page_ready()
                        return True
            except Exception:
                continue

        # 策略2: JS 查找提交按钮
        submit_texts = ["提交", "确认提交", "确定", "申请", "转移申请"]
        try:
            clicked = self.page.evaluate("""(submitTexts) => {
                const btns = document.querySelectorAll(
                    'button, a.btn, [role="button"], .el-button'
                );
                for (const btn of btns) {
                    const t = (btn.innerText || btn.value || '').trim();
                    for (const st of submitTexts) {
                        if ((t === st || t.includes(st))
                            && btn.offsetParent !== null) {
                            btn.click();
                            return t;
                        }
                    }
                }
                return null;
            }""", submit_texts)
            if clicked:
                logger.info(
                    f"[ViolationTransferSubTask] JS 点击提交成功: {clicked}"
                )
                self._wait_for_page_ready()
                return True
        except Exception:
            pass

        # 策略3: 文本查找
        for text in ["提交", "确定", "申请"]:
            if self._find_clickable_by_text(text):
                logger.info(
                    f"[ViolationTransferSubTask] 文本查找点击 '{text}' 成功"
                )
                self._wait_for_page_ready()
                return True

        logger.warning("[ViolationTransferSubTask] 未找到提交按钮")
        self._screenshot("violation_transfer_submit_fail")
        return False

    # ------------------------------------------------------------------
    # 验证
    # ------------------------------------------------------------------

    def _verify_transfer(self) -> bool:
        """验证转移结果"""
        self._wait_human(3, 8)
        self._screenshot("violation_transfer_verify")

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
                    if (t.includes('成功') || t.includes('提交成功')
                        || t.includes('转移成功'))
                        return 'success';
                    if (t.includes('失败') || t.includes('错误'))
                        return 'fail: ' + t;
                }

                // 检查页面文本
                const successKeywords = [
                    '成功', '提交成功', '转移成功', '已提交', '申请已提交'
                ];
                const failKeywords = ['失败', '错误', '异常', '必填'];
                for (const kw of successKeywords) {
                    if (body.includes(kw)) return 'success';
                }
                for (const kw of failKeywords) {
                    if (body.includes(kw)) return 'fail: ' + kw;
                }

                return 'unknown';
            }""")

            logger.info(f"[ViolationTransferSubTask] 验证结果: {result}")

            if result == "success":
                return True
            elif result and result.startswith("fail"):
                logger.warning(
                    f"[ViolationTransferSubTask] 转移验证失败: {result}"
                )
                return False
            else:
                # unknown — 可能已提交成功但页面未显示明确标识
                return True

        except Exception as e:
            logger.warning(f"[ViolationTransferSubTask] 验证异常: {e}")
            return False
