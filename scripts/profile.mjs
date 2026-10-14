import { chromium } from 'playwright';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.PROFILE_URL ?? 'https://ps2-sih-26250.vercel.app/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(1500);
  const fcp = await page.evaluate(() => {
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    if (paint) return Math.round(paint.startTime);
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? Math.round(nav.domContentLoadedEventEnd) : null;
  });

  // Open the mission queue, generate a course of action, and launch the first
  // feasible mission, matching an operator's path through the console.
  const missionsTab = page.getByRole('tab', { name: 'MISSIONS' });
  if (await missionsTab.count()) await missionsTab.click();
  await page.keyboard.press('g');
  await page.waitForTimeout(2500);
  const execute = page.locator('button.execute-action:not(:disabled)').first();
  let missionStarted = false;
  if (await execute.count() && await execute.isEnabled()) {
    await execute.click();
    await page.waitForTimeout(500);
    missionStarted = true;
  }

  const fps = await page.evaluate(async () => {
    const samples = [];
    let start = 0;
    let previous = 0;
    let frames = 0;
    await new Promise((resolve) => {
      const tick = (time) => {
        if (!start) start = time;
        if (previous) frames += 1;
        if (time - previous >= 1000 && previous) {
          samples.push(frames * 1000 / (time - previous));
          frames = 0;
          previous = time;
        } else if (!previous) previous = time;
        if (time - start >= 10_000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { mean: samples.reduce((sum, value) => sum + value, 0) / samples.length, min: Math.min(...samples) };
  });

  const assets = await readdir('dist/assets');
  let bundleBytes = 0;
  for (const file of assets.filter((name) => name.endsWith('.js'))) bundleBytes += (await stat(join('dist/assets', file))).size;
  const result = { fcp, fps_mean: Math.round(fps.mean * 100) / 100, fps_min: Math.round(fps.min * 100) / 100, bundle_kb: Math.round(bundleBytes / 1024 * 100) / 100, mission_started: missionStarted, url };
  console.log(JSON.stringify(result, null, 2));
  await writeFile('docs/screenshots/final/06-fps-profiling.json', JSON.stringify(result, null, 2) + '\n');
} finally {
  await browser.close();
}
