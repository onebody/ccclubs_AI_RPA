import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugSite() {
  const browser = await chromium.launch({
    headless: false,
    timeout: 30000,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to target site...');
    await page.goto(process.env.TARGET_URL || 'https://zj.122.gov.cn', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    console.log('Page title:', title);
    
    const bodyText = await page.textContent('body');
    console.log('Body text (first 2000 chars):', bodyText?.substring(0, 2000));
    
    const allLinks = await page.$$eval('a', links => links.map(l => ({ text: l.textContent?.trim(), href: l.href })));
    console.log('All links:', JSON.stringify(allLinks.slice(0, 50), null, 2));
    
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()));
    console.log('All buttons:', allButtons);
    
    const allSpans = await page.$$eval('span', spans => spans.map(s => s.textContent?.trim()).filter(t => t && t.length > 2));
    console.log('All spans:', allSpans.slice(0, 50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugSite().catch(console.error);
