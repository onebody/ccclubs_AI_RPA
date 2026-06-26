import base64
import time
import logging

from .human_behavior import HumanBehavior

logger = logging.getLogger(__name__)


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
        try:
            page = context.new_page()
            url = SiteAutomation.get_province_url(province)
            page.goto(url, wait_until="networkidle", timeout=30000)
            # 检查是否有已登录特征元素（如用户名显示、"退出"按钮等）
            is_logged_in = page.locator('text=退出').is_visible(timeout=5000) or \
                          page.locator('.user-info').is_visible(timeout=3000)
            page.close()
            return is_logged_in
        except Exception as e:
            logger.warning(f"检查登录状态失败: {e}")
            return False

    @staticmethod
    def navigate_to_unit_login(context, province: str):
        """导航到单位登录页面"""
        page = context.new_page()
        url = SiteAutomation.get_province_url(province)
        page.goto(url, wait_until="networkidle", timeout=30000)
        
        # 模拟真人浏览行为
        HumanBehavior.random_scroll(page)
        HumanBehavior.wait_like_human(page)
        
        # 保存首页截图用于调试
        try:
            page.screenshot(path="/tmp/122_homepage.png")
            logger.info("已保存首页截图到 /tmp/122_homepage.png")
        except Exception:
            pass
        
        # 点击「单位登录」- 多种选择器降级策略
        login_selectors = [
            'text=单位登录',
            'a:has-text("单位登录")',
            'button:has-text("单位登录")',
            '.login-unit',
            '#unit-login',
            '[data-type="unit"]',
            'text=单位',
            'a[href*="unit"]',
        ]
        
        for selector in login_selectors:
            try:
                elem = page.locator(selector).first
                if elem.is_visible(timeout=2000):
                    box = elem.bounding_box()
                    if box:
                        # 模拟真人点击：鼠标移动 + 随机偏移
                        x = box['x'] + box['width'] * 0.5
                        y = box['y'] + box['height'] * 0.5
                        page.mouse.move(x, y, steps=8)
                        HumanBehavior.random_delay(0.1, 0.3)
                        page.mouse.click(x, y)
                    else:
                        elem.click()
                    HumanBehavior.random_delay(0.3, 0.8)
                    page.wait_for_load_state("networkidle", timeout=10000)
                    logger.info(f"成功点击登录入口: {selector}")
                    return page
            except Exception:
                continue
        
        # 如果所有选择器都失败，尝试查找任何包含"登录"的链接
        try:
            login_links = page.locator('a:has-text("登录")')
            count = login_links.count()
            for i in range(count):
                link = login_links.nth(i)
                text = link.inner_text().strip()
                if "单位" in text or "企业" in text:
                    link.click()
                    page.wait_for_load_state("networkidle", timeout=10000)
                    logger.info(f"通过文本匹配找到登录入口: {text}")
                    return page
        except Exception:
            pass
        
        logger.warning("未找到单位登录入口，直接返回当前页面（可能在默认登录页）")
        return page

    @staticmethod
    def capture_qr_code(page) -> str:
        """截取二维码图片，返回 base64"""
        try:
            # 等待页面完全渲染
            HumanBehavior.random_delay(1.0, 2.0)
            # 尝试定位二维码图片元素
            qr_selectors = [
                'img.qrcode', 'img[id*="qr"]', 'img[class*="qr"]',
                '.qr-code img', '#qrcode img', '.login-qrcode img',
                'canvas.qrcode', '.ercode img',
            ]
            for selector in qr_selectors:
                try:
                    qr_elem = page.locator(selector).first
                    if qr_elem.is_visible(timeout=3000):
                        screenshot = qr_elem.screenshot()
                        b64 = base64.b64encode(screenshot).decode()
                        return f"data:image/png;base64,{b64}"
                except Exception:
                    continue

            # 降级：截取整个登录区域
            page.screenshot(path="/tmp/qr_full_page.png")
            with open("/tmp/qr_full_page.png", "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            return f"data:image/png;base64,{b64}"
        except Exception as e:
            logger.error(f"截取二维码失败: {e}")
            return ""

    @staticmethod
    def wait_for_scan(page, timeout: int = 120) -> bool:
        """等待扫码成功（检测页面跳转或成功元素）"""
        try:
            # 等待 URL 变化或出现成功标志
            page.wait_for_url("**/unit/**", timeout=timeout * 1000)
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
    def select_company(page, company_id: str) -> bool:
        """选择单位"""
        try:
            # 扩展更多可能的选择器
            selectors = [
                '.company-list .company-item',
                '.unit-list .unit-item',
                'table tbody tr',
                '.company-card',
                '.list-item',
                'ul > li',
                '[class*="card"]',
                '[class*="item"]',
            ]
            for selector in selectors:
                try:
                    items = page.locator(selector)
                    count = items.count()
                    if count > 0:
                        idx = int(company_id)
                        if idx < count:
                            target = items.nth(idx)
                            box = target.bounding_box()
                            if box:
                                x = box['x'] + box['width'] * 0.5
                                y = box['y'] + box['height'] * 0.5
                                page.mouse.move(x, y, steps=8)
                                HumanBehavior.random_delay(0.1, 0.3)
                                page.mouse.click(x, y)
                            else:
                                target.click()
                            HumanBehavior.random_delay(0.3, 0.8)
                            page.wait_for_load_state("networkidle", timeout=10000)
                            logger.info(f"成功选择第 {idx} 个单位（使用选择器 '{selector}'）")
                            return True
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"选择单位失败: {e}")
        return False

    @staticmethod
    def execute_sub_task(page, sub_task: str, context: dict) -> dict:
        """执行单个子任务（占位）"""
        logger.info(f"执行子任务: {sub_task}")
        time.sleep(2)  # 占位，后续替换为实际自动化
        return {"success": True, "message": f"{sub_task} 执行完成"}
