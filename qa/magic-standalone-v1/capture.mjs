import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const out = 'qa/magic-standalone-v1';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto('http://localhost:8081/labs/magic-editor', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);

async function snap(name, fullPage = true) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage });
}

await snap('bio-desktop-1366');
await page.getByText('Avatar', { exact: true }).click();
await snap('avatar-selected');
await page.getByText('Texto', { exact: true }).click();
await snap('text-selected');
await page.getByText('Botón', { exact: true }).click();
await snap('cta-selected');
await page.getByText('Card', { exact: true }).click();
await snap('card-selected');

await page.setViewportSize({ width: 1440, height: 900 });
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(700);
await snap('bio-desktop-1440');

await page.getByRole('tab', { name: /Negocio/ }).click();
await page.waitForTimeout(500);
await snap('business-smoke');
await page.getByRole('tab', { name: /Portfolio/ }).click();
await page.waitForTimeout(500);
await snap('portfolio-smoke');

for (const width of [360, 390, 430]) {
  await page.setViewportSize({ width, height: 800 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(700);
  await snap(`bio-mobile-${width}`);
  await page.getByRole('heading', { name: 'Marina Solé', exact: true }).click();
  await snap(`mobile-${width}-text-selected`);
}

await browser.close();
