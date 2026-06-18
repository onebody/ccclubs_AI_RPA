export interface FingerprintConfig {
  userAgent: string;
  platform: string;
  accept: string;
  acceptLanguage: string;
  acceptEncoding: string;
  screenResolution: string;
  timezone: string;
  language: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  webglVendor: string;
  webglRenderer: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const PLATFORMS = ['macOS', 'Windows'];
const WEBGL_VENDORS = ['Intel Inc.', 'NVIDIA Corporation'];
const WEBGL_RENDERERS = ['Intel Iris OpenGL Engine', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)'];

export function generateFingerprint(): FingerprintConfig {
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
    acceptEncoding: 'gzip, deflate, br',
    screenResolution: '1920x1080',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    webglVendor: WEBGL_VENDORS[Math.floor(Math.random() * WEBGL_VENDORS.length)],
    webglRenderer: WEBGL_RENDERERS[Math.floor(Math.random() * WEBGL_RENDERERS.length)],
  };
}

export function buildRequestHeaders(fp: FingerprintConfig): Record<string, string> {
  return {
    'Accept': fp.accept,
    'Accept-Language': fp.acceptLanguage,
    'Accept-Encoding': fp.acceptEncoding,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': `"${fp.platform}"`,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  };
}

export function buildFingerprintScript(fp: FingerprintConfig): string {
  return `
    // 隐藏 webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    // 伪装 chrome.runtime
    window.chrome = { runtime: {} };
    
    // 伪装屏幕分辨率
    Object.defineProperty(screen, 'width', { get: () => ${fp.screenResolution.split('x')[0]} });
    Object.defineProperty(screen, 'height', { get: () => ${fp.screenResolution.split('x')[1]} });
    
    // 伪装硬件
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.hardwareConcurrency} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });
    
    // 伪装 WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return '${fp.webglVendor}';
      if (parameter === 37446) return '${fp.webglRenderer}';
      return getParameter.call(this, parameter);
    };
    
    // 伪装语言
    Object.defineProperty(navigator, 'languages', { get: () => ['${fp.language}', 'zh', 'en'] });
    Object.defineProperty(navigator, 'language', { get: () => '${fp.language}' });
  `;
}
