// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod python_bridge;

use python_bridge::PythonBridge;

fn main() {
    env_logger::init();

    tauri::Builder::default()
        // Shell 插件（用于系统操作）
        .plugin(tauri_plugin_shell::init())
        // 应用初始化：启动 Python 后端
        .setup(|_app| {
            // 在后台线程启动 Python 后端，避免阻塞 Tauri 主线程
            std::thread::spawn(|| {
                let mut bridge = PythonBridge::global().lock().unwrap();
                match bridge.start() {
                    Ok(_) => log::info!("[主进程] Python 后端启动成功"),
                    Err(e) => log::error!("[主进程] Python 后端启动失败: {}", e),
                }
            });
            Ok(())
        })
        // 注册所有 Tauri Commands（替代 Electron ipcMain.handle）
        .invoke_handler(tauri::generate_handler![
            // 浏览器控制
            commands::browser_launch,
            commands::browser_close,
            commands::browser_status,
            // 登录录制
            commands::login_start_recording,
            commands::login_stop_recording,
            commands::login_capture_qr,
            commands::login_check_status,
            // 数据提取
            commands::extract_selector,
            commands::extract_script,
            commands::extract_export_json,
            commands::extract_screenshot,
            // 任务管理
            commands::task_create,
            commands::task_execute,
            commands::task_list,
            commands::task_status,
            // 系统
            commands::system_health,
            // 调度器与流程编排
            commands::schedule_get_status,
            commands::schedule_start,
            commands::schedule_stop,
            commands::schedule_submit,
            commands::schedule_execute_flow,
            commands::schedule_validate_flow,
        ])
        // 应用退出时清理 Python 后端
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let mut bridge = PythonBridge::global().lock().unwrap();
                let _ = bridge.stop();
            }
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
