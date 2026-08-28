import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8081/power-editor-preview', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  
  await page.getByTitle('Abrir recetas').click();
  await page.getByText('Golden Atelier').first().waitFor({ timeout: 10000 });
  await page.getByText('Aplicar al canvas').first().click();
  await page.waitForTimeout(1000);
  
  const boxes = await page.$$eval('[data-block-id]', els => els.map(el => {
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute('data-block-id'),
      cls: el.className,
      text: (el.textContent || '').trim().slice(0, 80),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height)
    };
  }));
  
  console.log(JSON.stringify(boxes, null, 2));
  await page.screenshot({ path: 'artifacts/power-editor-premium-recipe-preview-latest.png', fullPage: false });
  await browser.close();
})();
