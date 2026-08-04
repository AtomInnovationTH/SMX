// Optional, local-only browser smoke test for Space Monkey Elevator.
//
// The unit suite (node --test tests/*.test.mjs) covers the pure logic but cannot boot
// the game, render, or catch asset 404s. This script drives the *built* index.html in a
// real headless Chromium and checks the things only a browser can: boot, the EPM energy
// loop, landmark/cloud transform anchors, the single-RAF loop, and focus-loss handling.
//
// It is deliberately NOT part of `node --test` (it lives outside the tests/*.test.mjs
// glob) and adds NO committed dependency. It resolves playwright-core and a Chromium
// binary at runtime and SKIPS cleanly (exit 0) if either is missing, so the repo stays
// zero-dependency and CI stays browser-free.
//
// Run it:
//   npm i -D playwright-core        # local, gitignored; or point PLAYWRIGHT_CORE at one
//   npx playwright install chromium # or set SMOKE_CHROMIUM to an existing browser binary
//   node tests/smoke/smoke.mjs
//
// Env overrides:
//   PLAYWRIGHT_CORE  absolute path/specifier for the playwright-core module
//   SMOKE_CHROMIUM   absolute path to a Chromium/Chrome executable
//   SMOKE_HEADED=1   run headed (watch it)
//
// Exit codes: 0 = all checks passed OR skipped (deps/browser absent); 1 = a check failed.

import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // repo root (serves index.html + assets/)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

function skip(reason) {
  console.log(`SMOKE SKIPPED — ${reason}`);
  console.log('  To run it locally: `npm i -D playwright-core && npx playwright install chromium`,');
  console.log('  then `node tests/smoke/smoke.mjs` (or set SMOKE_CHROMIUM to a Chrome/Chromium binary).');
  process.exit(0);
}

// --- resolve playwright-core (runtime, optional) --------------------------------------
let chromium;
try {
  const spec = process.env.PLAYWRIGHT_CORE || 'playwright-core';
  ({ chromium } = await import(spec));
} catch {
  skip('playwright-core is not installed');
}

// --- resolve a Chromium binary --------------------------------------------------------
async function findFile(dir, matcher, depth = 6) {
  if (depth < 0) return null;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && matcher(e.name)) return full;
    if (e.isDirectory()) {
      const found = await findFile(full, matcher, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

async function discoverChromium() {
  if (process.env.SMOKE_CHROMIUM && existsSync(process.env.SMOKE_CHROMIUM)) {
    return process.env.SMOKE_CHROMIUM;
  }
  // Best-effort: let playwright pick its managed build.
  try {
    const p = chromium.executablePath();
    if (p && existsSync(p)) return p;
  } catch { /* managed browser not installed */ }
  // Fall back to scanning the ms-playwright cache for any chromium-* build.
  const caches = [
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS
    path.join(os.homedir(), '.cache', 'ms-playwright'),            // Linux
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),    // Windows
  ].filter(Boolean);
  const isBinary = (n) =>
    n === 'Google Chrome for Testing' || n === 'Chromium' || n === 'chrome' || n === 'chrome.exe';
  for (const cache of caches) {
    try {
      const dirs = (await readdir(cache, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name.startsWith('chromium'))
        .map((d) => path.join(cache, d.name));
      for (const d of dirs) {
        const bin = await findFile(d, isBinary);
        if (bin) { try { await stat(bin); return bin; } catch { /* keep looking */ } }
      }
    } catch { /* no cache here */ }
  }
  return null;
}

const executablePath = await discoverChromium();
if (!executablePath) skip('no Chromium binary found');

// --- tiny static server on an ephemeral port ------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const abs = path.join(ROOT, rel);
    if (!abs.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    const body = await readFile(abs);
    res.writeHead(200, { 'content-type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const BASE = `http://127.0.0.1:${port}`;

// --- run the checks -------------------------------------------------------------------
const results = [];
const record = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

let browser;
try {
  browser = await chromium.launch({ executablePath, headless: !process.env.SMOKE_HEADED, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebGL/i.test(m.text())) consoleErrors.push('console: ' + m.text()); });

  await page.goto(`${BASE}/index.html?debug`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__smokeGame && window.__smokeGame.monkey, null, { timeout: 20000 });
  await page.waitForTimeout(500);

  // 1) Boot: loading overlay cleared, no non-WebGL console/page errors.
  const loadingHidden = await page.evaluate(() => {
    const o = document.getElementById('loading-overlay');
    return !o || getComputedStyle(o).display === 'none' || getComputedStyle(o).opacity === '0';
  });
  record('boot: loading overlay cleared', loadingHidden);

  // 2) Grip default: fresh gripMultiplier is the tuned reference 1.0, slider reads 20/"20%".
  const grip = await page.evaluate(() => {
    const g = window.__smokeGame;
    return { mult: g.gripMultiplier, val: document.getElementById('grip')?.value, lbl: document.getElementById('gripValue')?.textContent };
  });
  record('grip default = 1.0 at slider 20/"20%"', Math.abs(grip.mult - 1) < 1e-9 && grip.val === '20' && grip.lbl === '20%', JSON.stringify(grip));

  // 3) EPM loop: engaging drains/moves charge and the net readout.
  const base = await page.evaluate(() => ({ c: window.__smokeGame.epmCharge, n: window.__smokeGame.epmNetPerSec }));
  await page.keyboard.down(' ');
  await page.waitForTimeout(350);
  const during = await page.evaluate(() => ({ c: window.__smokeGame.epmCharge, n: window.__smokeGame.epmNetPerSec, grab: window.__smokeGame.monkey.isGrabbing }));
  await page.keyboard.up(' ');
  record('EPM: pulsing engages + moves charge/net', during.grab === true && during.c !== base.c && Math.abs(during.n) > 0, JSON.stringify(during));

  // 4) Brownout latches, the audio cue fires exactly once, and coasting recovers it.
  const brownout = await page.evaluate(async () => {
    const g = window.__smokeGame;
    window.__cue = 0;
    const orig = g.audio.brownout.bind(g.audio);
    g.audio.brownout = () => { window.__cue++; orig(); };
    g.monkey.equipment.magnet = 'hallbach';   // largest drain
    g.waveSystem.amplitude = 0;               // quality 0 -> pure drain
    g.epmCharge = 1.0; g.epmBrownout = false; g.monkey.isGrabbing = true;
    await new Promise((r) => setTimeout(r, 200));
    const latched = g.epmBrownout, cueAtLatch = window.__cue;
    await new Promise((r) => setTimeout(r, 300));
    const cueHeld = window.__cue;
    g.monkey.isGrabbing = false;              // coast -> trickle recovery
    let recovered = false;
    for (let i = 0; i < 30 && !recovered; i++) { await new Promise((r) => setTimeout(r, 500)); recovered = g.epmBrownout === false; }
    return { latched, cueAtLatch, cueHeld, recovered, charge: g.epmCharge };
  });
  record('EPM: brownout latch + single-fire cue + recovery', brownout.latched && brownout.cueAtLatch === 1 && brownout.cueHeld === 1 && brownout.recovered, JSON.stringify(brownout));

  // 5) Landmark transform anchors: Everest spans the viewport; Kármán is centered.
  const anchors = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const at = async (altM) => {
      g.monkey.y = -altM * 10; g.monkey.velocityY = 0; g.camera.y = g.monkey.y + g.canvas.height * 0.5;
      await new Promise((r) => setTimeout(r, 120));
      g.monkey.y = -altM * 10; g.monkey.velocityY = 0;
      await new Promise((r) => setTimeout(r, 80));
      const out = {};
      g.landmarkSystem.landmarks.forEach((l) => {
        if (l.element.style.display === 'none') return;
        const r = l.element.getBoundingClientRect();
        if (l.name === 'Mount Everest') out.everest = { w: Math.round(r.width), left: Math.round(r.left), vw: innerWidth };
        if (l.name === 'Kármán Line') out.karman = { cx: Math.round(r.left + r.width / 2), half: Math.round(innerWidth / 2) };
      });
      return out;
    };
    return { e: await at(8848), k: await at(100000) };
  });
  const everestOk = anchors.e.everest && Math.abs(anchors.e.everest.w - anchors.e.everest.vw) < 2 && Math.abs(anchors.e.everest.left) < 2;
  const karmanOk = anchors.k.karman && Math.abs(anchors.k.karman.cx - anchors.k.karman.half) < 40;
  record('anchors: Everest full-width + Kármán centered', everestOk && karmanOk, JSON.stringify(anchors));

  // 6) Single RAF loop: a fast pause/unpause burst must not leave a second chain (rate-independent).
  const raf = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    let calls = 0; const orig = g._boundUpdate; g._boundUpdate = (t) => { calls++; return orig(t); };
    const win = async () => { const s = calls; await new Promise((r) => setTimeout(r, 500)); return calls - s; };
    await new Promise((r) => setTimeout(r, 200));
    const baseline = await win();
    for (let i = 0; i < 30; i++) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (g.paused) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const burst = await win();
    g._boundUpdate = orig;
    return { baseline, burst, ratio: burst / baseline, paused: g.paused };
  });
  record('loop: single RAF chain after pause/unpause burst', raf.paused === false && raf.ratio < 1.4, JSON.stringify(raf));

  // 7) Focus loss releases the grab and clears held keys.
  const blur = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await new Promise((r) => setTimeout(r, 60));
    const before = { grab: g.monkey.isGrabbing, left: g.inputManager.isLeft() };
    window.dispatchEvent(new Event('blur'));
    await new Promise((r) => setTimeout(r, 60));
    const after = { grab: g.monkey.isGrabbing, left: g.inputManager.isLeft(), keys: Object.keys(g.inputManager.keys).length };
    return { before, after };
  });
  record('blur: releases grab + clears keys', blur.before.grab === true && blur.after.grab === false && blur.after.left === false && blur.after.keys === 0, JSON.stringify(blur));

  // 8) Gear button opens Settings; the in-panel colorblind toggle exists and its label
  //    stays in sync whether toggled by the button or the C key (task 2).
  const settings = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    const panel = document.getElementById('settingsPanel');
    const gear = document.getElementById('ux-settings-btn');
    const btn = document.getElementById('colorblindToggle');
    const before = panel.classList.contains('visible');
    gear.click();
    await new Promise((r) => setTimeout(r, 30));
    const afterGear = panel.classList.contains('visible');
    const initialLabel = btn.textContent;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // C key route
    await new Promise((r) => setTimeout(r, 30));
    const afterC = btn.textContent;
    btn.click(); // button route
    await new Promise((r) => setTimeout(r, 30));
    const afterBtn = btn.textContent;
    return { before, afterGear, initialLabel, afterC, afterBtn };
  });
  record('gear opens Settings + colorblind label in sync',
    settings.before === false && settings.afterGear === true &&
    settings.initialLabel === 'Colorblind palette: Off' &&
    settings.afterC === 'Colorblind palette: On' &&
    settings.afterBtn === 'Colorblind palette: Off',
    JSON.stringify(settings));

  // 9) Restart latch (task 10): a single R arms (no restart); a second R within the window
  //    restarts and clears the latch; and initGame clears it (D1) so a fresh run needs a
  //    fresh confirm instead of a single stray R restarting immediately.
  const latch = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    g.restartArmedAt = 0;
    let initCalls = 0;
    const origInit = g.initGame.bind(g);
    g.initGame = (...a) => { initCalls++; return origInit(...a); };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); // arm
    await new Promise((r) => setTimeout(r, 30));
    const armed = g.restartArmedAt > 0;
    const callsAfterArm = initCalls;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); // confirm
    await new Promise((r) => setTimeout(r, 50));
    const callsAfterConfirm = initCalls;
    const armedAtCleared = g.restartArmedAt === 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); // fresh run, single R
    await new Promise((r) => setTimeout(r, 30));
    const d1Armed = g.restartArmedAt > 0; // armed again, not an instant restart
    const callsAfterD1 = initCalls;
    g.initGame = origInit;
    return { armed, callsAfterArm, callsAfterConfirm, armedAtCleared, d1Armed, callsAfterD1 };
  });
  record('restart: arm then confirm restarts; fresh run needs a fresh confirm',
    latch.armed === true && latch.callsAfterArm === 0 &&
    latch.callsAfterConfirm === 1 && latch.armedAtCleared === true &&
    latch.d1Armed === true && latch.callsAfterD1 === 1,
    JSON.stringify(latch));

  record('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 6).join(' | '));
} catch (err) {
  record('harness', false, String(err && err.stack || err));
} finally {
  if (browser) await browser.close();
  server.close();
}

// --- report ---------------------------------------------------------------------------
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.detail || ''}`}`);
  if (!r.ok) failed++;
}
console.log(`\n${failed === 0 ? 'SMOKE PASS' : 'SMOKE FAIL'} — ${results.length - failed}/${results.length} checks`);
process.exit(failed === 0 ? 0 : 1);
