import base64
import time
import logging

from .human_behavior import HumanBehavior

logger = logging.getLogger(__name__)


def _is_browser_closed_error(e: Exception) -> bool:
    """检测是否为浏览器已关闭的错误"""
    msg = str(e).lower()
    return 'has been closed' in msg or 'target page' in msg or 'browser has been closed' in msg


class SiteAutomation:
    """封装 122.gov.cn 的所有自动化操作"""

    PROVINCE_CODES = {
        "北京": "bj", "天津": "tj", "河北": "he", "山西": "sx",
        "内蒙古": "nm", "辽宁": "ln", "吉林": "jl", "黑龙江": "hl",
        "上海": "sh", "江苏": "js", "浙江": "zj", "安徽": "ah",
        "福建": "fj", "江西": "jx", "山东": "sd", "河南": "ha",
        "湖北": "hb", "湖南": "hn", "广东": "gd", "广西": "gx",
        "海南": "hi", "重庆": "cq", "四川": "sc", "贵州": "gz",
        "云南": "yn", "西藏": "xz", "陕西": "sn", "甘肃": "gs",
        "青海": "qh", "宁夏": "nx", "新疆": "xj",
    }

    @staticmethod
    def get_province_url(province: str) -> str:
        code = SiteAutomation.PROVINCE_CODES.get(province)
        if not code:
            raise ValueError(f"未知省份: {province}")
        return f"https://{code}.122.gov.cn"

    @staticmethod
    def check_login_status(context, province: str) -> bool:
        """检查是否已登录"""
        page = None
        try:
            page = context.new_page()
            url = SiteAutomation.get_province_url(province)
            page.goto(url, wait_until="networkidle", timeout=30000)
            is_logged_in = page.locator('text=退出').is_visible(timeout=5000) or \
                          page.locator('.user-info').is_visible(timeout=3000)
            return is_logged_in
        except Exception as e:
            if _is_browser_closed_error(e):
                raise
            logger.warning(f"检查登录状态失败: {e}")
            return False
        finally:
            if page:
                try:
                    page.close()
                except Exception:
                    pass

    @staticmethod
    def navigate_to_unit_login(context, province: str):
        """导航到单位登录页面：优先直接导航到 gab.122.gov.cn/m/login?t=2"""
        page = context.new_page()

        # 策略1：尝试直接导航到统一登录页
        login_url = "https://gab.122.gov.cn/m/login?t=2"
        try:
            logger.info(f"直接导航到登录页: {login_url}")
            page.goto(login_url, wait_until="networkidle", timeout=30000)
            logger.info(f"导航后 URL: {page.url}")

            # 确认单位用户 Tab 已激活，等待二维码出现
            page.wait_for_selector("img#qrCode", timeout=10000)
            logger.info("二维码图片已加载")

            try:
                page.screenshot(path="/tmp/122_login_page.png")
            except Exception:
                pass

            return page
        except Exception as e:
            logger.warning(f"直接导航到登录页失败: {e}，尝试首页点击方式")

        # 策略2：访问首页，用 JS 强制点击按钮（绕过 display:none）
        try:
            url = SiteAutomation.get_province_url(province)
            page.goto(url, wait_until="networkidle", timeout=30000)
            HumanBehavior.random_scroll(page)
            HumanBehavior.wait_like_human(page)

            try:
                page.screenshot(path="/tmp/122_homepage.png")
            except Exception:
                pass

            # 用 JS 查找并点击按钮（不依赖 is_visible）
            clicked = page.evaluate("""
                () => {
                    const buttons = document.querySelectorAll('button.btn-mini.pane');
                    for (const btn of buttons) {
                        if (btn.textContent.includes('单位用户登录')) {
                            btn.click();
                            return true;
                        }
                    }
                    // 也尝试通过 onclick 属性匹配
                    const allBtns = document.querySelectorAll('button');
                    for (const btn of allBtns) {
                        const onclick = btn.getAttribute('onclick') || '';
                        if (onclick.includes('u=1')) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                }
            """)

            if clicked:
                logger.info("通过 JS 点击了单位用户登录按钮")
                HumanBehavior.random_delay(2.0, 3.0)
                page.wait_for_load_state("networkidle", timeout=15000)
                logger.info(f"点击后 URL: {page.url}")

                # 等待跳转到登录页
                try:
                    page.wait_for_selector("img#qrCode", timeout=10000)
                    logger.info("二维码图片已加载")
                except Exception:
                    logger.warning("未检测到二维码，可能仍在首页")
            else:
                logger.warning("首页未找到单位登录按钮，尝试直接导航")
                page.goto(login_url, wait_until="networkidle", timeout=30000)
                page.wait_for_selector("img#qrCode", timeout=10000)

            try:
                page.screenshot(path="/tmp/122_login_page.png")
            except Exception:
                pass

            return page
        except Exception as e:
            logger.error(f"导航到单位登录页完全失败: {e}")
            raise

    @staticmethod
    def capture_qr_code(page) -> str:
        """截取二维码元素单独截图，返回 base64（前端负责显示）"""
        try:
            # 等待二维码图片加载完成
            page.wait_for_selector("img#qrCode", timeout=10000)
            qr_element = page.locator("img#qrCode")
            
            # 单独截取二维码元素
            qr_element.screenshot(path="/tmp/qr_code.png")
            with open("/tmp/qr_code.png", "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            logger.info("已截取二维码元素单独截图")
            return f"data:image/png;base64,{b64}"
        except Exception as e:
            logger.error(f"截取二维码失败: {e}")
            # 降级：截取整个页面
            try:
                page.screenshot(path="/tmp/qr_full_page.png")
                with open("/tmp/qr_full_page.png", "rb") as f:
                    b64 = base64.b64encode(f.read()).decode()
                logger.warning("降级为整页截图")
                return f"data:image/png;base64,{b64}"
            except Exception as e2:
                logger.error(f"降级截图也失败: {e2}")
                return ""

    @staticmethod
    def wait_for_scan(page, timeout: int = 120) -> bool:
        """等待扫码成功（检测页面跳转或成功元素）"""
        try:
            # 扫码成功后页面会跳转离开登录页，或出现单位相关元素
            # 检测 URL 变化（从 gab.122.gov.cn/m/login 跳转到其他页面）
            page.wait_for_function(
                "() => !window.location.href.includes('/m/login')",
                timeout=timeout * 1000
            )
            return True
        except Exception:
            # 也检查是否有成功元素
            try:
                page.locator('text=登录成功').wait_for(timeout=5000)
                return True
            except Exception:
                return False

    @staticmethod
    def scrape_company_list(page) -> list:
        """抓取单位列表（正式模式：必须使用真实数据）"""
        companies = []
        try:
            # 模拟真人浏览行为
            HumanBehavior.random_scroll(page)
            HumanBehavior.wait_like_human(page, 1.0, 2.0)
            
            # 保存当前页面截图用于调试
            try:
                page.screenshot(path="/tmp/unit_page_debug.png")
                logger.info("已保存单位列表页截图到 /tmp/unit_page_debug.png")
            except Exception:
                pass
            
            # 打印页面标题和 URL 用于调试
            logger.info(f"当前页面 URL: {page.url}")
            logger.info(f"当前页面标题: {page.title()}")
            
            # 多级降级策略 - 扩展更多可能的选择器
            selectors = [
                # 常见列表容器
                '.company-list .company-item',
                '.unit-list .unit-item',
                '.enterprise-list .item',
                '.org-list li',
                'table tbody tr',
                '.company-card',
                '.list-item',
                # 通用列表项
                'ul > li',
                'div[class*="list"] > div',
                # 表格行
                'tr[data-id]',
                'tr[role="row"]',
                # 卡片式布局
                '[class*="card"]',
                '[class*="item"]',
            ]
            for selector in selectors:
                try:
                    items = page.locator(selector)
                    count = items.count()
                    if count > 0:
                        logger.info(f"找到选择器 '{selector}' 匹配 {count} 个元素")
                        for i in range(count):
                            item = items.nth(i)
                            text = item.inner_text()
                            # 尝试提取名称和信用代码
                            name = text.strip().split('\n')[0].strip()
                            code = ""
                            for line in text.split('\n'):
                                line = line.strip()
                                if len(line) == 18 and line[0].isdigit():
                                    code = line
                                    break
                            if name and len(name) > 2:  # 过滤过短的名称
                                companies.append({
                                    "id": str(i),
                                    "name": name,
                                    "creditCode": code or f"CODE{i:04d}",
                                })
                        if companies:
                            logger.info(f"成功抓取 {len(companies)} 个单位")
                            break
                except Exception as e:
                    logger.debug(f"选择器 '{selector}' 失败: {e}")
                    continue

            if not companies:
                # 尝试从页面文本中提取单位名称（最后手段）
                page_text = page.inner_text('body')
                lines = [line.strip() for line in page_text.split('\n') if line.strip()]
                # 查找包含"公司"、"企业"、"单位"的行
                for line in lines:
                    if any(keyword in line for keyword in ['公司', '企业', '单位', '有限公司']):
                        # 尝试提取统一社会信用代码（18位数字开头）
                        import re
                        match = re.search(r'\b(91\d{16}|\d{18})\b', line)
                        code = match.group(1) if match else ""
                        companies.append({
                            "id": str(len(companies)),
                            "name": line[:50],  # 限制长度
                            "creditCode": code or f"CODE{len(companies):04d}",
                        })
                        if len(companies) >= 5:  # 最多取5个
                            break
                
                if companies:
                    logger.info(f"通过文本分析提取到 {len(companies)} 个单位")
                else:
                    # 正式模式：抓取失败抛出异常，不使用模拟数据
                    raise Exception("未找到单位列表元素，页面结构可能已变化或尚未登录")
        except Exception as e:
            logger.error(f"抓取单位列表失败: {e}")
            raise

        return companies

    @staticmethod
    def select_company(page, company_id, company_name: str = None) -> bool:
        """选择单位（仅点击单位元素，登录按钮由 executor 处理）"""
        current_url = page.url
        logger.info(f"[select_company] 入口: company_id={company_id}, company_name={company_name}, URL={current_url}")

        # 截图调试：记录选择公司前的页面状态
        try:
            page.screenshot(path="/tmp/select_company_entry.png")
            logger.info("[select_company] 已保存入口截图到 /tmp/select_company_entry.png")
        except Exception as e:
            logger.debug(f"[select_company] 入口截图失败: {e}")

        # 判断 company_id 是否为合成索引（纯数字且较小，来自 scrape_company_list 的 str(i)）
        is_synthetic_id = False
        try:
            _id_val = int(company_id)
            if _id_val < 100:
                is_synthetic_id = True
                logger.info(f"[select_company] company_id={company_id} 疑似合成索引，将跳过 data-id/文本精确匹配")
        except (ValueError, TypeError):
            pass

        try:
            page.bring_to_front()

            # 与 scrape_company_list 保持一致的选择器列表
            selectors = [
                # 常见列表容器
                '.company-list .company-item',
                '.unit-list .unit-item',
                '.enterprise-list .item',
                '.org-list li',
                'table tbody tr',
                '.company-card',
                '.list-item',
                # 通用列表项
                'ul > li',
                'div[class*="list"] > div',
                # 表格行
                'tr[data-id]',
                'tr[role="row"]',
                # 卡片式布局
                '[class*="card"]',
                '[class*="item"]',
            ]

            # 遍历选择器，找到并点击单位元素
            clicked = False
            for selector in selectors:
                try:
                    items = page.locator(selector)
                    count = items.count()
                    if count > 0:
                        logger.info(f"[select_company] 选择器 '{selector}' 匹配 {count} 个元素")

                        # --- 匹配策略（优先 company_name，合成索引跳过 data-id/文本匹配） ---
                        target = None
                        matched_info = ""

                        # 策略1: 通过 company_name 文本匹配（最可靠，优先尝试）
                        if not target and company_name:
                            for i in range(count):
                                item = items.nth(i)
                                try:
                                    text = item.inner_text().strip()
                                    if company_name in text:
                                        target = item
                                        matched_info = f"文本匹配company_name={company_name}"
                                        break
                                except Exception:
                                    pass

                        # 策略2: 通过 data-id 属性精确匹配（仅当 company_id 非合成索引时）
                        if not target and not is_synthetic_id:
                            for i in range(count):
                                item = items.nth(i)
                                try:
                                    data_id = item.get_attribute('data-id')
                                    if data_id and str(data_id) == str(company_id):
                                        target = item
                                        matched_info = f"data-id={company_id}"
                                        break
                                except Exception:
                                    pass

                        # 策略3: 通过文本内容精确行匹配 company_id（仅当 company_id 非合成索引时）
                        if not target and not is_synthetic_id:
                            for i in range(count):
                                item = items.nth(i)
                                try:
                                    text = item.inner_text().strip()
                                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                                    if str(company_id) in lines:
                                        target = item
                                        matched_info = f"文本行精确匹配company_id={company_id}"
                                        break
                                except Exception:
                                    pass

                        # 策略4: 降级为索引匹配
                        if not target:
                            try:
                                idx = int(company_id) if isinstance(company_id, str) else company_id
                                if isinstance(idx, int) and 0 <= idx < count:
                                    target = items.nth(idx)
                                    matched_info = f"索引 idx={idx}"
                            except (ValueError, TypeError, IndexError):
                                pass

                        if not target:
                            logger.warning(f"[select_company] 选择器 '{selector}' 找到 {count} 个元素但无法匹配 company_id={company_id}")
                            continue

                        # 点击目标元素
                        box = target.bounding_box()
                        if box:
                            x = box['x'] + box['width'] * 0.5
                            y = box['y'] + box['height'] * 0.5
                            page.mouse.move(x, y, steps=8)
                            HumanBehavior.random_delay(0.1, 0.3)
                            page.mouse.click(x, y)
                        else:
                            target.click()
                        logger.info(f"[select_company] 点击了单位元素: {matched_info}, 选择器='{selector}'")
                        HumanBehavior.random_delay(0.3, 0.8)
                        page.wait_for_load_state("domcontentloaded", timeout=10000)
                        clicked = True
                        break
                except Exception as e:
                    logger.debug(f"[select_company] 选择器 '{selector}' 失败: {e}")
                    continue

            # CSS 选择器全部失败时，尝试 JS 回退：在全文中查找包含 company_name 的可点击元素
            if not clicked:
                logger.info(f"[select_company] CSS选择器全部失败，尝试 JS 回退匹配 company_name={company_name}")
                try:
                    clicked = page.evaluate("""(companyName) => {
                        const allElements = document.querySelectorAll('div, a, li, tr, span, p, button, td');
                        let bestMatch = null;
                        let bestTextLen = Infinity;
                        for (const el of allElements) {
                            const text = el.innerText || el.textContent || '';
                            if (text.includes(companyName)) {
                                const len = text.length;
                                if (len < bestTextLen && el.children.length < 10) {
                                    bestMatch = el;
                                    bestTextLen = len;
                                }
                            }
                        }
                        if (bestMatch) {
                            bestMatch.click();
                            return true;
                        }
                        return false;
                    }""", company_name)
                    if clicked:
                        logger.info(f"[select_company] JS 回退成功匹配并点击了 company_name={company_name}")
                        HumanBehavior.random_delay(0.3, 0.8)
                        try:
                            page.wait_for_load_state("domcontentloaded", timeout=10000)
                        except Exception:
                            pass
                    else:
                        logger.warning(f"[select_company] JS 回退也未找到匹配元素")
                except Exception as e:
                    logger.warning(f"[select_company] JS 回退执行失败: {e}")

            if not clicked:
                logger.error(f"[select_company] 所有选择器均未找到可匹配的单位 company_id={company_id}")
                # 保存失败截图用于调试
                try:
                    page.screenshot(path="/tmp/select_company_failed.png")
                    logger.info("[select_company] 已保存失败截图到 /tmp/select_company_failed.png")
                except Exception:
                    pass
                return False

            # 公司选择成功，尝试点击"登录"按钮完成单位切换
            logger.info("[select_company] 公司选择成功，尝试点击登录按钮")
            try:
                login_clicked = False
                # 策略1：查找包含"登录"文本的按钮/链接
                login_selectors = [
                    'button:has-text("登录")',
                    'a:has-text("登录")',
                    'button:has-text("→ 登录")',
                    'a:has-text("→ 登录")',
                    '.login-btn',
                    '.btn-login',
                    '[class*="login"]',
                    'button[type="submit"]',
                ]
                for selector in login_selectors:
                    try:
                        elements = page.query_selector_all(selector)
                        for el in elements:
                            if el.is_visible():
                                text = el.inner_text() or ''
                                if '登录' in text or 'login' in text.lower() or selector in ['.login-btn', '.btn-login', '[class*="login"]', 'button[type="submit"]']:
                                    el.click()
                                    login_clicked = True
                                    logger.info(f"[select_company] 登录按钮点击成功 (selector={selector})")
                                    break
                        if login_clicked:
                            break
                    except Exception:
                        continue

                # JS 回退查找登录按钮
                if not login_clicked:
                    try:
                        login_clicked = page.evaluate("""() => {
                            const allBtns = document.querySelectorAll('button, a, input[type="submit"], div[role="button"]');
                            for (const btn of allBtns) {
                                const text = (btn.innerText || btn.value || btn.textContent || '').trim();
                                if (text.includes('登录') && btn.offsetParent !== null) {
                                    btn.click();
                                    return true;
                                }
                            }
                            return false;
                        }""")
                        if login_clicked:
                            logger.info("[select_company] JS 回退成功点击登录按钮")
                    except Exception as e:
                        logger.warning(f"[select_company] JS 回退点击登录按钮失败: {e}")

                if not login_clicked:
                    logger.warning("[select_company] 未找到登录按钮，可能需要手动登录")

                # 等待页面跳转
                try:
                    page.wait_for_load_state("domcontentloaded", timeout=15000)
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"[select_company] 点击登录按钮失败: {e}")

            logger.info(f"[select_company] 操作完成，最终URL={page.url}")
            return True

        except Exception as e:
            if _is_browser_closed_error(e):
                raise
            logger.error(f"[select_company] 选择单位失败: {e}")
        return False

    @staticmethod
    def navigate_to_homepage(page, province: str):
        """选择单位后跳转到首页/业务主页面"""
        try:
            url = SiteAutomation.get_province_url(province)
            page.goto(url, wait_until="networkidle", timeout=30000)
            HumanBehavior.random_scroll(page)
            HumanBehavior.wait_like_human(page, 1.0, 3.0)
            logger.info(f"已跳转到首页: {url}")
        except Exception as e:
            if _is_browser_closed_error(e):
                raise
            logger.error(f"跳转首页失败: {e}")

    @staticmethod
    def keep_alive(page):
        """页面保活：随机点击刷新、随机滚动、随机等待（30~120秒间隔）"""
        import random
        try:
            action = random.choice(['scroll', 'click_refresh', 'click_random', 'wait'])
            if action == 'scroll':
                HumanBehavior.random_scroll(page)
                logger.debug("保活操作: 随机滚动")
            elif action == 'click_refresh':
                refresh_selectors = [
                    'button:has-text("刷新")', 'a:has-text("刷新")',
                    '.refresh-btn', '[title="刷新"]', '.reload',
                    'button:has-text("查询")', 'a:has-text("查询")',
                ]
                for selector in refresh_selectors:
                    try:
                        elem = page.locator(selector).first
                        if elem.is_visible(timeout=1000):
                            box = elem.bounding_box()
                            if box:
                                x = box['x'] + box['width'] * 0.5
                                y = box['y'] + box['height'] * 0.5
                                page.mouse.move(x, y, steps=5)
                                HumanBehavior.random_delay(0.1, 0.3)
                                page.mouse.click(x, y)
                            else:
                                elem.click()
                            logger.debug(f"保活操作: 点击刷新 ({selector})")
                            break
                    except Exception:
                        continue
                else:
                    HumanBehavior.random_scroll(page)
                    logger.debug("保活操作: 未找到刷新按钮，降级为滚动")
            elif action == 'click_random':
                # 安全保活：不点击链接（避免页面跳转），改为鼠标随机移动
                try:
                    x = random.randint(100, 900)
                    y = random.randint(100, 600)
                    page.mouse.move(x, y, steps=random.randint(3, 8))
                    HumanBehavior.random_delay(0.3, 0.8)
                    logger.debug(f"保活操作: 鼠标随机移动到 ({x}, {y})")
                except Exception:
                    HumanBehavior.random_scroll(page)
            else:
                HumanBehavior.wait_like_human(page, 2.0, 5.0)
                logger.debug("保活操作: 随机等待")
            interval = random.uniform(30, 120)
            logger.debug(f"下次保活间隔: {interval:.0f}s")
            return interval
        except Exception as e:
            if _is_browser_closed_error(e):
                raise
            logger.warning(f"保活操作异常: {e}")
            return 60

    @staticmethod
    def keep_alive_on_page(page):
        """在当前业务页面上执行轻量级随机保活操作，不导航到其他页面

        操作包括：小幅度滚动、鼠标随机移动、键盘 Tab、模拟阅读等
        不会点击业务按钮、不会触发导航、不会提交表单
        """
        import random
        try:
            actions = [
                # 小幅度随机滚动（上下都可能，模拟阅读）
                lambda: (
                    page.evaluate(f"window.scrollBy(0, {random.randint(-150, 200)})"),
                    logger.debug("[keep_alive_on_page] 保活: 小幅度随机滚动"),
                ),
                # 鼠标随机移动（在视口内随机位置）
                lambda: (
                    page.mouse.move(random.randint(100, 900), random.randint(100, 600), steps=random.randint(3, 8)),
                    logger.debug("[keep_alive_on_page] 保活: 鼠标随机移动"),
                ),
                # 键盘 Tab（切换焦点，不触发任何操作）
                lambda: (
                    page.keyboard.press("Tab"),
                    logger.debug("[keep_alive_on_page] 保活: 键盘 Tab"),
                ),
                # 模拟阅读等待
                lambda: (
                    HumanBehavior.wait_like_human(page, 1.5, 4.0),
                    logger.debug("[keep_alive_on_page] 保活: 模拟阅读等待"),
                ),
                # 鼠标移动到页面顶部区域（模拟查看导航栏）
                lambda: (
                    page.mouse.move(random.randint(200, 700), random.randint(10, 50), steps=random.randint(5, 10)),
                    logger.debug("[keep_alive_on_page] 保活: 鼠标移动到顶部"),
                ),
            ]

            # 随机选择一个保活动作
            action = random.choice(actions)
            action()

            # 如果页面意外弹出对话框，尝试关闭
            try:
                dialog_selectors = [
                    '.el-dialog__close', '.modal-close', '.close-btn',
                    'button:has-text("关闭")', 'a:has-text("关闭")',
                    'button:has-text("取消")', '.el-message-box__btns .el-button--primary',
                ]
                for sel in dialog_selectors:
                    try:
                        elem = page.locator(sel).first
                        if elem.is_visible(timeout=500):
                            elem.click()
                            logger.info(f"[keep_alive_on_page] 关闭了意外弹出的对话框: {sel}")
                            break
                    except Exception:
                        continue
            except Exception:
                pass

            interval = random.uniform(30, 120)
            logger.debug(f"[keep_alive_on_page] 下次保活间隔: {interval:.0f}s")
            return interval
        except Exception as e:
            if _is_browser_closed_error(e):
                raise
            logger.warning(f"[keep_alive_on_page] 保活操作失败: {e}")
            return 60

    @staticmethod
    def check_pending_business(page) -> list:
        """检查页面是否有待处理的业务数据"""
        pending = []
        try:
            business_types = [
                {"keyword": "备案", "type": "备案查询"},
                {"keyword": "违章", "type": "违章查询"},
                {"keyword": "违法", "type": "违章查询"},
                {"keyword": "合同调整", "type": "合同调整"},
                {"keyword": "转移", "type": "违章转移"},
            ]
            badge_selectors = [
                '.badge', '.count', '.num', '.todo-count',
                '[class*="badge"]', '[class*="count"]',
                '.el-badge__content', '.notification-count',
            ]
            for selector in badge_selectors:
                try:
                    badges = page.locator(selector)
                    count = badges.count()
                    if count > 0:
                        for i in range(count):
                            badge = badges.nth(i)
                            text = badge.inner_text().strip()
                            if text.isdigit() and int(text) > 0:
                                parent = badge.locator('..')
                                parent_text = parent.inner_text()
                                for bt in business_types:
                                    if bt["keyword"] in parent_text:
                                        pending.append({"type": bt["type"], "count": int(text)})
                                        break
                except Exception:
                    continue
            if not pending:
                try:
                    page_text = page.inner_text('body')
                    for bt in business_types:
                        if bt["keyword"] in page_text:
                            import re
                            pattern = rf'{bt["keyword"]}.*?(?:待处理|未处理|新|待办|\d+条)'
                            if re.search(pattern, page_text):
                                pending.append({"type": bt["type"], "count": 1})
                except Exception:
                    pass
            if pending:
                logger.info(f"检测到待处理业务: {pending}")
            else:
                logger.debug("未检测到待处理业务")
        except Exception as e:
            if _is_browser_closed_error(e):
                raise
            logger.warning(f"检查业务数据异常: {e}")
        return pending

    @staticmethod
    def execute_sub_task(page, sub_task: str, context: dict) -> dict:
        """执行子任务，委托给 SubTaskRegistry"""
        from app.browser.sub_tasks import SubTaskRegistry

        handler_cls = SubTaskRegistry.get_handler(sub_task)
        if not handler_cls:
            logger.warning(f"[execute_sub_task] 未知子任务类型: {sub_task}")
            return {"success": False, "message": f"未知子任务: {sub_task}"}

        broadcast_fn = context.get("broadcast_fn")
        task_id = context.get("task_id")
        handler = handler_cls(page, broadcast_fn=broadcast_fn, task_id=task_id)
        return handler.execute()
