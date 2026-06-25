"""
安全工具模块
提供 API Key 鉴权、敏感数据加密等安全能力
"""
import hashlib
import hmac
import time
import secrets
from typing import Optional
from loguru import logger


def generate_api_key() -> str:
    """
    生成动态 API Key
    Python 后端启动时生成，Electron 通过 IPC 获取后携带在请求头中
    """
    return secrets.token_hex(32)


def generate_timestamp_token(api_key: str, max_age_seconds: int = 60) -> dict:
    """
    生成带时间戳的鉴权 Token
    
    采用 API Key + 时间戳防重放机制：
    - 服务端校验时间偏差超过 max_age_seconds 则拒绝
    - 防止本地接口被恶意劫持
    
    Args:
        api_key: API 密钥
        max_age_seconds: 最大允许时间偏差（秒）
        
    Returns:
        包含 token 和 timestamp 的字典
    """
    timestamp = str(int(time.time()))
    message = f"{api_key}:{timestamp}"
    signature = hmac.new(
        api_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return {
        "token": signature,
        "timestamp": timestamp,
    }


def verify_timestamp_token(
    api_key: str,
    token: str,
    timestamp: str,
    max_age_seconds: int = 60,
) -> bool:
    """
    校验时间戳 Token 的有效性
    
    Args:
        api_key: API 密钥
        token: 待校验的 Token
        timestamp: 请求携带的时间戳
        max_age_seconds: 最大允许时间偏差
        
    Returns:
        Token 是否有效
    """
    # 检查时间偏差
    current_time = int(time.time())
    request_time = int(timestamp)
    if abs(current_time - request_time) > max_age_seconds:
        logger.warning(f"时间戳过期: 偏差={abs(current_time - request_time)}s")
        return False

    # 验证签名
    message = f"{api_key}:{timestamp}"
    expected = hmac.new(
        api_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(token, expected)
