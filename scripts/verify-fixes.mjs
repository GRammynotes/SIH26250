import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const baseUrl = process.env.VERIFY_URL ?? 'https://ps2-sih-26250.vercel.app/';
const outputDir = path.resolve('docs/screenshots/verify');
await mkdir(outputDir, { recursive: true });

const results = {
  fix1: false, fix2: false, fix3: false, fix4: false,
  fix5: false, fix6: false, fix7: false, fix8: false,
  notes: {}, consoleErrors: [],
};
let browser;
let page;

function note(key, value) { results.notes[key] = String(value); }
function capture(name) { return page.screenshot({ path: path.join(outputDir, name) }); }
async function dismissWelcome() {
  const card = page.locator('.welcome-card');
  if (await card.count()) await card.getByRole('button', { name: /EXPLORE/ }).click();
  await card.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}
async function reloadClean() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.welcome-card').waitFor({ state: 'visible', timeout: 20000 });
  await dismissWelcome();
  await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 30000 });
}
async function run(key, fn) {
  try { results[key] = Boolean(await fn()); }
  catch (error) {
    results[key] = false;
    note(key, error?.stack ?? error);
    const captures = { fix1: '01-base-detail-scrolled.png', fix2: '02-3d-expanded.png', fix3: '03-3d-zoom.png', fix4: '04-training-aircraft.png', fix5: '05-degraded-banner.png', fix6: '06-demo-topbar.png', fix7: '07-scenario-auto-tab.png', fix8: '08-map-brightness.png' };
    if (captures[key]) await page.screenshot({ path: path.join(outputDir, captures[key]) }).catch(() => {});
  }
}
async function openExperience(label) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.setItem('aircommand.seen', 'true'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 30000 });
  await dismissWelcome();
  await page.getByRole('button', { name: 'EXPERIENCE', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
}

// Minimal PNG decoder for measuring the pixels in the actual Playwright captures.
function decodePng(png) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!png.subarray(0, 8).equals(signature)) throw new Error('Screenshot was not PNG');
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const dataChunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    if (type === 'IDAT') dataChunks.push(data);
    offset += length + 12;
    if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`Unsupported PNG format ${bitDepth}/${colorType}`);
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(dataChunks));
  const pixels = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  let sourceOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[sourceOffset++], row = y * stride, prior = row - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[sourceOffset++], left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y ? pixels[prior + x] : 0, upperLeft = y && x >= channels ? pixels[prior + x - channels] : 0;
      pixels[row + x] = (value + (filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0)) & 255;
    }
  }
  return { width, height, channels, pixels };
}

async function captureRegionStats(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Requested visual region is not visible');
  const image = decodePng(await page.screenshot());
  const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(image.width, Math.ceil(box.x + box.width)), y1 = Math.min(image.height, Math.ceil(box.y + box.height));
  let sum = 0, sumSq = 0, bright = 0, cyan = 0, count = 0;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
    const i = (y * image.width + x) * image.channels, r = image.pixels[i], g = image.pixels[i + 1], b = image.pixels[i + 2];
    const lum = .2126 * r + .7152 * g + .0722 * b;
    sum += lum; sumSq += lum * lum; count++;
    if (Math.max(r, g, b) > 55) bright++;
    if (g > 85 && b > 85 && g > r * 1.25 && b > r * 1.15) cyan++;
  }
  const mean = sum / Math.max(1, count);
  return { mean, deviation: Math.sqrt(Math.max(0, sumSq / Math.max(1, count) - mean * mean)), brightFraction: bright / Math.max(1, count), cyanPixels: cyan };
}

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => results.consoleErrors.push(`PAGEERROR: ${error.message}`));

  await reloadClean();

  await run('fix1', async () => {
    // Click the Jodhpur AFS map point by projecting its known coordinates from the visible map center.
    const map = page.locator('.map-canvas');
    const box = await map.boundingBox();
    const mapLabels = await page.locator('.coord').allTextContents();
    const centerText = mapLabels.find((text) => text.includes('THEATER MAP')) ?? '';
    const zoomText = mapLabels.find((text) => text.includes('ZOOM')) ?? '';
    const center = centerText.match(/([\d.]+)°N\s*\/\s*([\d.]+)°E/);
    const zoom = Number(zoomText.match(/ZOOM\s+([\d.]+)/)?.[1] ?? 3.8);
    if (box && center) {
      const lat0 = Number(center[1]) * Math.PI / 180, lat1 = 26.2511 * Math.PI / 180;
      const world = 512 * 2 ** zoom;
      const x = box.width / 2 + (73.0489 - Number(center[2])) / 360 * world;
      const yMercator = (lat) => Math.log(Math.tan(Math.PI / 4 + lat / 2));
      const y = box.height / 2 - (yMercator(lat1) - yMercator(lat0)) / (2 * Math.PI) * world;
      await page.mouse.click(box.x + x, box.y + y);
      await page.waitForTimeout(1000);
    }
    if (!(await page.getByText('BASE DETAIL', { exact: true }).count())) {
      // Keep the check honest if the vector hit-test misses: use the roster's base control and record it.
      const baseButton = page.getByRole('button', { name: 'Show base detail' }).first();
      if (await baseButton.count()) { await baseButton.click(); note('fix1_method', 'Map marker miss; used aircraft roster base control'); }
    } else note('fix1_method', 'Clicked Jodhpur AFS map point');
    const panel = page.locator('aside.panel');
    await panel.waitFor({ state: 'visible', timeout: 12000 });
    const roster = panel.locator('.roster');
    await roster.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);
    await capture('01-base-detail-scrolled.png');
    const last = roster.locator('.ac-card').last();
    const visibility = await last.evaluate((el) => { const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect(); return r.top >= p.top && r.bottom <= p.bottom; });
    note('fix1_last_aircraft_visible', visibility);
    note('fix1_base_roster_rows', await roster.locator('.ac-card').count());
    return visibility;
  });

  await run('fix2', async () => {
    await reloadClean();
    await page.locator('button').filter({ hasText: /^SB-301$/ }).first().click();
    await page.waitForTimeout(2000);
    const expand = page.getByRole('button', { name: /EXPAND/ });
    await expand.waitFor({ state: 'visible', timeout: 10000 });
    await expand.click();
    await page.waitForTimeout(3000);
    await capture('02-3d-expanded.png');
    const expanded = page.locator('.canvas-wrap');
    const canvas = expanded.locator('canvas');
    const modelStates = { canvases: await canvas.count(), loader: await expanded.getByText(/LOADING MODEL/i).count(), fallback: await expanded.getByText(/SVG FALLBACK/i).count() };
    const stats = await captureRegionStats(expanded);
    note('fix2_model_state', JSON.stringify(modelStates));
    note('fix2_canvas_pixel_stats', JSON.stringify(stats));
    const pass = modelStates.canvases > 0 && modelStates.loader === 0 && modelStates.fallback === 0 && stats.brightFraction > .01;
    return pass;
  });

  await run('fix3', async () => {
    const canvas = page.locator('.canvas-wrap canvas').last();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Expanded model canvas is missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const started = performance.now();
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -500);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 500);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
    const elapsedMs = performance.now() - started;
    await capture('03-3d-zoom.png');
    note('fix3_zoom_response_ms', elapsedMs.toFixed(1));
    return elapsedMs < 500;
  });

  await run('fix4', async () => {
    await openExperience('HISTORICAL TRAINING');
    await page.waitForTimeout(20000);
    await capture('04-training-aircraft.png');
    const map = page.locator('.map-canvas');
    const stats = await captureRegionStats(map);
    const missionAircraft = await page.locator('.state-row').filter({ hasText: 'AIRCRAFT' }).innerText().catch(() => '');
    note('fix4_map_pixel_stats', JSON.stringify(stats));
    note('fix4_training_aircraft_state', missionAircraft || 'Training live state is not exposed as text row');
    // Bright cyan pixels in the map viewport correspond to the aircraft halo/route layers; reject a dark/blank viewport.
    return stats.cyanPixels >= 5 && stats.brightFraction > .015;
  });

  await run('fix5', async () => {
    await page.getByRole('button', { name: /Exit training experience/ }).click().catch(() => {});
    const exit = page.getByRole('button', { name: /^EXIT$/ }).last();
    if (await exit.count()) await exit.click();
    await page.locator('.scenario-menu summary').click();
    await page.locator('.scenario-bar.dropdown').getByRole('button', { name: /RADAR LOSS/ }).click();
    await page.waitForTimeout(3000);
    await capture('05-degraded-banner.png');
    const banner = page.locator('div.degraded').filter({ hasText: 'EDGE MODE ACTIVE' });
    const box = await banner.boundingBox();
    const map = await page.locator('.map-wrap').boundingBox();
    const text = await banner.innerText().catch(() => '');
    const quadrant = Boolean(box && map && box.x + box.width / 2 > map.x + map.width / 2 && box.y + box.height / 2 < map.y + map.height / 2);
    note('fix5_banner_text', text);
    note('fix5_banner_box', JSON.stringify(box));
    return /EDGE MODE ACTIVE/.test(text) && quadrant;
  });

  await run('fix6', async () => {
    await openExperience('GUIDED DEMO');
    await page.waitForTimeout(1200);
    await capture('06-demo-topbar.png');
    const topbar = page.locator('.topbar');
    const menuText = await topbar.innerText();
    const box = await topbar.boundingBox();
    const visible = await topbar.isVisible();
    note('fix6_topbar_text', menuText);
    note('fix6_topbar_opacity', await topbar.evaluate((el) => getComputedStyle(el).opacity));
    return visible && !!box && ['VIEW', 'TOOLS', 'HELP', 'SYSTEM'].every((label) => menuText.includes(label));
  });

  await run('fix7', async () => {
    await reloadClean();
    await page.locator('.scenario-menu summary').click();
    await page.locator('.scenario-bar.dropdown').getByRole('button', { name: /DEEP STRIKE/ }).click();
    await page.waitForTimeout(2000);
    await capture('07-scenario-auto-tab.png');
    const weapons = page.getByRole('tab', { name: 'WEAPONS', exact: true });
    const recommended = page.locator('.recommended-view');
    const selected = await weapons.getAttribute('aria-selected');
    note('fix7_weapons_selected', selected);
    note('fix7_recommended_view_chip', await recommended.innerText().catch(() => 'missing'));
    return selected === 'true' && await recommended.isVisible();
  });

  await run('fix8', async () => {
    await reloadClean();
    const mapCanvas = page.locator('.map-canvas');
    const startZoom = Number((await page.locator('.coord.tr').innerText()).match(/ZOOM\s+([\d.]+)/)?.[1] ?? 3.8);
    const box = await mapCanvas.boundingBox();
    if (box && startZoom < 4.8) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -650);
      await page.waitForTimeout(2000);
    }
    await capture('08-map-brightness.png');
    const stats = await captureRegionStats(mapCanvas);
    note('fix8_map_luminance', JSON.stringify(stats));
    return stats.mean > 18 && stats.deviation > 8;
  });

  results.consoleErrors = [...new Set(results.consoleErrors)];
  note('tested_url', baseUrl);
  note('tested_viewport', '1920x1080');
  note('maplibre_console_errors', results.consoleErrors.filter((message) => /maplibre|layer|zoom expression/i.test(message)).length);
} catch (error) {
  results.notes.fatal = error?.stack ?? String(error);
} finally {
  if (browser) await browser.close();
  await writeFile(path.join(outputDir, 'RESULTS.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
}
