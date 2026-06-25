"""
数据提取模块
负责从浏览器页面中提取结构化数据，并导出为 JSON 文件
"""
import json
from typing import Any, Dict, List, Optional
from pathlib import Path
from datetime import datetime
from loguru import logger

from app.config import settings
from app.engine.browser_engine import BrowserEngine


class DataExtractor:
    """
    数据提取器
    
    核心职责：
    1. 在浏览器上下文中执行 JS 脚本提取 DOM 数据
    2. 对提取的数据进行清洗和结构化
    3. 将结果导出为 JSON 文件至本地目录
    """

    def __init__(self, engine: BrowserEngine):
        self.engine = engine

    async def extract_by_selector(
        self,
        session_id: str,
        selector: str,
        attribute: Optional[str] = None,
    ) -> List[Any]:
        """
        通过 CSS 选择器提取页面数据
        
        Args:
            session_id: 浏览器会话ID
            selector: CSS 选择器
            attribute: 可选，提取特定属性值（None 则提取 textContent）
            
        Returns:
            提取的数据列表
        """
        page = self.engine.get_page(session_id)

        # 在浏览器上下文中执行 JS 提取数据
        results = await page.evaluate(
            """
            ({ selector, attribute }) => {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).map(el => {
                    if (attribute) {
                        return el.getAttribute(attribute);
                    }
                    return el.textContent?.trim() || '';
                });
            }
            """,
            {"selector": selector, "attribute": attribute},
        )

        logger.info(f"数据提取完成: selector={selector}, 共 {len(results)} 条")
        return results

    async def extract_by_script(
        self,
        session_id: str,
        script: str,
    ) -> Any:
        """
        通过自定义 JS 脚本提取数据
        
        在浏览器上下文中执行用户提供的 JS 脚本，
        直接提取 DOM 数据，避免跨进程传输大量 HTML。
        
        Args:
            session_id: 浏览器会话ID
            script: 要执行的 JavaScript 脚本字符串
            
        Returns:
            脚本执行结果
        """
        page = self.engine.get_page(session_id)

        result = await page.evaluate(script)
        logger.info("自定义脚本数据提取完成")
        return result

    async def extract_page_info(
        self,
        session_id: str,
    ) -> Dict[str, Any]:
        """
        提取页面基础信息（标题、URL、元数据等）
        
        Args:
            session_id: 浏览器会话ID
            
        Returns:
            页面信息字典
        """
        page = self.engine.get_page(session_id)

        info = await page.evaluate("""
            () => {
                return {
                    title: document.title,
                    url: window.location.href,
                    charset: document.characterSet,
                    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
                    links: document.querySelectorAll('a').length,
                    images: document.querySelectorAll('img').length,
                };
            }
        """)

        return info

    async def export_to_json(
        self,
        data: Any,
        filename: Optional[str] = None,
        subdirectory: Optional[str] = None,
    ) -> str:
        """
        将提取的数据导出为 JSON 文件
        
        Args:
            data: 要导出的数据
            filename: 可选的自定义文件名
            subdirectory: 可选的子目录名
            
        Returns:
            导出文件的完整路径
        """
        export_dir = settings.export_path
        if subdirectory:
            export_dir = export_dir / subdirectory
            export_dir.mkdir(parents=True, exist_ok=True)

        # 生成文件名
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"extract_{timestamp}.json"

        file_path = export_dir / filename

        # 写入 JSON 文件
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"数据已导出至: {file_path}")
        return str(file_path)

    async def extract_and_export(
        self,
        session_id: str,
        selector: str,
        filename: Optional[str] = None,
        attribute: Optional[str] = None,
    ) -> str:
        """
        一站式操作：提取数据并立即导出
        
        Args:
            session_id: 浏览器会话ID
            selector: CSS 选择器
            filename: 可选的自定义文件名
            attribute: 可选的属性名
            
        Returns:
            导出文件路径
        """
        data = await self.extract_by_selector(session_id, selector, attribute)
        file_path = await self.export_to_json(data, filename)
        return file_path
