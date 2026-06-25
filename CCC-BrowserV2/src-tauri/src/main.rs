#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{
    App, AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem, Window,
};

#[derive(Serialize)]
struct SystemInfo {
    os: String,
    arch: String,
}

fn get_system_info() -> SystemInfo {
    let os = match std::env::consts::OS {
        "windows" => "Windows".to_string(),
        "macos" => "macOS".to_string(),
        "linux" => "Linux".to_string(),
        _ => "Unknown".to_string(),
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => "x86_64".to_string(),
        "aarch64" => "aarch64".to_string(),
        "arm" => "arm".to_string(),
        _ => "Unknown".to_string(),
    };
    SystemInfo { os, arch }
}

fn create_tray_menu() -> SystemTrayMenu {
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let hide = CustomMenuItem::new("hide".to_string(), "隐藏");
    let show = CustomMenuItem::new("show".to_string(), "显示");
    SystemTrayMenu::new()
        .add_item(hide)
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit)
}

fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "quit" => {
                app.exit(0);
            }
            "hide" => {
                let window = app.get_window("main").unwrap();
                window.hide().unwrap();
            }
            "show" => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            _ => {}
        },
        _ => {}
    }
}

#[tauri::command]
fn get_system_info_cmd() -> SystemInfo {
    get_system_info()
}

#[tauri::command]
fn minimize_window(window: Window) {
    window.minimize().unwrap();
}

#[tauri::command]
fn maximize_window(window: Window) {
    window.maximize().unwrap();
}

#[tauri::command]
fn toggle_maximize_window(window: Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
fn close_window(window: Window) {
    window.close().unwrap();
}

#[tauri::command]
fn hide_window(window: Window) {
    window.hide().unwrap();
}

#[tauri::command]
fn show_window(app: AppHandle) {
    let window = app.get_window("main").unwrap();
    window.show().unwrap();
    window.set_focus().unwrap();
}

fn main() {
    let tray = SystemTray::new().with_menu(create_tray_menu());

    let app = tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| handle_tray_event(app, event))
        .invoke_handler(tauri::generate_handler![
            get_system_info_cmd,
            minimize_window,
            maximize_window,
            toggle_maximize_window,
            close_window,
            hide_window,
            show_window
        ])
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.set_title("RPA自动化系统").unwrap();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });
}