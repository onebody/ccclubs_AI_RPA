/// Python 后端子进程桥接管理器
/// 负责启动/停止 Python FastAPI 后端，并提供 HTTP 请求转发能力
use once_cell::sync::Lazy;
use reqwest::Client;
use serde_json::Value;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

/// Python 后端配置
pub struct PythonBridgeConfig {
    pub python_path: String,
    pub module_path: String,
    pub port: u16,
    pub host: String,
}

impl Default for PythonBridgeConfig {
    fn default() -> Self {
        Self {
            python_path: "python3".to_string(),
            module_path: "app.main".to_string(),
            port: 8900,
            host: "127.0.0.1".to_string(),
        }
    }
}

/// Python 后端桥接管理器
pub struct PythonBridge {
    process: Option<Child>,
    config: PythonBridgeConfig,
    is_ready: bool,
    client: Client,
}

/// 全局 Python 桥接实例（线程安全）
static PYTHON_BRIDGE: Lazy<Mutex<PythonBridge>> = Lazy::new(|| {
    Mutex::new(PythonBridge {
        process: None,
        config: PythonBridgeConfig::default(),
        is_ready: false,
        client: Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap(),
    })
});

impl PythonBridge {
    /// 获取全局实例的锁（供 commands.rs 调用）
    pub fn global() -> &'static Mutex<PythonBridge> {
        &PYTHON_BRIDGE
    }

    /// 启动 Python FastAPI 后端子进程
    pub fn start(&mut self) -> Result<(), String> {
        // 获取 backend 目录绝对路径
        let backend_dir = self.get_backend_dir();
        log::info!("[PythonBridge] 后端目录: {}", backend_dir);

        let args = vec![
            "-m".to_string(),
            "uvicorn".to_string(),
            format!("{}:app", self.config.module_path),
            "--host".to_string(),
            self.config.host.clone(),
            "--port".to_string(),
            self.config.port.to_string(),
            "--reload".to_string(),
        ];

        log::info!(
            "[PythonBridge] 启动: {} {}",
            self.config.python_path,
            args.join(" ")
        );

        let child = Command::new(&self.config.python_path)
            .args(&args)
            .current_dir(&backend_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动 Python 进程失败: {}", e))?;

        self.process = Some(child);
        log::info!("[PythonBridge] Python 进程已启动");

        // 轮询等待后端就绪（同步方式，在 setup 闭包中通过 tokio::task::spawn_blocking 调用）
        self.wait_for_ready_sync(30)?;

        Ok(())
    }

    /// 停止 Python 后端子进程
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.process.take() {
            log::info!("[PythonBridge] 正在停止 Python 后端...");
            let _ = child.kill();
            let _ = child.wait();
            self.is_ready = false;
            log::info!("[PythonBridge] Python 后端已停止");
        }
        Ok(())
    }

    /// 向后端发送 HTTP 请求（异步）
    pub async fn request(
        &self,
        method: &str,
        path: &str,
        body: Option<Value>,
    ) -> Result<Value, String> {
        if !self.is_ready {
            return Err("Python 后端尚未就绪".to_string());
        }

        let url = format!(
            "http://{}:{}{}",
            self.config.host, self.config.port, path
        );

        let response = match method.to_uppercase().as_str() {
            "GET" => self
                .client
                .get(&url)
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?,
            "POST" => self
                .client
                .post(&url)
                .json(&body.unwrap_or(Value::Null))
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?,
            "PUT" => self
                .client
                .put(&url)
                .json(&body.unwrap_or(Value::Null))
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?,
            "DELETE" => self
                .client
                .delete(&url)
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?,
            _ => return Err(format!("不支持的 HTTP 方法: {}", method)),
        };

        let status = response.status();
        let text = response
            .text()
            .await
            .map_err(|e| format!("读取响应失败: {}", e))?;

        if status.is_success() {
            serde_json::from_str(&text).unwrap_or(Value::String(text))
                .into();
            Ok(serde_json::from_str(&text).unwrap_or(Value::String(text)))
        } else {
            Err(format!("HTTP {}: {}", status.as_u16(), text))
        }
    }

    /// 获取 backend 目录的绝对路径
    fn get_backend_dir(&self) -> String {
        // Tauri 开发模式：从 src-tauri 目录向上一级找到项目根目录
        // 生产模式：从 app bundle 资源目录中查找
        #[cfg(debug_assertions)]
        {
            let manifest_dir = env!("CARGO_MANIFEST_DIR");
            let project_root = std::path::Path::new(manifest_dir).parent().unwrap();
            project_root
                .join("backend")
                .to_string_lossy()
                .to_string()
        }
        #[cfg(not(debug_assertions))]
        {
            // 生产模式：backend 放在 app bundle Resources 目录中
            let exe_dir = std::env::current_exe()
                .unwrap()
                .parent()
                .unwrap()
                .to_path_buf();
            exe_dir.join("backend").to_string_lossy().to_string()
        }
    }

    /// 同步轮询等待后端就绪（用于 setup 阶段）
    fn wait_for_ready_sync(&mut self, timeout_secs: u64) -> Result<(), String> {
        let health_url = format!(
            "http://{}:{}/api/v1/health",
            self.config.host, self.config.port
        );
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .unwrap();

        let start = std::time::Instant::now();
        while start.elapsed().as_secs() < timeout_secs {
            match client.get(&health_url).send() {
                Ok(resp) if resp.status().is_success() => {
                    self.is_ready = true;
                    log::info!("[PythonBridge] 后端健康检查通过，已就绪");
                    return Ok(());
                }
                _ => {}
            }
            std::thread::sleep(Duration::from_secs(1));
        }

        Err(format!(
            "Python 后端在 {}s 内未就绪",
            timeout_secs
        ))
    }
}

impl Drop for PythonBridge {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
