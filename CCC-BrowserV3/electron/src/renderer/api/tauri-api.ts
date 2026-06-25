/**
 * Tauri IPC 通信 API 封装
 * 替代原 Electron preload/contextBridge 方案
 * 前端通过 invoke() 调用 Rust 后端的 Tauri Commands
 */
import { invoke } from '@tauri-apps/api/core';

/**
 * 浏览器控制 API
 */
export const browserApi = {
  /** 启动浏览器会话 */
  launch: (options: { url?: string; headless?: boolean }) =>
    invoke('browser_launch', options),
  /** 关闭浏览器会话 */
  close: (sessionId: string) =>
    invoke('browser_close', { sessionId }),
  /** 获取会话状态 */
  status: (sessionId: string) =>
    invoke('browser_status', { sessionId }),
};

/**
 * 登录录制 API
 */
export const loginApi = {
  /** 开始录制登录流程 */
  startRecording: (params: { sessionId: string; targetUrl: string }) =>
    invoke('login_start_recording', {
      sessionId: params.sessionId,
      targetUrl: params.targetUrl,
    }),
  /** 停止录制并保存登录态 */
  stopRecording: (params: { sessionId: string }) =>
    invoke('login_stop_recording', { sessionId: params.sessionId }),
  /** 捕获二维码截图 */
  captureQr: (params: { sessionId: string; qrSelector: string }) =>
    invoke('login_capture_qr', {
      sessionId: params.sessionId,
      qrSelector: params.qrSelector,
    }),
  /** 检测登录状态 */
  checkStatus: (params: {
    sessionId: string;
    successSelector?: string;
    successUrlPattern?: string;
  }) =>
    invoke('login_check_status', params),
};

/**
 * 数据提取 API
 */
export const extractApi = {
  /** 通过 CSS 选择器提取页面数据 */
  selector: (params: { sessionId: string; selector: string; attribute?: string }) =>
    invoke('extract_selector', params),
  /** 通过自定义 JS 脚本提取数据 */
  script: (params: { sessionId: string; script: string }) =>
    invoke('extract_script', params),
  /** 提取数据并导出为 JSON */
  exportJson: (params: { sessionId: string; selector: string; filename?: string }) =>
    invoke('extract_export_json', params),
  /** 页面截图 */
  screenshot: (params: { sessionId: string; fullPage?: boolean }) =>
    invoke('extract_screenshot', params),
};

/**
 * 任务管理 API
 */
export const taskApi = {
  /** 创建任务 */
  create: (config: any) =>
    invoke('task_create', { config }),
  /** 执行任务 */
  execute: (params: { taskId: string; sessionId: string }) =>
    invoke('task_execute', params),
  /** 获取任务列表 */
  list: () =>
    invoke('task_list'),
  /** 获取任务执行状态 */
  status: (instanceId: string) =>
    invoke('task_status', { instanceId }),
};

/**
 * 系统 API
 */
export const systemApi = {
  /** 健康检查 */
  health: () =>
    invoke('system_health'),
};

/**
 * 调度器与流程编排 API
 */
export const scheduleApi = {
  /** 获取调度器状态 */
  getStatus: () =>
    invoke('schedule_get_status'),
  /** 启动调度器 */
  start: () =>
    invoke('schedule_start'),
  /** 停止调度器 */
  stop: () =>
    invoke('schedule_stop'),
  /** 提交任务到调度队列 */
  submit: (params: any) =>
    invoke('schedule_submit', { params }),
  /** 执行 DAG 流程 */
  executeFlow: (params: any) =>
    invoke('schedule_execute_flow', { params }),
  /** 验证 DAG 流程 */
  validateFlow: (flowDefinition: any) =>
    invoke('schedule_validate_flow', { flowDefinition }),
};
