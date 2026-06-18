export interface FingerprintConfig {
  userAgent: string
  platform: string
  accept: string
  acceptLanguage: string
  acceptEncoding: string
  screenResolution: string
  timezone: string
  language: string
  hardwareConcurrency: number
  deviceMemory: number
  webglVendor: string
  webglRenderer: string
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

const PLATFORMS = ['MacIntel', 'Win32', 'Linux x86_64']

const SCREEN_RESOLUTIONS = ['1920x1080', '1920x1200', '2560x1440', '3840x2160', '1440x900']

const TIMEZONES = ['Asia/Shanghai', 'Asia/Beijing', 'Asia/Tokyo', 'Europe/London', 'America/New_York']

const WEBGL_VENDORS = [
  'Google Inc. (Intel)',
  'Google Inc.',
  'NVIDIA Corporation',
  'Intel Inc.',
]

const WEBGL_RENDERERS = [
  'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Google, SwiftShader Direct3D11 vs_5_0 ps_5_0)',
  'WebKit WebGL',
]

export function generateFingerprint(): FingerprintConfig {
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
    acceptEncoding: 'gzip, deflate, br',
    screenResolution: SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)],
    timezone: TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)],
    language: 'zh-CN',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    webglVendor: WEBGL_VENDORS[Math.floor(Math.random() * WEBGL_VENDORS.length)],
    webglRenderer: WEBGL_RENDERERS[Math.floor(Math.random() * WEBGL_RENDERERS.length)],
  }
}

export const FINGERPRINT_INJECT_SCRIPT = `
  Object.defineProperty(navigator, 'platform', {
    get: () => '{{PLATFORM}}',
    configurable: true,
  });
  Object.defineProperty(navigator, 'language', {
    get: () => '{{LANGUAGE}}',
    configurable: true,
  });
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => {{HARDWARE_CONCURRENCY}},
    configurable: true,
  });
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => {{DEVICE_MEMORY}},
    configurable: true,
  });
  Object.defineProperty(screen, 'width', {
    get: () => {{SCREEN_WIDTH}},
    configurable: true,
  });
  Object.defineProperty(screen, 'height', {
    get: () => {{SCREEN_HEIGHT}},
    configurable: true,
  });
  Object.defineProperty(screen, 'availWidth', {
    get: () => {{SCREEN_WIDTH}},
    configurable: true,
  });
  Object.defineProperty(screen, 'availHeight', {
    get: () => {{SCREEN_HEIGHT}},
    configurable: true,
  });
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type) {
    const context = originalGetContext.call(this, type);
    if (type === 'webgl' || type === 'experimental-webgl') {
      const originalGetParameter = context.getParameter.bind(context);
      context.getParameter = function(pname) {
        if (pname === 37445) return '{{WEBGL_VENDOR}}';
        if (pname === 37446) return '{{WEBGL_RENDERER}}';
        return originalGetParameter(pname);
      };
    }
    return context;
  };
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    const originalAudioContext = AudioContext;
    window.AudioContext = function() {
      const ctx = new originalAudioContext();
      const originalCreateOscillator = ctx.createOscillator.bind(ctx);
      ctx.createOscillator = function() {
        const osc = originalCreateOscillator();
        const originalGetFrequencyResponse = osc.getFrequencyResponse.bind(osc);
        osc.getFrequencyResponse = function(mag, phase) {
          mag.fill(1);
          phase.fill(0);
          return originalGetFrequencyResponse(mag, phase);
        };
        return osc;
      };
      return ctx;
    };
  }
`

export function buildFingerprintScript(config: FingerprintConfig): string {
  const [width, height] = config.screenResolution.split('x').map(Number)
  return FINGERPRINT_INJECT_SCRIPT
    .replace('{{PLATFORM}}', config.platform)
    .replace('{{LANGUAGE}}', config.language)
    .replace('{{HARDWARE_CONCURRENCY}}', String(config.hardwareConcurrency))
    .replace('{{DEVICE_MEMORY}}', String(config.deviceMemory))
    .replace(/{{SCREEN_WIDTH}}/g, String(width))
    .replace(/{{SCREEN_HEIGHT}}/g, String(height))
    .replace('{{WEBGL_VENDOR}}', config.webglVendor)
    .replace('{{WEBGL_RENDERER}}', config.webglRenderer)
}

export function buildRequestHeaders(fingerprint: FingerprintConfig): Record<string, string> {
  return {
    'Accept': fingerprint.accept,
    'Accept-Language': fingerprint.acceptLanguage,
    'Accept-Encoding': fingerprint.acceptEncoding,
    'User-Agent': fingerprint.userAgent,
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': `"${fingerprint.platform === 'MacIntel' ? 'macOS' : fingerprint.platform === 'Win32' ? 'Windows' : 'Linux'}"`,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  }
}