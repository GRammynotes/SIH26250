import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
try {
  await mkdir('docs/screenshots/final', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => { if (/VOICE|DEMO/.test(msg.text())) console.log(`[browser] ${msg.text()}`); });
  await page.addInitScript(() => {
    const nativeSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    const calls = [];
    window.speechSynthesis.speak = (utterance) => { calls.push(utterance.text); window.__voiceCalls = calls; nativeSpeak(utterance); };
  });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(1200);
  const getZoom = async () => Number((await page.locator('.coord.tr').innerText()).match(/ZOOM ([\d.]+)/)?.[1] ?? 4.2);
  const zoomOut = page.locator('.maplibregl-ctrl-zoom-out');
  for (let i = 0; i < 10 && await getZoom() > 2.5; i++) { await zoomOut.click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/final/01-zoom-2-cluster.png' });
  const zoomIn = page.locator('.maplibregl-ctrl-zoom-in');
  for (let i = 0; i < 10 && await getZoom() < 5.9; i++) { await zoomIn.click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/final/02-zoom-6-symbols.png' });
  await page.getByRole('button', { name: 'HELP' }).click();
  await page.getByRole('menuitem', { name: /COMPREHENSIVE DEMO/ }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'docs/screenshots/final/03-demo-step-active.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'TOOLS' }).click();
  await page.getByRole('menuitem', { name: /REFERENCE/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /OPERATION SINDOOR/ }).click();
  await page.waitForTimeout(250);
  const focusTarget = page.getByRole('button', { name: /TARGET AREA/ });
  if (await focusTarget.count()) await focusTarget.click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'docs/screenshots/final/04-diagram-click-zoom.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.speechSynthesis.speaking && !window.speechSynthesis.pending, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.evaluate(() => { if (window.__voiceCalls) window.__voiceCalls.length = 0; });
  const generate = page.getByRole('button', { name: /GENERATE COA/ }).first();
  if (await generate.count()) { await generate.click(); await page.waitForTimeout(900); await generate.click(); }
  await page.waitForTimeout(1800);
  const voiceCalls = await page.evaluate(() => window.__voiceCalls ?? []);
  await page.evaluate((calls) => {
    const panel = document.createElement('pre');
    panel.textContent = `VOICE DEDUPE · ${calls.length} SPEAK CALL(S)\n${calls.join('\n')}`;
    Object.assign(panel.style, { position: 'fixed', zIndex: 9999, right: '16px', bottom: '16px', padding: '12px', color: '#00d4ff', background: '#05080f', border: '1px solid #00d4ff', font: '12px monospace' });
    document.body.append(panel);
  }, voiceCalls);
  await page.screenshot({ path: 'docs/screenshots/final/05-voice-dedupe-before-after.png' });
} finally { await browser.close(); }
