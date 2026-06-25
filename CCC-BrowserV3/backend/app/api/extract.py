"""
数据提取 API 路由
提供页面数据提取和 JSON 导出接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any, Dict
from loguru import logger

from app.engine.browser_engine import BrowserEngine
from app.engine.data_extractor import DataExtractor

router = APIRouter()

# 全局引擎和提取器实例
_engine: Optional[BrowserEngine] = None
_extractor: Optional[DataExtractor] = None


def get_extractor() -> DataExtractor:
    """获取或创建数据提取器实例"""
    global _engine, _extractor
    if _extractor is None:
        if _engine is None:
            _engine = BrowserEngine()
        _extractor = DataExtractor(_engine)
    return _extractor


# ============================
# 请求/响应模型
# ============================

class ExtractBySelectorRequest(BaseModel):
    """通过 CSS 选择器提取数据请求"""
    session_id: str
    selector: str
    attribute: Optional[str] = None


class ExtractByScriptRequest(BaseModel):
    """通过自定义 JS 脚本提取数据请求"""
    session_id: str
    script: str


class ExtractAndExportRequest(BaseModel):
    """提取并导出请求"""
    session_id: str
    selector: str
    filename: Optional[str] = None
    attribute: Optional[str] = None
    subdirectory: Optional[str] = None


class PageScreenshotRequest(BaseModel):
    """页面截图请求"""
    session_id: str
    full_page: bool = False


# ============================
# API 端点
# ============================

@router.post("/extract/selector")
async def extract_by_selector(request: ExtractBySelectorRequest):
    """
    通过 CSS 选择器提取页面数据
    
    在浏览器上下文中执行 JS，提取匹配选择器的所有元素的文本内容或属性值。
    """
    extractor = get_extractor()
    try:
        data = await extractor.extract_by_selector(
            session_id=request.session_id,
            selector=request.selector,
            attribute=request.attribute,
        )
        return {"data": data, "count": len(data)}
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")
    except Exception as e:
        logger.error(f"数据提取失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/script")
async def extract_by_script(request: ExtractByScriptRequest):
    """
    通过自定义 JS 脚本提取数据
    
    在浏览器上下文中执行用户提供的 JavaScript 脚本，
    返回脚本执行结果。
    """
    extractor = get_extractor()
    try:
        data = await extractor.extract_by_script(
            session_id=request.session_id,
            script=request.script,
        )
        return {"data": data}
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")
    except Exception as e:
        logger.error(f"脚本执行失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/page-info")
async def extract_page_info(request: ExtractBySelectorRequest):
    """
    提取页面基础信息（标题、URL、元数据等）
    """
    extractor = get_extractor()
    try:
        info = await extractor.extract_page_info(session_id=request.session_id)
        return info
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")


@router.post("/export/json")
async def export_to_json(request: ExtractAndExportRequest):
    """
    提取数据并导出为 JSON 文件
    
    一站式操作：先通过 CSS 选择器提取数据，再写入本地 JSON 文件。
    """
    extractor = get_extractor()
    try:
        file_path = await extractor.extract_and_export(
            session_id=request.session_id,
            selector=request.selector,
            filename=request.filename,
            attribute=request.attribute,
        )
        return {
            "status": "ok",
            "file_path": file_path,
            "message": "数据导出成功",
        }
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")
    except Exception as e:
        logger.error(f"数据导出失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/screenshot")
async def take_screenshot(request: PageScreenshotRequest):
    """
    对当前页面截图
    
    返回截图的 base64 编码字符串，供前端展示。
    """
    engine = _engine or BrowserEngine()
    try:
        page = engine.get_page(request.session_id)
        screenshot_bytes = await page.screenshot(full_page=request.full_page)
        import base64
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
        return {
            "session_id": request.session_id,
            "screenshot": screenshot_b64,
        }
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")
    except Exception as e:
        logger.error(f"截图失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
