import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.PROFILE_URL ?? 'http://localhost:5177/';
const out = resolve('docs/screenshots/final');
const reportOut = resolve('docs/screenshots/report');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => console.error('[pageerror]', error.message));
  page.on('console', message => { if (message.type() === 'error') console.error('[console]', message.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.map-canvas', { timeout: 60000 });
  await page.waitForTimeout(3500);
  await mkdir(out, { recursive: true });
  await mkdir(reportOut, { recursive: true });
  await page.screenshot({ path: resolve(out, '07-main-four-zones.png') });
  await page.locator('.experience-dock').screenshot({ path: resolve(out, '08-demo-training-sim-dock.png') });
  const flow = page.getByRole('tab', { name: /MISSION FLOW/i });
  await flow.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(out, '09-mission-input-output-flow.png') });
  await page.getByRole('button', { name: /Start probabilistic simulation/i }).click();
  await page.getByRole('button', { name: /SIMULATE OUTCOME/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(out, '10-historical-outcome-probabilities.png') });
  await page.goto(new URL('/report.html', url).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#technologies tr').length > 0, { timeout: 30000 });
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => image.loading = 'eager');
    await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })));
  });
  await page.screenshot({ path: resolve(reportOut, '01-full-project-report.png'), fullPage: true });
  console.log(JSON.stringify({ url, screenshots: [resolve(out, '07-main-four-zones.png'), resolve(out, '08-demo-training-sim-dock.png'), resolve(out, '09-mission-input-output-flow.png'), resolve(out, '10-historical-outcome-probabilities.png'), resolve(reportOut, '01-full-project-report.png')] }, null, 2));
} finally { await browser.close(); }
