use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;
use rand::Rng;
use std::thread;
use tiny_http::{Server, Response};

use crate::device;

/// 获取设备唯一标识（持久化）
#[tauri::command]
pub async fn get_device_id(app: AppHandle) -> Result<String, String> {
    device::get_device_id(&app)
}

/// 生成客户端标识（每次登录会话唯一）
#[tauri::command]
pub async fn generate_client_id() -> Result<String, String> {
    Ok(Uuid::new_v4().to_string())
}

/// 生成随机 token（32位 hex）
#[tauri::command]
pub async fn generate_token() -> Result<String, String> {
    let mut rng = rand::thread_rng();
    let token: String = (0..32)
        .map(|_| format!("{:x}", rng.gen_range(0..16)))
        .collect();
    Ok(token)
}

/// 打开外部浏览器
#[tauri::command]
pub async fn open_login_browser(app: AppHandle, url: String) -> Result<(), String> {
    log::info!("打开登录浏览器: {}", url);
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("打开浏览器失败: {}", e))
}

/// 启动登录回调 HTTP 服务器
/// 监听本地随机端口，等待登录成功回调
#[tauri::command]
pub async fn start_login_callback_server(app: AppHandle) -> Result<u16, String> {
    let server = Server::http("127.0.0.1:0")
        .map_err(|e| format!("启动回调服务器失败: {}", e))?;

    let port = server.server_addr().to_ip().unwrap().port();
    log::info!("登录回调服务器启动在端口: {}", port);

    let app_handle = app.clone();
    thread::spawn(move || {
        // 只处理一个请求（登录回调）
        if let Ok(request) = server.recv() {
            let url = request.url().to_string();
            log::info!("收到登录回调: {}", url);

            // 解析回调参数
            let params: std::collections::HashMap<String, String> = url
                .split('?')
                .nth(1)
                .unwrap_or("")
                .split('&')
                .filter_map(|pair: &str| {
                    let mut parts = pair.splitn(2, '=');
                    Some((parts.next()?.to_string(), parts.next()?.to_string()))
                })
                .collect();

            let status = params.get("status").cloned().unwrap_or_default();
            let user_id = params.get("user_id").cloned().unwrap_or_default();
            let username = params.get("username").cloned().unwrap_or_default();

            // 返回成功响应给浏览器
            let response_body = r#"<!DOCTYPE html><html><body><h2>登录成功，请返回应用</h2><script>setTimeout(function(){window.close()},2000)</script></body></html>"#;
            let response = Response::from_string(response_body)
                .with_header(tiny_http::Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap());
            let _ = request.respond(response);

            // 通过 Tauri event 通知前端
            let payload = serde_json::json!({
                "status": status,
                "user_id": user_id,
                "username": username,
            });
            let _ = app_handle.emit("login-callback", payload);
        }
    });

    Ok(port)
}
