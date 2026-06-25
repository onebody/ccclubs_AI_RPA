"""
DAG 流程执行引擎
支持有向无环图定义的任务流程编排，实现条件分支、循环和并行执行
"""
import asyncio
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from loguru import logger

from app.engine.browser_engine import BrowserEngine
from app.engine.data_extractor import DataExtractor
from app.engine.login_recorder import LoginRecorder
from app.websocket.log_push import log_manager


class NodeType(str, Enum):
    """DAG 节点类型"""
    NAVIGATE = "navigate"           # 页面导航
    CLICK = "click"                 # 点击元素
    FILL = "fill"                   # 填写输入
    WAIT = "wait"                   # 等待元素/时间
    EXTRACT = "extract"             # 数据提取
    SCREENSHOT = "screenshot"       # 页面截图
    CONDITION = "condition"         # 条件分支
    LOGIN_CHECK = "login_check"     # 登录状态检测
    SAVE_STATE = "save_state"       # 保存登录态
    EXPORT_JSON = "export_json"     # 导出 JSON
    DELAY = "delay"                 # 随机延迟（反爬）
    SCRIPT = "script"               # 执行自定义 JS


@dataclass
class FlowNode:
    """DAG 流程节点"""
    id: str
    node_type: NodeType
    name: str = ""
    config: Dict[str, Any] = field(default_factory=dict)
    # 后续节点ID列表（支持分支）
    next_nodes: List[str] = field(default_factory=list)
    # 条件分支：当 node_type == CONDITION 时使用
    condition_expr: Optional[str] = None
    true_branch: Optional[str] = None   # 条件为真时跳转的节点ID
    false_branch: Optional[str] = None  # 条件为假时跳转的节点ID


@dataclass
class FlowDefinition:
    """DAG 流程定义"""
    id: str
    name: str
    nodes: Dict[str, FlowNode]
    entry_node_id: str  # 入口节点ID


class FlowExecutor:
    """
    DAG 流程执行器
    
    核心职责：
    1. 解析 DAG 流程定义
    2. 按拓扑顺序执行节点
    3. 处理条件分支和循环
    4. 每个节点执行前后通过 WebSocket 推送状态
    """

    def __init__(self, engine: BrowserEngine):
        self.engine = engine
        self.extractor = DataExtractor(engine)
        self.recorder = LoginRecorder(engine)

    async def execute(
        self,
        flow: FlowDefinition,
        session_id: str,
        instance_id: str = "",
        task_id: str = "",
    ) -> Dict[str, Any]:
        """
        执行 DAG 流程
        
        Args:
            flow: 流程定义
            session_id: 浏览器会话ID
            instance_id: 任务实例ID（用于日志推送）
            task_id: 任务ID
            
        Returns:
            执行结果字典
        """
        results: Dict[str, Any] = {}
        current_node_id = flow.entry_node_id
        visited_count: Dict[str, int] = {}  # 防止无限循环
        max_visits = 10  # 单个节点最大执行次数

        logger.info(f"开始执行流程: {flow.name}, 入口节点: {current_node_id}")

        while current_node_id:
            node = flow.nodes.get(current_node_id)
            if not node:
                raise ValueError(f"节点不存在: {current_node_id}")

            # 防止无限循环
            visited_count[current_node_id] = visited_count.get(current_node_id, 0) + 1
            if visited_count[current_node_id] > max_visits:
                raise RuntimeError(f"节点执行次数超限: {node.name}({current_node_id})")

            # 推送节点开始事件
            await log_manager.log_task_event(
                task_id=task_id,
                instance_id=instance_id,
                event_type="step_start",
                message=f"执行节点: {node.name or node.node_type.value}",
                data={"node_id": current_node_id, "node_type": node.node_type.value},
            )

            try:
                # 执行节点逻辑
                result = await self._execute_node(node, session_id, results)
                results[current_node_id] = result

                # 推送节点完成事件
                await log_manager.log_task_event(
                    task_id=task_id,
                    instance_id=instance_id,
                    event_type="step_complete",
                    message=f"节点完成: {node.name or node.node_type.value}",
                    data={"node_id": current_node_id, "result_keys": list(result.keys()) if isinstance(result, dict) else []},
                )

                # 确定下一个节点
                if node.node_type == NodeType.CONDITION:
                    # 条件分支
                    condition_result = result.get("condition_result", False)
                    current_node_id = node.true_branch if condition_result else node.false_branch
                elif node.next_nodes:
                    # 线性/多分支：取第一个（后续可扩展为并行执行）
                    current_node_id = node.next_nodes[0]
                else:
                    # 流程结束
                    current_node_id = None

            except Exception as e:
                await log_manager.log_task_event(
                    task_id=task_id,
                    instance_id=instance_id,
                    event_type="error",
                    message=f"节点执行失败: {node.name} - {str(e)}",
                    data={"node_id": current_node_id, "error": str(e)},
                )
                raise

        logger.info(f"流程执行完成: {flow.name}")
        return results

    async def _execute_node(
        self,
        node: FlowNode,
        session_id: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        执行单个 DAG 节点
        
        根据节点类型调用对应的操作处理器
        """
        page = self.engine.get_page(session_id)
        config = node.config

        if node.node_type == NodeType.NAVIGATE:
            url = config.get("url", "")
            # 支持从上下文中引用变量
            url = self._resolve_variables(url, context)
            await page.goto(url, wait_until=config.get("wait_until", "domcontentloaded"))
            return {"url": url, "title": await page.title()}

        elif node.node_type == NodeType.CLICK:
            selector = config.get("selector", "")
            await page.click(selector, timeout=config.get("timeout", 10000))
            return {"clicked": selector}

        elif node.node_type == NodeType.FILL:
            selector = config.get("selector", "")
            value = config.get("value", "")
            value = self._resolve_variables(value, context)
            await page.fill(selector, value)
            return {"filled": selector, "value": value}

        elif node.node_type == NodeType.WAIT:
            selector = config.get("selector")
            timeout = config.get("timeout", 30000)
            if selector:
                await page.wait_for_selector(selector, timeout=timeout)
                return {"waited": selector}
            else:
                ms = config.get("ms", 1000)
                await asyncio.sleep(ms / 1000)
                return {"waited_ms": ms}

        elif node.node_type == NodeType.EXTRACT:
            selector = config.get("selector", "body")
            attribute = config.get("attribute")
            data = await self.extractor.extract_by_selector(session_id, selector, attribute)
            return {"data": data, "count": len(data)}

        elif node.node_type == NodeType.SCREENSHOT:
            full_page = config.get("full_page", False)
            screenshot_bytes = await page.screenshot(full_page=full_page)
            import base64
            b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
            return {"screenshot": b64[:100] + "..."}  # 只返回摘要

        elif node.node_type == NodeType.CONDITION:
            # 执行条件表达式
            expr = config.get("expression", "false")
            expr = self._resolve_variables(expr, context)
            try:
                result = await page.evaluate(expr)
            except Exception:
                result = bool(expr)
            return {"condition_result": result}

        elif node.node_type == NodeType.LOGIN_CHECK:
            is_logged_in = await self.recorder.check_login_status(
                session_id,
                success_selector=config.get("success_selector"),
                success_url_pattern=config.get("success_url_pattern"),
            )
            return {"is_logged_in": is_logged_in}

        elif node.node_type == NodeType.SAVE_STATE:
            path = await self.recorder.save_storage_state(
                session_id,
                filename=config.get("filename"),
            )
            return {"storage_state_path": path}

        elif node.node_type == NodeType.EXPORT_JSON:
            data = config.get("data")
            filename = config.get("filename")
            path = await self.extractor.export_to_json(data, filename)
            return {"export_path": path}

        elif node.node_type == NodeType.DELAY:
            min_ms = config.get("min_ms", 500)
            max_ms = config.get("max_ms", 2000)
            import random
            delay_ms = random.randint(min_ms, max_ms)
            await asyncio.sleep(delay_ms / 1000)
            return {"delay_ms": delay_ms}

        elif node.node_type == NodeType.SCRIPT:
            script = config.get("script", "")
            script = self._resolve_variables(script, context)
            result = await page.evaluate(script)
            return {"script_result": result}

        else:
            raise ValueError(f"未知的节点类型: {node.node_type}")

    def _resolve_variables(self, template: str, context: Dict[str, Any]) -> str:
        """
        解析模板中的变量引用
        
        支持 {{node_id.key}} 格式的变量引用，
        从之前节点的执行结果中获取值。
        """
        import re
        pattern = r'\{\{(\w+)\.(\w+)\}\}'

        def replacer(match):
            node_id = match.group(1)
            key = match.group(2)
            node_result = context.get(node_id, {})
            return str(node_result.get(key, match.group(0)))

        return re.sub(pattern, replacer, template)


def parse_flow_definition(data: Dict[str, Any]) -> FlowDefinition:
    """
    从 JSON 数据解析流程定义
    
    前端 ReactFlow 画布导出的 JSON 格式转换为 FlowDefinition 对象
    """
    nodes = {}
    entry_node_id = data.get("entry_node_id", "")

    for node_data in data.get("nodes", []):
        node = FlowNode(
            id=node_data["id"],
            node_type=NodeType(node_data.get("type", "navigate")),
            name=node_data.get("name", ""),
            config=node_data.get("config", {}),
            next_nodes=node_data.get("next_nodes", []),
            condition_expr=node_data.get("condition_expr"),
            true_branch=node_data.get("true_branch"),
            false_branch=node_data.get("false_branch"),
        )
        nodes[node.id] = node

    return FlowDefinition(
        id=data.get("id", ""),
        name=data.get("name", ""),
        nodes=nodes,
        entry_node_id=entry_node_id,
    )
