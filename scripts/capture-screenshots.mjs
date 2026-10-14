import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile, stat, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'docs/screenshots');
const baseUrl = 'http://127.0.0.1:5173/';
const captured = [];
const failed = [];
const runtimeErrors = new Set();
const expectedShots = [
  'base/01-console-global-view.png', 'base/02-console-scenario-active.png', 'base/03-scenario-bar-closeup.png',
  'modals/04-mission-briefing.png', 'modals/05-decision-prompt.png', 'modals/06-after-action-review.png', 'modals/07-metrics-dashboard.png', 'modals/08-command-palette.png', 'modals/09-glossary.png', 'modals/10-shortcut-help.png',
  'features/11-trajectory-mid-flight.png', 'features/12-trajectory-impact.png', 'features/13-voice-caption-active.png', 'features/14-focus-pointer.png', 'features/15-weapon-matrix.png', 'features/16-cyber-panel.png', 'features/17-red-view.png', 'features/18-3d-terrain.png',
  'states/19-track-loss-decision.png', 'states/20-data-poisoning-detected.png', 'states/21-degraded-mode.png', 'states/22-loadout-su30.png', 'states/23-loadout-rafale.png',
];
let server;
let ownsServer = false;

async function serverIsReady() {
  try { return (await fetch(baseUrl, { signal: AbortSignal.timeout(1200) })).ok; } catch { return false; }
}

async function startServer() {
  if (await serverIsReady()) return;
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  server = spawn(command, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true, shell: process.platform === 'win32' });
  ownsServer = true;
  for (let i = 0; i < 100; i++) {
    if (await serverIsReady()) return;
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`);
    await delay(500);
  }
  throw new Error('Timed out waiting for Vite at http://127.0.0.1:5173');
}

async function main() {
  await mkdir(resolve(output, 'base'), { recursive: true });
  await mkdir(resolve(output, 'modals'), { recursive: true });
  await mkdir(resolve(output, 'features'), { recursive: true });
  await mkdir(resolve(output, 'states'), { recursive: true });
  await Promise.all(expectedShots.map((relative) => unlink(resolve(output, relative)).catch(() => {})));
  await startServer();

  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(5000);
  page.on('pageerror', (error) => runtimeErrors.add(error.message));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1500);

  async function save(relative, selector) {
    const path = resolve(output, relative);
    if (selector) await page.locator(selector).waitFor({ state: 'visible', timeout: 7000 });
    await page.screenshot({ path, fullPage: false, animations: 'disabled' });
    const info = await stat(path);
    if (info.size < 1000) throw new Error('Screenshot file is unexpectedly small');
    captured.push(relative.replaceAll('\\', '/'));
  }

  async function attempt(relative, action, selector) {
    try { await action?.(); await save(relative, selector); }
    catch (error) { failed.push({ file: relative.replaceAll('\\', '/'), reason: String(error?.message ?? error).split('\n')[0] }); }
  }

  const clickButton = async (name) => page.getByRole('button', { name, exact: false }).first().click();
  const clickLeftTab = async (name) => page.locator('.left-tabs button').filter({ hasText: name }).first().click();
  const clickRightTab = async (name) => page.locator('.right-tabs button[role="tab"]').filter({ hasText: name }).first().click();
  const scenario = (name) => page.locator('.scenario-bar button').filter({ hasText: name }).first();
  const closeOverlays = async () => { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); };

  await attempt('base/01-console-global-view.png', async () => {
    await scenario('GLOBAL VIEW').click();
    await page.waitForTimeout(1000);
  }, '.scenario-bar');
  await attempt('base/02-console-scenario-active.png', async () => {
    await scenario('AIRCRAFT NMC').click();
    await page.waitForTimeout(1200);
  }, '.scenario-bar button[aria-pressed="true"]');
  await attempt('base/03-scenario-bar-closeup.png', async () => {}, '.scenario-bar');
  if (captured.includes('base/03-scenario-bar-closeup.png')) {
    const path = resolve(output, 'base/03-scenario-bar-closeup.png');
    await page.screenshot({ path, clip: { x: 0, y: 0, width: 1920, height: 180 }, animations: 'disabled' });
  }

  await attempt('modals/04-mission-briefing.png', async () => {
    await closeOverlays();
    await clickLeftTab('MISSIONS');
    await page.locator('.mission-block .quick-actions button').filter({ hasText: 'BRIEF' }).first().click();
  }, '.layer:not(.hidden) [role="dialog"]');

  await attempt('modals/05-decision-prompt.png', async () => {
    await closeOverlays();
    await scenario('TRACK LOSS').click();
    await page.waitForTimeout(500);
  }, '.layer:not(.hidden) [role="dialog"]');

  await attempt('modals/06-after-action-review.png', async () => {
    await closeOverlays();
    await clickLeftTab('MISSIONS');
    await page.locator('.mission-block .quick-actions button').filter({ hasText: 'BRIEF' }).first().click();
    await page.waitForTimeout(400);
    const choices = await page.locator('.layer:not(.hidden) button').allTextContents();
    const execute = page.locator('.layer:not(.hidden) button').filter({ hasText: /EXECUTE|APPROVE|LAUNCH/i }).first();
    if (!choices.some((text) => /EXECUTE|APPROVE|LAUNCH/i.test(text))) throw new Error('Mission briefing has no launch action');
    await execute.click();
    await page.waitForTimeout(22000);
  }, '.layer:not(.hidden) [role="dialog"]');

  await attempt('modals/07-metrics-dashboard.png', async () => {
    await closeOverlays();
    await clickRightTab('METRICS');
  }, '.right-tab-content');

  await attempt('modals/08-command-palette.png', async () => {
    await page.keyboard.press('Control+k');
    await page.getByLabel('Search commands').fill('strike');
  }, '[role="dialog"] input');

  await attempt('modals/09-glossary.png', async () => {
    await closeOverlays();
    await clickButton('HELP');
    await clickButton('GLOSSARY');
  }, '.layer:not(.hidden) [aria-label="Glossary"]');

  await attempt('modals/10-shortcut-help.png', async () => {
    await closeOverlays();
    await page.keyboard.press('?');
  }, '.layer:not(.hidden) [aria-label="Keyboard shortcuts"]');

  await attempt('features/11-trajectory-mid-flight.png', async () => {
    await closeOverlays();
    await page.locator('.mission-block .quick-actions button').filter({ hasText: 'EXECUTE' }).first().click();
    await page.waitForTimeout(2500);
  }, '.trajectory-dot');

  await attempt('features/12-trajectory-impact.png', async () => {
    await page.waitForTimeout(15000);
  }, '.trajectory-impact-pulse');

  await attempt('features/13-voice-caption-active.png', async () => {
    await clickButton('AIR SUPERIORITY');
    await page.locator('.mission-block .quick-actions button').filter({ hasText: 'BRIEF' }).first().click();
    await page.waitForTimeout(350);
    await page.locator('.layer:not(.hidden) button').filter({ hasText: /APPROVE|EXECUTE|LAUNCH/i }).first().click();
  }, '.caption');

  await attempt('features/14-focus-pointer.png', async () => {
    await page.waitForTimeout(800);
  }, '.focus-layer .ring');

  await attempt('features/15-weapon-matrix.png', async () => {
    await closeOverlays();
    await clickRightTab('WEAPONS');
  }, '.matrix-panel');

  await attempt('features/16-cyber-panel.png', async () => {
    await clickRightTab('CYBER');
  }, '.cyber-panel');

  await attempt('features/17-red-view.png', async () => {
    await clickRightTab('RED VIEW');
  }, '.right-tab-content');

  await attempt('features/18-3d-terrain.png', async () => {
    await closeOverlays();
    await page.getByRole('checkbox', { name: /3D terrain/i }).click();
    await page.waitForTimeout(800);
  }, '.map-wrap');

  await attempt('states/19-track-loss-decision.png', async () => {
    await closeOverlays();
    await scenario('TRACK LOSS').click();
    await page.waitForTimeout(700);
  }, '.layer:not(.hidden) [role="dialog"]');

  await attempt('states/20-data-poisoning-detected.png', async () => {
    await closeOverlays();
    await scenario('DATA POISONING').click();
    await page.waitForTimeout(2600);
  }, '.map-wrap');

  await attempt('states/21-degraded-mode.png', async () => {
    await closeOverlays();
    await scenario('RADAR LOSS').click();
    await page.waitForTimeout(900);
  }, '.map-wrap .degraded');

  await attempt('states/22-loadout-su30.png', async () => {
    await closeOverlays();
    await clickLeftTab('FORCE ROSTER');
    await page.locator('.list .row').filter({ hasText: 'Su-30MKI' }).first().locator('button', { hasText: 'LOADOUT' }).click();
  }, '.layer:not(.hidden) [role="dialog"]');

  await attempt('states/23-loadout-rafale.png', async () => {
    await closeOverlays();
    await clickLeftTab('FORCE ROSTER');
    await page.locator('.list .row').filter({ hasText: 'Rafale' }).first().locator('button', { hasText: 'LOADOUT' }).click();
  }, '.layer:not(.hidden) [role="dialog"]');

  await browser.close();
  const failureLines = failed.map(({ file, reason }) => `${file}: ${reason}`);
  for (const error of runtimeErrors) failureLines.push(`runtime: ${error}`);
  await writeFile(resolve(output, 'FAILED.txt'), failureLines.length ? failureLines.join('\n') + '\n' : 'No screenshot captures failed.\n');
  console.log(`Captured ${captured.length} of 23 screenshots.`);
  console.log(captured.join('\n'));
  console.log(`Failed ${failed.length}. See docs/screenshots/FAILED.txt`);
  if (ownsServer) server?.kill();
}

main().catch(async (error) => {
  await writeFile(resolve(output, 'FAILED.txt'), `capture-runner: ${error.message}\n`).catch(() => {});
  console.error(error);
  if (ownsServer) server?.kill();
  process.exitCode = 1;
});
