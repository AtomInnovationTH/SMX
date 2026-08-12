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
const ROOT = path.resolve(HERE, '..', '..', '..'); // repo root (serves index.html + assets/)

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
    // The magnet ladder is gone (M2.6) and M2.8's drain is switching watts. At the shift 9
    // demo defaults that is 11.8 kW over a 0.19 MJ buffer ≈ 6.2 charge-points/s (the same
    // drain rate the 128-pair stack had over 3 MJ): trip the latch from a small charge
    // instead of a large tier — 0.2 / (6.2 - TRICKLE 3.0) ≈ 63 ms to brownout.
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

  // 10) M3.1: the FG40 sandwich renders every frame (it is the vehicle, drawn engaged or
  //     not) and the firing sweep advances while engaged. Shift 9 added the LITERAL check:
  //     the demo stack is 8 pairs and the drawing is 8 pairs, so what is on screen is what
  //     is in the model. Reads the live render handles on window.__smokeGame.
  const stack = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await new Promise((r) => setTimeout(r, 150));
    const out = { grab: g.monkey.isGrabbing, pairs: g._stackDrawnPairs, literal: g._stackDrawnLiteral,
                  nPairs: g.nPairs, sweepA: g._stackSweepPos };
    await new Promise((r) => setTimeout(r, 300));
    out.sweepB = g._stackSweepPos;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    return out;
  });
  record('FG40 stack renders the LITERAL 8 pairs of the demo stack; the firing sweep advances',
    stack.grab === true && stack.pairs === 8 && stack.nPairs === 8 && stack.literal === true &&
    stack.sweepA !== stack.sweepB,
    JSON.stringify(stack));

  // 10b) Shift 10 non-contact: the film RENDERS as a band, and the band the renderer
  //      actually drew keeps daylight to the sprite's clamp jaws at every film width. The
  //      pure test pins the function; this pins what the live renderer put on screen, at
  //      the default and at the top of the width slider (1000 mm).
  const bandInfo = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await wait();
    const out = { atDefault: g._filmBandHalfPx, jaws: g._clampJawHalfPx };
    const slider = document.getElementById('width');
    const before = slider.value;
    slider.value = '1000';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    out.atMax = g._filmBandHalfPx;
    slider.value = '10';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    out.atMin = g._filmBandHalfPx;
    slider.value = before;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    return out;
  });
  record('film draws as a BAND (not a line) and never grows into the climber\'s clamp jaws',
    bandInfo.atDefault === 12 && bandInfo.atMax < bandInfo.jaws && bandInfo.atMin >= 3 &&
    bandInfo.atMax > bandInfo.atMin && bandInfo.jaws === 16,
    JSON.stringify(bandInfo));

  // 11) M3.1 photosafety: the firing gradient is a SLOWED schematic. Each unit modulates
  //     at 1/period, which must stay under the 3 flashes/s photosensitive-seizure ceiling
  //     (a literal 92-1000 Hz firing animation would be a strobe), and the sweep FREEZES
  //     to a static lit state under prefers-reduced-motion — checked on a second page
  //     booted with reducedMotion:'reduce' (the flag is read at window load).
  const sweepInfo = await page.evaluate(() => ({ period: window.__smokeGame._stackSweepPeriodS }));
  record('firing sweep respects the 3 Hz photosafety ceiling',
    typeof sweepInfo.period === 'number' && 1 / sweepInfo.period <= 3, JSON.stringify(sweepInfo));
  const rmContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(`${BASE}/index.html?debug`, { waitUntil: 'load' });
  // __smokeGame is exposed in the constructor, BEFORE the loading gate completes and the
  // first frame renders — wait for the render handles themselves, or the samples below
  // read undefined on a slow boot.
  await rmPage.waitForFunction(
    () => window.__smokeGame && typeof window.__smokeGame._stackSweepPos === 'number',
    null, { timeout: 20000, polling: 100 });
  const frozen = await rmPage.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    const a = g._stackSweepPos;
    await new Promise((r) => setTimeout(r, 400));
    return { a, b: g._stackSweepPos, flag: g._stackSweepFrozen, pairs: g._stackDrawnPairs };
  });
  record('firing sweep freezes to a static lit state under reduced motion',
    frozen.flag === true && frozen.a === frozen.b && frozen.pairs === 8, JSON.stringify(frozen));
  await rmContext.close();

  // 12) M3.4: the event schedule — the 12 km transverse reveal fires on the crossing
  //     (once per run, card queued), and the 70 km gigacycle-fatigue beat stays SILENT
  //     at the 92 Hz default: it is conditional on the carrier sitting in the paper's
  //     top decade (freqDecadeColumn >= 6), and 92 Hz is the 100 Hz column.
  const beats = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    g.monkey.velocityY = -20000;                       // 2 km/s: fast, deterministic crossings
    g.monkey.y = -115000; g.camera.y = g.monkey.y + 400;   // 11.5 km, climbing
    await new Promise((r) => setTimeout(r, 400));           // crosses 12 km
    const t12 = { fired: g._beatsFired.has('transverse'), card: g._beatCard && g._beatCard.title };
    g.monkey.y = -695000; g.camera.y = g.monkey.y + 400;   // 69.5 km (teleport also crosses 20 km)
    await new Promise((r) => setTimeout(r, 400));           // crosses 70 km at 92 Hz
    const out = { t12, fatigueFired: g._beatsFired.has('fatigue'), freq: g.waveSystem.frequency,
                  queueLen: g._beatQueue.length };
    g.monkey.velocityY = 0;
    return out;
  });
  record('event schedule: 12 km reveal fires; 70 km fatigue beat silent at 92 Hz',
    beats.t12.fired === true && typeof beats.t12.card === 'string' && beats.t12.card.includes('transverse') &&
    beats.fatigueFired === false && Math.abs(beats.freq - 92) < 1,   // log-slider float noise
    JSON.stringify(beats));

  // 13) M3.5: descending climbers replaced the pickups. Check 12's teleport crossed BOTH
  //     descender trigger altitudes (30 km, 60 km), so by now each rider has spawned, been
  //     drawn at least once, and passed the player — the pass retargets the milestone
  //     shake/burst, kicks the schematic film ripple, and queues a beat card.
  const desc = await page.evaluate(() => {
    const g = window.__smokeGame;
    const titles = [g._beatCard, ...g._beatQueue].filter(Boolean).map((c) => c.title);
    return { fired: [...g._descendersFired],
             ripple: !!g._filmRipple,
             drawn: g._descenderDrawnTotal || 0,
             hasDescCard: titles.some((t) => t.includes('descending climber')),
             hasTopCard: titles.some((t) => t.includes('power from the top')) };
  });
  record('descenders: 30/60 km riders spawn, render, pass — ripple + beat cards queued',
    desc.fired.includes('desc-30') && desc.fired.includes('desc-60') &&
    desc.ripple === true && desc.drawn >= 1 && desc.hasDescCard && desc.hasTopCard,
    JSON.stringify(desc));

  // 14) M3.7: presets apply a whole configuration through the SAME slider path (DOM
  //     events -> existing listeners -> eventBus), so labels, readouts and game state
  //     all track one click. Wessels pins his 60 cm stroke; Lofstrom's 1000 Hz lights the
  //     switching wall (128 kW on the shift 9 demo stack — small against the ground
  //     station's 4 MW, lethal to the climber's own 0.19 MJ buffer); Paper baseline
  //     restores 92 Hz and its 12 kW.
  const presets = await page.evaluate(() => {
    const g = window.__smokeGame;
    const click = (id) => document.querySelector(`[data-preset="${id}"]`).click();
    const read = () => ({
      hz: g.waveSystem.frequency, amp: g.waveSystem.amplitude, nPairs: g.nPairs, cargo: g.cargoKg,
      sw: document.getElementById('switchingValue').textContent,
      ampLabel: document.getElementById('amplitudeValue').textContent,
      freqLabel: document.getElementById('frequencyValue').textContent,
    });
    click('wessels'); const w = read();
    click('lofstrom'); const l = read();
    click('paper'); const p = read();
    return { w, l, p };
  });
  record('presets: Wessels 60 cm stroke, Lofstrom switching wall, Paper baseline restores',
    Math.abs(presets.w.amp - 0.6) < 1e-9 && presets.w.ampLabel.includes('0.60') &&
    Math.abs(presets.l.hz - 1000) < 1 && presets.l.sw.includes('128 kW') &&
    Math.abs(presets.p.hz - 92) < 1 && presets.p.freqLabel.includes('92.0') && presets.p.sw.includes('12 kW'),
    JSON.stringify(presets));

  // 15) M3.8: every persistence key moved to .v2 (bestScore -> bestAltitude.v2 — it
  //     always stored altitude). v1 values are NOT migrated (units and meaning both
  //     changed); they are deleted on first v2 load. Shift 9 adds the two v2 SCORE keys
  //     to the same purge, because the demo payload went 50 kg -> 3 kg and the bootstrap
  //     target 5000 kg -> 600 kg: a kept record would be unbeatable and a kept total
  //     would read 8x its real progress. Seed them all, reload, assert they are gone.
  const STALE_KEYS = ['spaceMonkey.bestScore', 'spaceMonkey.bestRun.v1', 'spaceMonkey.cargoBest.v1',
                      'spaceMonkey.bootstrapKg.v1', 'spaceMonkey.settings.v1', 'spaceMonkey.audioMuted.v1',
                      'spaceMonkey.cargoBest.v2', 'spaceMonkey.bootstrapKg.v2'];
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.setItem(k, '12345');
  }, STALE_KEYS);
  await page.reload({ waitUntil: 'load' });
  // __smokeGame is exposed in the constructor, BEFORE the first frame — wait on the
  // render handle, not just the game object.
  await page.waitForFunction(
    () => window.__smokeGame && typeof window.__smokeGame._stackSweepPos === 'number',
    null, { timeout: 20000, polling: 100 });
  const migrated = await page.evaluate((keys) => ({
    left: keys.filter((k) => localStorage.getItem(k) !== null),
    bestAlt: window.__smokeGame.bestAltitude,   // must NOT inherit the seeded 12345
    cargoBest: window.__smokeGame.cargoBest,
    bootstrap: window.__smokeGame.bootstrapKg,
  }), STALE_KEYS);
  record('persistence: stale-unit keys purged on load, values not migrated',
    migrated.left.length === 0 && migrated.bestAlt === 0 &&
    migrated.cargoBest === 0 && migrated.bootstrap === 0, JSON.stringify(migrated));

  // 16) Shift 9, touch play. A phone used to get "requires a keyboard" instead of the
  //     game. Boot a real touch viewport (390x844) and check the whole path: the game
  //     boots, the notice stays hidden, the copy stops naming a key that is not there,
  //     and the bottom HUD band collapses to the compact plate.
  const touchCtx = await browser.newContext({
    hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 },
  });
  const tPage = await touchCtx.newPage();
  const tErrors = [];
  tPage.on('pageerror', (e) => tErrors.push('pageerror: ' + e.message));
  tPage.on('console', (m) => { if (m.type() === 'error' && !/WebGL/i.test(m.text())) tErrors.push('console: ' + m.text()); });
  await tPage.goto(`${BASE}/index.html?debug`, { waitUntil: 'load' });
  await tPage.waitForFunction(
    () => window.__smokeGame && typeof window.__smokeGame._stackSweepPos === 'number',
    null, { timeout: 20000, polling: 100 });
  const touchBoot = await tPage.evaluate(() => ({
    notice: getComputedStyle(document.getElementById('mobile-notice')).display,
    touchClass: document.body.classList.contains('touch-play'),
    panelWord: document.getElementById('grab-input-word').textContent,
    heading: document.getElementById('settings-heading').textContent,
    compact: window.__smokeGame._compactHud,
    booted: !!window.__smokeGame.monkey,
  }));
  record('touch: a phone viewport boots the game (no keyboard notice), copy follows the device',
    touchBoot.booted === true && touchBoot.notice === 'none' && touchBoot.touchClass === true &&
    !/SPACE/i.test(touchBoot.panelWord) && !/Press S/i.test(touchBoot.heading) &&
    touchBoot.compact === true,
    JSON.stringify(touchBoot));

  // 17) Hold anywhere IS the button: a press on the play surface engages the stack and the
  //     lift releases it — the same input:grab event SPACE emits, no second input path.
  await tPage.evaluate(() => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true; g.monkey.isGrabbing = false;
  });
  await tPage.mouse.move(195, 520);
  await tPage.mouse.down();
  await tPage.waitForTimeout(120);
  const holdOn = await tPage.evaluate(() => window.__smokeGame.monkey.isGrabbing);
  await tPage.mouse.up();
  await tPage.waitForTimeout(120);
  const holdOff = await tPage.evaluate(() => window.__smokeGame.monkey.isGrabbing);
  //     ...and a second finger must not be able to release the first: the handler tracks
  //     pointer ids in a Set precisely because a boolean would drop the hold here.
  const multi = await tPage.evaluate(async () => {
    const g = window.__smokeGame;
    g.monkey.isGrabbing = false;
    const fire = (type, pointerId) => window.dispatchEvent(new PointerEvent(type, {
      pointerId, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: pointerId === 1,
    }));
    fire('pointerdown', 1);
    fire('pointerdown', 2);
    await new Promise((r) => setTimeout(r, 40));
    const both = g.monkey.isGrabbing;
    fire('pointerup', 1);
    await new Promise((r) => setTimeout(r, 40));
    const afterOneLift = g.monkey.isGrabbing;
    fire('pointerup', 2);
    await new Promise((r) => setTimeout(r, 40));
    return { both, afterOneLift, afterBothLift: g.monkey.isGrabbing };
  });
  record('touch: hold anywhere engages, lift releases, second finger cannot steal the release',
    holdOn === true && holdOff === false &&
    multi.both === true && multi.afterOneLift === true && multi.afterBothLift === false,
    JSON.stringify({ holdOn, holdOff, multi }));

  // 18) Chrome is not the play surface. Tapping the gear must open Settings WITHOUT
  //     engaging the stack (otherwise every settings visit is also a pulse), the panel has
  //     to be reachable at phone width, and it has to be closable — S is a key that is not
  //     there, so the close button is the only way out.
  const panelTouch = await tPage.evaluate(async () => {
    const g = window.__smokeGame;
    g.monkey.isGrabbing = false;
    document.getElementById('settingsPanel').classList.remove('visible');
    return { closeDisplay: getComputedStyle(document.getElementById('settings-close')).display };
  });
  const gearRect = await tPage.evaluate(() => {
    const r = document.getElementById('ux-settings-btn').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  await tPage.touchscreen.tap(gearRect.x, gearRect.y);
  await tPage.waitForTimeout(120);
  const afterGearTap = await tPage.evaluate(() => ({
    visible: document.getElementById('settingsPanel').classList.contains('visible'),
    grab: window.__smokeGame.monkey.isGrabbing,
    // The panel fills a phone viewport and scrolls, instead of overflowing off-screen.
    fits: document.getElementById('settingsPanel').getBoundingClientRect().width <= innerWidth,
  }));
  await tPage.touchscreen.tap(
    (await tPage.evaluate(() => { const r = document.getElementById('settings-close').getBoundingClientRect(); return r.x + r.width / 2; })),
    (await tPage.evaluate(() => { const r = document.getElementById('settings-close').getBoundingClientRect(); return r.y + r.height / 2; })));
  await tPage.waitForTimeout(120);
  const afterClose = await tPage.evaluate(() => ({
    visible: document.getElementById('settingsPanel').classList.contains('visible'),
    grab: window.__smokeGame.monkey.isGrabbing,
  }));
  record('touch: gear/close taps drive Settings without engaging the stack; panel fits the phone',
    panelTouch.closeDisplay === 'block' && gearRect.w >= 44 && gearRect.h >= 44 &&
    afterGearTap.visible === true && afterGearTap.grab === false && afterGearTap.fits === true &&
    afterClose.visible === false && afterClose.grab === false,
    JSON.stringify({ panelTouch, gearRect, afterGearTap, afterClose }));
  record('touch: no console/page errors on the phone viewport', tErrors.length === 0, tErrors.slice(0, 6).join(' | '));
  await touchCtx.close();

  // 19) Shift 9, instrument levels. The DEFAULT is minimal: a visitor lands on the climb,
  //     not on four HUD blocks plus a 640 px frequency table. H cycles minimal -> full ->
  //     off, and ?clean boots straight to off for captures (every instrument is drawn on
  //     the canvas, so no CSS could hide it). The stack keeps rendering at every level —
  //     it is the vehicle, not a readout.
  const desktopHud = await page.evaluate(() => window.__smokeGame._hudLevelDrawn);
  const cleanCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cPage = await cleanCtx.newPage();
  await cPage.goto(`${BASE}/index.html?debug&clean`, { waitUntil: 'load' });
  await cPage.waitForFunction(
    () => window.__smokeGame && typeof window.__smokeGame._hudLevelDrawn === 'number',
    null, { timeout: 20000, polling: 100 });
  const clean = await cPage.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    const press = async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
      await new Promise((r) => setTimeout(r, 120));
      return g._hudLevelDrawn;
    };
    await new Promise((r) => setTimeout(r, 120));
    const onLoad = g._hudLevelDrawn;                 // ?clean -> off (2)
    const gearHidden = getComputedStyle(document.getElementById('ux-settings-btn')).display;
    const after1 = await press();                    // -> minimal (0)
    const gearBack = getComputedStyle(document.getElementById('ux-settings-btn')).display;
    const after2 = await press();                    // -> full (1)
    const after3 = await press();                    // -> off (2)
    return { onLoad, after1, after2, after3, gearHidden, gearBack, pairs: g._stackDrawnPairs };
  });
  record('instruments: minimal by default, H cycles minimal/full/off, ?clean starts off',
    desktopHud === 0 && clean.onLoad === 2 && clean.after1 === 0 && clean.after2 === 1 &&
    clean.after3 === 2 && clean.gearHidden === 'none' && clean.gearBack !== 'none' &&
    clean.pairs === 8,
    JSON.stringify({ desktopHud, clean }));
  await cleanCtx.close();

  // 20) What each level actually PUTS ON SCREEN. Every instrument is canvas text, so this
  //     wraps ctx.fillText for one frame and diffs the strings drawn at minimal against
  //     full. Pins the two cuts that make the default friendly: an event beat is a title at
  //     minimal (its body is two or three lines of paper citation) and the energy gauge is a
  //     bar, not four lines of kilowatts and a slip ratio.
  const drawn = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    const setLevel = async (want) => {
      for (let i = 0; i < 4 && g._hudLevelDrawn !== want; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
        await new Promise((r) => setTimeout(r, 100));
      }
      return g._hudLevelDrawn === want;
    };
    const capture = async () => {
      // A card has to be on screen to be measured; 7 s is the normal lifetime.
      g._beatCard = { title: 'SMOKE-TITLE', lines: ['SMOKE-BODY-LINE'] };
      g._beatCardTimer = 6;
      const seen = [];
      const orig = g.ctx.fillText.bind(g.ctx);
      g.ctx.fillText = (s, x, y) => { seen.push(String(s)); return orig(s, x, y); };
      await new Promise((r) => setTimeout(r, 220));
      delete g.ctx.fillText;
      return seen;
    };
    const out = {};
    out.minimalSet = await setLevel(0); out.minimal = await capture();
    out.fullSet = await setLevel(1);    out.full = await capture();
    await setLevel(0);
    g._beatCard = null;
    return out;
  });
  const has = (a, re) => a.some((s) => re.test(s));
  record('levels: minimal draws the beat TITLE and a bare energy bar; full adds the readouts',
    drawn.minimalSet && drawn.fullSet &&
    has(drawn.minimal, /SMOKE-TITLE/) && !has(drawn.minimal, /SMOKE-BODY-LINE/) &&
    has(drawn.full, /SMOKE-TITLE/) && has(drawn.full, /SMOKE-BODY-LINE/) &&
    has(drawn.minimal, /^EPM$/) && !has(drawn.minimal, /switch \d+ kW/) && !has(drawn.minimal, /slip u =/) &&
    has(drawn.full, /switch \d+ kW/) && has(drawn.full, /slip u =/) &&
    // Minimal still says what to press: the compact plate is the one instruction left.
    has(drawn.minimal, /SPACE: pulse/),
    JSON.stringify({ minimalSet: drawn.minimalSet, fullSet: drawn.fullSet,
                     minimal: drawn.minimal.slice(0, 12), full: drawn.full.slice(0, 14) }));

  // 21) Shift 11, slip crests: the wave OVERTAKING the climber is drawn, not numbered.
  //     Held at u = 0 the chevron stream scrolls at the capped rate and the push factor
  //     is 1; flung past the film peak (u = 3) the gate is empty and the overlay must
  //     show exactly zero push and zero scroll — absence, not a clamp. The pass-rate cap
  //     respects the 3 Hz photosafety ceiling, the overlay hides at HUD off (?clean
  //     captures stay clean), and a reduced-motion boot gets a frozen scroll with the
  //     push channel still live (size/brightness carry u statically). Reads the live
  //     render handles renderVine sets every frame.
  const crests = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    g.monkey.velocityY = 0;
    await wait(150);
    const open = { drawn: g._crestDrawn, push: g._crestPush, speed: g._crestScrollPxS,
                   capHz: g._crestPassHzMax, hud: g._hudLevelDrawn, a: g._crestScrollPx };
    await wait(300);
    open.advanced = g._crestScrollPx - open.a;
    // u = 3: outrunning the crest, the gate never opens. Gravity over 300 ms adds only
    // ~3 m/s (GRAVITY = 98.1 px/s² at 10 px/m), so u cannot fall back under 1 here.
    g.monkey.velocityY = -3 * g.waveSystem.amplitude * g.waveSystem.frequency * 2 * Math.PI
        * 10;   // px/s (ALTITUDE_CONVERSION = 10 px/m)
    await wait(150);
    const closed = { push: g._crestPush, speed: g._crestScrollPxS, a: g._crestScrollPx };
    await wait(300);
    closed.advanced = g._crestScrollPx - closed.a;
    // Back to a quiet parked state on the ground (no game-over left behind).
    g.monkey.velocityY = 0; g.monkey.y = 0; g.monkey.altitude = 0; g.maxAltitude = 0;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    // HUD off must hide the overlay: it is an instrument, not the vehicle.
    for (let i = 0; i < 4 && g._hudLevelDrawn !== 2; i++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
      await wait(100);
    }
    const hiddenAtOff = g._hudLevelDrawn === 2 && g._crestDrawn === false;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));   // back to minimal
    await wait(100);
    return { open, closed, hiddenAtOff, restored: g._hudLevelDrawn };
  });
  //     ...and the reduced-motion boot, on its own page like check 11's.
  const crestRmCtx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const crestRmPage = await crestRmCtx.newPage();
  await crestRmPage.goto(`${BASE}/index.html?debug`, { waitUntil: 'load' });
  await crestRmPage.waitForFunction(
    () => window.__smokeGame && typeof window.__smokeGame._crestPush === 'number',
    null, { timeout: 20000, polling: 100 });
  const crestRm = await crestRmPage.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    g.monkey.velocityY = 0;
    await new Promise((r) => setTimeout(r, 150));
    const a = g._crestScrollPx;
    await new Promise((r) => setTimeout(r, 300));
    return { frozen: g._crestScrollFrozen, a, b: g._crestScrollPx,
             push: g._crestPush, speed: g._crestScrollPxS };
  });
  await crestRmCtx.close();
  record('slip crests: overtaking drawn (scroll + push), fades to exactly 0 past the gate, frozen under reduced motion, hidden at HUD off',
    crests.open.drawn === true && crests.open.hud === 0 &&
    Math.abs(crests.open.push - 1) < 0.05 && crests.open.speed > 100 &&
    crests.open.capHz <= 3 && crests.open.advanced > 10 &&
    crests.closed.push === 0 && crests.closed.speed === 0 && crests.closed.advanced === 0 &&
    crests.hiddenAtOff === true && crests.restored === 0 &&
    crestRm.frozen === true && crestRm.speed === 0 && crestRm.a === crestRm.b &&
    Math.abs(crestRm.push - 1) < 0.05,
    JSON.stringify({ ...crests, crestRm }));

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
