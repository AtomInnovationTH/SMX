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
  // The overlay hides on a 500 ms fade AFTER the last asset reports loaded, so a fixed
  // wall-clock wait races it on a busy runner (the one-off FAIL this suite kept
  // paying: "boot: loading overlay cleared" on an under-load machine, twice locally
  // and once in CI on the bootstrap-progress shift alone). Wait on the state, not the
  // clock: the exact predicate check 1 asserts below (and check 8 waits on later).
  await page.waitForFunction(() => {
    const o = document.getElementById('loading-overlay');
    return !o || getComputedStyle(o).display === 'none' || getComputedStyle(o).opacity === '0';
  }, null, { timeout: 20000 });

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
  //    State, not clock: the input handler runs synchronously down the eventBus (slider
  //    listener -> settings:airGap -> updateDerivedReadouts), so the polls pass on the
  //    first tick; the 5 s bound is only the escape hatch on a loaded runner.
  const gripDrag = await page.evaluate(async () => {
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    const el = document.getElementById('airGap');
    const before = el.value;
    el.value = '5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const out = {};
    await until(() => {
      out.lbl = document.getElementById('airGapValue').textContent;
      out.gap = window.__smokeGame.airGapMm;
      return out.lbl === '5.00 mm' && Math.abs(out.gap - 5) < 1e-9;
    });
    el.value = before;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => Math.abs(window.__smokeGame.airGapMm - 0.15) < 1e-9);
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
  // State, not clock: at quality 0 the charge drains every frame and the net readout
  // is computed per frame, so the predicate is exactly what the record asserts; the
  // 5 s bound is only the escape hatch on a runner too loaded to render one frame.
  const during = await page.evaluate(async (c0) => {
    const g = window.__smokeGame;
    const s = {};
    const t0 = Date.now();
    let ok = false;
    while (!ok) {
      s.c = g.epmCharge;
      s.n = g.epmNetPerSec;
      s.grab = g.monkey.isGrabbing;
      ok = s.grab === true && s.c < c0 && s.n < 0;
      if (!ok) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
    }
    return s;
  }, epmSetup.c);
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
    // State, not clock: the latch trips on SIM charge (the drain is dt-scaled, and the
    // dt clamp means a loaded runner simulates less per wall second), so wait on the
    // latch itself. 200 x 25 ms = 5 s of wall patience, far past the healthy ~63 ms,
    // and the detail tells the next failure which side it died on.
    let latched = false;
    for (let i = 0; i < 200 && !(latched = g.epmBrownout === true); i++) { await new Promise((r) => setTimeout(r, 25)); }
    const cueAtLatch = window.__cue;
    // The single-fire proof is a negative assertion: the cue must NOT refire while the
    // latch stays down. That is inherently a soak, so soak in STATE: 18 frames is the
    // old 300 ms at 60fps, and a buggy per-frame refire shows in one.
    let cueFrames = 0; const origUpdate = g._boundUpdate;
    g._boundUpdate = (t) => { cueFrames++; return origUpdate(t); };
    for (let i = 0; i < 200 && cueFrames < 18; i++) { await new Promise((r) => setTimeout(r, 25)); }
    g._boundUpdate = origUpdate;
    const cueHeld = window.__cue;
    g.monkey.isGrabbing = false;              // coast -> trickle recovery
    let recovered = false;
    for (let i = 0; i < 30 && !recovered; i++) { await new Promise((r) => setTimeout(r, 500)); recovered = g.epmBrownout === false; }
    return { latched, cueAtLatch, cueHeld, cueFrames, recovered, charge: g.epmCharge };
  });
  record('EPM: brownout latch + single-fire cue + recovery', brownout.latched && brownout.cueAtLatch === 1 && brownout.cueHeld === 1 && brownout.cueFrames >= 18 && brownout.recovered, JSON.stringify(brownout));

  // 5) Landmark transform anchors: Everest spans the viewport; Kármán is centered.
  const anchors = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const at = async (altM) => {
      g.monkey.y = -altM * 10; g.monkey.velocityY = 0; g.camera.y = g.monkey.y + g.canvas.height * 0.5;
      // State, not clock: monkey.altitude is derived from monkey.y each frame in
      // updatePosition, and the landmark DOM transforms refresh from it in the same
      // frame, so the placement is consumed exactly when the altitude says so. The
      // tolerance is wide on purpose: gravity is integrated BEFORE the derive, so a
      // stalled first frame (dt clamp) lands ~1 m low and then falls monotonically, so
      // a tight tolerance would never match and would burn the whole bound (a review
      // catch on the hardening shift). 100 m can never false-pass on a pre-placement
      // frame (the two placements are thousands of metres apart, from the ground).
      // The 10 s bound is only the escape hatch on a loaded runner.
      let placed = false;
      const t0 = Date.now();
      while (!(placed = Math.abs(g.monkey.altitude - altM) < 100)) { if (Date.now() - t0 > 10000) break; await new Promise((r) => setTimeout(r, 25)); }
      // The drift guard: during the poll above gravity may have tugged the climber a
      // few centimetres off the mark; re-place and give the render one rAF frame to
      // draw the sprites at the exact altitude before reading their boxes.
      g.monkey.y = -altM * 10; g.monkey.velocityY = 0;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const out = { placed };
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
  record('anchors: Everest full-width + Kármán centered', everestOk && karmanOk && anchors.e.placed === true && anchors.k.placed === true, JSON.stringify(anchors));

  // 6) Single RAF loop: a fast pause/unpause burst must not leave a second chain
  //    (rate-independent AND now clock-independent). The old version sampled calls over
  //    two fixed 500 ms windows and asserted a ratio < 1.4; a loaded CI runner frames
  //    unevenly inside a fixed window, which is the flake this suite kept paying.
  //    Structural instead: every callback in one rAF batch receives the SAME timestamp,
  //    so a doubled chain must call update twice with the same t. Count calls per t and
  //    assert no t repeats, then count frames over a bounded state wait.
  const raf = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    let calls = 0; const perT = new Map(); let repeatedT = 0;
    const orig = g._boundUpdate;
    g._boundUpdate = (t) => {
      calls++;
      const n = (perT.get(t) || 0) + 1; perT.set(t, n);
      if (n === 2) repeatedT++;          // count a doubled t once, not per extra call
      return orig(t);
    };
    // Settle until a couple of frames have definitely run THROUGH the wrapped callback
    // (state, not clock): the burst that follows must be measured on a live chain.
    for (let i = 0; i < 200 && calls < 2; i++) await new Promise((r) => setTimeout(r, 25));
    perT.clear();
    for (let i = 0; i < 30; i++) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (g.paused) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const after = calls;
    for (let i = 0; i < 200 && calls - after < 2; i++) await new Promise((r) => setTimeout(r, 25));
    const framesAfter = calls - after;
    g._boundUpdate = orig;
    return { repeatedT, framesAfter, paused: g.paused };
  });
  record('loop: single RAF chain after pause/unpause burst', raf.paused === false && raf.repeatedT === 0 && raf.framesAfter >= 2, JSON.stringify(raf));

  // 7) Focus loss releases the engage latch and clears held keys. SPACE is the only
  //    gameplay key now that the lateral axis is gone, so this presses SPACE plus an inert
  //    key: blur must clear BOTH the isGrabbing latch and the whole keys map, or a
  //    suppressed keyup would leave the stack engaged forever.
  const blur = await page.evaluate(async () => {
    const g = window.__smokeGame;
    // State, not clock: every latch below is set inside a synchronous keydown/blur
    // handler, so each poll passes on its first tick when the handler ran; the 5 s
    // bound only absorbs a loaded runner's task-queue latency.
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    g.paused = false; g.gameOver = false; g.running = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // inert: no handler
    await until(() => g.monkey.isGrabbing === true && g.inputManager.isKeyPressed(' ') && g.inputManager.isKeyPressed('x'));
    const before = {
      grab: g.monkey.isGrabbing,
      space: g.inputManager.isKeyPressed(' '),
      inert: g.inputManager.isKeyPressed('x'),
    };
    window.dispatchEvent(new Event('blur'));
    await until(() => g.monkey.isGrabbing === false && Object.keys(g.inputManager.keys).length === 0);
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
  // State, not clock: the panel and the focus drop are driven by the click handler;
  // wait until that has actually happened rather than for a fixed 80 ms.
  await page.waitForFunction(
    () => document.getElementById('settingsPanel').classList.contains('visible'),
    null, { timeout: 5000, polling: 100 });
  const gearState = await page.evaluate(() => ({
    panelVisible: document.getElementById('settingsPanel').classList.contains('visible'),
    activeTag: document.activeElement && document.activeElement.tagName,
  }));
  // Gameplay keys must still reach the game after clicking the gear (focus was dropped).
  await page.keyboard.down(' ');
  await page.waitForFunction(() => window.__smokeGame.monkey.isGrabbing === true, null, { timeout: 5000, polling: 100 });
  const pulseAfterGear = await page.evaluate(() => window.__smokeGame.monkey.isGrabbing);
  await page.keyboard.up(' ');
  // A second, non-SPACE gameplay key must also reach the game. Arrows used to serve here;
  // with the lateral axis gone, the wave-type keys are the surviving observable input.
  await page.evaluate(() => window.__smokeGame.waveSystem.setType('sine'));
  await page.keyboard.press('2');
  await page.waitForFunction(() => window.__smokeGame.waveSystem.getType() === 'square', null, { timeout: 5000, polling: 100 });
  const waveAfterGear = await page.evaluate(() => window.__smokeGame.waveSystem.getType());
  await page.evaluate(() => window.__smokeGame.waveSystem.setType('sine'));
  const labels = await page.evaluate(async () => {
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    const btn = document.getElementById('colorblindToggle');
    const initial = btn.textContent;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // C key route
    await until(() => btn.textContent !== initial);
    const afterC = btn.textContent;
    btn.click(); // button route
    await until(() => btn.textContent !== afterC);
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
    // State, not clock: arm/confirm run inside the synchronous keydown handler, so these
    // polls pass on the first tick; the 5 s bound only absorbs a loaded runner.
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    g.paused = false; g.gameOver = false; g.running = true;
    g.restartArmedAt = 0;
    let initCalls = 0;
    const origInit = g.initGame.bind(g);
    g.initGame = (...a) => { initCalls++; return origInit(...a); };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); // arm
    const armTook = await until(() => g.restartArmedAt > 0);
    const armed = g.restartArmedAt > 0;
    const callsAfterArm = initCalls;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); // confirm
    const confirmTook = await until(() => initCalls === callsAfterArm + 1 && g.restartArmedAt === 0);
    const callsAfterConfirm = initCalls;
    const armedAtCleared = g.restartArmedAt === 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); // fresh run, single R
    const d1Took = await until(() => g.restartArmedAt > 0);
    const d1Armed = g.restartArmedAt > 0; // armed again, not an instant restart
    const callsAfterD1 = initCalls;
    g.initGame = origInit;
    return { armed, armTook, callsAfterArm, confirmTook, callsAfterConfirm, armedAtCleared, d1Armed, d1Took, callsAfterD1 };
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
    // State, not clock: the drawn-pair count and the sweep position are render-path
    // values, so each poll is exactly "a frame drew with this state", however late the
    // runner renders it.
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    g.paused = false; g.gameOver = false; g.running = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await until(() => g.monkey.isGrabbing === true && g._stackDrawnPairs === 8);
    const out = { grab: g.monkey.isGrabbing, pairs: g._stackDrawnPairs, literal: g._stackDrawnLiteral,
                  nPairs: g.nPairs, sweepA: g._stackSweepPos };
    await until(() => g._stackSweepPos !== out.sweepA);
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

  // 10c) M4 taper (p.9): the taper slider drives the REAL chain live — the stroke cap
  //      tightens by 1/√R (stress binds at the thin top), the amplitude label shows the
  //      post-clamp stroke, and the drawn band widens toward the anchor's wider section
  //      (still capped clear of the clamp jaws). The monkey is placed back on the ground
  //      first: the taper's band effect lives at low altitude (check 5 left it at 100 km,
  //      where the section ratio is 1 and the band is the untapered one).
  const taperInfo = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    g.monkey.y = 0; g.monkey.velocityY = 0; g.monkey.altitude = 0;
    g.camera.y = g.monkey.y + g.canvas.height * 0.5;
    const slider = document.getElementById('taper');
    const before = slider.value;
    slider.value = '4';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    const out = {
      ratio: g.taperRatio,
      band: g._filmBandHalfPx, jaws: g._clampJawHalfPx,
      cap: document.getElementById('strokeCapValue').textContent,
      amp: document.getElementById('amplitudeValue').textContent,
      stress: document.getElementById('waveStressValue').textContent,
    };
    // Restore the default chain: taper 1 AND the amplitude slider's own event (the
    // clamp never auto-raises, so only the slider path puts 1.00 m back).
    slider.value = before;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    const ampSlider = document.getElementById('amplitude');
    ampSlider.value = '1';
    ampSlider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    out.restoredBand = g._filmBandHalfPx;
    out.restoredAmp = g.waveSystem.amplitude;
    return out;
  });
  record('taper: stroke cap tightens by 1/√R, amplitude label shows the clamp, band widens at the anchor under the jaw cap',
    taperInfo.ratio === 4 && taperInfo.band === 13 && taperInfo.band < taperInfo.jaws &&
    taperInfo.cap.startsWith('0.54 m') && taperInfo.amp.includes('(capped)') &&
    taperInfo.stress.includes('anchor') &&
    taperInfo.restoredBand === 12 && Math.abs(taperInfo.restoredAmp - 1) < 1e-9,
    JSON.stringify(taperInfo));

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
    // The frozen proof is a negative assertion: the sweep must NOT move while frames
    // keep running. Soak in STATE, not clock: 24 frames is the old 400 ms at 60fps,
    // and the frame count proves the soak was real even on a runner that idled.
    let frames = 0; const orig = g._boundUpdate;
    g._boundUpdate = (t) => { frames++; return orig(t); };
    const t0 = Date.now();
    const a = g._stackSweepPos;
    while (frames < 24) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
    g._boundUpdate = orig;
    return { a, b: g._stackSweepPos, flag: g._stackSweepFrozen, pairs: g._stackDrawnPairs, frames };
  });
  record('firing sweep freezes to a static lit state under reduced motion',
    frozen.flag === true && frozen.a === frozen.b && frozen.pairs === 8 && frozen.frames >= 24, JSON.stringify(frozen));
  await rmContext.close();

  // 12) M3.4: the event schedule — the 12 km transverse reveal fires on the crossing
  //     (once per run, card queued), and the 70 km gigacycle-fatigue beat stays SILENT
  //     at the 92 Hz default: it is conditional on the carrier sitting in the paper's
  //     top decade (freqDecadeColumn >= 6), and 92 Hz is the 100 Hz column.
  //     M4: the teleport from the ground also crosses 1 km (the TAPER beat, p.9) and
  //     2 km (the WAVE-DRAG beat, p.7), so the taper beat owns the active card and the
  //     wave-drag and transverse cards queue behind it.
  //     M4 (p.12/13): the second teleport also crosses 42 km, where the
  //     mode-conversion beat asks the paper's question verbatim and marks the
  //     mechanism absent (no converter in the paper, so none modelled; the card
  //     fires past the act break so it never shares the screen with its banner).
  //     M4 (hot side): the same teleport also crosses 30 km, where the stack-heat
  //     beat books the exact watts against the datasheet's +73 °C ceiling and
  //     marks the temperature absent; the Stack heat readout must track altitude.
  //     M4 (slide 6 budget display): the Wave arriving readout rides this check
  //     too, in the plain slide-6 form at both sampled altitudes, drag-sapped at
  //     the higher one (the p.7 tax grows with the column below you).
  //     Assert on the active card PLUS the queue (the same pattern check 13 uses).
  const beats = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    // Climb until each crossing has ACTUALLY happened (state, not clock), the same
    // discipline the 85 km legs taught: the dt clamp means a loaded runner simulates
    // less per wall second, so a fixed 400 ms can end short of the crossing and the
    // whole card/queue cascade fails on a race with the frame loop. 100 x 50 ms = 5 s
    // of patience, far past healthy, far under the workflow's.
    const cross = async (altM) => {
      g.monkey.velocityY = -20000;                        // 2 km/s once the frames run
      for (let i = 0; i < 100 && g.monkey.altitude < altM; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      g.monkey.velocityY = 0;
      return g.monkey.altitude >= altM;
    };
    g.monkey.y = -115000; g.camera.y = g.monkey.y + 400;   // 11.5 km, climbing
    const crossed12 = await cross(12400);                     // crosses 1/2/12 km
    const titles = [g._beatCard, ...g._beatQueue].filter(Boolean).map((c) => c.title);
    const t12 = { fired: g._beatsFired.has('transverse'), taperFired: g._beatsFired.has('taper'),
                  dragFired: g._beatsFired.has('wave-drag'), titles,
                  heatLabelLow: document.getElementById('stackHeatValue').textContent,
                  budgetLabelLow: document.getElementById('waveBudgetValue').textContent };
    g.monkey.y = -695000; g.camera.y = g.monkey.y + 400;   // 69.5 km (teleport also crosses 20/30/42/45 km)
    const crossed70 = await cross(70400);                     // crosses 70 km at 92 Hz
    const titles2 = [g._beatCard, ...g._beatQueue].filter(Boolean).map((c) => c.title);
    const modeCard = [g._beatCard, ...g._beatQueue].filter(Boolean)
      .find((c) => c.title === 'above the atmosphere: convert modes? the paper asks');
    const heatCard = [g._beatCard, ...g._beatQueue].filter(Boolean)
      .find((c) => c.title === 'the air stops carrying your heat');
    const out = { t12, crossed12, crossed70, fatigueFired: g._beatsFired.has('fatigue'), freq: g.waveSystem.frequency,
                  queueLen: g._beatQueue.length,
                  modeFired: g._beatsFired.has('mode-conversion'),
                  modeTitle: titles2.some((t) => t.includes('convert modes')),
                  modeBody: (modeCard || { lines: [] }).lines.join(' '),
                  heatFired: g._beatsFired.has('stack-heat'),
                  heatTitle: titles2.some((t) => t.includes('stops carrying your heat')),
                  heatBody: (heatCard || { lines: [] }).lines.join(' '),
                  heatLabelHigh: document.getElementById('stackHeatValue').textContent,
                  budgetLabelHigh: document.getElementById('waveBudgetValue').textContent };
    g.monkey.velocityY = 0;
    return out;
  });
  record('event schedule: 1 km taper + 2 km wave-drag + 12 km reveal + 30 km stack-heat + 42 km mode question fire; 70 km fatigue beat silent at 92 Hz',
    beats.crossed12 === true && beats.crossed70 === true &&
    beats.t12.fired === true && beats.t12.taperFired === true && beats.t12.dragFired === true &&
    beats.t12.titles.some((t) => t.includes('transverse')) &&
    beats.modeFired === true && beats.modeTitle === true && /no converter/.test(beats.modeBody) &&
    beats.heatFired === true && beats.heatTitle === true &&
    /no temperature is modelled/.test(beats.heatBody) && /\+73 /.test(beats.heatBody) &&
    /of sea level/.test(beats.t12.heatLabelLow) && /of sea level/.test(beats.heatLabelHigh) &&
    beats.t12.heatLabelLow !== beats.heatLabelHigh &&   // the medium falls with altitude
    // M4 (slide 6): the Wave arriving readout, plain form at both teleports, the
    // higher one sapped by the drag column below it (138.1 MW -> 136.6 MW here).
    /^\d+\.\d+ MW · P = ρ·c·A·V² \(slide 6\)$/.test(beats.t12.budgetLabelLow) &&
    /^\d+\.\d+ MW · P = ρ·c·A·V² \(slide 6\)$/.test(beats.budgetLabelHigh) &&
    parseFloat(beats.t12.budgetLabelLow) > parseFloat(beats.budgetLabelHigh) &&
    parseFloat(beats.t12.budgetLabelLow) < 144.2 &&   // never above the untouched anchor figure
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

  // 13b) M4 resonance (p.10): the marked 40-70 km retune beat, live. The availability
  //     card already fired OFF during check 12's 45 km crossing; here the slider's own
  //     event path engages the mode at 49.5 km (engage BEFORE the crossing, or the
  //     teleport down would itself retune the cavity), and the 50 km crossing must
  //     produce exactly one retune: n 1 -> 2, the transient counting down, the card
  //     queued. The cavity owns the active frequency (switching collapses to watts)
  //     while the renderer's carrier stays 92 Hz; disengage restores the label.
  //     The resonance texture rides this check too: while engaged the crest train's
  //     breath rate IS the cavity rate capped at the scroll's 2.5 Hz ceiling, and the
  //     channel goes dark on disengage.
  const res = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    g.paused = false; g.gameOver = false; g.running = true;
    g.monkey.velocityY = 0;
    g.monkey.y = -495000; g.camera.y = g.monkey.y + 400;   // 49.5 km, at rest
    await wait();
    const slider = document.getElementById('resonance');
    slider.value = '1';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    const engaged = { on: g.resonanceOn, label: document.getElementById('resonanceValue').textContent,
                    freqLabel: document.getElementById('frequencyValue').textContent,
                    modeLabel: document.getElementById('modeCellValue').textContent };
    g.monkey.velocityY = -20000;                            // 2 km/s once the frames run
    // State, not clock: climb until altitude proves the 50 km crossing (the dt clamp
    // means a loaded runner simulates less per wall second, the same race the 85 km
    // legs taught). 100 x 50 ms = 5 s of patience. The transient counts DOWN from the
    // crossing, so stop as soon as altitude proves it: polling past it only shrinks it.
    for (let i = 0; i < 100 && g.monkey.altitude < 50400; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const crossed50 = g.monkey.altitude >= 50400;
    g.monkey.velocityY = 0;
    const titles = [g._beatCard, ...g._beatQueue].filter(Boolean).map((c) => c.title);
    const out = {
      crossed50,
      engaged,
      n: g._resMode && g._resMode.n,
      resets: g._resonanceResets,
      transient: g._resTransientS,
      retuneFired: g._beatsFired.has('resonance-retune'),
      availFired: g._beatsFired.has('resonance'),
      titles,
      activeFreq: g.activeFreqHz(),
      carrier: g.waveSystem.frequency,
      switchW: g._switchingW,
      budgetEngaged: document.getElementById('waveBudgetValue').textContent,
      crestBreathHz: g._crestBreathHz,
      crestBreathe: g._crestBreathe,
    };
    // Restore: disengage through the same slider path (the handler reverts the
    // carrier label), and settle the climber.
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    g.monkey.velocityY = 0;
    await wait();
    out.restoredOn = g.resonanceOn;
    out.restoredLabel = document.getElementById('frequencyValue').textContent;
    out.restoredModeLabel = document.getElementById('modeCellValue').textContent;
    out.budgetRestored = document.getElementById('waveBudgetValue').textContent;
    out.restoredBreathHz = g._crestBreathHz;
    out.restoredBreathe = g._crestBreathe;
    return out;
  });
  record('resonance: 50 km retune fires (n 1 -> 2, transient paid, card queued), the cavity owns the active frequency, disengage restores',
    res.crossed50 === true &&
    res.engaged.on === true && res.engaged.label.includes('node') &&
    res.engaged.freqLabel.includes('cavity') &&
    res.engaged.modeLabel.includes('standing') &&   // M4 (p.12/13): the one mode change, named
    // M4 (slide 6): the budget readout rides the mode too: the anchor's injection
    // (kW-scale, P = σ·v) while engaged, back to slide 6's transported MW plain.
    /^\d+ kW · the anchor's injection, P = σ·v \(p\.10\)$/.test(res.budgetEngaged) &&
    /^\d+\.\d+ MW · P = ρ·c·A·V² \(slide 6\)$/.test(res.budgetRestored) &&
    res.n === 2 && res.resets === 1 && res.transient > 0 &&
    res.retuneFired === true && res.availFired === true &&
    Math.abs(res.activeFreq - 0.417) < 0.01 && Math.abs(res.carrier - 92) < 1 &&
    res.switchW < 100 &&
    // M4 (p.10) resonance texture: the crest train breathes at the cavity rate while
    // engaged (capped at the scroll's own 2.5 Hz slowed-schematic ceiling), the swell
    // stays inside its additive 1.0 to 1.28 range, and disengage goes dark exactly.
    Math.abs(res.crestBreathHz - Math.min(res.activeFreq, 2.5)) < 1e-9 &&
    res.crestBreathe >= 1 && res.crestBreathe <= 1.281 &&
    res.restoredBreathHz === 0 && res.restoredBreathe === 1 &&
    res.restoredOn === false && res.restoredLabel.includes('92.0') &&
    res.restoredModeLabel.includes('travelling'),
    JSON.stringify(res));

  // 13c) M4 multi-climber (p.14): the 85 km share-or-refuse beat, live. Refuse
  //     first: crossing 85 km with the slider off fires the request card and NO
  //     rider boards. Then the share half: drop back below 85 km, clear the fired
  //     beat, flip the slider through its own DOM event and cross again — the
  //     sharing card queues, the rider boards and is genuinely drawn (the render
  //     counter), and on a plain wave the budget reads ~140 MW with the cap far
  //     above any skim (the budget is not what is scarce). Refusing again unboards
  //     the rider. The binding halves are the balance harness's job, not smoke's.
  const share = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    g.paused = false; g.gameOver = false; g.running = true;
    // Climb until the 85 km crossing has ACTUALLY happened (state, not clock): the dt
    // clamp means a busy runner simulates less per wall second, and a fixed 400 ms made
    // the share leg miss the crossing on a loaded CI machine while the refuse leg made
    // it (seen on the bootstrap-progress shift's deploy run). 100 x 50 ms = 5 s of
    // patience, far past healthy, far under the workflow's.
    const cross = async () => {
      g.monkey.velocityY = -20000;                        // 2 km/s once the frames run
      for (let i = 0; i < 100 && g.monkey.altitude < 85400; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      g.monkey.velocityY = 0;
      return g.monkey.altitude >= 85400;
    };
    const slider = document.getElementById('powerShare');
    const titles = () => [g._beatCard, ...g._beatQueue].filter(Boolean).map((c) => c.title);
    // REFUSE: cross 85 km with the slider off. (At rest below the request first,
    // so _lastFrameAltitude settles under the crossing test.)
    g.monkey.velocityY = 0;
    g.monkey.y = -845000; g.monkey.altitude = 84500; g.camera.y = g.monkey.y + 400;
    await wait();
    const before = { on: g.powerShareOn, aboard: g._shareRiderAboard, drawn: g._shareRiderDrawnTotal };
    const crossedRefuse = await cross();                // crosses 85 km
    await wait();
    const refusal = { fired: g._beatsFired.has('second-climber'), aboard: g._shareRiderAboard,
                      drawn: g._shareRiderDrawnTotal, card: titles().some((t) => t === 'a second climber requests power'),
                      cardBody: ([g._beatCard, ...g._beatQueue].filter(Boolean).find((c) => c.title === 'a second climber requests power') || { lines: [] }).lines.join(' ') };
    // SHARE: clear the beat, drop back below the request, flip the slider through
    // its own DOM event (the same path a player's finger takes), cross again.
    g._beatsFired.delete('second-climber');
    g.monkey.y = -845000; g.monkey.altitude = 84500; g.camera.y = g.monkey.y + 400;
    await wait();
    slider.value = '1';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();
    const engaged = { on: g.powerShareOn, label: document.getElementById('powerShareValue').textContent };
    const crossedShare = await cross();                 // crosses 85 km again
    // Climb-on velocity for the readout: the rider's draw is weight x climb speed.
    g.monkey.velocityY = -3000;
    await wait();
    const out = {
      before, refusal, engaged, crossedRefuse, crossedShare,
      aboard: g._shareRiderAboard,
      card: titles().some((t) => t === 'sharing the wave with a second climber'),
      // The shared card quotes the live budget: it must be computed FRESH at the
      // crossing, never read off a stale cache (the crossing frame's updateContinuous
      // ran before updatePosition, so the rider was not aboard yet).
      cardBody: ([g._beatCard, ...g._beatQueue].filter(Boolean).find((c) => c.title === 'sharing the wave with a second climber') || { lines: [] }).lines.join(' '),
      drawn: g._shareRiderDrawnTotal,
      budgetW: g._shareBudgetW, otherDrawW: g._shareOtherDrawW, capW: g._shareCapW,
      budgetShared: document.getElementById('waveBudgetValue').textContent,
    };
    // Refuse again through the same slider path: the rider unboards and the label
    // restores. Settle the climber for the checks that follow.
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    g.monkey.velocityY = 0;
    await wait();
    out.refusedOn = g.powerShareOn;
    out.refusedAboard = g._shareRiderAboard;
    out.refusedLabel = document.getElementById('powerShareValue').textContent;
    out.budgetRefused = document.getElementById('waveBudgetValue').textContent;
    return out;
  });
  record('multi-climber: 85 km refusal fires the request card with no rider; sharing boards the rider, live shared-budget numbers; refuse unboards',
    share.crossedRefuse === true && share.crossedShare === true &&
    share.before.on === false && share.before.aboard === false && share.before.drawn === 0 &&
    share.refusal.fired === true && share.refusal.aboard === false &&
    share.refusal.drawn === 0 && share.refusal.card === true &&
    /~\d+(\.\d+)? MW against/.test(share.refusal.cardBody) &&
    share.engaged.on === true && share.engaged.label.includes('share') &&
    share.aboard === true && share.card === true &&
    /shared budget: your skim caps at \d+(\.\d+)? MW minus/.test(share.cardBody) &&
    // M4 (slide 6): the Wave arriving readout IS that shared budget while the
    // rider is aboard (suffixed so), and drops the suffix when refused again.
    / · shared with the second climber \(p\.14\)$/.test(share.budgetShared) &&
    /^1\d\d\.\d MW · P = ρ·c·A·V² \(slide 6\)$/.test(share.budgetRefused) &&
    share.drawn > share.refusal.drawn &&
    share.budgetW > 1e8 && share.otherDrawW > 1e4 && share.capW > share.budgetW / 2 &&
    share.capW < share.budgetW &&   // with the rider drawing, the cap sits strictly under the budget
    share.refusedOn === false && share.refusedAboard === false && share.refusedLabel === 'refuse',
    JSON.stringify(share));

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
  // State, not clock: the pointer handler latches the grab; wait until the latch
  // shows rather than for a fixed 120 ms.
  await tPage.waitForFunction(() => window.__smokeGame.monkey.isGrabbing === true, null, { timeout: 5000, polling: 100 });
  const holdOn = await tPage.evaluate(() => window.__smokeGame.monkey.isGrabbing);
  await tPage.mouse.up();
  await tPage.waitForFunction(() => window.__smokeGame.monkey.isGrabbing === false, null, { timeout: 5000, polling: 100 });
  const holdOff = await tPage.evaluate(() => window.__smokeGame.monkey.isGrabbing);
  //     ...and a second finger must not be able to release the first: the handler tracks
  //     pointer ids in a Set precisely because a boolean would drop the hold here.
  const multi = await tPage.evaluate(async () => {
    const g = window.__smokeGame;
    // State, not clock: the pointer handlers run synchronously on dispatch, so these
    // polls pass on the first tick; the 5 s bound only absorbs a loaded runner.
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    g.monkey.isGrabbing = false;
    const fire = (type, pointerId) => window.dispatchEvent(new PointerEvent(type, {
      pointerId, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: pointerId === 1,
    }));
    fire('pointerdown', 1);
    fire('pointerdown', 2);
    await until(() => g.monkey.isGrabbing === true);
    const both = g.monkey.isGrabbing;
    fire('pointerup', 1);
    await new Promise((r) => setTimeout(r, 40)); // a beat for a wrongful release to land
    const afterOneLift = g.monkey.isGrabbing;
    fire('pointerup', 2);
    await until(() => g.monkey.isGrabbing === false);
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
  // State, not clock: the tap handler toggles the panel; wait until it has.
  await tPage.waitForFunction(
    () => document.getElementById('settingsPanel').classList.contains('visible'),
    null, { timeout: 5000, polling: 100 });
  const afterGearTap = await tPage.evaluate(() => ({
    visible: document.getElementById('settingsPanel').classList.contains('visible'),
    grab: window.__smokeGame.monkey.isGrabbing,
    // The panel fills a phone viewport and scrolls, instead of overflowing off-screen.
    fits: document.getElementById('settingsPanel').getBoundingClientRect().width <= innerWidth,
  }));
  await tPage.touchscreen.tap(
    (await tPage.evaluate(() => { const r = document.getElementById('settings-close').getBoundingClientRect(); return r.x + r.width / 2; })),
    (await tPage.evaluate(() => { const r = document.getElementById('settings-close').getBoundingClientRect(); return r.y + r.height / 2; })));
  await tPage.waitForFunction(
    () => !document.getElementById('settingsPanel').classList.contains('visible'),
    null, { timeout: 5000, polling: 100 });
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
    // State, not clock: the H keydown flips the level synchronously, but the DRAWN
    // handle only follows on the next rendered frame. Wait for the handle to consume
    // THIS press before pressing again, or a loaded runner batches presses and lands
    // on the wrong level.
    const press = async () => {
      const prev = g._hudLevelDrawn;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
      const t0 = Date.now();
      while (g._hudLevelDrawn === prev) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
      return g._hudLevelDrawn;
    };
    // The waitForFunction above already gates on the first render having drawn a level,
    // so onLoad needs no wait at all.
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
  //     bar, not four lines of kilowatts and a slip ratio. Shift 12 adds the third pin: the
  //     throughput score rides the minimal compact plate as one line, in all three of its
  //     states (goal pre-climb, live pace while climbing, locked figure + best after
  //     delivery), and never leaks into the full level's own mission block. The bootstrap-
  //     pacing shift adds the fourth: once a best exists it rides the goal and pace lines
  //     too (the one pacing reference the game owns; the paper publishes no pacing figure
  //     to cite), at minimal and in the full block's pace branch alike. The bootstrap-
  //     progress shift adds the fifth: the delivered line carries the cumulative tether
  //     meter the one moment it moves, read live from the game's own bootstrapKg. The
  //     phone-forms fix adds the sixth: at a 390 px viewport the full mission block's
  //     goal and pace branches carry short forms (the block overflowed the screen), and
  //     the long forms are gone there.
  const drawn = await page.evaluate(async () => {
    const g = window.__smokeGame;
    g.paused = false; g.gameOver = false; g.running = true;
    // State, not clock, in both helpers:
    // - the H keydown flips the level synchronously, but the DRAWN handle follows on
    //   the next rendered frame, so each press waits until the handle consumed THIS
    //   press (a loaded runner would otherwise batch presses and land on the wrong
    //   level: the old fixed 100 ms x 4 loop had exactly that race);
    // - the capture unwraps only after the wrapped fillText has seen two whole frames
    //   (counted through the live _boundUpdate property, the same wrap check 6 uses),
    //   so a slow runner waits its frames out instead of sampling an empty frame.
    const setLevel = async (want) => {
      for (let i = 0; i < 4 && g._hudLevelDrawn !== want; i++) {
        const prev = g._hudLevelDrawn;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
        const t0 = Date.now();
        while (g._hudLevelDrawn === prev) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
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
      let frames = 0; const origUpdate = g._boundUpdate;
      g._boundUpdate = (t) => { frames++; return origUpdate(t); };
      const t0 = Date.now();
      while (frames < 2) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
      delete g.ctx.fillText;
      g._boundUpdate = origUpdate;
      return seen;
    };
    const out = {};
    out.minimalSet = await setLevel(0); out.minimal = await capture();
    out.fullSet = await setLevel(1);    out.full = await capture();
    await setLevel(0);
    // The minimal capture above ran in the pre-climb state (fresh reload, on the
    // ground, clock not started). These two set up the line's other states: 50 km
    // with 100 s on the climb clock is the climbing state (below the 100 km delivery
    // altitude, so cargoDeliveryCredit cannot fire); the delivered state is written
    // directly. Then restore the quiet ground state the crest check builds on.
    // The climbing state carries a persisted best (34) so the bootstrap-pacing pin
    // sees the pace paired with it, at minimal and in the full mission block alike.
    // (The old fixed 80 ms settle before each capture is gone: the capture's own
    // two-frame gate is exactly that wait, state-based.)
    g.monkey.velocityY = 0;
    g.monkey.y = -500000; g.camera.y = g.monkey.y + g.canvas.height * 0.5;
    g._runTimeS = 200; g._climbStartS = 100;
    g.cargoBest = 34;
    out.climbing = await capture();
    out.fullClimbingSet = await setLevel(1);
    out.fullClimbing = await capture();
    await setLevel(0);
    g.cargoDelivered = true; g.deliveredKg = 3; g._deliveredInS = 380.4; g.cargoBest = 31;
    out.delivered = await capture();
    // Bootstrap progress: the delivered line carries the cumulative meter when one
    // exists. This written state set no bootstrapKg, so the capture above read the
    // game's live value (0 after the check-15 reload: no clause, the shift-12 pin
    // survives); write one and the same line carries it, read live each frame.
    g.bootstrapKg = 40;
    out.deliveredBoot = await capture();
    g.bootstrapKg = 0;
    g.cargoDelivered = false; g.deliveredKg = 0; g._deliveredInS = null; g.cargoBest = 0;
    g.monkey.velocityY = 0; g.monkey.y = 0; g.monkey.altitude = 0; g.maxAltitude = 0;
    g._runTimeS = 0; g._climbStartS = null; g.camera.y = g.monkey.y + g.canvas.height * 0.5;
    // The 50 km teleport crossed 40 km, so it armed the ACT II banner and a beat card.
    // Both draw over mid-screen for seconds of sim time; clear them or they bleed into
    // whatever check runs next.
    g._actBreakTimer = 0; g._beatCardTimer = 0;
    await setLevel(0);
    // One more state: back on the quiet ground with a best on record, the goal line
    // carries it (the cargo-choice moment). Then zero it again for the checks after.
    g.cargoBest = 34;
    out.groundBest = await capture();
    g.cargoBest = 0;
    g._beatCard = null;
    return out;
  });
  // The full mission block at PHONE width: the goal and pace branches carry short
  // forms under _compactHud (the block overflowed a 390 px screen; the delivered line
  // fits and stays one string). Same figures, so the narrow pace pin reuses the exact
  // 50 km / 100 s / best 34 state. Restores the desktop viewport for the checks after.
  await page.setViewportSize({ width: 390, height: 844 });
  const drawnNarrow = await page.evaluate(async () => {
    const g = window.__smokeGame;
    // Same state-not-clock helpers as the desktop half above.
    const setLevel = async (want) => {
      for (let i = 0; i < 4 && g._hudLevelDrawn !== want; i++) {
        const prev = g._hudLevelDrawn;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
        const t0 = Date.now();
        while (g._hudLevelDrawn === prev) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
      }
      return g._hudLevelDrawn === want;
    };
    const capture = async () => {
      const seen = [];
      const orig = g.ctx.fillText.bind(g.ctx);
      g.ctx.fillText = (s, x, y) => { seen.push(String(s)); return orig(s, x, y); };
      let frames = 0; const origUpdate = g._boundUpdate;
      g._boundUpdate = (t) => { frames++; return origUpdate(t); };
      const t0 = Date.now();
      while (frames < 2) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
      delete g.ctx.fillText;
      g._boundUpdate = origUpdate;
      return seen;
    };
    const out = {};
    out.narrowSet = await setLevel(1);          // full level on the phone layout
    out.compact = g._compactHud;
    out.fullGoal = await capture();             // quiet ground: the goal branch
    g.monkey.velocityY = 0;
    g.monkey.y = -500000; g.camera.y = g.monkey.y + g.canvas.height * 0.5;
    g._runTimeS = 200; g._climbStartS = 100;
    g.cargoBest = 34;
    out.fullClimb = await capture();
    // Teardown: the quiet ground state the crest check builds on, minimal level, and
    // the 40 km crossing's banner and beat card cleared (same discipline as above).
    g.cargoBest = 0;
    g.monkey.velocityY = 0; g.monkey.y = 0; g.monkey.altitude = 0; g.maxAltitude = 0;
    g._runTimeS = 0; g._climbStartS = null; g.camera.y = g.monkey.y + g.canvas.height * 0.5;
    g._actBreakTimer = 0; g._beatCardTimer = 0; g._beatCard = null;
    await setLevel(0);
    return out;
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  const has = (a, re) => a.some((s) => re.test(s));
  record('levels: minimal draws the beat TITLE, a bare energy bar and the score line; full adds the readouts',
    drawn.minimalSet && drawn.fullSet &&
    has(drawn.minimal, /SMOKE-TITLE/) && !has(drawn.minimal, /SMOKE-BODY-LINE/) &&
    has(drawn.full, /SMOKE-TITLE/) && has(drawn.full, /SMOKE-BODY-LINE/) &&
    has(drawn.minimal, /^EPM$/) && !has(drawn.minimal, /switch \d+ kW/) && !has(drawn.minimal, /slip u =/) &&
    has(drawn.full, /switch \d+ kW/) && has(drawn.full, /slip u =/) &&
    // Minimal still says what to press: the compact plate is the one instruction left.
    has(drawn.minimal, /SPACE: pulse/) &&
    // Shift 12: the throughput score at minimal, in all three states, and not at full.
    // The goal line is matched without its cargo figure on purpose: the settings the
    // reload restores are not this check's business, and pure.test.mjs pins the whole
    // string. The delivered figures ARE pinned, because this check writes them.
    has(drawn.minimal, /score: kg\/h to Kármán/) &&
    has(drawn.climbing, /pace \d+ kg\/h to Kármán/) &&
    has(drawn.delivered, /delivered 28 kg\/h · best 31 kg\/h/) &&
    !has(drawn.full, /score: kg\/h to Kármán/) &&
    // Bootstrap pacing: with a best on record it rides the pace line at minimal, the
    // full mission block's pace branch, and the ground goal line. This check wrote the
    // 34 kg/h best and the 50 km / 100 s state, so the 54 kg/h pace is exact.
    has(drawn.climbing, /pace 54 kg\/h to Kármán · best 34 kg\/h/) &&
    drawn.fullClimbingSet &&
    has(drawn.fullClimbing, /pace 54 kg\/h to Kármán \(best 34\)/) &&
    has(drawn.groundBest, /score: kg\/h to Kármán · cargo 3 kg · best 34 kg\/h/) &&
    // Bootstrap progress: the delivered line carries the cumulative meter the moment
    // it moves, reading the game's live bootstrapKg (40 written above, exact figures).
    has(drawn.deliveredBoot, /delivered 28 kg\/h · best 31 kg\/h · tether 40\/600 kg/) &&
    // The mission block at phone width: the goal and pace branches carry short forms
    // (goal matched without its cargo figure, like the minimal goal pin above: the
    // settings the reload restores are not this check's business); the long forms are
    // gone at 390 px; the pace pin is exact because this check wrote the state.
    drawnNarrow.narrowSet && drawnNarrow.compact === true &&
    has(drawnNarrow.fullGoal, /^Mission: \d+ kg to Kármán \(100 km\)$/) &&
    !has(drawnNarrow.fullGoal, /deliver it to/) &&
    has(drawnNarrow.fullClimb, /^pace 54 kg\/h to Kármán \(best 34\)$/) &&
    !has(drawnNarrow.fullClimb, /Mission: \d+ kg cargo ·/),
    JSON.stringify({ minimalSet: drawn.minimalSet, fullSet: drawn.fullSet,
                     minimal: drawn.minimal.slice(0, 12), full: drawn.full.slice(0, 14),
                     climbing: drawn.climbing.slice(0, 14), delivered: drawn.delivered.slice(0, 14),
                     deliveredBoot: (drawn.deliveredBoot || []).slice(0, 14),
                     fullClimbing: (drawn.fullClimbing || []).slice(0, 14),
                     groundBest: (drawn.groundBest || []).slice(0, 14),
                     narrowSet: drawnNarrow.narrowSet, compact: drawnNarrow.compact,
                     narrowGoal: drawnNarrow.fullGoal.slice(0, 14),
                     narrowClimb: drawnNarrow.fullClimb.slice(0, 14) }));

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
    // State, not clock: the overlay re-derives the gate from u every frame, so each
    // wait below polls the render handles themselves with a 5 s wall escape bound; a
    // loaded runner just polls longer (the fixed 150/300 ms pair raced the frame
    // loop's first recomputation at the new state).
    const until = async (fn, maxMs = 5000) => {
      const t0 = Date.now();
      while (!fn()) { if (Date.now() - t0 > maxMs) return false; await new Promise((r) => setTimeout(r, 25)); }
      return true;
    };
    // A soak in frames, not wall time: n frames counted through the same live
    // _boundUpdate property check 6 wraps. 18 frames is the old 300 ms at 60fps, and
    // the count proves the soak was real even on a runner that idled.
    const framesAfter = async (n, maxMs = 5000) => {
      let c = 0; const orig = g._boundUpdate;
      g._boundUpdate = (t) => { c++; return orig(t); };
      const t0 = Date.now();
      while (c < n) { if (Date.now() - t0 > maxMs) break; await new Promise((r) => setTimeout(r, 25)); }
      g._boundUpdate = orig;
      return c;
    };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    g.monkey.velocityY = 0;
    await until(() => g._crestDrawn === true && g._crestPush > 0.95 && g._crestScrollPxS > 100);
    const open = { drawn: g._crestDrawn, push: g._crestPush, speed: g._crestScrollPxS,
                   capHz: g._crestPassHzMax, hud: g._hudLevelDrawn, a: g._crestScrollPx };
    // The accumulation pin IS the predicate now (the boot-overlay discipline: wait on
    // what the check asserts). Its minimum-rate half already lives in speed > 100.
    await until(() => g._crestScrollPx - open.a > 10);
    open.advanced = g._crestScrollPx - open.a;
    // u = 3: outrunning the crest, the gate never opens. Gravity over the soak adds
    // only ~3 m/s (GRAVITY = 98.1 px/s² at 10 px/m), so u cannot fall back under 1 here.
    g.monkey.velocityY = -3 * g.waveSystem.amplitude * g.waveSystem.frequency * 2 * Math.PI
        * 10;   // px/s (ALTITUDE_CONVERSION = 10 px/m)
    await until(() => g._crestPush === 0 && g._crestScrollPxS === 0);
    const closed = { push: g._crestPush, speed: g._crestScrollPxS, a: g._crestScrollPx };
    closed.frames = await framesAfter(18);
    closed.advanced = g._crestScrollPx - closed.a;
    // Back to a quiet parked state on the ground (no game-over left behind).
    g.monkey.velocityY = 0; g.monkey.y = 0; g.monkey.altitude = 0; g.maxAltitude = 0;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    // HUD off must hide the overlay: it is an instrument, not the vehicle. Each press
    // waits until the DRAWN handle consumed it, or a loaded runner batches presses.
    for (let i = 0; i < 4 && g._hudLevelDrawn !== 2; i++) {
      const prev = g._hudLevelDrawn;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
      await until(() => g._hudLevelDrawn !== prev);
    }
    const hiddenAtOff = g._hudLevelDrawn === 2 && g._crestDrawn === false;
    const prevHud = g._hudLevelDrawn;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));   // back to minimal
    await until(() => g._hudLevelDrawn !== prevHud);
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
    // State, not clock: two frames settle the first sample, then an 18-frame soak
    // (the old 300 ms at 60fps) proves the frozen scroll never moves while frames run.
    let frames = 0; const orig = g._boundUpdate;
    g._boundUpdate = (t) => { frames++; return orig(t); };
    const t0 = Date.now();
    while (frames < 2) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
    const a = g._crestScrollPx;
    const framesAtA = frames;
    while (frames - framesAtA < 18) { if (Date.now() - t0 > 5000) break; await new Promise((r) => setTimeout(r, 25)); }
    g._boundUpdate = orig;
    return { frozen: g._crestScrollFrozen, a, b: g._crestScrollPx,
             push: g._crestPush, speed: g._crestScrollPxS, frames: frames - framesAtA };
  });
  await crestRmCtx.close();
  record('slip crests: overtaking drawn (scroll + push), fades to exactly 0 past the gate, frozen under reduced motion, hidden at HUD off',
    crests.open.drawn === true && crests.open.hud === 0 &&
    Math.abs(crests.open.push - 1) < 0.05 && crests.open.speed > 100 &&
    crests.open.capHz <= 3 && crests.open.advanced > 10 &&
    crests.closed.push === 0 && crests.closed.speed === 0 && crests.closed.advanced === 0 &&
    crests.closed.frames >= 18 &&
    crests.hiddenAtOff === true && crests.restored === 0 &&
    crestRm.frozen === true && crestRm.speed === 0 && crestRm.a === crestRm.b &&
    crestRm.frames >= 18 &&
    Math.abs(crestRm.push - 1) < 0.05,
    JSON.stringify({ ...crests, crestRm }));

  // 30) Climber face follows the MOTION, not the input latch (renderMonkey/_faceState):
  //     calm on the pad, smiled while climbing, gritted while sliding back down engaged
  //     (a stall), surprised only once coasting airborne. State-based: renderMonkey writes
  //     _faceState every frame, so three frames after each placement is a certain settle.
  const faces = await page.evaluate(async () => {
    const g = window.__smokeGame;
    const frames = (n) => new Promise((res) => { let i = 0; const step = () => (++i >= n ? res() : requestAnimationFrame(step)); requestAnimationFrame(step); });
    const out = {};
    const set = async (grabbing, vy, altM, key) => {
      g.monkey.isGrabbing = grabbing;
      g.monkey.y = -altM * 10; g.monkey.velocityY = vy;
      g.camera.y = g.monkey.y + g.canvas.height * 0.5;
      await frames(3);
      out[key] = g._faceState;
    };
    await set(false, 0, 0, 'pad');            // standing on the grass
    await set(true, -3000, 12000, 'climb');   // engaged, climbing ~1080 km/h
    await set(true, 3000, 12000, 'slide');    // engaged, sliding back down (stall)
    await set(false, 1500, 12000, 'coast');   // released, airborne
    g.monkey.y = 0; g.monkey.velocityY = 0; g.monkey.isGrabbing = false;
    return out;
  });
  record('face states: calm on the pad, smile climbing, grimace on a stall slide, surprised coasting airborne',
    faces.pad === 'idle' && faces.climb === 'smile' && faces.slide === 'grimace' && faces.coast === 'surprised',
    JSON.stringify(faces));

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
