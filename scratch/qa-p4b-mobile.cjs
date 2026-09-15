const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  const resp = await page.goto('http://localhost:8080/pg/yfLEdka', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = resp && resp.status();
  await page.waitForTimeout(1500);

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  const rendererMounted = await page.evaluate(() =>
    Boolean(document.querySelector('[class*="pts-"], [data-testid*="template"], main')),
  );
  const editorChrome = await page.evaluate(() =>
    Boolean(document.querySelector('[data-testid="power-editor"], [data-testid="editor-shell"], .basic-editor-shell')),
  );

  console.log(JSON.stringify({
    route: '/pg/yfLEdka (mobile 390x844)',
    http_status: status,
    renderer_mounted: rendererMounted,
    editor_chrome: editorChrome,
    horizontal_overflow: overflow.scrollWidth > overflow.clientWidth,
    scrollWidth: overflow.scrollWidth,
    clientWidth: overflow.clientWidth,
    runtime_errors: errors,
  }, null, 2));

  await browser.close();
})();
