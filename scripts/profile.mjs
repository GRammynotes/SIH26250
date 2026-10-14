import { chromium } from 'playwright';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.PROFILE_URL ?? 'http://localhost:5173/';
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

  // Start the bundled historical exercise so the map carries a live mission
  // route during the panning sample.
  let missionStarted = false;
  await page.getByRole('button', { name: 'HELP', exact: true }).click();
  await page.getByRole('menuitem', { name: /TRAINING SIMULATION/i }).click();
  await page.getByRole('button', { name: /START SIMULATION/i }).click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /CLOSE SIMULATION/i }).click();
  await page.waitForTimeout(1200);
  missionStarted = (await page.locator('.trajectory-dot').count()) > 0;

  const fpsPromise = page.evaluate(async () => {
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
  const panPromise = (async () => {
    const points = [[800, 500], [845, 530], [800, 500], [755, 470]];
    const until = Date.now() + 10_000;
    while (Date.now() < until) {
      await page.mouse.move(points[0][0], points[0][1]);
      await page.mouse.down();
      for (const [x, y] of points.slice(1)) { await page.mouse.move(x, y, { steps: 3 }); await new Promise((resolve) => setTimeout(resolve, 120)); }
      await page.mouse.up();
    }
  })();
  const [fps] = await Promise.all([fpsPromise, panPromise]);

  const assets = await readdir('dist/assets');
  let bundleBytes = 0;
  for (const file of assets.filter((name) => name.endsWith('.js'))) bundleBytes += (await stat(join('dist/assets', file))).size;
  const result = { fcp, fps_mean: Math.round(fps.mean * 100) / 100, fps_min: Math.round(fps.min * 100) / 100, bundle_kb: Math.round(bundleBytes / 1024 * 100) / 100, mission_started: missionStarted, measurement: 'Headless Chromium requestAnimationFrame samples during scripted map panning', url };
  console.log(JSON.stringify(result, null, 2));
  await writeFile('docs/screenshots/final/06-fps-profiling.json', JSON.stringify(result, null, 2) + '\n');
} finally {
  await browser.close();
}
