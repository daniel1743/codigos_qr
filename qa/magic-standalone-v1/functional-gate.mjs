import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const out = 'qa/magic-standalone-v1';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const url = 'http://localhost:8081/labs/magic-editor';
const results = [];

async function fresh(viewport = { width: 1366, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(10000);
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: String(error) });
  }
}

await check('inline text + commit + undo/redo', async () => {
  await fresh();
  const heading = page.locator('h1[data-cq]').filter({ hasText: 'Marina Solé' }).first();
  await heading.click();
  await page.locator('[data-selected="true"]').first().waitFor({ state: 'attached', timeout: 60000 });
  await heading.click();
  await page.locator('[contenteditable="true"]').first().waitFor({ state: 'attached', timeout: 60000 });
  const editable = page.locator('[contenteditable="true"]').first();
  await editable.press('Control+A');
  await editable.type('Marina QA');
  await editable.press('Enter');
  await page.getByText('Creadora · Viajes lentos · Barcelona', { exact: true }).click();
  await page.waitForTimeout(700);
  if (!(await page.getByRole('heading', { name: 'Marina QA', exact: true }).count())) throw new Error('text commit not visible');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  if (!(await page.getByRole('heading', { name: 'Marina Solé', exact: true }).count())) throw new Error('undo did not restore');
  await page.getByRole('button', { name: 'Rehacer' }).click();
  if (!(await page.getByRole('heading', { name: 'Marina QA', exact: true }).count())) throw new Error('redo did not restore');
});

await check('block picker + undo/redo', async () => {
  await fresh();
  await page.locator('[data-cq]').filter({ has: page.locator('img[alt="Costa mediterránea al atardecer"]') }).first().click();
  await page.waitForTimeout(700);
  await page.locator('button:visible').filter({ hasText: 'Añadir bloque' }).last().click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog', { name: 'Añadir bloque' });
  await dialog.getByRole('button', { name: /^Imagen/ }).click();
  await page.waitForTimeout(400);
  if (!(await page.locator('[data-cq]').count())) throw new Error('block was not added');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await page.getByRole('button', { name: 'Rehacer' }).click();
  if (!(await page.locator('[data-cq]').count())) throw new Error('redo did not restore block');
});

await check('image replacement local flow', async () => {
  await fresh();
  const image = page.locator('[data-cq]').filter({ has: page.locator('img[alt="Lugares tranquilos"]') }).last();
  const before = await image.locator('img').getAttribute('src');
  await image.click();
  await page.getByRole('button', { name: 'Reemplazar' }).click();
  const picker = page.getByRole('dialog', { name: 'Reemplazar' });
  await picker.getByRole('button', { name: 'Usar esta imagen' }).nth(1).click();
  const after = await image.locator('img').getAttribute('src');
  if (!after || after === before) throw new Error('image src did not change');
});

await check('social contextual controls', async () => {
  await fresh();
  const social = page.locator('[data-cq][aria-label]').first();
  const label = await social.getAttribute('aria-label');
  await social.click();
  if (!(await page.getByRole('toolbar', { name: `Editar ${label}` }).count())) throw new Error('social toolbar missing');
  await page.getByRole('button', { name: 'Red', exact: true }).last().click();
  if (!(await page.getByRole('dialog', { name: 'Red' }).count())) throw new Error('social platform panel missing');
});

await check('page background settings drawer', async () => {
  await fresh();
  const pageRoot = page.locator('[data-cq]').first();
  await pageRoot.click({ position: { x: 5, y: 600 } });
  await page.getByRole('button', { name: 'Ajustes avanzados de página' }).click();
  if (!(await page.getByRole('dialog', { name: 'Ajustes de página' }).count())) throw new Error('settings drawer missing');
});

await check('MobileSheet text/avatar/CTA', async () => {
  await fresh({ width: 390, height: 800 });
  const heading = page.getByRole('heading', { name: 'Marina Solé', exact: true }).first();
  await heading.click();
  if (!(await page.getByRole('dialog', { name: /Editar/ }).count())) throw new Error('text sheet missing');
  await page.screenshot({ path: `${out}/mobile-sheet-text.png`, fullPage: true });
  if (await page.getByRole('toolbar').count()) throw new Error('desktop toolbar visible with sheet');
  await page.getByRole('button', { name: 'Cerrar' }).last().click();

  await page.locator('[data-cq]').filter({ has: page.locator('img[alt="Marina Solé"]') }).last().click();
  if (!(await page.getByRole('dialog', { name: /Editar/ }).count())) throw new Error('avatar sheet missing');
  await page.screenshot({ path: `${out}/mobile-sheet-avatar.png`, fullPage: true });
  await page.getByRole('button', { name: 'Cerrar' }).last().click();

  await page.getByRole('link', { name: /Colaboremos/ }).click();
  if (!(await page.getByRole('dialog', { name: /Editar/ }).count())) throw new Error('CTA sheet missing');
  await page.screenshot({ path: `${out}/mobile-sheet-cta.png`, fullPage: true });
});

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1;
await browser.close();
