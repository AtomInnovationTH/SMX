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

  // 2) Air-gap default (M2.4/M2.11): the working gap of the FG40 sandwich is 0.15 mm —
  //    as tight as the flutter margin allows at 100 kgf pretension — and the label SAYS
  //    so in millimetres. (This replaced the grip slider's "field strength" multiplier.)
  const grip = await page.evaluate(() => {
    const g = window.__smokeGame;
    return { gap: g.airGapMm, val: document.getElementById('airGap')?.value, lbl: document.getElementById('airGapValue')?.textContent };
  });
  record('air gap default = 0.15 mm at slider raw 0.15',
    Math.abs(grip.gap - 0.15) < 1e-9 && grip.val === '0.15' && grip.lbl === '0.15 mm',
    JSON.stringify(grip));

  //    ...and dragging it re-labels in millimetres within the published curve's domain.
  const gripDrag = await page.evaluate(async () => {
    const el = document.getElementById('airGap');
    const before = el.value;
    el.value = '5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    const out = { lbl: document.getElementById('airGapValue').textContent, gap: window.__smokeGame.airGapMm };
    el.value = before;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    return { ...out, restored: window.__smokeGame.airGapMm };
  });
  record('air gap slider max reads 5.00 mm (edge of the published curve)',
    gripDrag.lbl === '5.00 mm' && Math.abs(gripDrag.gap - 5) < 1e-9 && Math.abs(gripDrag.restored - 0.15) < 1e-9,
    JSON.stringify(gripDrag));

  // 3) EPM loop: engaging via the real SPACE key drains charge and drives the net readout.
  //    Deterministic ON PURPOSE. The old version held SPACE from a full charge and asserted
  //    "charge moved and netPerSec != 0", which is environment dependent: epmChargeStep
  //    clamps with Math.min(CAPACITY, ...) and netPerSec is (next - charge)/dt, so at a
  //    saturated charge BOTH are legitimately 0 whenever ambient coupling quality happens to
  //    beat break-even (DRAIN/REGEN ~ 0.43). That passed locally and failed in CI on frame
  //    pacing alone. Force quality 0 from a non-saturated charge so the sign is fixed:
  //    net = TRICKLE - DRAIN = -1.5/s for the base tier.
  const epmSetup = await page.evaluate(() => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    const origAmp = g.waveSystem.amplitude;
    g.waveSystem.amplitude = 0;   // quality 0 -> pure drain, no timing dependence
    g.epmCharge = 50;             // clear of the CAPACITY clamp so movement is observable
    g.epmBrownout = false;
    return { origAmp, c: g.epmCharge };
  });
  await page.keyboard.down(' ');
  await page.waitForTimeout(350);
  const during = await page.evaluate(() => ({
    c: window.__smokeGame.epmCharge,
    n: window.__smokeGame.epmNetPerSec,
    grab: window.__smokeGame.monkey.isGrabbing,
  }));
  await page.keyboard.up(' ');
  await page.evaluate((amp) => { window.__smokeGame.waveSystem.amplitude = amp; }, epmSetup.origAmp);
  record('EPM: pulsing engages + drains charge (net < 0 at quality 0)',
    during.grab === true && during.c < epmSetup.c && during.n < 0,
    JSON.stringify({ base: epmSetup.c, during }));

  // 4) Brownout latches, the audio cue fires exactly once, and coasting recovers it.
  const brownout = await page.evaluate(async () => {
    const g = window.__smokeGame;
    window.__cue = 0;
    const orig = g.audio.brownout.bind(g.audio);
    g.audio.brownout = () => { window.__cue++; orig(); };
    // The magnet ladder is gone (M2.6) and M2.8's drain is switching watts (269 kW at
    // defaults ≈ 26.9 charge-points/s): trip the latch from a small charge instead of a
    // large tier — deterministic: 0.2 / (26.9 - TRICKLE 1.5) ≈ 8 ms to brownout.
    g.waveSystem.amplitude = 0;               // no film velocity -> no thrust -> pure drain
    g.epmCharge = 0.2; g.epmBrownout = false; g.monkey.isGrabbing = true;
    await new Promise((r) => setTimeout(r, 400));
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

  // 7) Focus loss releases the engage latch and clears held keys. SPACE is the only
  //    gameplay key now that the lateral axis is gone, so this presses SPACE plus an inert
  //    key: blur must clear BOTH the isGrabbing latch and the whole keys map, or a
  //    suppressed keyup would leave the stack engaged forever.
  const blur = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // inert: no handler
    await new Promise((r) => setTimeout(r, 60));
    const before = {
      grab: g.monkey.isGrabbing,
      space: g.inputManager.isKeyPressed(' '),
      inert: g.inputManager.isKeyPressed('x'),
    };
    window.dispatchEvent(new Event('blur'));
    await new Promise((r) => setTimeout(r, 60));
    const after = {
      grab: g.monkey.isGrabbing,
      space: g.inputManager.isKeyPressed(' '),
      inert: g.inputManager.isKeyPressed('x'),
      keys: Object.keys(g.inputManager.keys).length,
    };
    return { before, after };
  });
  record('blur: releases the engage latch + clears keys',
    blur.before.grab === true && blur.before.space === true && blur.before.inert === true &&
    blur.after.grab === false && blur.after.space === false && blur.after.inert === false &&
    blur.after.keys === 0,
    JSON.stringify(blur));

  // 8) Gear button opens Settings via a REAL mouse click, drops focus afterwards, and the
  //    in-panel colorblind label stays in sync via either route (task 2).
  //    A programmatic element.click() is NOT sufficient here: it bypasses hit-testing (so it
  //    cannot see the loading overlay still swallowing clicks mid-fade) and it does not move
  //    focus (so it cannot see a focused <button> gating SPACE via _isFormTarget).
  await page.waitForFunction(() => {
    const o = document.getElementById('loading-overlay');
    return !o || getComputedStyle(o).display === 'none';
  }, null, { timeout: 20000 });
  const gearBox = await page.evaluate(() => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    document.getElementById('settingsPanel').classList.remove('visible');
    const r = document.getElementById('ux-settings-btn').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(gearBox.x, gearBox.y);
  await page.waitForTimeout(80);
  const gearState = await page.evaluate(() => ({
    panelVisible: document.getElementById('settingsPanel').classList.contains('visible'),
    activeTag: document.activeElement && document.activeElement.tagName,
  }));
  // Gameplay keys must still reach the game after clicking the gear (focus was dropped).
  await page.keyboard.down(' ');
  await page.waitForTimeout(120);
  const pulseAfterGear = await page.evaluate(() => window.__smokeGame.monkey.isGrabbing);
  await page.keyboard.up(' ');
  // A second, non-SPACE gameplay key must also reach the game. Arrows used to serve here;
  // with the lateral axis gone, the wave-type keys are the surviving observable input.
  await page.evaluate(() => window.__smokeGame.waveSystem.setType('sine'));
  await page.keyboard.press('2');
  await page.waitForTimeout(80);
  const waveAfterGear = await page.evaluate(() => window.__smokeGame.waveSystem.getType());
  await page.evaluate(() => window.__smokeGame.waveSystem.setType('sine'));
  const labels = await page.evaluate(async () => {
    const btn = document.getElementById('colorblindToggle');
    const initial = btn.textContent;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // C key route
    await new Promise((r) => setTimeout(r, 30));
    const afterC = btn.textContent;
    btn.click(); // button route
    await new Promise((r) => setTimeout(r, 30));
    return { initial, afterC, afterBtn: btn.textContent };
  });
  record('gear opens Settings (real click), drops focus, colorblind label in sync',
    gearState.panelVisible === true && gearState.activeTag !== 'BUTTON' &&
    pulseAfterGear === true && waveAfterGear === 'square' &&
    labels.initial === 'Colorblind palette: Off' &&
    labels.afterC === 'Colorblind palette: On' &&
    labels.afterBtn === 'Colorblind palette: Off',
    JSON.stringify({ gearState, pulseAfterGear, waveAfterGear, labels }));

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
