import threading
import json
import time
import asyncio
import random
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


def _broadcast_done(future):
    """广播完成回调，检查并记录异常"""
    try:
        exc = future.exception(timeout=0)
        if exc:
            logger.error(f"广播协程异常: {exc}")
    except Exception as e:
        logger.error(f"广播结果检查失败: {e}")


def _broadcast(message: dict):
    """线程安全的 WebSocket 广播"""
    try:
        from app.main import _main_loop
        if _main_loop and _main_loop.is_running():
            future = asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast(message), _main_loop
            )
            # 添加回调检查异常，不阻塞工作线程
            future.add_done_callback(_broadcast_done)
        else:
            logger.warning(f"主事件循环不可用，无法广播消息: {message.get('type')}")
    except Exception as e:
        logger.error(f"广播调度失败: {e}")


def _pw(fn):
    """简写：在 Playwright 工作线程中执行函数，带浏览器存活检查"""
    if not BrowserSessionManager.check_alive():
        raise RuntimeError("浏览器已关闭，需要恢复会话")
    return BrowserSessionManager.run(fn)


def _recover_checkpoint(province: str, context, page, task_id: int, step: str):
    """检查浏览器存活状态，如已崩溃则恢复会话并返回新的 context 和 page"""
    if BrowserSessionManager.check_alive():
        # 浏览器存活，记录当前页面状态用于调试
        try:
            pages = context.pages if hasattr(context, 'pages') else []
            for p in pages:
                logger.info(f"[recover] step={step}, 当前页面 URL: {p.url}")
            if page:
                page.screenshot(path="/tmp/recover_checkpoint.png")
                logger.debug("[recover] 已保存检查点截图到 /tmp/recover_checkpoint.png")
        except Exception as e:
            logger.warning(f"[recover] 页面状态检查失败: {e}")
        return context, page
    logger.warning("浏览器已关闭，尝试恢复...")
    _broadcast({"type": "execution_progress", "data": {
        "taskId": task_id, "step": step,
        "message": "浏览器异常，正在恢复...",
    }})
    BrowserSessionManager.recover(province)
    context = BrowserSessionManager.get_context(province)
    page = _pw(lambda: context.new_page())
    _pw(lambda: page.goto(
        SiteAutomation.get_province_url(province),
        wait_until="domcontentloaded", timeout=30000,
    ))
    logger.info("浏览器恢复完成，已重新打开页面")
    return context, page


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
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "checking_login",
            "message": "正在初始化浏览器...",
        }})
        context = BrowserSessionManager.get_context(province)

        # 2. 检查登录状态（PW 线程）
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "checking_login",
            "message": "正在检查登录状态...",
        }})
        is_logged_in = _pw(lambda: SiteAutomation.check_login_status(context, province))

        # 3. 若未登录，执行扫码登录
        if not is_logged_in:
            _broadcast({"type": "execution_progress", "data": {
                "taskId": task_id, "step": "qr_scanning",
                "message": "正在打开登录页面...",
            }})
            page = _pw(lambda: SiteAutomation.navigate_to_unit_login(context, province))

            # 截取二维码（PW 线程）
            time.sleep(2)  # 等待页面加载
            qr_image = _pw(lambda: SiteAutomation.capture_qr_code(page))

            # 推送二维码到前端
            _broadcast({"type": "qr_code", "data": {"taskId": task_id, "qrImage": qr_image}})
            _broadcast({"type": "execution_progress", "data": {
                "taskId": task_id, "step": "qr_scanning",
                "message": "请使用交管12123 APP扫描二维码",
            }})

            # 等待用户扫码（在独立线程中阻塞，不占用 PW 线程）
            try:
                waiter_data = _wait_for_user(task_id, timeout=120)
                if waiter_data and waiter_data.get("cancelled"):
                    raise Exception("用户取消执行")
            except TimeoutError:
                raise Exception("扫码等待超时")

            # 保存登录状态（PW 线程）
            BrowserSessionManager.save_state(province)
            _broadcast({"type": "login_result", "data": {
                "taskId": task_id, "success": True, "message": "登录成功",
            }})
        else:
            page = _pw(lambda: context.new_page())
            _pw(lambda: page.goto(
                SiteAutomation.get_province_url(province),
                wait_until="networkidle", timeout=30000,
            ))

        # 4. 抓取单位列表（PW 线程）
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "waiting_company",
            "message": "正在获取单位列表...",
        }})
        try:
            companies = _pw(lambda: SiteAutomation.scrape_company_list(page))
        except Exception as e:
            error_msg = f"抓取单位列表失败: {str(e)}"
            logger.error(error_msg)
            _broadcast({"type": "execution_error", "data": {"taskId": task_id, "message": error_msg}})
            raise

        # 推送单位列表
        _broadcast({"type": "company_list", "data": {"taskId": task_id, "companies": companies}})
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "waiting_company",
            "message": "请选择要办理业务的单位",
        }})

        # 等待用户选择单位（在独立线程中阻塞）
        try:
            waiter_data = _wait_for_user(task_id, timeout=300)
            if waiter_data and waiter_data.get("cancelled"):
                raise Exception("用户取消执行")
            company_id = waiter_data.get("companyId", "0") if waiter_data else "0"
            company_name = waiter_data.get("companyName", "") if waiter_data else ""
        except TimeoutError:
            raise Exception("选择单位等待超时")

        # 5. 选择单位（PW 线程）
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "executing",
            "message": "正在登录单位账户...",
        }})
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "executing",
            "message": "正在切换到目标单位...",
        }})
        context, page = _recover_checkpoint(province, context, page, task_id, "executing")
        success = _pw(lambda: SiteAutomation.select_company(page, company_id, company_name))
        if not success:
            raise Exception(f"选择单位失败: company_id={company_id}, company_name={company_name}")

        # 6. 进入保活循环
        # 为保活循环注册可取消的信号事件
        ExecutionWaiter.register_check(task_id)
        _broadcast({"type": "execution_progress", "data": {
            "taskId": task_id, "step": "keeping_alive",
            "message": "页面保活中，等待业务触发...",
        }})

        max_keep_alive_hours = 8  # 最大保活时长（小时）
        keep_alive_start = time.time()
        business_executed = []

        while True:
            # 检查浏览器是否存活
            context, page = _recover_checkpoint(province, context, page, task_id, "keeping_alive")

            # 检查是否超时
            elapsed_hours = (time.time() - keep_alive_start) / 3600
            if elapsed_hours >= max_keep_alive_hours:
                logger.info(f"保活达到最大时长 {max_keep_alive_hours} 小时，任务完成")
                break

            # 检查取消信号（非阻塞）
            try:
                cancel_data = ExecutionWaiter.check_signal(task_id)
                if cancel_data and cancel_data.get("cancelled"):
                    logger.info(f"用户取消执行 task_id={task_id}")
                    break
            except Exception:
                pass

            # 执行一次保活操作（在当前业务页面执行，不跳转）
            interval = _pw(lambda: SiteAutomation.keep_alive_on_page(page))

            # 检查是否有待处理业务
            pending = _pw(lambda: SiteAutomation.check_pending_business(page))

            if pending:
                # 构建 context，传递 broadcast_fn 和 task_id 给子任务
                context = {
                    "broadcast_fn": _broadcast,
                    "task_id": task_id,
                    "sub_tasks": sub_tasks,
                }
                for biz in pending:
                    biz_type = biz.get("type", "")

                    # 用用户配置的 sub_tasks 过滤（如果用户配置了的话）
                    if sub_tasks and biz_type not in sub_tasks:
                        matched = any(
                            st in biz_type or biz_type in st for st in sub_tasks
                        )
                        if not matched:
                            logger.info(f"[executor] 跳过未配置的子任务: {biz_type}")
                            continue

                    if biz_type in business_executed:
                        continue

                    _broadcast({"type": "execution_progress", "data": {
                        "taskId": task_id, "step": "executing",
                        "message": f"检测到待处理业务: {biz_type}，正在处理...",
                    }})
                    result = _pw(
                        lambda bt=biz_type: SiteAutomation.execute_sub_task(
                            page, bt, context
                        )
                    )
                    business_executed.append(biz_type)

                    if result and result.get("success"):
                        logger.info(
                            f"[executor] 子任务 {biz_type} 执行成功: "
                            f"{result.get('message')}"
                        )
                    else:
                        logger.warning(
                            f"[executor] 子任务 {biz_type} 执行失败: "
                            f"{result.get('message')}"
                        )

                    _broadcast({"type": "execution_progress", "data": {
                        "taskId": task_id, "step": "keeping_alive",
                        "message": f"业务 {biz_type} 处理完成，继续保活...",
                    }})

                    # 子任务执行后冷却间隔，控制 PPM
                    cooldown = random.uniform(30, 90)
                    logger.info(f"[executor] 子任务后冷却 {cooldown:.0f}s")
                    time.sleep(cooldown)

                # 处理完业务后不跳转回首页，停留在当前业务页面继续保活
                logger.info("业务处理完成，停留在当前业务页面继续保活")
            else:
                logger.debug(f"保活循环: 无待处理业务, 等待 {interval:.0f}s")

            # 等待保活间隔（分段等待，便于响应取消信号）
            wait_end = time.time() + interval
            cancelled_during_wait = False
            while time.time() < wait_end:
                try:
                    cancel_data = ExecutionWaiter.check_signal(task_id)
                    if cancel_data and cancel_data.get("cancelled"):
                        cancelled_during_wait = True
                        break
                except Exception:
                    pass
                time.sleep(min(5, max(0.1, wait_end - time.time())))
            if cancelled_during_wait:
                break

        # 8. 完成任务
        _pw(lambda: page.close())
        finished_at = datetime.now()
        task.status = "completed"
        task.last_executed_at = finished_at
        task.last_result = "success"
        task.next_executed_at = finished_at + timedelta(days=1)
        log.finished_at = finished_at
        log.status = "completed"
        log.result_message = f"执行成功，处理业务: {', '.join(business_executed) if business_executed else '无'}"
        db.commit()

        _broadcast({"type": "task_status_update", "data": {
            "taskId": task_id, "status": "completed",
            "lastResult": "success",
            "lastExecutedAt": finished_at.strftime("%Y-%m-%d %H:%M:%S"),
        }})

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

        _broadcast({"type": "execution_error", "data": {"taskId": task_id, "message": str(e)}})
        _broadcast({"type": "task_status_update", "data": {
            "taskId": task_id, "status": "failed",
            "lastResult": "failed",
            "lastExecutedAt": finished_at.strftime("%Y-%m-%d %H:%M:%S"),
        }})
    finally:
        ExecutionWaiter.cleanup(task_id)
        db.close()


def submit_task_execution(task_id: int):
    _executor.submit(_run_task_logic, task_id)
