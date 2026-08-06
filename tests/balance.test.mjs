// M2.0 — Balance-trace harness. Drives the REAL integrator (extracted PhysicsEngine,
// WaveSystem and pure helpers, wired in the same order as Game.update/updateContinuous)
// at a fixed dt with the coupling always engaged, and records the altitude / velocity /
// charge trace. Exists so that M2's deliberate retunes can tell an intended change from
// a regression: assertions are INVARIANTS, not magic numbers.
//
//   - the climb completes 100 km within a generous wall of simulated time (fail = stall)
//   - altitude is monotonically non-decreasing while engaged (see NOTE below)
//   - terminal speed is finite — and M2.5 must tighten this to `< v_max` HERE: when
//     applyEddyDrag (EDDY_FRACTION, the shipped game's only speed ceiling) is deleted,
//     a missing/wrong slip term shows up as runaway speed and this assertion turns red
//   - the trace is frame-rate independent: dt = 1/60 vs dt = 1/240 agree to tolerance
//   - charge stays within [0, CAPACITY]; brownout recovers via ambient trickle
//
// NOTE on monotonicity: true per-step under the current model (verified: 0 dips in the
// 919 s default climb). M2.8 makes the engage/release rhythm emergent — thrust fades as
// slip closes while switching drain stays flat — so brownout dives become PHYSICAL and
// this assertion is expected to be relaxed to "no sustained net descent" in that commit,
// with the snapshot diff as the review record.
//
// Snapshot: tests/balance.snapshot.json is a committed trace at documented defaults.
// A mismatch is ADVISORY ("explain or revert"), not a hard failure — M2.11 updates it
// in one reviewable commit via:  BALANCE_SNAPSHOT_UPDATE=1 node --test tests/balance.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadGameModule } from './extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, 'balance.snapshot.json');

const {
  GameConfig, WaveSystem, PhysicsEngine,
  epmChargeStep, couplingMomentumScale, thermalStep, climbSpeedKmh,
} = loadGameModule();

// Documented defaults, mirroring initGame() exactly: vineWidth 4.5 == 45 mm (slider
// raw / SETTINGS_SCALE.WIDTH), tension 100 kgf, material 300 GPa CC-CNT (speculative,
// MATERIAL_DEFAULT_INDEX), field x1.00, gravity x1.00, cargo 50 kg, sine carrier at
// WAVE.DEFAULT_FREQUENCY / DEFAULT_AMPLITUDE (7.0 m — the honest equivalent of the old
// 70 px). Wave power does not attenuate with altitude (paper p.9), so energyFactor is
// 1.0; the fabricated material damping multiplier went with it (both M2.2 deletions).
const DEFAULTS = {
  gripMultiplier: 1.0,
  gravityMultiplier: 1.0,
  dragMultiplier: 1.0,
  vineWidth: 4.5,
  vineTension: 100,
  cargoKg: GameConfig.MONKEY.WEIGHT,
};

// One climb at fixed dt. The step order below mirrors Game.update() ->
// updateContinuous() call-for-call; keep them in sync or the trace lies.
function runClimb(dt, wallS) {
  const ws = new WaveSystem('sine');
  const phys = new PhysicsEngine(GameConfig, { emit() {} });
  const monkey = { x: 600, y: 0, width: 80, height: 80, velocityY: 0,
                   weight: DEFAULTS.cargoKg, isGrabbing: true, altitude: 0 };
  const refScale = couplingMomentumScale(DEFAULTS.vineWidth, DEFAULTS.vineTension);
  const waveSpeedFactor = () => Math.max(GameConfig.TETHER.SPEED_FACTOR_MIN,
    Math.min(GameConfig.TETHER.SPEED_FACTOR_MAX,
      couplingMomentumScale(DEFAULTS.vineWidth, DEFAULTS.vineTension) / refScale));
  let charge = GameConfig.EPM.START_CHARGE, brownout = false, thermalTier = -1;
  let coldFactor = 1;

  const targetM = GameConfig.MISSION.DELIVER_ALTITUDE_M;
  const trace = [];
  const crossings = new Map(); // first crossing time per 5 km band
  let nextBandM = 5000;
  let doneAt = null, dips = 0, chargeInRange = true, lastMinute = 0;
  const steps = Math.round(wallS / dt);
  for (let i = 0; i < steps; i++) {
    ws.time += dt;
    const th = thermalStep(monkey.altitude, thermalTier);
    thermalTier = th.tier; coldFactor = th.coldFactor;
    const prevAlt = monkey.altitude;
    phys.applyGravityAndDrag(monkey, dt, DEFAULTS.gravityMultiplier, DEFAULTS.dragMultiplier);
    const engaged = monkey.isGrabbing && !brownout;
    let quality = 0;
    if (engaged) {
      const c = phys.calculateContinuousCoupling(ws, monkey, DEFAULTS.gripMultiplier,
        GameConfig.PHYSICS.MOMENTUM_MULTIPLIER, dt);
      monkey.velocityY += c.impulse * waveSpeedFactor() * coldFactor;
      phys.applyEddyDrag(monkey, dt, DEFAULTS.gripMultiplier);
      quality = c.quality;
    }
    const step = epmChargeStep({ charge, brownout, pulsing: engaged, quality,
      energyFactor: 1.0, tier: 'base', dt });
    charge = step.charge; brownout = step.brownout;
    phys.updatePosition(monkey, dt);

    if (monkey.altitude < prevAlt - 1e-9) dips++;
    if (!(charge >= 0 && charge <= GameConfig.EPM.CAPACITY)) chargeInRange = false;
    // Per-minute cadence: record the FIRST frame at/after each minute mark, so every dt
    // produces exactly one row per minute (a tolerance-window test can double-count when
    // the mark falls between two frames).
    const t = (i + 1) * dt;
    const minute = Math.floor(t / 60 + 1e-9);
    if (minute > lastMinute) {
      lastMinute = minute;
      trace.push({ t: minute * 60, altM: +monkey.altitude.toFixed(1),
                   speedKmh: +climbSpeedKmh(monkey.velocityY).toFixed(1), charge: +charge.toFixed(2) });
    }
    while (nextBandM <= targetM && monkey.altitude >= nextBandM) {
      crossings.set(nextBandM, t);
      nextBandM += 5000;
    }
    if (monkey.altitude >= targetM) { doneAt = t; break; }
  }
  return { doneAt, dips, chargeInRange, trace, crossings,
           finalSpeedKmh: climbSpeedKmh(monkey.velocityY), finalAltM: monkey.altitude };
}

const WALL_S = 2000; // ~2.2x the observed default climb (~919 s); a miss means the climb stalled
const DT_TOLERANCE = 0.02; // frame-rate independence: 1/60 vs 1/240 agree within 2% (~4x observed)

test('climb completes within a generous wall; altitude monotonic; speed finite; charge in range', () => {
  const r = runClimb(1 / 60, WALL_S);
  assert.notEqual(r.doneAt, null,
    `climb did not reach ${GameConfig.MISSION.DELIVER_ALTITUDE_M} m within ${WALL_S} s (stall)`);
  assert.equal(r.dips, 0, `altitude decreased on ${r.dips} steps while engaged`);
  assert.ok(r.chargeInRange, `charge left [0, ${GameConfig.EPM.CAPACITY}]`);
  assert.ok(Number.isFinite(r.finalSpeedKmh) && r.finalSpeedKmh > 0,
    `terminal speed not finite and positive: ${r.finalSpeedKmh} km/h`);
  // M2.5: assert r.finalSpeedKmh < v_max here once §2.1's v_max exists. The EDDY_FRACTION
  // deletion removes the game's only speed ceiling; this line is the tripwire.
});

test('trace is frame-rate independent (dt = 1/60 vs 1/240)', () => {
  const a = runClimb(1 / 60, WALL_S);
  const b = runClimb(1 / 240, WALL_S);
  assert.notEqual(a.doneAt, null); assert.notEqual(b.doneAt, null);
  assert.ok(Math.abs(a.doneAt - b.doneAt) / a.doneAt < DT_TOLERANCE,
    `completion time spread ${(100 * Math.abs(a.doneAt - b.doneAt) / a.doneAt).toFixed(2)}% exceeds ${100 * DT_TOLERANCE}%`);
  assert.ok(Math.abs(a.finalSpeedKmh - b.finalSpeedKmh) / a.finalSpeedKmh < DT_TOLERANCE,
    `final speed spread ${(100 * Math.abs(a.finalSpeedKmh - b.finalSpeedKmh) / a.finalSpeedKmh).toFixed(2)}% exceeds ${100 * DT_TOLERANCE}%`);
  // Compare time-at-altitude, not altitude-at-time: in an accelerating climb the latter
  // amplifies integrator noise, the former is what the player experiences. Worst observed
  // spread 1.15% (5 km band, set by early-climb sampling granularity), decaying to 0.44%.
  for (const [band, ta] of a.crossings) {
    const tb = b.crossings.get(band);
    assert.notEqual(tb, undefined, `dt=1/240 run never crossed ${band} m`);
    const spread = Math.abs(ta - tb) / ta;
    assert.ok(spread < DT_TOLERANCE,
      `crossing time at ${band / 1000} km: ${ta.toFixed(1)}s vs ${tb.toFixed(1)}s (${(100 * spread).toFixed(2)}% > ${100 * DT_TOLERANCE}%)`);
  }
});

test('brownout recovers via ambient trickle (loop invariant, even when the default climb never trips)', () => {
  // Force a latched brownout with zero regen available; the ambient TRICKLE term alone
  // must refill to BROWNOUT_RECOVER and release the latch, in bounded time, in-range.
  let charge = 0, brownout = true, recoveredAt = null;
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(120 / dt); i++) {
    const s = epmChargeStep({ charge, brownout, pulsing: true, quality: 0, energyFactor: 0, tier: 'base', dt });
    charge = s.charge; brownout = s.brownout;
    assert.ok(charge >= 0 && charge <= GameConfig.EPM.CAPACITY, `charge out of range: ${charge}`);
    if (!brownout) { recoveredAt = (i + 1) * dt; break; }
  }
  assert.notEqual(recoveredAt, null, 'brownout never recovered');
  assert.ok(recoveredAt <= GameConfig.EPM.BROWNOUT_RECOVER / GameConfig.EPM.TRICKLE + 1,
    `brownout took ${recoveredAt.toFixed(1)} s to recover (trickle bound is ${(GameConfig.EPM.BROWNOUT_RECOVER / GameConfig.EPM.TRICKLE).toFixed(1)} s)`);
});

test('trace matches the committed snapshot at documented defaults (advisory)', () => {
  const r = runClimb(1 / 60, WALL_S);
  const snapshot = { dt: '1/60', wallS: WALL_S, defaults: DEFAULTS, doneAtS: +(r.doneAt ?? -1).toFixed(1),
                     finalSpeedKmh: +r.finalSpeedKmh.toFixed(1), trace: r.trace };
  if (process.env.BALANCE_SNAPSHOT_UPDATE === '1') {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
    return;
  }
  const committed = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const diffs = [];
  if (committed.doneAtS !== snapshot.doneAtS) diffs.push(`doneAtS ${committed.doneAtS} -> ${snapshot.doneAtS}`);
  if (committed.finalSpeedKmh !== snapshot.finalSpeedKmh) diffs.push(`finalSpeedKmh ${committed.finalSpeedKmh} -> ${snapshot.finalSpeedKmh}`);
  const n = Math.max(committed.trace.length, snapshot.trace.length);
  for (let i = 0; i < n; i++) {
    const a = JSON.stringify(committed.trace[i]), b = JSON.stringify(snapshot.trace[i]);
    if (a !== b) diffs.push(`row ${i}: ${a} -> ${b}`);
  }
  if (diffs.length) {
    console.warn(`\n[balance] ADVISORY — trace differs from tests/balance.snapshot.json (explain or revert;` +
      ` intentional retunes commit an updated snapshot via BALANCE_SNAPSHOT_UPDATE=1):\n  ` +
      diffs.slice(0, 8).join('\n  ') + (diffs.length > 8 ? `\n  …and ${diffs.length - 8} more` : ''));
  }
});
