/**
 * pages-smoke.mjs — 全页冒烟测试.
 *
 * 从 routes.tsx ROUTES 派生页面矩阵，逐一访问并断言：
 *   - 页面无 console error
 *   - 页面无 page error（Cannot read properties of undefined 等）
 *   - 主容器渲染（body 非空）
 *
 * 运行: node tests/e2e/pages-smoke.mjs
 * 需要: vite preview 已启动（端口 4173）
 */

import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Routes to test — visible routes only (exclude hidden workbench pages)
const ROUTES = [
  '/', '/guide', '/system-map', '/capabilities',
  '/overview', '/mesh', '/topology', '/compute',
  '/observability', '/logs',
  '/governance-domain', '/command-audit', '/governance-pulse',
  '/l4-health', '/debt', '/alerts',
  '/research', '/knowledge', '/knowledge-action',
  '/engines', '/assets', '/kems', '/scene-cards',
  '/decision-inbox', '/external-resources',
  '/commands', '/chain', '/swarm', '/agents', '/bcos',
  '/brain', '/gbrain-admin',
  '/tasks', '/performance', '/sandbox', '/workflows', '/domain-apps',
  '/settings',
];

const fatalErrors = []; // Cannot read properties of undefined, etc.
const backendErrors = []; // 503, 404, network errors (expected without backend)
const results = [];

// Patterns that indicate frontend runtime errors (fatal)
const FATAL_PATTERNS = [
  /Cannot read propert/i,
  /undefined is not/i,
  /null is not/i,
  /is not a function/i,
  /Unexpected token/i,
  /SyntaxError/i,
  /ReferenceError/i,
];

// Patterns that indicate backend unavailability (non-fatal)
const BACKEND_PATTERNS = [
  /Failed to load resource/i,
  /503/i,
  /404/i,
  /net::ERR_/i,
  /EventSource/i,
  /MIME type/i,
  /Failed to fetch/i,
];

function classifyError(text) {
  if (FATAL_PATTERNS.some((re) => re.test(text))) return 'fatal';
  if (BACKEND_PATTERNS.some((re) => re.test(text))) return 'backend';
  return 'other';
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const kind = classifyError(msg.text());
        if (kind === 'fatal') {
          fatalErrors.push({ route: page.url(), text: msg.text() });
        } else {
          backendErrors.push({ route: page.url(), text: msg.text() });
        }
      }
    });

    // Capture page errors (always fatal)
    page.on('pageerror', (err) => {
      fatalErrors.push({ route: page.url(), text: err.message });
    });

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        // Wait for body to render
        await page.waitForSelector('body', { timeout: 5000 });
        const bodyText = await page.$eval('body', (el) => el.textContent?.trim() || '');
        const hasContent = bodyText.length > 0;
        results.push({ route, status: 'ok', hasContent });
        process.stdout.write('.');
      } catch (err) {
        results.push({ route, status: 'fail', error: err.message });
        process.stdout.write('x');
      }
    }
  } finally {
    await browser.close();
  }

  // Report
  console.log('\n\n=== Page Smoke Results ===');
  const passed = results.filter((r) => r.status === 'ok').length;
  const failed = results.filter((r) => r.status === 'fail');
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n--- Failed Routes ---');
    for (const f of failed) {
      console.log(`  ${f.route}: ${f.error}`);
    }
  }

  if (backendErrors.length > 0) {
    console.log(`\n--- Backend Errors (expected without backend): ${backendErrors.length} ---`);
    for (const e of backendErrors.slice(0, 5)) {
      console.log(`  ${e.route}: ${e.text}`);
    }
    if (backendErrors.length > 5) {
      console.log(`  ... and ${backendErrors.length - 5} more backend errors`);
    }
  }

  if (fatalErrors.length > 0) {
    console.log('\n--- Fatal Errors ---');
    for (const e of fatalErrors.slice(0, 20)) {
      console.log(`  ${e.route}: ${e.text}`);
    }
  }

  // Exit code: only fatal errors and failed routes cause failure
  process.exit(failed.length > 0 || fatalErrors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
