import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import User, Task, TaskExecutionLog, Tenant, Device  # 确保模型被导入
from app.api import auth, tasks, tenants, devices
from app.ws.manager import ws_manager

# 主事件循环引用，供工作线程中的 WebSocket 广播使用
_main_loop: asyncio.AbstractEventLoop | None = None

app = FastAPI(title="CCC RPA API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(tenants.router)
app.include_router(devices.router)


@app.on_event("startup")
async def startup_capture_loop():
    """捕获主事件循环，供工作线程 WebSocket 广播使用"""
    global _main_loop
    _main_loop = asyncio.get_event_loop()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    from sqlalchemy import text
    from app.database import SessionLocal
    try:
        db = SessionLocal()
        # 添加 predecessor_id 列（如果不存在）
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN predecessor_id INT NULL"))
        except Exception:
            pass  # 列已存在
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN sub_tasks TEXT NULL"))
        except Exception:
            pass
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN province VARCHAR(64) NULL"))
        except Exception:
            pass
        # 添加 predecessor_tasks 列
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN predecessor_tasks TEXT NULL"))
        except Exception:
            pass
        # 添加 customer_name 列
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN customer_name VARCHAR(128) NULL"))
        except Exception:
            pass
        # 添加 handler_account 列
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN handler_account VARCHAR(64) NULL"))
        except Exception:
            pass
        # 添加 tenant_id 列
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN tenant_id VARCHAR(64) NULL"))
        except Exception:
            pass
        # 添加 device_id 列
        try:
            db.execute(text("ALTER TABLE tasks ADD COLUMN device_id VARCHAR(64) NULL"))
        except Exception:
            pass
        db.commit()
        db.close()
    except Exception as e:
        print(f"迁移警告: {e}")

    # 插入初始 mock 任务数据
    db = SessionLocal()
    try:
        count = db.query(Task).count()
        if count == 0:
            mock_tasks = [
                Task(name="企业信息采集", status="pending", customer_name="默认客户", remark="定期采集企业工商信息变更"),
                Task(name="信用数据同步", status="completed", last_result="success", remark="同步信用中国最新数据"),
                Task(name="司法公告监控", status="running", remark="监控裁判文书网新公告"),
                Task(name="站点可用性检测", status="failed", last_result="failed", remark="检测目标站点是否可访问"),
            ]
            db.add_all(mock_tasks)
            db.commit()
    finally:
        db.close()

    # 插入租户种子数据
    db = SessionLocal()
    try:
        if db.query(Tenant).count() == 0:
            seed_tenants = [
                Tenant(tenant_code="1", name="广东分公司"),
                Tenant(tenant_code="2", name="浙江分公司"),
                Tenant(tenant_code="3", name="江苏分公司"),
            ]
            db.add_all(seed_tenants)
            db.commit()
            print("已插入 3 条租户种子数据")
    finally:
        db.close()

    # 插入设备种子数据
    db = SessionLocal()
    try:
        if db.query(Device).count() == 0:
            seed_devices = [
                Device(device_code="device-001", name="本地设备-A"),
                Device(device_code="device-002", name="本地设备-B"),
            ]
            db.add_all(seed_devices)
            db.commit()
            print("已插入 2 条设备种子数据")
    finally:
        db.close()

    # Playwright 采用延迟初始化，在实际执行任务时由后台线程启动
    # 避免 Sync API 与 asyncio 事件循环冲突


@app.on_event("shutdown")
def shutdown():
    from app.browser.session_manager import BrowserSessionManager
    BrowserSessionManager.close_all()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ccc-rpa-api"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except Exception:
        ws_manager.disconnect(websocket)
