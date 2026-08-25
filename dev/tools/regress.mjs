// regress.mjs - advisory perceptual regression for the README stills.
//
//   node dev/tools/regress.mjs
//
// For each committed still (screenshots/hero.png and screenshots/climb.png) this
// shells out to a FRESH deterministic frame capture (dev/tools/capture.mjs
// frame <name> <tmp> [skytS] [targetYD]) and compares pixels against the
// committed PNG, reporting two numbers:
//
//   - meanAbsDiff: mean over pixels of the largest absolute RGBA channel diff
//     (0-255 scale).
//   - changedFraction: fraction of pixels whose largest channel diff exceeds
//     CHANGE_TOL (12/255).
//
// A rerun of the unchanged build must report 0 / 0: the capture recipe is
// deterministic by construction (by-hand sim-stepped loop, seeded beats, the
// game's frozen sky via ?clean&debug&skyt=<s>, and a page-level stub of
// Math.random + performance.now installed before the game script loads, so the
// star field and the hands-glow pulse are constants too). The verdict is OK
// only for a bit-exact match; anything else is DRIFT.
//
// DRIFT is an advisory observation, never a gate - the repo's design rule says
// a render change is not verified until you have shot the frame, and the gate
// for that is the capture itself, not this diff. Exit is 0 in normal operation
// even when DRIFT is reported. This file is MANUAL: dev/tools/check.sh does not
// reference it yet (wiring it in is the owner's separate decision).
//
// Exit codes: 0 always in normal operation; 1 only for a tool bug (the capture
// produced nothing, a PNG is unreadable, the PNG format is unsupported, or two
// frames have different dimensions).
//
// PNG decoding is zero-dependency: node's built-in zlib inflates the IDAT
// stream and this file undoes the scanline filters (types 0-4). The committed
// stills are 1280x800, 8 bits per sample, non-interlaced. Headless Chromium
// writes truecolor without alpha (color type 2) and re-encodes may also arrive
// as rgba (color type 6); both 8-bit truecolor forms are accepted, anything
// else - a palette, gray, 16-bit depth or an interlaced file - fails loudly.
//
// Env overrides (advisory experiments only):
//   REGRESS_SKYT     frozen sky seconds for the fresh frame (default 1719)
//   REGRESS_TARGET_Y px added to the walker's TARGET_Y for the fresh frame
//                    (default 0) - a 1 px shove is the honest sensitivity probe
//
// A different REGRESS_SKYT is a no-op for these two low-altitude compositions
// (the sky shader reads time only inside its rain/aurora/meteor bands, all
// altitude-gated below 13 km), so the sensitivity probe is REGRESS_TARGET_Y.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CAPTURE = path.join(HERE, 'capture.mjs');
const CHANGE_TOL = 12;
const SKYT = Number.isFinite(Number(process.env.REGRESS_SKYT))
  ? Number(process.env.REGRESS_SKYT) : 1719;
const TARGET_Y = Number.isFinite(Number(process.env.REGRESS_TARGET_Y))
  ? Number(process.env.REGRESS_TARGET_Y) : 0;
const FRAMES = [
  { name: 'hero', committed: path.join(ROOT, 'screenshots', 'hero.png') },
  { name: 'climb', committed: path.join(ROOT, 'screenshots', 'climb.png') },
];
const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readPng(file) {
  const buf = readFileSync(file);
  if (buf.length < 8 || !SIG.every((b, i) => buf[i] === b)) {
    throw new Error('not a PNG: ' + file);
  }
  let pos = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  if (!w || !h) throw new Error('missing IHDR/IDAT: ' + file);
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG format (${file}): colorType=${colorType} `
      + `bitDepth=${bitDepth} interlace=${interlace} - expected 8-bit truecolor/truecolor-alpha, non-interlaced`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  const prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filt = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    if (filt === 1) {          // Sub
      for (let i = bpp; i < stride; i++) line[i] = (line[i] + line[i - bpp]) & 255;
    } else if (filt === 2) {   // Up
      for (let i = 0; i < stride; i++) line[i] = (line[i] + prev[i]) & 255;
    } else if (filt === 3) {   // Average
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? line[i - bpp] : 0;
        line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255;
      }
    } else if (filt === 4) {   // Paeth
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? line[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        const pr = pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
        line[i] = (line[i] + pr) & 255;
      }
    } else if (filt !== 0) {
      throw new Error('unknown PNG scanline filter ' + filt + ' in ' + file);
    }
    line.copy(px, y * stride);
    line.copy(prev);
  }
  return { w, h, bpp, px };
}

function compare(a, b) {
  const n = a.w * a.h;
  let total = 0;
  let changed = 0;
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const oa = i * a.bpp;
    const ob = i * b.bpp;
    let d = Math.abs(a.px[oa] - b.px[ob]);
    d = Math.max(d, Math.abs(a.px[oa + 1] - b.px[ob + 1]));
    d = Math.max(d, Math.abs(a.px[oa + 2] - b.px[ob + 2]));
    if (a.bpp === 4 || b.bpp === 4) {
      const aa = a.bpp === 4 ? a.px[oa + 3] : 255;
      const ab = b.bpp === 4 ? b.px[ob + 3] : 255;
      d = Math.max(d, Math.abs(aa - ab));
    }
    total += d;
    if (d > CHANGE_TOL) changed++;
    if (d > worst) worst = d;
  }
  return { mean: total / n, changedFrac: changed / n, worst };
}

const workdir = mkdtempSync(path.join(tmpdir(), 'regress-'));
let toolBug = false;
try {
  for (const frame of FRAMES) {
    const fresh = path.join(workdir, frame.name + '-fresh.png');
    console.log(`regress: shooting fresh ${frame.name} frame (skyt=${SKYT}, targetY offset=${TARGET_Y})`);
    const res = spawnSync(process.execPath, [
      CAPTURE, 'frame', frame.name, fresh, String(SKYT), String(TARGET_Y),
    ], { encoding: 'utf8' });
    for (const l of (res.stdout || '').split('\n')) {
      if (l.trim()) console.log('regress:   ' + l);
    }
    if (res.status !== 0 || !existsSync(fresh)) {
      console.error(`regress: FAIL - capture did not produce ${fresh} `
        + `(status=${res.status}, stderr: ${(res.stderr || '').trim().split('\n')[0]})`);
      toolBug = true;
      continue;
    }
    let committed, shot;
    try {
      committed = readPng(frame.committed);
      shot = readPng(fresh);
    } catch (err) {
      console.error(`regress: FAIL - ${err.message}`);
      toolBug = true;
      continue;
    }
    if (committed.w !== shot.w || committed.h !== shot.h) {
      console.error(`regress: FAIL - ${frame.name} dimension mismatch `
        + `(committed ${committed.w}x${committed.h}, fresh ${shot.w}x${shot.h})`);
      toolBug = true;
      continue;
    }
    const s = compare(committed, shot);
    const verdict = s.mean === 0 && s.changedFrac === 0 ? 'OK' : 'DRIFT';
    console.log(`regress: ${frame.name} meanAbsDiff=${s.mean.toFixed(6)} `
      + `changedFraction=${s.changedFrac.toFixed(6)} worst=${s.worst} verdict=${verdict}`);
  }
  const bad = FRAMES.filter((f) => !existsSync(path.join(workdir, f.name + '-fresh.png'))).length;
  if (!toolBug) console.log(`regress: done - ${FRAMES.length - bad}/${FRAMES.length} frames compared`);
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
process.exitCode = toolBug ? 1 : 0;