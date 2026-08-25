// Capture tool for Space Monkey Elevator: the README stills, the climb clip, and
// the one-frame regress shots.
//
//   node dev/tools/capture.mjs                      # stills + clip
//   node dev/tools/capture.mjs stills               # screenshots/hero.png + screenshots/climb.png
//   node dev/tools/capture.mjs clip                 # screenshots/climb.mp4
//   node dev/tools/capture.mjs frame <n> <out> [skytS] [targetYD]
//                                                   # one named composition ('hero' or 'climb')
//                                                   # to <out>, defaults skyt 1719, targetY shift 0
//
// frame is the deterministic single-shot mode the advisory regress tool
// (dev/tools/regress.mjs) drives. It is the SAME recipe as stills - the walker,
// the seeded beats and the by-hand stepped loop are one shared implementation
// (shootOne below) - with two capture-run fixes that make a rerun bit-exact:
//
//   - The page boots with ?clean&debug&skyt=<s> so the WebGL sky's wall-clock
//     is frozen (the game's own Shift G hook, inert in normal play).
//   - page.addInitScript runs BEFORE the game script and stubs Math.random with
//     a tiny deterministic LCG plus performance.now with a fixed value, so the
//     boot-time star field and the hands-glow pulse are constants instead of
//     per-run noise. The whole bundle - frozen sky, seeded beats, stubbed
//     random/clock, sim-stepped loop - is what makes two captures identical.
//
// stills and clip keep their CLI contract exactly; they simply inherit the same
// determinism from boot (their pixels get stronger, nothing reads differently).
//
// Like tests/smoke/smoke.mjs this adds NO committed dependency: playwright-core and a
// Chromium binary are resolved at runtime and the script SKIPS CLEANLY (exit 0) when
// either is absent, so the repo stays zero-dependency and the gate is never slowed.
// playwright-core is looked up (1) via PLAYWRIGHT_CORE, (2) as a plain import, then
// (3) inside dev/tests/smoke/node_modules, where the smoke suite keeps its local copy.
// The Chromium lookup is smoke.mjs's own discovery (SMOKE_CHROMIUM, the managed build,
// then the ms-playwright cache), extended to also see chrome-headless-shell builds,
// which the capture prefers: that is the binary the swiftshader flags were tuned on.
//
// The encoding half needs ffmpeg on PATH. Without it the frames are still captured and
// kept, and the exact ffmpeg command is printed; the clip step then reports SKIP.
//
// The recipe (paid for over several shifts; do not rediscover):
//   - Headless Chromium renders no WebGL sky without
//     --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader.
//   - Never set paused = true: the pause state draws a wash-out veil.
//   - The loop is stepped BY HAND: cancel the RAF chain once, then call update(t) with a
//     synthetic clock at a fixed dt and cancel the chain it re-arms after every call.
//     Sim time (not wall time) then drives the captures, so frames are exactly 1/30 s
//     apart no matter how slow the screenshot round-trip is, and a dt of 0 re-renders
//     without moving anything (the camera follow is a no-op at dt 0).
//   - Landmarks are DOM with parallax, so aligning the climber to a sprite by altitude
//     arithmetic does not work. Read the sprite's getBoundingClientRect and walk the
//     altitude until it lands in the target window (__align below).
//   - Re-place the climber immediately before each shot; any real-time wait drifts it.
//   - Teleporting fires beat cards, the act banner, suit toasts and milestone bursts and
//     leaves the run clock near zero, so the HUD prints absurd numbers. Seed
//     _beatsFired, _descendersFired, _actBreakFired, _runTimeS and _climbStartS first,
//     plus landmarksPassed/milestonesPassed (suppresses the shake + burst) and
//     currentLandmarkName/currentLandmarkAlt (suppresses the altimeter pill and the
//     mid-screen hero label, which renderEffects draws even at HUD off).
//   - Low altitude is the friendly picture: below 8 km there is no suit, and the hero
//     must read at thumbnail size. The stills use the hot air balloon (220 m) and the
//     bald eagle (355 m), the same pair the pre-band shots used.
//
// Exit codes: 0 = everything asked for was produced OR a dependency was absent (SKIP);
// 1 = a tool bug or a capture that failed its own sanity checks.

import http from 'node:http';
import { readFile, readdir, stat, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // repo root (serves index.html + assets/)
const SHOTS = path.join(ROOT, 'screenshots');

// --- what we shoot --------------------------------------------------------------------
// Still compositions at 1280x800, HUD off (?clean). The walker puts the named
// landmark's image centre on TARGET_Y; the neighbours then fall where the parallax puts
// them, which is why the targets are tuned by eye (box kite and osprey captions must
// stay inside the frame).
const VIEW = { width: 1280, height: 800 };
// Frozen sky seconds for frame mode (?debug&skyt=<s>). The value is arbitrary;
// 1719 is the constant the regress pipeline was verified at.
const FRAME_SKYT = 1719;
const STILLS = [
  { name: 'Hot Air Balloon', targetY: 510, guessAlt: 255, out: 'hero.png' },
  { name: 'Bald Eagle', targetY: 330, guessAlt: 360, out: 'climb.png' },
];
// The clip: a real climb from 100 m, HUD at the minimal level (the default a player
// sees). Engage, coast (the falling pose and the parked crests are the release beat),
// re-engage. 30 fps sim-stepping; ffmpeg encodes the clip from the PNG frames.
const CLIP = {
  out: 'climb.mp4',
  startAltM: 100, startSpeedMps: 20, fps: 30, crf: 27, width: 640,
  // [startS, endS, engaged]
  plan: [[0, 3.5, true], [3.5, 5.0, false], [5.0, 7.5, true]],
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

function skip(reason) {
  console.log(`CAPTURE SKIPPED - ${reason}`);
  console.log('  Local setup: npm --prefix dev/tests/smoke i -D playwright-core && '
    + 'npx --prefix dev/tests/smoke playwright install chromium');
  process.exit(0);
}

// --- resolve playwright-core (runtime, optional) --------------------------------------
let chromium;
try {
  const spec = process.env.PLAYWRIGHT_CORE || 'playwright-core';
  ({ chromium } = await import(spec));
} catch {
  try {
    ({ chromium } = createRequire(path.join(ROOT, 'dev', 'tests', 'smoke', 'smoke.mjs'))('playwright-core'));
  } catch {
    skip('playwright-core is not installed');
  }
}

// --- resolve a Chromium binary (smoke.mjs's discovery, + headless shell) ---------------
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
  try {
    const p = chromium.executablePath();
    if (p && existsSync(p)) return p;
  } catch { /* managed browser not installed */ }
  const caches = [
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS
    path.join(os.homedir(), '.cache', 'ms-playwright'),            // Linux
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),    // Windows
  ].filter(Boolean);
  const isBinary = (n) =>
    n === 'chrome-headless-shell' || n === 'headless_shell' ||
    n === 'Google Chrome for Testing' || n === 'Chromium' || n === 'chrome' || n === 'chrome.exe';
  const hits = [];
  for (const cache of caches) {
    try {
      const dirs = (await readdir(cache, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name.startsWith('chromium'))
        .map((d) => path.join(cache, d.name));
      for (const d of dirs) {
        const bin = await findFile(d, isBinary);
        if (bin) { try { await stat(bin); hits.push(bin); } catch { /* keep looking */ } }
      }
    } catch { /* no cache here */ }
  }
  // Prefer the headless shell (the binary this recipe was tuned on), newest first.
  hits.sort((a, b) => Number(/(\d{4})/.exec(b)?.[1] || 0) - Number(/(\d{4})/.exec(a)?.[1] || 0));
  return hits.find((p) => p.includes('headless')) || hits[0] || null;
}

const executablePath = await discoverChromium();
if (!executablePath) skip('no Chromium binary found');
const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

// --- tiny static server on an ephemeral port (same as smoke.mjs) -----------------------
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

// --- browser ---------------------------------------------------------------------------
let browser;
const failures = [];
const skips = [];
try {
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--mute-audio', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
} catch (err) {
  skip(`Chromium would not launch (${String(err && err.message || err).split('\n')[0]})`);
}

// In-page harness: freeze the RAF chain, seed the run state, install __step/__place/
// __align. Everything runs off the synthetic clock window.__simT.
async function boot(query) {
  const page = await browser.newPage({ viewport: VIEW });
  page.on('pageerror', (e) => failures.push('pageerror: ' + e.message));
  // Deterministic capture run: stub Math.random (LCG) and performance.now (fixed)
  // BEFORE the game script parses, so the boot-time star field and the hands-glow
  // pulse are constants. Inert for a real player; only the capture pages boot here.
  await page.addInitScript(() => {
    let _rng = 424242;
    Math.random = () => {
      _rng = (Math.imul(_rng, 1664525) + 1013904223) >>> 0;
      return _rng / 4294967296;
    };
    performance.now = () => 7200000;
  });
  await page.goto(`${BASE}/index.html?debug${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__smokeGame && window.__smokeGame.monkey, null, { timeout: 20000 });
  // State, not clock: the loop starts on loadingManager.onComplete AFTER the overlay's
  // fade, and a freeze that lands before the overlay clears is cancelled-and-resurrected
  // by _startLoop() (a recorded trap). The thermometer and suit sprites are NOT counted
  // by the loading manager (the other recorded trap), so also wait for every
  // canvas-consumed image to decode.
  await page.waitForFunction(() => {
    const o = document.getElementById('loading-overlay');
    const cleared = !o || getComputedStyle(o).display === 'none' || getComputedStyle(o).opacity === '0';
    const g = window.__smokeGame;
    if (!cleared || !g || g._rafId === null) return false;
    const imgs = [g.monkeyGrabbingImage, g.monkeyFallingImage, g.thermometerImage, ...(g.suitImages || [])];
    return imgs.every((im) => !im || im.complete);
  }, null, { timeout: 20000 });
  await page.evaluate(() => {
    const g = window.__smokeGame;
    if (g._rafId !== null) { cancelAnimationFrame(g._rafId); g._rafId = null; }
    // The recipe's seeds: no beat cards, act banner, descenders or suit toasts from the
    // teleports, and a run clock that makes the HUD print sane figures.
    g._beatsFired = new Set(['taper', 'wave-drag', 'transverse', 'thinning', 'fatigue', 'second-climber', 'resonance', 'resonance-retune', 'mode-conversion', 'stack-heat']);
    g._descendersFired = new Set(['desc-30', 'desc-60']);
    g._actBreakFired = true;
    g.landmarksPassed = new Set(g.landmarkSystem.landmarks.map((l) => l.altitude));
    g.milestonesPassed = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    g._firstCoupleDone = true;        // the pulsing first-grab hint is onboarding, not the climb
    g._couplingParticleTimer = 999;   // no sparkle burst inside a dt-0 frame
    // Suppress the altimeter pill and the mid-screen hero label: both are stale the
    // moment a shot is placed, and renderEffects draws the label even at HUD off.
    g.currentLandmarkName = 'Treetops'; g.currentLandmarkAlt = 0;
    if (g.altimeterLabel) { g.altimeterLabel.classList.remove('visible'); g.altimeterLabel.textContent = ''; }
    // Freeze the sim clock baseline: lastTime=0 makes update() take the dt=0 guard
    // (`this.lastTime === 0 ? 0 : ...`) on the FIRST manual step too, so the real
    // RAF boot timestamp never leaks into waveSystem.time and the film band's phase
    // and highlight are identical on every page. Zero the wave clocks outright so no
    // pre-cancel RAF frame can leave residue.
    g.lastTime = 0;
    g.waveSystem.time = 0;
    g._shapeTimeS = 0;
    window.__simT = Math.max(1000, g.lastTime || 0);
    window.__step = (n, dtMs) => {
      for (let i = 0; i < n; i++) {
        window.__simT += dtMs;
        g.update(window.__simT);
        if (g._rafId !== null) { cancelAnimationFrame(g._rafId); g._rafId = null; }
      }
    };
    window.__place = (altM) => {
      g.monkey.y = -altM * 10; g.monkey.velocityY = 0; g.monkey.altitude = altM;
      // 0.7 is the game's own GameConfig.CAMERA.VERTICAL_OFFSET (not exported to the
      // page): camera.y = monkey.y - H*0.7 puts the climber at its natural 0.7H framing.
      // At dt 0 the follow is a no-op, so this exact value is what the stills keep.
      const target = g.monkey.y - g.canvas.height * 0.7;
      g.camera.y = target; g.camera.targetY = target; g.camera.shakeIntensity = 0;
    };
    // Walk the altitude until the landmark's IMAGE centre sits on targetY. The parallax
    // factor is re-read every iteration from the actual rendered rect, so this converges
    // in a few steps and never trusts a hand-computed factor.
    window.__align = (name, targetY) => {
      const lm = g.landmarkSystem.landmarks.find((l) => l.name === name);
      if (!lm || !lm.element) throw new Error('landmark not found: ' + name);
      const img = lm.element.querySelector('img');
      let r = img.getBoundingClientRect();
      for (let i = 0; i < 16; i++) {
        window.__place(g.monkey.altitude);
        window.__step(1, 0);
        r = img.getBoundingClientRect();
        const err = (r.y + r.height / 2) - targetY;
        if (Math.abs(err) < 3) break;
        const par = 0.92 - Math.min(lm.altitude / 100000, 1) * 0.67;
        g.monkey.y -= (err / (par * 10)) * -10; // err>0: sprite too low -> raise altitude
        g.monkey.altitude = -g.monkey.y / 10;
      }
      if (Math.abs((r.y + r.height / 2) - targetY) >= 3) {
        throw new Error('align did not converge for ' + name);
      }
      return { alt: g.monkey.altitude, centerY: r.y + r.height / 2, name };
    };
  });
  return page;
}

// --- the shot recipe (shared by stills and frame; never duplicate) ----------------------
// One named composition: walk the altitude until the landmark's image centre sits
// on targetY, re-place the climber immediately before the shot, then screenshot.
async function shootOne(page, spec, outPath) {
  const info = await page.evaluate(({ name, targetY, guessAlt }) => {
    const g = window.__smokeGame;
    g.monkey.isGrabbing = true;
    window.__place(guessAlt);
    const out = window.__align(name, targetY);
    // Re-place immediately before the shot and re-render without advancing anything.
    window.__place(g.monkey.altitude);
    window.__step(2, 0);
    return out;
  }, spec);
  await page.screenshot({ path: outPath });
  const kb = Math.round((await stat(outPath)).size / 1024);
  console.log(`  ${path.basename(outPath)}: ${spec.name} at ${info.alt.toFixed(1)} m, `
    + `centre y=${info.centerY.toFixed(0)} (${kb} KB)`);
  return info;
}

// --- stills (HUD off, the social card must stay a still PNG) ---------------------------
// One fresh page PER still, the same frozen sky as frame mode (skyt=FRAME_SKYT), so the
// committed PNGs and the regress tool's probes are the same shots: before this, the two
// stills shared one page and the hero walker's state (altitude, landmark suppression,
// camera smoothing, wave clocks) leaked into the climb frame - deterministic, but a
// DIFFERENT picture than a fresh-page probe of the same composition. The clip keeps a
// live sky: it is a video, a frozen aurora would read as a bug there, and nothing
// compares it pixel-wise.
async function shootStills() {
  for (const s of STILLS) {
    const page = await boot(`&clean&skyt=${FRAME_SKYT}`);
    await shootOne(page, s, path.join(SHOTS, s.out));
    await page.close();
  }
}

// --- one named frame (the regress tool's probe) -----------------------------------------
async function shootFrame() {
  const name = process.argv[3];
  const outPath = process.argv[4];
  const skytS = process.argv[5] === undefined || process.argv[5] === ''
    ? String(FRAME_SKYT) : process.argv[5];
  const targetYD = process.argv[6] === undefined || process.argv[6] === ''
    ? 0 : Number(process.argv[6]);
  const skyt = parseFloat(skytS);
  if (!Number.isFinite(skyt) || skyt < 0) throw new Error('frame: skyt must be a number');
  if (Number.isNaN(targetYD)) throw new Error('frame: targetY offset must be a number');
  const spec = STILLS.find((s) => s.out.slice(0, -'.png'.length) === name);
  if (!spec) throw new Error(`frame: unknown composition "${name}" - use hero or climb`);
  if (path.extname(outPath).toLowerCase() !== '.png') throw new Error('frame: outPath must end in .png');
  const page = await boot(`&clean&skyt=${skytS}`);
  await shootOne(page, { ...spec, targetY: spec.targetY + targetYD }, outPath);
  await page.close();
}

// --- clip (minimal HUD: the default screen, and the score line rides it) ---------------
async function shootClip() {
  const framesDir = await mkdtemp('smx-climb-');
  const page = await boot(''); // minimal HUD is the boot default
  await page.evaluate(({ startAltM, startSpeedMps }) => {
    const g = window.__smokeGame;
    // A real climb state: moving at startSpeed, engaged, with the climb clock consistent
    // with having climbed here at the default mean pace (947 km/h) plus a second of
    // acceleration, so the pace line projects honestly from frame one.
    window.__place(startAltM);
    g.monkey.velocityY = -startSpeedMps * 10;
    g.monkey.isGrabbing = true;
    g.maxAltitude = startAltM;
    g._runTimeS = 20;
    g._climbStartS = 20 - (startAltM / 263 + 1.0);
  }, CLIP);
  let frame = 0;
  const t0 = Date.now();
  for (const [tA, tB, engaged] of CLIP.plan) {
    await page.evaluate((on) => { window.__smokeGame.monkey.isGrabbing = on; }, engaged);
    const n = Math.round((tB - tA) * CLIP.fps);
    for (let i = 0; i < n; i++) {
      await page.evaluate((dtMs) => window.__step(1, dtMs), 1000 / CLIP.fps);
      await page.screenshot({ path: path.join(framesDir, `f${String(frame).padStart(4, '0')}.png`) });
      frame++;
    }
  }
  const end = await page.evaluate(() => ({
    alt: Math.round(window.__smokeGame.monkey.altitude),
    kmh: Math.round(-window.__smokeGame.monkey.velocityY / 10 * 3.6),
    gameOver: window.__smokeGame.gameOver,
  }));
  await page.close();
  console.log(`  clip: ${frame} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s, `
    + `ends at ${end.alt} m / ${end.kmh} km/h, gameOver=${end.gameOver}`);
  if (end.gameOver) failures.push('clip: the run ended mid-capture (game over)');
  if (!ffmpeg) {
    console.log(`  clip: ffmpeg not found - frames kept at ${framesDir}`);
    console.log(`        encode them with: ffmpeg -framerate ${CLIP.fps} -i '${framesDir}/f%04d.png' `
      + `-vf scale=${CLIP.width}:-2:flags=lanczos -c:v libx264 -pix_fmt yuv420p -crf ${CLIP.crf} `
      + `-movflags +faststart -an ${path.join(SHOTS, CLIP.out)}`);
    skips.push('clip (no ffmpeg on PATH)');
    return;
  }
  const out = path.join(SHOTS, CLIP.out);
  const enc = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(CLIP.fps),
    '-i', path.join(framesDir, 'f%04d.png'),
    '-vf', `scale=${CLIP.width}:-2:flags=lanczos`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(CLIP.crf),
    '-preset', 'slow', '-movflags', '+faststart', '-an', out,
  ], { stdio: 'inherit' });
  if (enc.status !== 0) { failures.push('clip: ffmpeg encode failed'); return; }
  await rm(framesDir, { recursive: true, force: true });
  console.log(`  ${CLIP.out}: ${Math.round((await stat(out)).size / 1024)} KB`);
}

async function mkdtemp(prefix) {
  const dir = path.join(os.tmpdir(), prefix + Date.now());
  await mkdir(dir, { recursive: true });
  return dir;
}

// --- main --------------------------------------------------------------------------------
const what = process.argv[2] || 'all';
console.log(`capture: ${what} (browser: ${path.basename(executablePath)}, ffmpeg: ${ffmpeg ? 'yes' : 'no'})`);
try {
  if (what === 'stills' || what === 'all') await shootStills();
  if (what === 'clip' || what === 'all') await shootClip();
  if (what === 'frame') await shootFrame();
  if (what !== 'stills' && what !== 'clip' && what !== 'all' && what !== 'frame') {
    console.error(`unknown mode "${what}" - use stills, clip, frame or all`);
    process.exitCode = 1;
  }
} catch (err) {
  failures.push(String(err && err.stack || err));
} finally {
  if (browser) await browser.close();
  server.close();
}
if (failures.length) {
  console.error('CAPTURE FAIL:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(skips.length ? `CAPTURE PASS (with skips: ${skips.join('; ')})` : 'CAPTURE PASS');
