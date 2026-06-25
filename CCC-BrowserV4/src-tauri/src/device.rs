use tauri::AppHandle;
use tauri_plugin_store::StoreBuilder;
use uuid::Uuid;

/// 初始化设备标识存储
pub fn init_device_store(app: &AppHandle) -> Result<(), String> {
    let store = StoreBuilder::new(app, "device.json")
        .build()
        .map_err(|e| format!("初始化存储失败: {}", e))?;

    // 检查是否已有 device_id
    if store.get("device_id").is_none() {
        let device_id = Uuid::new_v4().to_string();
        store.set("device_id", serde_json::Value::String(device_id.clone()));
        store.save().map_err(|e| format!("保存设备标识失败: {}", e))?;
        log::info!("生成新设备标识: {}", device_id);
    }

    Ok(())
}

/// 获取设备标识
pub fn get_device_id(app: &AppHandle) -> Result<String, String> {
    let store = StoreBuilder::new(app, "device.json")
        .build()
        .map_err(|e| format!("初始化存储失败: {}", e))?;
    store
        .get("device_id")
        .and_then(|v: serde_json::Value| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "设备标识不存在".to_string())
}
