import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ChromeManager } from './ChromeManager';
import { CdpBrowserService } from './CdpBrowserService';
import { generateFingerprint, buildRequestHeaders } from './AntiDetection';

let mainWindow: BrowserWindow | null = null;
let chromeManager: ChromeManager | null = null;
let browserService: CdpBrowserService | null = null;
let wsEndpoint: string | null = null;

// 等待Chrome启动并获取WebSocket端点
async function waitForChrome(port: number): Promise<string> {
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const response = await fetch(`http://localhost:${port}/json/version`);
      const data = await response.json();
      if (data.webSocketDebuggerUrl) {
        return data.webSocketDebuggerUrl;
      }
    } catch (e) {
      // 继续等待
    }
  }
  throw new Error('Failed to connect to Chrome');
}

// 创建主窗口
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
  });

  // 加载渲染进程HTML（从dist/renderer加载）
  const rendererPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(rendererPath);
}

// 初始化应用
async function initApp(): Promise<void> {
  console.log('Initializing desktop browser...');

  // 1. 启动系统 Chrome
  chromeManager = new ChromeManager(9222);
  await chromeManager.start();
  console.log('Chrome started');

  // 2. 获取 WebSocket 端点
  wsEndpoint = await waitForChrome(chromeManager.getPort());
  console.log('WebSocket endpoint:', wsEndpoint);

  // 3. 生成浏览器指纹
  const fingerprint = generateFingerprint();
  console.log('Generated fingerprint:', { userAgent: fingerprint.userAgent.substring(0, 50) + '...' });

  // 4. 创建CDP浏览器服务
  browserService = new CdpBrowserService(wsEndpoint, fingerprint);

  // 5. 注册 IPC 处理程序（先注册，避免渲染器调用时无处理器）
  registerIpcHandlers();

  // 6. 连接到Chrome
  await browserService.connect();
  console.log('Connected to Chrome via CDP');

  // 7. 设置请求拦截器添加自定义头
  browserService.setCustomHeaders(buildRequestHeaders(fingerprint));

  // 8. 创建主窗口
  createMainWindow();
}

// 注册 IPC 处理器
function registerIpcHandlers(): void {
  // 导航到 URL
  ipcMain.handle('navigate', async (_event: Electron.IpcMainInvokeEvent, url: string) => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.navigate(url);
  });

  // 后退
  ipcMain.handle('go-back', async () => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.goBack();
  });

  // 前进
  ipcMain.handle('go-forward', async () => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.goForward();
  });

  // 刷新
  ipcMain.handle('refresh', async () => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.refresh();
  });

  // 获取页面标题
  ipcMain.handle('get-title', async () => {
    if (!browserService) return { title: '' };
    return await browserService.getTitle();
  });

  // 获取当前 URL
  ipcMain.handle('get-url', async () => {
    if (!browserService) return { url: '' };
    return await browserService.getCurrentUrl();
  });

  // 截图
  ipcMain.handle('screenshot', async () => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.screenshot();
  });

  // 获取页面内容长度
  ipcMain.handle('get-content-length', async () => {
    if (!browserService) return { contentLength: 0 };
    return await browserService.getContentLength();
  });

  // 点击元素
  ipcMain.handle('click', async (_event: Electron.IpcMainInvokeEvent, selector: string) => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.clickElement(selector);
  });

  // 输入文本
  ipcMain.handle('type-text', async (_event: Electron.IpcMainInvokeEvent, selector: string, text: string) => {
    if (!browserService) return { error: 'Browser service not initialized' };
    return await browserService.typeText(selector, text);
  });

  // 书签管理
  ipcMain.handle('add-bookmark', async (_event: Electron.IpcMainInvokeEvent, bookmark: any) => {
    const bookmarks: any[] = [];
    bookmarks.push(bookmark);
    return { success: true };
  });

  // 停止 Chrome
  ipcMain.handle('stop-chrome', async () => {
    if (chromeManager) {
      await chromeManager.stop();
    }
    app.quit();
  });
}

// 应用就绪时初始化
app.whenReady().then(initApp).catch(console.error);

// macOS 允许再次打开应用
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// 所有窗口关闭时退出（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
