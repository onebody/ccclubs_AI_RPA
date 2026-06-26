import threading
import json
import time
import asyncio
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.task import Task
from app.models.execution_log import TaskExecutionLog
from app.ws.manager import ws_manager
from app.browser.session_manager import BrowserSessionManager
from app.browser.site_automation import SiteAutomation
from app.browser.waiter import ExecutionWaiter

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="task-exec")
_wait_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="wait-block")


def _broadcast(msg_type: str, data: dict):
    """广播 WebSocket 消息"""
    message = {"type": msg_type, "data": data}
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(ws_manager.broadcast(message), loop)
        else:
            loop.run_until_complete(ws_manager.broadcast(message))
    except RuntimeError:
        try:
            asyncio.run(ws_manager.broadcast(message))
        except Exception:
            pass


def _pw(fn):
    """简写：在 Playwright 工作线程中执行函数"""
    return BrowserSessionManager.run(fn)


def _wait_for_user(task_id: int, timeout: int = 300):
    """在独立线程中执行阻塞等待，避免阻塞 Playwright 工作线程"""
    future = _wait_executor.submit(ExecutionWaiter.wait_for, task_id, timeout)
    return future.result()


def _run_task_logic(task_id: int):
    db: Session = SessionLocal()
    started_at = datetime.now()
    try:
        task = db.query(Task).filter(Task.id == task_id, Task.deleted == False).first()
        if not task:
            return

        log = TaskExecutionLog(
            task_id=task_id,
            task_name=task.name,
            started_at=started_at,
            status="running",
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        province = task.province or "浙江"
        sub_tasks = json.loads(task.sub_tasks) if task.sub_tasks else []

        # 1. 获取浏览器上下文（PW 线程）
        _broadcast("execution_progress", {
            "taskId": task_id, "step": "checking_login",
            "message": "正在初始化浏览器...",
        })
        context = BrowserSessionManager.get_context(province)

        # 2. 检查登录状态（PW 线程）
        _broadcast("execution_progress", {
            "taskId": task_id, "step": "checking_login",
            "message": "正在检查登录状态...",
        })
        is_logged_in = _pw(lambda: SiteAutomation.check_login_status(context, province))

        # 3. 若未登录，执行扫码登录
        if not is_logged_in:
            _broadcast("execution_progress", {
                "taskId": task_id, "step": "qr_scanning",
                "message": "正在打开登录页面...",
            })
            page = _pw(lambda: SiteAutomation.navigate_to_unit_login(context, province))

            # 截取二维码（PW 线程）
            time.sleep(2)  # 等待页面加载
            qr_image = _pw(lambda: SiteAutomation.capture_qr_code(page))

            # 推送二维码到前端
            _broadcast("qr_code", {"taskId": task_id, "qrImage": qr_image})
            _broadcast("execution_progress", {
                "taskId": task_id, "step": "qr_scanning",
                "message": "请使用交管12123 APP扫描二维码",
            })

            # 等待用户扫码（在独立线程中阻塞，不占用 PW 线程）
            try:
                waiter_data = _wait_for_user(task_id, timeout=120)
                if waiter_data and waiter_data.get("cancelled"):
                    raise Exception("用户取消执行")
            except TimeoutError:
                raise Exception("扫码等待超时")

            # 保存登录状态（PW 线程）
            BrowserSessionManager.save_state(province)
            _broadcast("login_result", {
                "taskId": task_id, "success": True, "message": "登录成功",
            })
        else:
            page = _pw(lambda: context.new_page())
            _pw(lambda: page.goto(
                SiteAutomation.get_province_url(province),
                wait_until="networkidle", timeout=30000,
            ))

        # 4. 抓取单位列表（PW 线程）
        _broadcast("execution_progress", {
            "taskId": task_id, "step": "waiting_company",
            "message": "正在获取单位列表...",
        })
        try:
            companies = _pw(lambda: SiteAutomation.scrape_company_list(page))
        except Exception as e:
            error_msg = f"抓取单位列表失败: {str(e)}"
            logger.error(error_msg)
            _broadcast("execution_error", {"taskId": task_id, "message": error_msg})
            raise

        # 推送单位列表
        _broadcast("company_list", {"taskId": task_id, "companies": companies})
        _broadcast("execution_progress", {
            "taskId": task_id, "step": "waiting_company",
            "message": "请选择要办理业务的单位",
        })

        # 等待用户选择单位（在独立线程中阻塞）
        try:
            waiter_data = _wait_for_user(task_id, timeout=300)
            if waiter_data and waiter_data.get("cancelled"):
                raise Exception("用户取消执行")
            company_id = waiter_data.get("companyId", "0") if waiter_data else "0"
        except TimeoutError:
            raise Exception("选择单位等待超时")

        # 5. 选择单位（PW 线程）
        _broadcast("execution_progress", {
            "taskId": task_id, "step": "executing",
            "message": "正在切换到目标单位...",
        })
        _pw(lambda: SiteAutomation.select_company(page, company_id))

        # 6. 执行子任务（PW 线程）
        for sub_task in sub_tasks:
            _broadcast("execution_progress", {
                "taskId": task_id, "step": "executing",
                "message": f"正在执行: {sub_task}",
            })
            result = _pw(lambda st=sub_task: SiteAutomation.execute_sub_task(page, st, {}))
            logger.info(f"子任务 {sub_task} 结果: {result}")

        # 7. 完成（PW 线程）
        _pw(lambda: page.close())
        finished_at = datetime.now()
        task.status = "completed"
        task.last_executed_at = finished_at
        task.last_result = "success"
        task.next_executed_at = finished_at + timedelta(days=1)
        log.finished_at = finished_at
        log.status = "completed"
        log.result_message = "执行成功"
        db.commit()

        _broadcast("task_status_update", {
            "taskId": task_id, "status": "completed",
            "lastResult": "success",
            "lastExecutedAt": finished_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

    except Exception as e:
        logger.error(f"任务执行异常: {e}", exc_info=True)
        finished_at = datetime.now()
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "failed"
                task.last_executed_at = finished_at
                task.last_result = "failed"
                db.commit()
        except Exception:
            pass
        try:
            log.finished_at = finished_at
            log.status = "failed"
            log.result_message = f"执行异常: {str(e)}"
            db.commit()
        except Exception:
            pass

        _broadcast("execution_error", {"taskId": task_id, "message": str(e)})
        _broadcast("task_status_update", {
            "taskId": task_id, "status": "failed",
            "lastResult": "failed",
            "lastExecutedAt": finished_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    finally:
        ExecutionWaiter.cleanup(task_id)
        db.close()


def submit_task_execution(task_id: int):
    _executor.submit(_run_task_logic, task_id)
