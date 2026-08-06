// M2.0 — Balance-trace harness. Drives the REAL integrator (extracted PhysicsEngine,
// WaveSystem and pure helpers, wired in the same order as Game.update/updateContinuous)
// at a fixed dt with the coupling always engaged, and records the altitude / velocity /
// charge trace. Exists so that M2's deliberate retunes can tell an intended change from
// a regression: assertions are INVARIANTS, not magic numbers.
//
//   - the climb completes 100 km within a generous wall of simulated time (fail = stall)
//   - altitude is monotonically non-decreasing while engaged (see NOTE below)
//   - terminal speed is finite and strictly below v_max (the tripwire for the EDDY_FRACTION
//     deletion: with the old decay ceiling gone, a missing/wrong slip term shows up as
//     runaway speed and this assertion turns red)
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
  epmChargeStep, thermalStep, climbSpeedKmh,
  maxMaterialVelocityMps, maxAmplitudeM, gapFluxT, pairCouplingK, stackDryMassKg,
  switchingPowerW,
} = loadGameModule();

// Documented defaults, mirroring initGame() exactly (M2.11 tuning): film 100 GPa
// Polycrystalline Graphene (MATERIAL_DEFAULT_INDEX — strongest non-speculative rung),
// carrier 92 Hz (the energy loop only closes at the low end of the band for this film
// class — switching watts grow with f while extraction is capped by v_max), air gap
// 0.15 mm (as tight as the flutter margin allows at 100 kgf pretension), 128 pairs
// (2× §2.5's hold-50-kg anchor, to carry stack + 50 kg cargo), tension 100 kgf, width
// 45 mm, thickness 0.2 mm, cargo 50 kg, gravity x1.00, sine carrier, amplitude clamped
// to the stress cap at boot.
const DEFAULTS = {
  gravityMultiplier: 1.0,
  dragMultiplier: 1.0,
  vineWidth: 4.5,
  vineTension: 100,
  airGapMm: 0.15,
  filmThicknessMm: 0.2,
  cargoKg: GameConfig.MONKEY.WEIGHT,
};

// M2.4/M2.5: the hardware chain — air gap -> pole flux (FG40's published curve), flux ->
// per-pair traction coefficient (§2.5). The flutter margin is load-bearing here: flutter
// at 100 kgf = 0.1 mm, so a gap at/below 0.10 mm unloads the stack entirely at the
// default tension — the tension/slider coupling made real (margin <= 0 => flux 0).
function kPerPairFor(cfg) {
  const material = GameConfig.MATERIALS[cfg.materialIndex];
  const pole = GameConfig.FG40.POLE_FLUX_T;
  const flutterMm = GameConfig.TETHER.FLUTTER_REF_MM * Math.sqrt(100 / DEFAULTS.vineTension);
  const fluxT = cfg.gapMm - flutterMm <= 0 ? 0 : gapFluxT(cfg.gapMm, pole);
  return pairCouplingK({ sigmaSPerM: material.sigmaSPerM, thicknessM: DEFAULTS.filmThicknessMm / 1000,
                         fluxT, poleAreaM2: GameConfig.FG40.POLE_AREA_M2 });
}

// M2.7: total mass = dry stack (magnets + structure fraction) + scored cargo.
function totalMassKgFor(nPairs, cargoKg) {
  return stackDryMassKg(nPairs) * (1 + GameConfig.FG40.STRUCTURE_MASS_FRACTION) + cargoKg;
}

const DEFAULT_CFG = {
  materialIndex: GameConfig.MATERIAL_DEFAULT_INDEX,
  gapMm: DEFAULTS.airGapMm,
  nPairs: GameConfig.FG40.DEFAULT_N_PAIRS,
  carrierHz: GameConfig.WAVE.DEFAULT_FREQUENCY,
  cargoKg: DEFAULTS.cargoKg,
};

// One climb at fixed dt. The step order below mirrors Game.update() ->
// updateContinuous() call-for-call; keep them in sync or the trace lies.
// cfg overrides exercise non-default configs (the rhythm test drives a hot carrier).
function runClimb(dt, wallS, over = {}) {
  const cfg = { ...DEFAULT_CFG, ...over };
  const ws = new WaveSystem('sine');
  ws.frequency = cfg.carrierHz;
  // §2.1: initGame clamps amplitude to the stress cap at boot, so the harness does the
  // same — the 7.0 m default stroke exceeds the cap at any carrier in the band.
  {
    const m = GameConfig.MATERIALS[cfg.materialIndex];
    const vMax = maxMaterialVelocityMps(m.strengthGpa, m.youngsPa, m.densityKgM3, 0.30);
    ws.amplitude = Math.min(ws.amplitude, maxAmplitudeM(vMax, ws.frequency * 2 * Math.PI));
  }
  const phys = new PhysicsEngine(GameConfig, { emit() {} });
  const monkey = { x: 600, y: 0, width: 80, height: 80, velocityY: 0,
                   isGrabbing: true, altitude: 0 };
  const kPerPair = kPerPairFor(cfg);
  const massKg = totalMassKgFor(cfg.nPairs, cfg.cargoKg);
  let charge = GameConfig.EPM.START_CHARGE, brownout = false, thermalTier = -1;
  let coldFactor = 1;

  const targetM = GameConfig.MISSION.DELIVER_ALTITUDE_M;
  const trace = [];
  const crossings = new Map(); // first crossing time per 5 km band
  let nextBandM = 5000;
  let doneAt = null, dips = 0, chargeInRange = true, lastMinute = 0;
  const brownoutEpisodes = [];   // [startT, endT] pairs
  let episodeStart = null;
  const steps = Math.round(wallS / dt);
  for (let i = 0; i < steps; i++) {
    ws.time += dt;
    const th = thermalStep(monkey.altitude, thermalTier);
    thermalTier = th.tier; coldFactor = th.coldFactor;
    const prevAlt = monkey.altitude;
    phys.applyGravityAndDrag(monkey, dt, DEFAULTS.gravityMultiplier, DEFAULTS.dragMultiplier);
    const engaged = monkey.isGrabbing && !brownout;
    let quality = 0, thrustFrameN = 0;
    if (engaged) {
      const c = phys.calculateContinuousCoupling(ws, monkey,
        { kPerPair, nPairs: cfg.nPairs, massKg, dt });
      monkey.velocityY += c.impulse * coldFactor;
      quality = c.quality;
      thrustFrameN = c.thrustN;
    }
    // M2.8: switching watts out, extracted mechanical power in (mirrors updateContinuous).
    const switchW = switchingPowerW(ws.frequency, cfg.nPairs, GameConfig.FG40.E_SWITCH_J);
    const extractW = thrustFrameN * Math.max(0, -monkey.velocityY / GameConfig.PHYSICS.ALTITUDE_CONVERSION);
    const toRate = (w) => w / GameConfig.EPM.CAPACITY_J * GameConfig.EPM.CAPACITY;
    const step = epmChargeStep({ charge, brownout, pulsing: engaged,
      drainPerSec: toRate(switchW), regenPerSec: toRate(extractW), dt });
    charge = step.charge; brownout = step.brownout;
    phys.updatePosition(monkey, dt);

    const t = (i + 1) * dt;
    if (brownout && episodeStart === null) episodeStart = t;
    if (!brownout && episodeStart !== null) { brownoutEpisodes.push([episodeStart, t]); episodeStart = null; }
    if (monkey.altitude < prevAlt - 1e-9) dips++;
    if (!(charge >= 0 && charge <= GameConfig.EPM.CAPACITY)) chargeInRange = false;
    // Per-minute cadence: record the FIRST frame at/after each minute mark, so every dt
    // produces exactly one row per minute (a tolerance-window test can double-count when
    // the mark falls between two frames).
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
  return { doneAt, dips, chargeInRange, trace, crossings, brownoutEpisodes,
           finalSpeedKmh: climbSpeedKmh(monkey.velocityY), finalAltM: monkey.altitude };
}

const WALL_S = 2000; // ~5.8x the observed default climb (~345 s); a miss means the climb stalled
const DT_TOLERANCE = 0.02; // frame-rate independence: 1/60 vs 1/240 agree within 2% (~4x observed)

test('climb completes within a generous wall; altitude monotonic; speed finite; charge in range', () => {
  const r = runClimb(1 / 60, WALL_S);
  assert.notEqual(r.doneAt, null,
    `climb did not reach ${GameConfig.MISSION.DELIVER_ALTITUDE_M} m within ${WALL_S} s (stall)`);
  assert.equal(r.dips, 0, `altitude decreased on ${r.dips} steps while engaged`);
  assert.ok(r.chargeInRange, `charge left [0, ${GameConfig.EPM.CAPACITY}]`);
  assert.ok(Number.isFinite(r.finalSpeedKmh) && r.finalSpeedKmh > 0,
    `terminal speed not finite and positive: ${r.finalSpeedKmh} km/h`);
  // M2.5 tripwire, armed: terminal speed must sit strictly BELOW v_max. applyEddyDrag
  // (EDDY_FRACTION, the shipped game's only speed ceiling) is deleted; the slip model's
  // u → 1 asymptote is the ceiling now — runaway speed turns this red.
  const mDef = GameConfig.MATERIALS[GameConfig.MATERIAL_DEFAULT_INDEX];
  const vMaxKmh = maxMaterialVelocityMps(mDef.strengthGpa, mDef.youngsPa, mDef.densityKgM3, 0.30) * 3.6;
  assert.ok(r.finalSpeedKmh < vMaxKmh,
    `terminal speed ${r.finalSpeedKmh.toFixed(0)} km/h must sit strictly below v_max ${vMaxKmh.toFixed(0)} km/h`);
  // M2.11 rebalance targets — BANDS, never single numbers:
  // 100 km in ~5 min at the paper's operating point (1000 km/h mean => 360 s).
  assert.ok(r.doneAt >= 240 && r.doneAt <= 480,
    `completion ${r.doneAt.toFixed(0)} s outside the ~5 min band [240, 480] s`);
  const meanKmh = (GameConfig.MISSION.DELIVER_ALTITUDE_M / r.doneAt) * 3.6;
  assert.ok(meanKmh >= 900 && meanKmh <= 1300,
    `mean climb speed ${meanKmh.toFixed(0)} km/h outside the paper's ~1000 km/h band [900, 1300]`);
  // And the cruise rides near the cap (the asymptote working), not crawling: final
  // speed at completion is a substantial fraction of v_max.
  assert.ok(r.finalSpeedKmh >= 0.4 * vMaxKmh,
    `final speed ${r.finalSpeedKmh.toFixed(0)} km/h below 40% of v_max — the climber is not riding the asymptote`);
});

test('M2.11: a hotter carrier forces the emergent engage/release rhythm into the 2–8 s band', () => {
  // 150 Hz on this film class: switching watts outrun extraction through the mid-slip
  // region, so the physics forces brownout releases — the rhythm §2.3 promised, not a
  // script. (The shipped 92 Hz default is the energy-feasible end and needs no rhythm.)
  const r = runClimb(1 / 60, WALL_S, { carrierHz: 150, nPairs: 256 });
  assert.notEqual(r.doneAt, null, 'the 150 Hz loaded climb stalled');
  assert.ok(r.brownoutEpisodes.length >= 3,
    `expected >= 3 emergent brownout episodes at 150 Hz, got ${r.brownoutEpisodes.length}`);
  for (const [start, end] of r.brownoutEpisodes) {
    const len = end - start;
    assert.ok(len >= 2 && len <= 8,
      `brownout episode at ${start.toFixed(0)}s lasted ${len.toFixed(1)}s — outside the 2-8 s rhythm band`);
  }
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
  // Latched and held engaged (the worst case: no thrust, no extraction): the ambient
  // TRICKLE alone must refill to BROWNOUT_RECOVER and release the latch, in bounded
  // time, in-range. M2.11 tuned TRICKLE so this lands in the 2-8 s rhythm band.
  let charge = 0, brownout = true, recoveredAt = null;
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(120 / dt); i++) {
    const s = epmChargeStep({ charge, brownout, pulsing: true, drainPerSec: 10, regenPerSec: 0, dt });
    charge = s.charge; brownout = s.brownout;
    assert.ok(charge >= 0 && charge <= GameConfig.EPM.CAPACITY, `charge out of range: ${charge}`);
    if (!brownout) { recoveredAt = (i + 1) * dt; break; }
  }
  assert.notEqual(recoveredAt, null, 'brownout never recovered');
  assert.ok(recoveredAt <= GameConfig.EPM.BROWNOUT_RECOVER / GameConfig.EPM.TRICKLE + 1,
    `brownout took ${recoveredAt.toFixed(1)} s to recover (trickle bound is ${(GameConfig.EPM.BROWNOUT_RECOVER / GameConfig.EPM.TRICKLE).toFixed(1)} s)`);
  assert.ok(recoveredAt >= 2 && recoveredAt <= 8,
    `recovery ${recoveredAt.toFixed(1)} s outside the 2-8 s rhythm band (M2.11)`);
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
