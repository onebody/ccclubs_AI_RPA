import { chromium, Browser, Page } from 'playwright-core';
import { generateFingerprint, buildFingerprintScript, buildRequestHeaders } from '../src/modules/browser/fingerprint';
import * as os from 'os';

function getChromePath(): string {
  if (os.platform() === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (os.platform() === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  return '/usr/bin/google-chrome';
}

async function testBrowser() {
  console.log('=== 测试浏览器自动化服务（使用系统 Chrome）===');
  
  const chromePath = getChromePath();
  console.log('Chrome 路径:', chromePath);
  
  const fingerprint = generateFingerprint();
  console.log('生成指纹:', { userAgent: fingerprint.userAgent.substring(0, 50) + '...' });
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });
    
    console.log('Chrome 启动成功');
    
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: fingerprint.userAgent,
      extraHTTPHeaders: buildRequestHeaders(fingerprint),
      ignoreHTTPSErrors: true,
    });
    
    console.log('页面创建成功');
    
    await page.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        ...buildRequestHeaders(fingerprint),
      };
      await route.continue({ headers });
    });
    
    await page.addInitScript(buildFingerprintScript(fingerprint));
    
    await page.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
      window.chrome = { runtime: {} };
    `);
    
    console.log('指纹注入完成');
    
    console.log('\n=== 测试访问百度 ===');
    await page.goto('https://www.baidu.com', { waitUntil: 'networkidle', timeout: 30000 });
    const baiduTitle = await page.title();
    console.log('百度标题:', baiduTitle);
    
    console.log('\n=== 测试访问 122.gov.cn ===');
    await page.goto('https://zj.122.gov.cn/', { waitUntil: 'networkidle', timeout: 60000 });
    const govTitle = await page.title();
    console.log('122.gov.cn 标题:', govTitle);
    
    const currentUrl = page.url();
    console.log('当前URL:', currentUrl);
    
    const content = await page.content();
    const hasContent = content.length > 1000;
    console.log('页面内容长度:', content.length, '字节');
    console.log('是否加载成功:', hasContent);
    
    const screenshot = await page.screenshot({ fullPage: false });
    console.log('截图大小:', screenshot.length, '字节');
    
    console.log('\n=== 测试完成，等待 10 秒后关闭 ===');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('测试失败:', error.message);
    process.exit(1);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('浏览器已关闭');
  }
}

testBrowser();
