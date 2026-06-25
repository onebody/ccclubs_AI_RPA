/// Tauri 命令集
/// 替代原 Electron IPC handlers，前端通过 @tauri-apps/api/core 的 invoke() 调用
use crate::python_bridge::PythonBridge;
use serde_json::Value;
use tauri::command;

// ============================================================
// 辅助宏：获取 PythonBridge 全局锁
// ============================================================
macro_rules! with_bridge {
    ($body:expr) => {{
        let bridge = PythonBridge::global()
            .lock()
            .map_err(|_| "Python 桥接锁获取失败".to_string())?;
        $body(bridge)
    }};
}

// ============================================================
// 浏览器控制 Commands
// ============================================================

/// 启动浏览器会话
#[command]
pub async fn browser_launch(url: Option<String>, headless: Option<bool>) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    if let Some(u) = url {
        body.insert("url".into(), Value::String(u));
    }
    if let Some(h) = headless {
        body.insert("headless".into(), Value::Bool(h));
    }
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("POST", "/api/v1/browser/launch", Some(Value::Object(body)))
            .await
    })
}

/// 关闭浏览器会话
#[command]
pub async fn browser_close(session_id: String) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            &format!("/api/v1/browser/close/{}", session_id),
            None,
        )
        .await
    })
}

/// 获取浏览器会话状态
#[command]
pub async fn browser_status(session_id: String) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "GET",
            &format!("/api/v1/browser/status/{}", session_id),
            None,
        )
        .await
    })
}

// ============================================================
// 登录录制 Commands
// ============================================================

/// 开始录制登录流程
#[command]
pub async fn login_start_recording(
    session_id: String,
    target_url: String,
) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    body.insert("target_url".into(), Value::String(target_url));
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/login/start-recording",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 停止录制并保存登录态
#[command]
pub async fn login_stop_recording(session_id: String) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/login/stop-recording",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 捕获二维码截图
#[command]
pub async fn login_capture_qr(
    session_id: String,
    qr_selector: String,
) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    body.insert("qr_selector".into(), Value::String(qr_selector));
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/login/capture-qr",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 检测登录状态
#[command]
pub async fn login_check_status(
    session_id: String,
    success_selector: Option<String>,
    success_url_pattern: Option<String>,
) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    if let Some(s) = success_selector {
        body.insert("success_selector".into(), Value::String(s));
    }
    if let Some(p) = success_url_pattern {
        body.insert("success_url_pattern".into(), Value::String(p));
    }
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/login/check-login-status",
            Some(Value::Object(body)),
        )
        .await
    })
}

// ============================================================
// 数据提取 Commands
// ============================================================

/// 通过 CSS 选择器提取页面数据
#[command]
pub async fn extract_selector(
    session_id: String,
    selector: String,
    attribute: Option<String>,
) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    body.insert("selector".into(), Value::String(selector));
    if let Some(a) = attribute {
        body.insert("attribute".into(), Value::String(a));
    }
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/extract/extract/selector",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 通过自定义 JS 脚本提取数据
#[command]
pub async fn extract_script(session_id: String, script: String) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    body.insert("script".into(), Value::String(script));
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/extract/extract/script",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 提取数据并导出为 JSON
#[command]
pub async fn extract_export_json(
    session_id: String,
    selector: String,
    filename: Option<String>,
) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    body.insert("selector".into(), Value::String(selector));
    if let Some(f) = filename {
        body.insert("filename".into(), Value::String(f));
    }
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/extract/export/json",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 页面截图
#[command]
pub async fn extract_screenshot(
    session_id: String,
    full_page: Option<bool>,
) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("session_id".into(), Value::String(session_id));
    if let Some(f) = full_page {
        body.insert("full_page".into(), Value::Bool(f));
    }
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/extract/screenshot",
            Some(Value::Object(body)),
        )
        .await
    })
}

// ============================================================
// 任务管理 Commands
// ============================================================

/// 创建任务
#[command]
pub async fn task_create(config: Value) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("POST", "/api/v1/tasks", Some(config)).await
    })
}

/// 执行任务
#[command]
pub async fn task_execute(task_id: String, session_id: String) -> Result<Value, String> {
    let mut body = serde_json::Map::new();
    body.insert("task_id".into(), Value::String(task_id));
    body.insert("session_id".into(), Value::String(session_id));
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/tasks/execute",
            Some(Value::Object(body)),
        )
        .await
    })
}

/// 获取任务列表
#[command]
pub async fn task_list() -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("GET", "/api/v1/tasks", None).await
    })
}

/// 获取任务执行状态
#[command]
pub async fn task_status(instance_id: String) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "GET",
            &format!("/api/v1/tasks/instance/{}/status", instance_id),
            None,
        )
        .await
    })
}

// ============================================================
// 系统 Commands
// ============================================================

/// 健康检查
#[command]
pub async fn system_health() -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("GET", "/api/v1/health", None).await
    })
}

// ============================================================
// 调度器与流程编排 Commands
// ============================================================

/// 获取调度器状态
#[command]
pub async fn schedule_get_status() -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("GET", "/api/v1/schedule/scheduler/status", None)
            .await
    })
}

/// 启动调度器
#[command]
pub async fn schedule_start() -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("POST", "/api/v1/schedule/scheduler/start", None)
            .await
    })
}

/// 停止调度器
#[command]
pub async fn schedule_stop() -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("POST", "/api/v1/schedule/scheduler/stop", None)
            .await
    })
}

/// 提交任务到调度队列
#[command]
pub async fn schedule_submit(params: Value) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("POST", "/api/v1/schedule/scheduler/submit", Some(params))
            .await
    })
}

/// 执行 DAG 流程
#[command]
pub async fn schedule_execute_flow(params: Value) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request("POST", "/api/v1/schedule/flow/execute", Some(params))
            .await
    })
}

/// 验证 DAG 流程
#[command]
pub async fn schedule_validate_flow(flow_definition: Value) -> Result<Value, String> {
    with_bridge!(|b: std::sync::MutexGuard<'_, PythonBridge>| {
        b.request(
            "POST",
            "/api/v1/schedule/flow/validate",
            Some(flow_definition),
        )
        .await
    })
}
