#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod device;


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_device_id,
            commands::generate_client_id,
            commands::generate_token,
            commands::open_login_browser,
            commands::start_login_callback_server,
        ])
        .setup(|app| {
            // 初始化设备标识
            let app_handle = app.handle().clone();
            device::init_device_store(&app_handle)?;
            log::info!("CCC-Browser V4 启动完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
