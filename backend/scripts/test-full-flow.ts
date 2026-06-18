import { spawn, ChildProcess } from 'child_process';
import { chromium, Browser, Page } from 'playwright';
import { generateFingerprint, buildFingerprintScript, buildRequestHeaders } from '../src/modules/browser/fingerprint';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

async function testFullFlow() {
  console.log('=== 完整流程测试：启动系统 Chrome + 连接 CDP + 访问 122.gov.cn ===\n');

  // 1. 创建临时用户数据目录
  const baseDir = path.join(require('os').tmpdir(), 'rpa-test-' + crypto.randomUUID());
  fs.mkdirSync(baseDir, { recursive: true });
  console.log('1. 临时目录:', baseDir);

  // 2. 启动系统 Chrome，开启远程调试端口 9222
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const cdpPort = 9222;

  const chromeArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + baseDir,
    '--remote-allow-origins=*',
  ];

  console.log('\n2. 启动 Chrome...');
  const chromeProcess: ChildProcess = spawn(chromePath, chromeArgs, {
    detached: false,
    stdio: 'ignore',
  });

  console.log('   Chrome PID:', chromeProcess.pid);

  // 等待 Chrome 启动并获取调试地址
  console.log('   等待 Chrome 调试端口就绪...');
  let wsEndpoint = '';
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const response = await fetch(`http://localhost:${cdpPort}/json/version`);
      const data = await response.json();
      wsEndpoint = data.webSocketDebuggerUrl;
      if (wsEndpoint) break;
    } catch (e) {
      console.log(`   尝试 ${i+1}/10: 等待...`);
    }
  }

  if (!wsEndpoint) {
    console.error('❌ 无法获取 Chrome WebSocket 调试地址');
    chromeProcess.kill();
    return;
  }
  console.log('   WebSocket 地址:', wsEndpoint);

  try {
    // 3. 通过 CDP 连接 Chrome
    console.log('\n3. 通过 CDP 连接...');
    const browser = await chromium.connectOverCDP(wsEndpoint);
    console.log('   连接成功！');

    // 4. 生成指纹并创建页面
    console.log('\n4. 生成指纹，创建页面...');
    const fingerprint = generateFingerprint();
    console.log('   UA:', fingerprint.userAgent.substring(0, 60) + '...');

    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: fingerprint.userAgent,
      extraHTTPHeaders: buildRequestHeaders(fingerprint),
      ignoreHTTPSErrors: true,
    });
    console.log('   页面创建成功');

    // 5. 注入指纹
    console.log('\n5. 注入指纹脚本...');
    await page.addInitScript(buildFingerprintScript(fingerprint));
    await page.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
      window.chrome = { runtime: {} };
    `);

    // 拦截所有请求添加统一头
    await page.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        ...buildRequestHeaders(fingerprint),
      };
      await route.continue({ headers });
    });

    console.log('   指纹注入完成');

    // 6. 访问目标网站
    console.log('\n6. 访问 https://zj.122.gov.cn/ ...');
    await page.goto('https://zj.122.gov.cn/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const title = await page.title();
    const url = page.url();
    const content = await page.content();

    console.log('\n=== 结果 ===');
    console.log('页面标题:', title);
    console.log('页面URL:', url);
    console.log('内容长度:', content.length, '字节');
    console.log('是否成功:', title.includes('交通安全') || content.length > 10000);

    // 7. 截图
    const screenshotPath = path.join(baseDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('截图保存:', screenshotPath);

    await page.close();
    await browser.close();
    console.log('\n✅ 测试通过！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  } finally {
    console.log('\n清理资源...');
    chromeProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('完成');
  }
}

testFullFlow();
