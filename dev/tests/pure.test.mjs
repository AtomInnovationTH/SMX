// Zero-dependency unit tests for the pure logic of Space Monkey Elevator.
//
// Run with:  node --test tests/
//
// These exercise the DOM-free / WebGL-free surface extracted from the single inline
// <script> in Space_Monkey_Elevator.html (see extract.mjs). No npm install required.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGameModule, declaredPureHelpers, exportedSymbols } from './extract.mjs';

const game = loadGameModule();
const {
  GameConfig,
  WAVE_CALCULATORS,
  WaveSystem,
  PhysicsEngine,
  Camera,
  ALTIMETER_LANDMARKS,
  logSliderToFreq,
  freqToLogSlider,
  frameDecay,
  climbSpeedKmh,
  tetherWaveSpeed,
  tetherPhaseAt,
  filmCrossSectionM2,
  maxMaterialVelocityMps,
  maxAmplitudeM,
  taperSectionRatioAt,
  taperVelocityFactorAt,
  gapFluxT,
  pairCouplingK,
  stackDryMassKg,
  stackLengthM,
  stackPhaseOffset,
  flutterAmplitudeMm,
  freqDecadeColumn,
  switchingPowerW,
  slipThrustMeanN,
  slipCruiseU,
  slipGateFactor,
  safePersistedNumber,
  throughputKgPerHour,
  bootstrapPct,
  densityRatio,
  atmosphereAct,
  densityColumnKgM2,
  waveDragSpeedFactorAt,
  waveDragColumnPowerW,
  waveDragHeatingWM,
  resonanceModeAt,
  resonanceBoostFactor,
  resonanceSupplyW,
  resonantFilmPeakMps,
  waveTransportedPowerW,
  waveSharedBudgetW,
  powerShareCapW,
  waveModeCell,
  temperatureAtAltitude,
  thermalSuitIndex,
  altimeterLandmarkAt,
  epmChargeStep,
  milestoneMarkerAt,
  shouldTriggerGameOver,
  scaleSettingValue,
  couplingTier,
  couplingColor,
  upgradeCrossed,
  restartPressDecision,
  rhythmHintDue,
  shareConfigEncode,
  shareConfigDecode,
  shareUrlParse,
  ariaLiveLine,
  GAME_OVER_INPUT_GATE_MS,
  RESTART_CONFIRM_MS,
  LANDMARK_PILL_MS,
  thermalStep,
  airDensityReadout,
  cargoDeliveryCredit,
  weightN,
  activeFreqCells,
  grabHintText,
  nextHudLevel,
  hudLevelToast,
  minimalScoreLine,
  HUD_MINIMAL,
  HUD_FULL,
  HUD_OFF,
  compactHudLayout,
  clampPlateX,
  viewportTooSmall,
  cleanModeRequested,
  COMPACT_HUD_MAX_W,
  filmBandHalfPx,
  waveDrawAmpPx,
  drawnOscillationHz,
  railAltitudeToFrac,
  CLAMP_JAW_HALF_PX,
  FILM_BAND_MIN_HALF_PX,
  FILM_BAND_MAX_HALF_PX,
  frozenSkyTimeS,
  epmFlowLabel,
} = game;

const approx = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b} (±${eps})`);

// ---------------------------------------------------------------------------
// Extraction sanity
// ---------------------------------------------------------------------------
test('extraction exposes the core pure symbols', () => {
  for (const [name, val] of Object.entries({
    GameConfig, WAVE_CALCULATORS, WaveSystem, PhysicsEngine, Camera,
    ALTIMETER_LANDMARKS, logSliderToFreq, freqToLogSlider, frameDecay,
    climbSpeedKmh,
    tetherWaveSpeed, tetherPhaseAt, filmCrossSectionM2, maxMaterialVelocityMps, maxAmplitudeM,
    taperSectionRatioAt, taperVelocityFactorAt,
    gapFluxT, pairCouplingK, stackDryMassKg, stackLengthM, stackPhaseOffset, flutterAmplitudeMm,
    freqDecadeColumn, switchingPowerW, slipThrustMeanN, slipCruiseU, slipGateFactor,
    densityRatio, atmosphereAct, altimeterLandmarkAt, epmChargeStep,
    densityColumnKgM2, waveDragSpeedFactorAt, waveDragColumnPowerW, waveDragHeatingWM,
    resonanceModeAt, resonanceBoostFactor, resonanceSupplyW, resonantFilmPeakMps,
    waveTransportedPowerW, waveSharedBudgetW, powerShareCapW, waveModeCell,
    milestoneMarkerAt, shouldTriggerGameOver, scaleSettingValue,
    couplingTier, couplingColor, upgradeCrossed, restartPressDecision, rhythmHintDue,
    shareConfigEncode, shareConfigDecode, shareUrlParse, ariaLiveLine, thermalStep,
    airDensityReadout, cargoDeliveryCredit, weightN, activeFreqCells,
    grabHintText, compactHudLayout, clampPlateX, viewportTooSmall, cleanModeRequested,
    LANDMARK_PILL_MS, RESTART_CONFIRM_MS, GAME_OVER_INPUT_GATE_MS,
    filmBandHalfPx, minimalScoreLine, waveDrawAmpPx, drawnOscillationHz,
    railAltitudeToFrac,
    frozenSkyTimeS,
    epmFlowLabel,
  })) {
    assert.notEqual(val, undefined, `symbol ${name} should be defined`);
  }
});

// Fail loudly when a pure helper is declared in the delimited source block but not
// added to EXPORTED_SYMBOLS — the silent-undefined footgun in the three-edit ritual.
test('every function in the pure-helpers block is exported for testing', () => {
  const declared = declaredPureHelpers();
  const exported = new Set(exportedSymbols());
  const missing = declared.filter((name) => !exported.has(name));
  assert.deepEqual(
    missing,
    [],
    `pure helpers declared but not exported (add to EXPORTED_SYMBOLS in extract.mjs): ${missing.join(', ')}`,
  );
  // And the reverse: nothing in EXPORTED_SYMBOLS is a phantom that no longer exists.
  for (const name of exportedSymbols()) {
    assert.notEqual(game[name], undefined, `EXPORTED_SYMBOLS entry "${name}" resolved to undefined`);
  }
});

test('the pure-helpers block contains exactly 72 declared helpers (guard against an over-broad regex)', () => {
  // The guard regex now also matches const/let arrow forms, but MUST NOT sweep in
  // non-helper declarations such as the ATMO_DENSITY_KGM3 array const. If this count
  // drifts, the regex grew too broad (or a helper was removed) — make it fail loudly.
  // 62 -> 61: coldGripFactor deleted with the invented cold-coupling term it fed.
  // 61 -> 63: waveDrawAmpPx + drawnOscillationHz, the legible-wave schematics.
  // 63 -> 64: railAltitudeToFrac, the altitude rail's sqrt axis.
  // 64 -> 65: slipCruiseU, the projected-cruise readout's solver.
  // 65 -> 66: rhythmHintDue, the first-rhythm-hint decision.
  // 66 -> 70: the Shift F share codec (encode/decode/urlParse) + ariaLiveLine.
  // 70 -> 71: frozenSkyTimeS, the deterministic-sky capture hook.
  // 71 -> 72: epmFlowLabel, the gauge's switching-bill flow readout (Shift J).
  assert.equal(declaredPureHelpers().length, 72);
});

// ---------------------------------------------------------------------------
// WAVE_CALCULATORS
// ---------------------------------------------------------------------------
test('sine wave position/velocity at known phases', () => {
  const amp = 70, omega = 3;
  approx(WAVE_CALCULATORS.sine.position(amp, 0), 0);
  approx(WAVE_CALCULATORS.sine.position(amp, Math.PI / 2), amp);
  approx(WAVE_CALCULATORS.sine.position(amp, Math.PI), 0, 1e-12);
  // velocity = amp*omega*cos(t)
  approx(WAVE_CALCULATORS.sine.velocity(amp, omega, 0), amp * omega);
  approx(WAVE_CALCULATORS.sine.velocity(amp, omega, Math.PI / 2), 0, 1e-12);
});

test('band-limited square: no spikes, peak |velocity| = amp·omega exactly', () => {
  const amp = 50, omega = 3;
  // The old square faked the discontinuity with a 100x velocity spike. The M2.3 carrier
  // is a band-limited harmonic sum, velocity-normalized: composite peak = amp·omega at
  // the edges, and |v| never exceeds it anywhere (grid-scanned).
  approx(WAVE_CALCULATORS.square.velocity(amp, omega, 0), amp * omega, 1e-9);
  let peak = 0;
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * 2 * Math.PI;
    peak = Math.max(peak, Math.abs(WAVE_CALCULATORS.square.velocity(amp, omega, t)));
  }
  assert.ok(peak <= amp * omega * (1 + 1e-9), `square peak ${peak} must not exceed amp·omega (no spikes)`);
  assert.ok(peak > amp * omega * 0.99, 'the edge peak must actually be reached');
  // Position: square-ish, positive in the first half-cycle, negative in the second.
  assert.ok(WAVE_CALCULATORS.square.position(amp, Math.PI / 2) > 0);
  assert.ok(WAVE_CALCULATORS.square.position(amp, 3 * Math.PI / 2) < 0);
  // Derivative-consistent (analytic pair).
  const t0 = 0.37, h = 1e-6;
  const numeric = (WAVE_CALCULATORS.square.position(amp, t0 + h) - WAVE_CALCULATORS.square.position(amp, t0 - h)) / (2 * h);
  approx(numeric, WAVE_CALCULATORS.square.velocity(amp, 1, t0), 1e-3);
});

test('band-limited sawtooth: asymmetric ratchet shape, no 50x reset spike', () => {
  const amp = 40, omega = 2;
  // The old sawtooth faked the flyback with a 50x spike. Band-limited: peak magnitude
  // = amp·omega, reached at the flyback (t = pi), never exceeded anywhere.
  approx(Math.abs(WAVE_CALCULATORS.sawtooth.velocity(amp, omega, Math.PI)), amp * omega, 1e-9);
  let peak = 0, sum = 0;
  const N = 720;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * 2 * Math.PI;
    const v = WAVE_CALCULATORS.sawtooth.velocity(amp, omega, t);
    peak = Math.max(peak, Math.abs(v));
    sum += v;
  }
  assert.ok(peak <= amp * omega * (1 + 1e-9), `sawtooth peak ${peak} must not exceed amp·omega (no spikes)`);
  // Periodic position ⇒ mean velocity over a cycle is zero (no net flux).
  approx(WAVE_CALCULATORS.sawtooth.position(amp, 0), WAVE_CALCULATORS.sawtooth.position(amp, 2 * Math.PI), 1e-9);
  assert.ok(Math.abs(sum / N) < amp * omega * 0.05, 'mean velocity over a cycle ≈ 0');
  // Derivative-consistent (analytic pair).
  const t0 = 0.83, h = 1e-6;
  const numeric = (WAVE_CALCULATORS.sawtooth.position(amp, t0 + h) - WAVE_CALCULATORS.sawtooth.position(amp, t0 - h)) / (2 * h);
  approx(numeric, WAVE_CALCULATORS.sawtooth.velocity(amp, 1, t0), 1e-3);
});

// ---------------------------------------------------------------------------
// WaveSystem
// ---------------------------------------------------------------------------
test('sine carrier is derivative-consistent, and WaveSystem has no time-only wave API', () => {
  // M2.10 deleted WaveSystem.calculatePosition/calculateVelocity and
  // PhysicsEngine.calculateWaveVelocity: the film's state is a PHASE (φ = ωt − k·y), so a
  // bare-time API is exactly how a renderer drifts away from the physics. Shape lives in
  // WAVE_CALCULATORS and is sampled with an explicit phase by both.
  const ws = new WaveSystem('sine');
  assert.equal(ws.calculatePosition, undefined, 'time-only calculatePosition was deleted');
  assert.equal(ws.calculateVelocity, undefined, 'time-only calculateVelocity was deleted');
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  assert.equal(p.calculateWaveVelocity, undefined, 'calculateWaveVelocity was deleted');
  // Numerical derivative of position matches analytic velocity at unit omega.
  const amp = 1.05, t0 = 0.37, h = 1e-6;
  const numeric = (WAVE_CALCULATORS.sine.position(amp, t0 + h) - WAVE_CALCULATORS.sine.position(amp, t0 - h)) / (2 * h);
  approx(numeric, WAVE_CALCULATORS.sine.velocity(amp, 1, t0), 1e-6);
});

test('WaveSystem.setType only accepts known types', () => {
  const ws = new WaveSystem('sine');
  ws.setType('square');
  assert.equal(ws.getType(), 'square');
  ws.setType('nonsense');
  assert.equal(ws.getType(), 'square'); // unchanged
});

// ---------------------------------------------------------------------------
// PhysicsEngine
// ---------------------------------------------------------------------------
test('calculateContinuousCoupling: slip thrust fades with speed, impulse always upward', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const monkey = { velocityY: 0, altitude: 0 };
  const args = { kPerPair: 0.043, nPairs: 64, massKg: 61.5, dt: 1 / 60 };
  for (const type of ['sine', 'square', 'sawtooth']) {
    const ws = new WaveSystem(type);
    ws.frequency = 260;
    ws.amplitude = 1.1;
    for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1.3]) {
      ws.time = t;
      const c = p.calculateContinuousCoupling(ws, monkey, args);
      assert.ok(c.quality >= 0 && c.quality <= 1, `quality ${c.quality} out of range (${type}@${t})`);
      assert.ok(c.impulse <= 0, `impulse should be upward (<=0), got ${c.impulse} (${type}@${t})`);
      assert.ok(c.thrustN >= 0, `thrust should be >= 0 for a stationary climber (${type}@${t})`);
    }
  }
});

test('calculateContinuousCoupling: thrust -> 0 as the climber approaches film peak speed (no clamp)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const args = { kPerPair: 0.043, nPairs: 64, massKg: 61.5, dt: 1 / 60 };
  const ws = new WaveSystem('sine');
  ws.frequency = 260;
  ws.amplitude = 1.1;
  const vFilmPeak = ws.amplitude * ws.frequency * 2 * Math.PI;   // m/s
  let prev = Infinity;
  for (const u of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
    const monkey = { velocityY: -u * vFilmPeak * GameConfig.PHYSICS.ALTITUDE_CONVERSION, altitude: 0 };
    const c = p.calculateContinuousCoupling(ws, monkey, args);
    assert.ok(c.thrustN < prev, `thrust must fade as slip closes (u=${u})`);
    prev = c.thrustN;
  }
  // Outrunning the crest: the gate is empty and thrust is exactly 0 (not clamped mid-fade).
  for (const u of [1.0, 1.2]) {
    const monkey = { velocityY: -u * vFilmPeak * GameConfig.PHYSICS.ALTITUDE_CONVERSION, altitude: 0 };
    const c = p.calculateContinuousCoupling(ws, monkey, args);
    assert.equal(c.thrustN, 0, `u=${u}: gate empty, thrust exactly 0`);
  }
});

// M3.6: display quality is thrust against 2× the load, so a healthy cruise reads
// "good". The reference it replaced (sine thrust at u = 0) painted cruise "poor" —
// quality ≈ 0.37 < GOOD_QUALITY 0.45 at u ≈ 0.47 — so a good climb flashed red.
test('M3.6: quality = thrust / (2 × weight) — cruise reads good, stall reads poor', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const ws = new WaveSystem('sine');
  ws.frequency = 92; ws.amplitude = 1.0;
  const massKg = 80;
  const weight = weightN(massKg, 1);   // the single tier/stall reference
  const vFilmPeak = ws.amplitude * ws.frequency * 2 * Math.PI;
  // Choose kPerPair so the u = 0 thrust is exactly 4× weight: then quality(u) is
  // exactly 2·S(u), with S the §2.3 slip factor (S(0) = 1 by construction).
  const nPairs = 128;
  const kPerPair = 4 * weight * Math.PI / (nPairs * vFilmPeak);
  const qAt = (u, gravityMult = 1) => {
    const monkey = { velocityY: -u * vFilmPeak * GameConfig.PHYSICS.ALTITUDE_CONVERSION, altitude: 0 };
    return p.calculateContinuousCoupling(ws, monkey, { kPerPair, nPairs, massKg, dt: 1 / 60, gravityMult }).quality;
  };
  approx(qAt(0), 1, 1e-9);                        // launch: thrust 4× weight = pegged perfect
  assert.equal(couplingTier(qAt(0)), 'perfect');
  // The papercut point itself: u = 0.47 cruise. S(0.47) ≈ 0.375 → quality ≈ 0.75,
  // comfortably "good" — under the old reference this exact climb read 0.375 = poor.
  const qCruise = qAt(0.47);
  approx(qCruise, 0.75, 0.01);
  assert.equal(couplingTier(qCruise), 'good');
  // The stall regime: thrust below 0.9× weight (S < 0.225, u ≳ 0.72 here) reads poor.
  assert.equal(couplingTier(qAt(0.9)), 'poor');
  // The gravity slider feeds the reference (heavier world = harder to impress): the
  // same u = 0.47 cruise that read "good" at 1 g reads "poor" at 2 g.
  approx(qAt(0.47, 2), 0.375, 0.01);
  assert.equal(couplingTier(qAt(0.47, 2)), 'poor');
});

// The single weight reference shared by the quality tier and the stall detector
// (M3.6 review): 1 kg at 1 G is exactly 9.81 N, and the gravity slider scales it.
test('weightN: mass × g, gravity-multiplier aware', () => {
  approx(weightN(1, 1), 9.81, 1e-12);
  approx(weightN(80, 1), 80 * GameConfig.PHYSICS.GRAVITY / GameConfig.PHYSICS.ALTITUDE_CONVERSION, 1e-9);
  approx(weightN(80, 2), 2 * weightN(80, 1), 1e-9);
  approx(weightN(0, 1), 0);
});

// The single p.11 cell-span rule shared by the dashboard and the report card (M3.6
// review): the shipped 92 Hz lights the 100 Hz column (5), which must report the
// paper's own words for every row that spans it — and the forbidden band's columns
// must NOT claim "climber can use all power".
test('activeFreqCells: the p.11 span rule, pinned per column', () => {
  const tags5 = activeFreqCells(5).map(({ tag }) => tag);
  assert.deepEqual(tags5, ['power', 'damage', 'fatigue', 'atmosphere']);
  const cellText = (col, tag) => activeFreqCells(col).find(({ tag: t }) => t === tag)?.cell.text;
  assert.equal(cellText(5, 'power'), 'climber can use all power');
  assert.equal(cellText(5, 'fatigue'), 'Gigacycles per decade?');
  // Column 2 (0.1 Hz) sits in the "climber reflects 50% of power" band: no power cell.
  assert.equal(cellText(2, 'power'), undefined);
  assert.equal(cellText(2, 'fatigue'), 'less fatigue concern');
  // Membership by cell identity is what the dashboard's highlight uses.
  const col6 = activeFreqCells(6);
  assert.ok(col6.every(({ cell }) => 6 >= cell.c0 && 6 <= cell.c1));
});

// §2.3 — the slip integral: the plan's headline mechanic, proven against both endpoints
// and its own numeric shadow.
test('slipThrustMeanN: closed form, endpoints, monotonic fade, no clamp anywhere', () => {
  const kPerPair = 0.043, nPairs = 64, V = 1877;
  const k = kPerPair * nPairs;
  // u = 0 -> kV/π (mean of a rectified sine).
  approx(slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: 0 }), k * V / Math.PI, 1e-9);
  // Closed form == direct numeric integration of the gate {v_film > v_climber}.
  for (const u of [0, 0.25, 0.5, 0.75, 0.9]) {
    const v = u * V;
    const closed = slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: v });
    let acc = 0; const N = 720000;
    for (let i = 0; i < N; i++) {
      const phi = (i + 0.5) * 2 * Math.PI / N;
      const vf = V * Math.sin(phi);
      if (vf > v) acc += vf - v;
    }
    approx(closed, k * acc / N, Math.max(1e-9, k * V * 1e-6));
  }
  // Monotonically decreasing, strictly positive at u = 0.9999 (no clamp: v_max is an
  // asymptote, never a wall).
  let prev = Infinity;
  for (const u of [0, 0.25, 0.5, 0.75, 0.9, 0.99, 0.9999]) {
    const f = slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: u * V });
    assert.ok(f < prev, `thrust must fade monotonically (u=${u})`);
    assert.ok(f > 0, `thrust must be strictly positive short of u = 1 (u=${u})`);
    prev = f;
  }
  // u >= 1: the gate is empty -> exactly 0. u <= -1 (fast descent): Lenz brake = -k·v.
  assert.equal(slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: V }), 0);
  assert.equal(slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: 2 * V }), 0);
  const vDesc = -2 * V;
  approx(slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: vDesc }), -k * vDesc, 1e-9);
  // Harmonic carriers take the numeric sub-step path: it must reproduce the closed form
  // for a sine, and give positive thrust for the band-limited sawtooth (paper's ratchet, p.5).
  const sineViaNumeric = slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: 0.5 * V,
    filmVelocityAt: (phi) => V * Math.sin(phi) });
  approx(sineViaNumeric, slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: 0.5 * V }), k * V * 1e-4);
  assert.ok(slipThrustMeanN({ kPerPair, nPairs, vFilmPeakMps: V, vClimberMps: 0,
    filmVelocityAt: (phi) => WAVE_CALCULATORS.sawtooth.velocity(1, V, phi) }) > 0,
    'the sawtooth ratchet must thrust a stationary climber');
});

// Shift 11: the crest overlay's push curve. It must BE the slip integral normalised,
// not a lookalike: the drawn push and the modelled push can never drift apart.
test('slipGateFactor is the normalised slip curve: 1 at rest, 0 at the asymptote', () => {
  approx(slipGateFactor(0), 1);
  // Closed-form sine gate at a known mid-slip point (u = 0.5):
  // g(u) = [2√(1-u²) − u(π − 2·asin u)] / 2.
  approx(slipGateFactor(0.5), Math.sqrt(1 - 0.25) - 0.5 * (Math.PI - 2 * Math.asin(0.5)) / 2);
  // u >= 1: the gate is empty, so there is no push to draw: exactly 0, not a clamp.
  assert.equal(slipGateFactor(1), 0);
  assert.equal(slipGateFactor(3), 0);
  // Fast descent (u <= -1): the gate never closes (full Lenz brake) -> factor 1.
  assert.equal(slipGateFactor(-2), 1);
  // Monotone non-increasing on [0, 1] and bounded: the push fades, never revives.
  let prev = Infinity;
  for (let u = 0; u <= 1.0001; u += 0.05) {
    const f = slipGateFactor(u);
    assert.ok(f <= prev + 1e-12, `factor must fade monotonically (u=${u.toFixed(2)})`);
    assert.ok(f >= 0 && f <= 1, `factor ${f} out of [0,1] at u=${u.toFixed(2)}`);
    prev = f;
  }
  // And it is literally the thrust ratio: k, N and V cancel.
  const num = slipThrustMeanN({ kPerPair: 2, nPairs: 8, vFilmPeakMps: 300, vClimberMps: 120 });
  const den = slipThrustMeanN({ kPerPair: 2, nPairs: 8, vFilmPeakMps: 300, vClimberMps: 0 });
  approx(slipGateFactor(0.4), num / den);
});

test('slipGateFactor follows harmonic carriers through the same numeric gate', () => {
  // The renderer passes the shape's normalised velocity exactly as the physics passes
  // the real one, so a square carrier's drawn push comes from its own gate integral.
  const sq = (phi) => WAVE_CALCULATORS.square.velocity(1, 1, phi);
  approx(slipGateFactor(0, sq), 1);
  assert.equal(slipGateFactor(1, sq), 0);
  const f = slipGateFactor(0.4, sq);
  assert.ok(f > 0 && f < 1, `square-carrier factor ${f} must sit inside (0,1)`);
  // Shape matters: the band-limited square's velocity peaks at the carrier edges and is
  // quiet mid-cycle, so at the same slip its gate window is NARROWER than the sine's.
  assert.ok(f < slipGateFactor(0.4), 'the square gate must fade faster than the sine gate at u = 0.4');
});

// Shift C: the projected-cruise readout's solver. Bisection on the monotone closed
// form; shape-honest for harmonic carriers via the same numeric gate the physics
// uses. The defaults cross-reading is the gold fixture: at the shipped settings
// (8 pairs, 0.15 mm gap, 100 GPa, 1 m stroke @ 92 Hz, 3 kg + dry stack) the pad
// asymptote lands at ~1131 km/h, and the balance trace's damped cruise (1085.1)
// sits 4.1 % under it - exactly the wave drag the asymptote excludes, the same
// "few per cent lower aloft" DEVELOPERS.md documents.
test('slipCruiseU: null when the open gate cannot lift, monotone in kN, bisection exact', () => {
  // Build the shipped chain exactly as the orchestrator and the balance harness do:
  // gap -> flux -> kPerPair, pad film (1 m stroke @ 92 Hz), dry stack + 3 kg cargo.
  const fluxT = gapFluxT(0.15, GameConfig.FG40.POLE_FLUX_T);
  const kPerPair = pairCouplingK({ sigmaSPerM: 1e6, thicknessM: 0.2 / 1000, fluxT, poleAreaM2: GameConfig.FG40.POLE_AREA_M2 });
  const V = 1.0 * 92 * 2 * Math.PI;
  const massKg = stackDryMassKg(8) * (1 + GameConfig.FG40.STRUCTURE_MASS_FRACTION) + GameConfig.MONKEY.WEIGHT;
  const base = { kPerPair, nPairs: 8, vFilmPeakMps: V, massKg, gravityMult: 1 };
  // Cannot lift: zero coupling, or a cargo heavier than the whole wave can push.
  assert.equal(slipCruiseU({ ...base, kPerPair: 0 }), null);
  assert.equal(slipCruiseU({ ...base, massKg: 1e6 }), null);
  assert.equal(slipCruiseU({ ...base, vFilmPeakMps: 0 }), null);
  // The gold fixture: the shipped defaults land on ~1131 km/h of pad asymptote,
  // with the balance trace's damped cruise (1085.1) sitting ~4 % under it.
  const uDefault = slipCruiseU(base);
  assert.ok(uDefault > 0 && uDefault < 1);
  approx(uDefault * V * 3.6, 1131.5, 2);
  // Monotone: more coupling lifts the cruise fraction toward the film speed.
  const uHot = slipCruiseU({ ...base, kPerPair: kPerPair * 2 });
  assert.ok(uHot > uDefault, 'more coupling must raise the cruise fraction');
  const uHeavy = slipCruiseU({ ...base, massKg: 40 });
  assert.ok(uHeavy < uDefault, 'more cargo must lower the cruise fraction');
  // Shape-honest, both directions. With the DEFAULT cargo the band-limited square
  // cannot lift at all (its gate integral is far thinner than the sine's) - the
  // honest null, not a number. With a light cargo both shapes lift and the square's
  // narrower gate window solves to a much lower asymptote, exactly as the
  // slipGateFactor test's "square fades faster" finding predicts. The
  // filmVelocityAt is the SAME real-amplitude call calculateContinuousCoupling
  // integrates (displacement amplitude 1 m at the real omega).
  const omega = 92 * 2 * Math.PI;
  const filmVelocityAt = (phi) => WAVE_CALCULATORS.square.velocity(1, omega, phi);
  assert.equal(slipCruiseU({ ...base, filmVelocityAt }), null,
    'the square gate cannot lift the default cargo - null, never a number');
  const uSineLight = slipCruiseU({ ...base, massKg: 1 });
  const uSquareLight = slipCruiseU({ ...base, massKg: 1, filmVelocityAt });
  assert.ok(uSineLight > 0 && uSineLight < 1 && uSquareLight > 0 && uSquareLight < 1);
  assert.ok(uSquareLight < uSineLight * 0.5,
    'the square gate must cruise far under the sine gate at the same kNV');
});

// Shift E (first-rhythm hint): the game's only decision is "release before the bar
// empties", and it used to be learned only by failing a brownout. The hint's rule is
// a pure decision so the corners are pinned here: engaged AND under half AND not in
// brownout AND not yet retired.
test('rhythmHintDue: the four corners of the one-time hint rule', () => {
  const due = (over) => rhythmHintDue({ chargePct: 0.4, engaged: true, brownout: false, hintDone: false, ...over });
  assert.equal(rhythmHintDue({ chargePct: 0.4, engaged: true, brownout: false, hintDone: false }), true);
  assert.equal(due({ engaged: false }), false);        // not holding
  assert.equal(due({ chargePct: 0.6 }), false);        // bar above half
  assert.equal(due({ chargePct: 0.5 }), false);        // exactly half is NOT under
  assert.equal(due({ brownout: true }), false);        // the brownout plate is teaching
  assert.equal(due({ hintDone: true }), false);        // retired forever
});

// Shift F (shareable runs): the codec is the contract that a share URL carries the
// PANEL's raw slider values (never game internals), version-prefixed, and malformed
// payloads are ignored, never fatal.
test('shareConfig codec: round-trips the raw slider state, rejects malformed payloads', () => {
  const raws = [0, 1, 450, 0.6, 450, 0.2, 400, 30, 0.15, 1, 0, 0, 8, 1, 5];
  const enc = shareConfigEncode(raws);
  assert.equal(enc, '1:0,1,450,0.6,450,0.2,400,30,0.15,1,0,0,8,1,5');
  const dec = shareConfigDecode(enc);
  assert.equal(dec.amplitude, 0.6);
  assert.equal(dec.tension, 400);
  assert.equal(dec.weight, 5);
  assert.equal(dec.frequency, 450);   // the RAW log-slider value, not Hz
  // Malformed payloads decode to null: wrong version, wrong length, non-numeric, junk.
  assert.equal(shareConfigEncode([1, 2]), null);
  // Non-finite entries kill the encode outright, and blank fields kill the decode:
  // Number('') === 0 would otherwise silently zero a setting (found by the tests).
  assert.equal(shareConfigEncode(raws.map(() => NaN)), null);
  assert.equal(shareConfigDecode('1:,,,,,,,,,,,,,,'), null);
  assert.equal(shareConfigDecode('1:0,1,,3'), null);
  assert.equal(shareConfigDecode('2:0,1,2'), null);          // wrong version
  assert.equal(shareConfigDecode('1:0,1'), null);            // short payload
  assert.equal(shareConfigDecode('1:0,1,2,3,4,5,6,7,8,9,10,11,12,x,5'), null);
  assert.equal(shareConfigDecode(null), null);
});

test('shareUrlParse: config plus optional result; missing or bad parts are dropped, never fatal', () => {
  const enc = shareConfigEncode([0, 1, 450, 0.6, 450, 0.2, 400, 30, 0.15, 1, 0, 0, 8, 1, 5]);
  const full = shareUrlParse(`?config=${enc}&time=345.5&kgh=31`);
  assert.equal(full.config.amplitude, 0.6);
  assert.equal(full.result.timeS, 345.5);
  assert.equal(full.result.kgH, 31);
  // Config alone parses; no result key.
  const bare = shareUrlParse(`?config=${enc}`);
  assert.equal(bare.config.weight, 5);
  assert.equal(bare.result, null);
  // A present-but-bad result field is dropped; the config still parses.
  const badRes = shareUrlParse(`?config=${enc}&time=abc`);
  assert.equal(badRes.result, null);
  // No config at all, or a bad one: null overall.
  assert.equal(shareUrlParse('?debug'), null);
  assert.equal(shareUrlParse('?config=9:broken'), null);
});

// Shift F (aria-live): one plain sentence a screen reader can speak. Numbers are the
// same ones the minimal plate reads; the shorthand pacing line is deliberately NOT
// reused (it reads as noise spoken aloud).
test('ariaLiveLine: plain steady-state sentences, delivered and mid-climb', () => {
  assert.equal(ariaLiveLine({ altitudeM: 4100, speedKmh: 186, chargePct: 0.6, delivered: false }),
    'Altitude 4.1 km, speed 186 km/h, buffer 60 percent.');
  assert.equal(ariaLiveLine({ altitudeM: 300, speedKmh: 54, chargePct: 0.25, delivered: false }),
    'Altitude 300 m, speed 54 km/h, buffer 25 percent.');
  assert.equal(ariaLiveLine({ altitudeM: 100000, speedKmh: 0, chargePct: 1, delivered: true, deliveredKg: 3 }),
    'Delivered 3 kg to the Kármán line.');
});

test('applyGravityAndDrag always applies gravity — there is no attached state', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  // The climber never touches the film, so gravity is unconditional. The retired
  // discrete grab model suspended it via an `isGrabbing` parameter; that parameter
  // is gone, and engaging must NOT stop the climber falling — only the coupling
  // impulse fights gravity.
  const engaged = { velocityY: 0, altitude: 0 };
  p.applyGravityAndDrag(engaged, 1 / 60, 1, 1);
  assert.ok(engaged.velocityY > 0, 'gravity should pull downward (positive velocityY)');

  const falling = { velocityY: 0, altitude: 0 };
  p.applyGravityAndDrag(falling, 1 / 60, 1, 1);
  assert.equal(engaged.velocityY, falling.velocityY, 'engaged and free-falling gravity are identical');
});

// ---------------------------------------------------------------------------
// frameDecay — the core of Item 2
// ---------------------------------------------------------------------------
test('frameDecay is an exact no-op at 60 Hz', () => {
  approx(frameDecay(0.985, 1 / 60), 0.985);
  approx(frameDecay(0.9, 1 / 60), 0.9);
  approx(frameDecay(1.0, 1 / 60), 1.0);
});

test('frame-rate independence: same wall-time, different dt → same residual velocity', () => {
  // Apply only the multiplicative drag decay (no gravity) over a fixed wall-clock
  // window and confirm 60 Hz and 144 Hz integration converge. (The base used to be
  // GameConfig.PHYSICS.AIR_DRAG; that constant is deleted in M4 — wave drag acts on
  // the film, not the climber — so the decay law is exercised on a literal now.)
  const base = 0.985;
  const wallTime = 1.0; // seconds
  const v0 = 1000;

  const integrate = (fps) => {
    const dt = 1 / fps;
    const steps = Math.round(wallTime * fps);
    let v = v0;
    for (let i = 0; i < steps; i++) v *= frameDecay(base, dt);
    return v;
  };

  const v60 = integrate(60);
  const v144 = integrate(144);
  const v240 = integrate(240);
  // All should collapse to v0 * base^(60*wallTime) regardless of step count.
  const expected = v0 * Math.pow(base, 60 * wallTime);
  approx(v60, expected, 1e-6);
  approx(v144, expected, 1e-6);
  approx(v240, expected, 1e-6);
});

test('camera smoothing is frame-rate independent toward a static target', () => {
  const wallTime = 0.5;
  const target = 1000;
  const settle = (fps) => {
    const cam = new Camera(GameConfig);
    const dt = 1 / fps;
    const steps = Math.round(wallTime * fps);
    for (let i = 0; i < steps; i++) cam.follow(target, dt, true);
    return cam.getY();
  };
  const y60 = settle(60);
  const y144 = settle(144);
  // Converge to within a small tolerance (smoothing is exponential, not exact, but
  // the per-second normalization keeps the two refresh rates close).
  approx(y60, y144, 1.0);
});

// ---------------------------------------------------------------------------
// logSliderToFreq / freqToLogSlider round-trip
// ---------------------------------------------------------------------------
test('logSlider <-> freq round-trips and hits endpoints', () => {
  approx(logSliderToFreq(0), 92, 1e-9);          // carrier range: Wessels' 92 Hz
  approx(logSliderToFreq(100), 1000, 1e-9);      // ...to Lofstrom's 1000 Hz
  for (const s of [0, 12.5, 33, 50, 77, 100]) {
    approx(freqToLogSlider(logSliderToFreq(s)), s, 1e-9);
  }
});

// ---------------------------------------------------------------------------
// climbSpeedKmh — the world scale, pinned
// ---------------------------------------------------------------------------
test('climbSpeedKmh round-trips against PX_PER_M (ALTITUDE_CONVERSION)', () => {
  const pxPerM = GameConfig.PHYSICS.ALTITUDE_CONVERSION;
  assert.equal(pxPerM, 10, 'PX_PER_M is authoritative at 10 px/m (plan decision 5)');
  // Screen y grows downward, so climbing is velocityY < 0 and reads positive.
  approx(climbSpeedKmh(0), 0);
  approx(climbSpeedKmh(-pxPerM), 3.6);          // 1 m/s = 3.6 km/h
  approx(climbSpeedKmh(-100 * pxPerM), 360);    // 100 m/s = 360 km/h
  // Round-trip: km/h -> m/s -> px/s -> km/h.
  for (const kmh of [1, 42, 382, 708 * 3.6, 2550]) {
    const velocityYPx = -(kmh / 3.6) * pxPerM;
    approx(climbSpeedKmh(velocityYPx), kmh, 1e-9);
  }
  // Descending is negative; the badge, not the helper, decides presentation.
  approx(climbSpeedKmh(pxPerM), -3.6);
});

test('climbSpeedKmh replaces the old 0.036 badge factor, which under-reported 10x', () => {
  // The retired badge expression was `-velocityY * 0.036`, which is
  // (-v / 100) * 3.6 — i.e. it assumed 100 px/m while the world uses 10.
  const v = -5000; // px/s
  approx(climbSpeedKmh(v) / (-v * 0.036), 10);
});

// ---------------------------------------------------------------------------
// tetherWaveSpeed / filmCrossSectionM2
// ---------------------------------------------------------------------------
test('tetherWaveSpeed = sqrt(E/rho), a material constant (longitudinal wave)', () => {
  const v = tetherWaveSpeed();
  assert.ok(v > 0);
  // Longitudinal (compression) wave speed in a rod: v = sqrt(E/rho).
  approx(v, Math.sqrt(GameConfig.TETHER.YOUNGS_MODULUS / GameConfig.TETHER.CARBON_DENSITY), 1e-9);
  // ~20.9 km/s for the paper's E=1 TPa, rho=2300 (slide 3) — far above orbital velocity.
  assert.ok(v > 20000 && v < 22000);
});

// M2.2 — slide 6 is a REGRESSION FIXTURE: at the paper's rho = 2300 kg/m^3 the derived
// units chain reproduces every published figure to 2 s.f.; at the old guess (1800) every
// one of these assertions fails by 8-13%. This single test proves E, rho, c, Z and P
// are mutually consistent AND agree with the source.
test('slide-6 fixture: the units chain reproduces the paper to 2 significant figures', () => {
  const E = GameConfig.TETHER.YOUNGS_MODULUS;
  const rho = GameConfig.TETHER.CARBON_DENSITY;
  assert.equal(rho, 2300, 'the paper gives rho = 2300 kg/m^3 (slide 3) — do not regress this');
  assert.equal(E, 1.0e12, 'the paper gives E ≈ 1 TPa (slide 3)');
  const r2 = (x) => Number(x.toPrecision(2));
  const cLong = Math.sqrt(E / rho);
  assert.equal(r2(cLong / 1000), 21, 'c_longitudinal ≈ 21 km/s (slide 3)');
  const cTrans = Math.sqrt(90e9 / rho);           // transverse wave at 90 GPa working stress
  assert.equal(r2(cTrans / 1000), 6.3, 'c_transverse @ 90 GPa ≈ 6.3 km/s (slide 3)');
  assert.equal(r2(cLong * rho / 1e6), 48, 'Z/A longitudinal = 48 N/(m/s)/mm^2 (slide 6)');
  assert.equal(r2(cTrans * rho / 1e6), 14, 'Z/A transverse = 14 N/(m/s)/mm^2 (slide 6)');
  // P/A = σ²/(cρ) with σ = v·√(Eρ). W/m^2 → kW/mm^2 is /1e9, → MW/mm^2 is /1e12.
  const powerAt = (vMps) => (vMps * Math.sqrt(E * rho)) ** 2 / (cLong * rho);
  assert.equal(r2(powerAt(200 / 3.6) / 1e9), 150, 'P/A @ 200 km/h = 150 kW/mm^2 (slide 6)');
  assert.equal(r2(powerAt(1000 / 3.6) / 1e12), 3.7, 'P/A @ 1000 km/h = 3.7 MW/mm^2 (slide 6)');
  assert.equal(r2((45e9) ** 2 / (cLong * rho) / 1e12), 42, 'P/A @ 45 GPa = 42 MW/mm^2 (slide 6)');
});

test('§2.1 v_max: material-only ceiling, stress-fraction reading reconciles the paper', () => {
  const E = GameConfig.TETHER.YOUNGS_MODULUS, rho = GameConfig.TETHER.CARBON_DENSITY;
  // v_max = f·strength/√(Eρ): 30% of the paper's 45 GPa working stress lands on the
  // paper's 1000 km/h operating point (the DECIDED default budget).
  const v = maxMaterialVelocityMps(45, E, rho, 0.30);
  assert.equal(Number((v * 3.6).toPrecision(2)), 1000, '30% of 45 GPa = 1000 km/h (paper p.9)');
  // v_max scales with strength (the ladder is a strength ladder) and budget.
  assert.ok(maxMaterialVelocityMps(90, E, rho, 0.30) > v);
  assert.ok(maxMaterialVelocityMps(45, E, rho, 0.60) > v);
  // The paper's "10% at 1000 km/h" is a POWER fraction: σ at 1000 km/h is 13.3 GPa,
  // and (13.3/45)² ≈ 8.8% ≈ 10% of stress-limited power — NOT 10% of stress.
  const sigmaAt1000 = (1000 / 3.6) * Math.sqrt(E * rho) / 1e9;   // GPa
  approx(sigmaAt1000, 13.3, 0.1);
  const powerFraction = (sigmaAt1000 / 45) ** 2;
  assert.ok(powerFraction > 0.08 && powerFraction < 0.12,
    `power fraction ${powerFraction} should be ≈10%, not a 10% stress reading`);
});

test('§2.2 maxAmplitudeM = v_max / omega — the stroke budget', () => {
  // At the paper's operating point (1000 km/h, 260 Hz): A ≈ 0.17 m one-sided stroke.
  approx(maxAmplitudeM(1000 / 3.6, 2 * Math.PI * 260), (1000 / 3.6) / (2 * Math.PI * 260), 1e-12);
  // Halving the carrier doubles the required stroke.
  const a1 = maxAmplitudeM(280, 2 * Math.PI * 260);
  const a2 = maxAmplitudeM(280, 2 * Math.PI * 130);
  approx(a2, 2 * a1, 1e-9);
});

// M4 (paper p.9) — TAPER: the film's section varies with altitude and the wave's
// amplitude/velocity adjusts as 1/√A so transported power stays constant. The two
// helpers are the whole model; the game reads them for the slip integral, the stroke
// cap, the slip-u readout and the film's drawn width and amplitude.
test('p.9 taper: section ramps anchor→top, velocity follows 1/√A, power is constant', () => {
  const SPAN = GameConfig.MISSION.DELIVER_ALTITUDE_M;   // the taper runs ground → Kármán
  // R = 1 is the uniform film: both helpers are exactly 1 at every altitude, which is
  // why the default climb's balance trace cannot move (the factor is a multiply by 1).
  for (const alt of [0, 1000, 25000, 50000, 99999, SPAN, 2 * SPAN]) {
    approx(taperSectionRatioAt(alt, 1, SPAN), 1, 1e-12);
    approx(taperVelocityFactorAt(alt, 1, SPAN), 1, 1e-12);
  }
  // The paper's own worked example: R = 4 trades a 500 km/h anchor for 1000 km/h aloft.
  // At the anchor the velocity factor is 1 (the film runs AT the anchor's drive); at the
  // thin top it is √R = 2, so the same drive delivers twice the particle velocity aloft.
  approx(taperSectionRatioAt(0, 4, SPAN), 4, 1e-12);
  approx(taperSectionRatioAt(SPAN, 4, SPAN), 1, 1e-12);
  approx(taperVelocityFactorAt(0, 4, SPAN), 1, 1e-12);
  approx(taperVelocityFactorAt(SPAN, 4, SPAN), 2, 1e-12);
  // Constant transported power, the paper's design law, pinned directly: P = Z·v² with
  // Z ∝ A, so factor² × section ≡ R along the whole taper.
  for (const alt of [0, 100, 2000, 12000, 40000, 70000, 99999, SPAN]) {
    const section = taperSectionRatioAt(alt, 4, SPAN);
    const factor = taperVelocityFactorAt(alt, 4, SPAN);
    approx(factor * factor * section, 4, 1e-9, `constant-power law broke at ${alt} m`);
  }
  // Monotonic: the section thins and the wave quickens with altitude, never otherwise.
  let prevSection = Infinity, prevFactor = 0;
  for (let alt = 0; alt <= SPAN; alt += 4000) {
    const s = taperSectionRatioAt(alt, 4, SPAN), vf = taperVelocityFactorAt(alt, 4, SPAN);
    assert.ok(s <= prevSection && vf >= prevFactor, `non-monotonic taper at ${alt} m`);
    prevSection = s; prevFactor = vf;
  }
  // Clamps and junk: below ground reads as the anchor, above the span holds the top's
  // values, R < 1 (no inverted taper) and a non-positive span degrade to the uniform film.
  approx(taperVelocityFactorAt(-500, 4, SPAN), 1, 1e-12);
  approx(taperVelocityFactorAt(2 * SPAN, 4, SPAN), 2, 1e-12);
  approx(taperVelocityFactorAt(50000, 0.5, SPAN), 1, 1e-12);
  approx(taperVelocityFactorAt(50000, 4, 0), 1, 1e-12);
  // The stress-cap relationship: the cap binds at the thin top, so the anchor's stroke
  // budget tightens by exactly 1/√R — at R = 4, half the stroke buys the same v_max aloft.
  const vMax = maxMaterialVelocityMps(45, GameConfig.TETHER.YOUNGS_MODULUS, GameConfig.TETHER.CARBON_DENSITY, 0.30);
  const omega = 2 * Math.PI * 92;
  approx(maxAmplitudeM(vMax / Math.sqrt(4), omega), maxAmplitudeM(vMax, omega) / 2, 1e-12);
});

// M2.4 — FG40's published normalised-force-vs-airgap curve (extracted point-by-point
// from the datasheet plot; static-contact holding of iron, SHAPE reused for gap->flux).
test('gapFluxT: datasheet anchors, monotonic collapse, clamps at the table ends', () => {
  const pole = GameConfig.FG40.POLE_FLUX_T;
  // Force ~ B^2, so flux ratio^2 = normalised force. Table anchors (extracted points):
  approx((gapFluxT(0.1, pole) / pole) ** 2, 1.0, 1e-9);        // 0.1 mm: 100%
  approx((gapFluxT(0.501, pole) / pole) ** 2, 0.16243, 1e-4);  // 0.5 mm: ~16%
  approx((gapFluxT(1.0, pole) / pole) ** 2, 0.03304, 1e-4);    // 1.0 mm: ~3%
  // §2.5's "~0.3 T across a working gap" region: 0.30 mm -> ~0.44 T, ~38% force.
  const bAtDefault = gapFluxT(0.30, pole);
  assert.ok(bAtDefault > 0.40 && bAtDefault < 0.49, `flux at 0.30 mm: ${bAtDefault} T`);
  // Monotonically decreasing over the published domain.
  let prev = Infinity;
  for (let g = 0.1; g <= 5.0; g += 0.07) {
    const b = gapFluxT(g, pole);
    assert.ok(b < prev, `flux must fall with gap (gap ${g.toFixed(2)} mm)`);
    prev = b;
  }
  // Clamps at the table ends (no extrapolation beyond the published curve).
  approx(gapFluxT(0.02, pole), gapFluxT(0.1, pole), 1e-12);
  approx(gapFluxT(9.9, pole), gapFluxT(5.012, pole), 1e-12);
});

test('pairCouplingK reproduces §2.5\'s per-pair k at the documented operating point', () => {
  // k = sigma · t · B^2 · A_pole. §2.5's anchor: k ≈ 0.043 N/(m/s) at sigma = 1e6 S/m,
  // t = 0.2 mm, B ≈ 0.42 T, A_pole = 1.2e-3 m^2 — giving ~15 N per pair at 350 m/s slip.
  const k = pairCouplingK({ sigmaSPerM: 1.0e6, thicknessM: 0.2e-3, fluxT: 0.42, poleAreaM2: 1.2e-3 });
  assert.ok(Math.abs(k - 0.043) / 0.043 < 0.05, `k ${k} must reproduce §2.5's 0.043 N/(m/s) within 5%`);
  approx(k * 350, 15, 0.8);   // ~15 N per pair at 350 m/s slip
  // Scales with B^2 (flux) and t (film thickness), and is zero at zero field.
  approx(pairCouplingK({ sigmaSPerM: 1.0e6, thicknessM: 0.2e-3, fluxT: 0.84, poleAreaM2: 1.2e-3 }), 4 * k, 1e-12);
  approx(pairCouplingK({ sigmaSPerM: 1.0e6, thicknessM: 0.4e-3, fluxT: 0.42, poleAreaM2: 1.2e-3 }), 2 * k, 1e-12);
  approx(pairCouplingK({ sigmaSPerM: 1.0e6, thicknessM: 0.2e-3, fluxT: 0, poleAreaM2: 1.2e-3 }), 0, 1e-15);
});

test('§2.5 stack: dry mass is magnets-only and the thrust-to-weight is ~10:1', () => {
  // 64 pairs = 128 units × 72 g = 9.216 kg of magnet — the stack pays for itself tenfold.
  approx(stackDryMassKg(64), 64 * 2 * 0.072, 1e-12);
  // Per pair: ~15 N at 350 m/s slip vs 2 × 72 g × 9.81 = 1.41 N of pair weight ≈ 10:1.
  const thrustPerPair = 15;   // N, from pairCouplingK's documented anchor above
  const ratio = thrustPerPair / (stackDryMassKg(1) * 9.81);
  assert.ok(ratio > 8 && ratio < 13, `magnet thrust-to-weight ${ratio} should be ~10`);
  // Stack length: Gassend's §2.5 anchor is ~64 pairs ≈ 2.6 m (decision 6). The shipped
  // DEMO default is 8 pairs ≈ 33 cm (shift 9) — an eighth of the anchor at an eighth of
  // the payload, so the same thrust-to-weight. Either way the stack is small against a
  // wavelength (λ ≈ 227 m at the 92 Hz default), which is what lets it read the LOCAL
  // film phase and still fire as a travelling sequence.
  approx(stackLengthM(64, GameConfig.FG40.PITCH_M), 64 * GameConfig.FG40.PITCH_M, 1e-12);
  assert.ok(stackLengthM(64, GameConfig.FG40.PITCH_M) > 2.3 && stackLengthM(64, GameConfig.FG40.PITCH_M) < 2.9);
  const demoLen = stackLengthM(GameConfig.FG40.DEFAULT_N_PAIRS, GameConfig.FG40.PITCH_M);
  assert.ok(demoLen > 0.3 && demoLen < 0.35, `demo stack ${demoLen.toFixed(2)} m`);
  const lambdaDefault = tetherWaveSpeed() / GameConfig.WAVE.DEFAULT_FREQUENCY;
  const stackFrac = demoLen / lambdaDefault;
  assert.ok(stackFrac > 0 && stackFrac < 0.06, `default stack spans ${(stackFrac * 100).toFixed(2)}% of λ`);
});

// M3.1: the travelling firing sequence. Unit i sits i·pitch above unit 0, so for the
// UP-travelling carrier (φ = ωt − k·y) it sees the same phase i·pitch/c seconds LATER:
// the relative phase is negative, and that sign is what sweeps the firing band upward.
test('stackPhaseOffset: upper units LAG — the sign is the sweep direction', () => {
  const c = 20850, f = 92, pitch = 0.041;
  const off1 = stackPhaseOffset(1, pitch, f, c);
  assert.ok(off1 < 0, 'an upper unit must see a SMALLER phase at the same instant (up-travelling wave)');
  approx(off1, -2 * Math.PI * f * pitch / c, 1e-15);                       // exact closed form
  approx(stackPhaseOffset(4, pitch, f, c), 4 * off1, 1e-15);               // linear in unit index
  approx(stackPhaseOffset(1, c / f, f, c), -2 * Math.PI, 1e-12);           // one λ of pitch = one cycle
  approx(stackPhaseOffset(0, pitch, f, c), 0, 1e-15);                      // unit 0 is the reference
});

test('stackPhaseOffset: span fixtures — the shipped stack, and the paper\u2019s 10 m @ 260 Hz', () => {
  const c = tetherWaveSpeed();
  // Shipped demo default (shift 9): 8 × 0.041 m = 0.328 m at 92 Hz → ~0.0014 λ, so the
  // units fire very nearly in unison. The deck's 64-pair anchor is ~0.0116 λ; both are
  // small enough that the sweep DIRECTION carries the physics, not the span.
  const spanDefault = Math.abs(stackPhaseOffset(GameConfig.FG40.DEFAULT_N_PAIRS, GameConfig.FG40.PITCH_M, 92, c)) / (2 * Math.PI);
  assert.ok(Math.abs(spanDefault - 0.00145) < 2e-4, `demo stack spans ${spanDefault.toFixed(5)} λ`);
  const spanAnchor = Math.abs(stackPhaseOffset(64, GameConfig.FG40.PITCH_M, 92, c)) / (2 * Math.PI);
  assert.ok(Math.abs(spanAnchor - 0.0116) < 1e-3, `64-pair stack spans ${spanAnchor.toFixed(4)} λ`);
  // The paper's spatial-phasing anchor (§2.5 of the plan): a 10 m stack at 260 Hz spans
  // "~0.11 λ". The paper's own λ ≈ 91 m implies c = 23.7 km/s — inconsistent with slide
  // 3's 21 km/s; with the shipped c = 20.85 km/s the span is 0.125 λ. Assert the BAND,
  // not the paper's rounding.
  const spanPaper = Math.abs(stackPhaseOffset(1, 10, 260, c)) / (2 * Math.PI);
  assert.ok(spanPaper > 0.10 && spanPaper < 0.15, `10 m stack at 260 Hz spans ${spanPaper.toFixed(3)} λ`);
});

// M3.1: flutter amplitude — the ESTIMATE that eats the centering margin. Single source
// for the coupling physics, the balance harness, and the panel/canvas readouts.
test('flutterAmplitudeMm: 0.1 mm at 100 kgf, √-scaling, monotone, finite at degenerate tension', () => {
  approx(flutterAmplitudeMm(100), GameConfig.TETHER.FLUTTER_REF_MM, 1e-12);
  approx(flutterAmplitudeMm(400), GameConfig.TETHER.FLUTTER_REF_MM / 2, 1e-12);   // ∝ 1/√T
  assert.ok(flutterAmplitudeMm(25) > flutterAmplitudeMm(100), 'slack film flutters MORE');
  assert.ok(Number.isFinite(flutterAmplitudeMm(0)), 'degenerate tension must stay finite (the max() guard)');
  // The shipped operating point: 0.15 mm gap vs 0.10 mm flutter at 100 kgf → margin 0.05 mm.
  const margin = 0.15 - flutterAmplitudeMm(100);
  assert.ok(Math.abs(margin - 0.05) < 1e-12, `shipped margin ${margin} mm`);
});

// M3.2 (paper p.11): the carrier's decade column — nearest column on the log axis,
// clamped to the table. The dashboard lights the consequence cells of this column.
test('freqDecadeColumn: nearest decade on the log axis, clamped to the p.11 table', () => {
  assert.equal(freqDecadeColumn(0), 0);       // f = 0: the cable-car column
  assert.equal(freqDecadeColumn(-5), 0);      // junk clamps to cable car
  assert.equal(freqDecadeColumn(0.01), 1);
  assert.equal(freqDecadeColumn(0.02), 1);    // below the 0.01/0.1 geometric midpoint
  assert.equal(freqDecadeColumn(0.05), 2);    // above it
  assert.equal(freqDecadeColumn(1), 3);
  assert.equal(freqDecadeColumn(92), 5);      // the shipped default lights the 100 Hz column
  assert.equal(freqDecadeColumn(260), 5);     // paper's reference band: below 316.2 -> 100 Hz
  assert.equal(freqDecadeColumn(317), 6);     // just above the 100/1000 midpoint
  assert.equal(freqDecadeColumn(1000), 6);
  assert.equal(freqDecadeColumn(5000), 6);    // clamped at the table's top
});

// M2.1: shared spatial phase φ = ωt − k·y for the up-travelling carrier.
test('tetherPhaseAt: constant phase requires altitude INCREASING with time (the wave travels up)', () => {
  const c = tetherWaveSpeed();
  const f = 260;                       // Hz carrier (paper's reference band)
  const omega = 2 * Math.PI * f;
  const k = omega / c;
  const PHI = 1.234;                   // any fixed phase
  // Solve tetherPhaseAt(y, t) === PHI for y at two times.
  const yAt = (t) => (omega * t - PHI) / k;
  const t1 = 3.2, t2 = 4.7;
  // Sanity: the helper itself reproduces the fixed phase at those (y, t) pairs.
  approx(tetherPhaseAt(yAt(t1), t1, f, c), PHI, 1e-6);
  approx(tetherPhaseAt(yAt(t2), t2, f, c), PHI, 1e-6);
  // The invariant: constant phase ⇒ altitude grows with time (up-travelling wave)...
  assert.ok(yAt(t2) > yAt(t1), 'constant phase must move UP the film as time passes');
  // ...at exactly the wave speed c.
  approx((yAt(t2) - yAt(t1)) / (t2 - t1), c, 1e-6);
});

test('tetherPhaseAt: one wavelength of altitude costs exactly one cycle of phase', () => {
  const c = tetherWaveSpeed();
  const f = 260;
  const lambda = c / f;
  // At fixed time, going UP one wavelength changes phase by exactly −2π (higher
  // points see an earlier phase of the up-travelling wave).
  approx(tetherPhaseAt(1000 + lambda, 7.7, f, c) - tetherPhaseAt(1000, 7.7, f, c), -2 * Math.PI, 1e-6);
  // At ground level the phase is just ωt.
  approx(tetherPhaseAt(0, 0.013, f, c), 2 * Math.PI * f * 0.013, 1e-12);
});

test('filmCrossSectionM2: the paper\'s ribbon is 45 mm × 0.2 mm = 9 mm² (M2.7)', () => {
  // The tether is a paper-thin FILM, not a cable — the old π(d/2)² cylinder is gone.
  approx(filmCrossSectionM2(45, 0.2) * 1e6, 9.0, 1e-9);     // mm^2
  approx(filmCrossSectionM2(45, 0.2), 9e-6, 1e-12);        // m^2
  approx(filmCrossSectionM2(90, 0.2), 2 * filmCrossSectionM2(45, 0.2), 1e-15);
  approx(filmCrossSectionM2(45, 0.4), 2 * filmCrossSectionM2(45, 0.2), 1e-15);
  assert.equal(game.couplingMomentumScale, undefined, 'couplingMomentumScale (cylinder) was deleted');
});

test('the transverse-string "sag" fiction is gone', () => {
  // tensionSagFactor scaled the rendered wave displacement by (1 - tension*0.008),
  // i.e. a taut transverse STRING sagging less. The tether carries a LONGITUDINAL
  // (compression) wave, which has no sag to reduce, and the factor reached nothing
  // but shadowBlur. Its two config constants went with it.
  assert.equal(game.tensionSagFactor, undefined, 'tensionSagFactor was deleted');
  assert.equal(GameConfig.TETHER.TENSION_SAG_FACTOR, undefined);
  assert.equal(GameConfig.TETHER.TENSION_SAG_MIN, undefined);
  // The dead glow constants it kept company with are gone too (nothing ever read them).
  assert.equal(GameConfig.WAVE.GLOW_THRESHOLD, undefined);
  assert.equal(GameConfig.WAVE.GLOW_BASE_RADIUS, undefined);
  assert.equal(GameConfig.WAVE.GLOW_VELOCITY_FACTOR, undefined);
});

test('safePersistedNumber rejects NaN/Infinity/negatives, passes valid values', () => {
  assert.equal(safePersistedNumber('123.5'), 123.5);
  assert.equal(safePersistedNumber('0'), 0);
  assert.equal(safePersistedNumber(null), 0);       // missing key
  assert.equal(safePersistedNumber('not a number'), 0);
  assert.equal(safePersistedNumber('-50'), 0);      // negatives clamped
  assert.equal(safePersistedNumber('Infinity'), 0); // non-finite rejected
  assert.equal(safePersistedNumber(''), 0);
});

test('throughputKgPerHour = delivered kg per hour of climb (decision 11)', () => {
  approx(throughputKgPerHour(0, 100), 0);
  approx(throughputKgPerHour(50, 387.6), 50 * 3600 / 387.6);   // reference climb ≈ 464 kg/h
  approx(throughputKgPerHour(250, 3600), 250);
  assert.ok(throughputKgPerHour(500, 1000) > throughputKgPerHour(250, 1000), 'more cargo, more throughput');
  assert.ok(throughputKgPerHour(50, 100) > throughputKgPerHour(50, 200), 'faster, more throughput');
  approx(throughputKgPerHour(50, 0), 0);                       // no time, no rate
  approx(throughputKgPerHour(50, -5), 0);                      // degenerate input guarded
});

test('bootstrapPct is 0-100 and saturates at the target', () => {
  const target = GameConfig.MISSION.BOOTSTRAP_TARGET_KG;
  approx(bootstrapPct(0), 0);
  approx(bootstrapPct(target / 2), 50);
  approx(bootstrapPct(target), 100);
  assert.equal(bootstrapPct(target * 10), 100); // clamped, never exceeds 100
});

// ---------------------------------------------------------------------------
// Thermal layer (temperature model + suit progression + cold penalty)
// ---------------------------------------------------------------------------
test('temperatureAtAltitude follows the standard atmosphere', () => {
  approx(temperatureAtAltitude(0), 15);          // sea level
  approx(temperatureAtAltitude(11000), 15 - 6.5 * 11); // tropopause ≈ -56.5
  approx(temperatureAtAltitude(20000), -56.5);   // isothermal lower stratosphere
  approx(temperatureAtAltitude(-500), 15);       // below ground clamps to sea level
  // Monotonic cooling through the troposphere.
  assert.ok(temperatureAtAltitude(1000) < temperatureAtAltitude(0));
  assert.ok(temperatureAtAltitude(8000) < temperatureAtAltitude(1000));
  // Stratopause is comparatively warm vs the tropopause.
  assert.ok(temperatureAtAltitude(47000) > temperatureAtAltitude(11000));
});

test('thermalSuitIndex steps up at the configured altitudes', () => {
  const [s0, s1, s2] = GameConfig.THERMAL.SUITS;
  assert.equal(thermalSuitIndex(0), -1);                 // bare
  assert.equal(thermalSuitIndex(s0.altitude - 1), -1);
  assert.equal(thermalSuitIndex(s0.altitude), 0);        // flight suit
  assert.equal(thermalSuitIndex(s1.altitude), 1);        // pressure suit
  assert.equal(thermalSuitIndex(s2.altitude), 2);        // full space suit
  assert.equal(thermalSuitIndex(s2.altitude + 1e6), 2);  // stays at top tier
});

// ---------------------------------------------------------------------------
// B.14/B.15 — vacuum-correct drag (the aero-kit dragMult channel died with the
// pickups in M3.5; what remains is the single density-scaled aero law)
// ---------------------------------------------------------------------------
test('densityRatio: 1.0 at sea level, ~2.2e6x lower at the Karman line', () => {
  approx(densityRatio(0), 1.0, 1e-12);
  approx(densityRatio(-5000), 1.0, 1e-12);              // clamped below ground
  approx(densityRatio(10000), 0.3376, 2e-3);            // US Standard 10 km
  approx(densityRatio(100000), 4.575e-7, 1e-9);
  approx(densityRatio(150000), densityRatio(100000), 1e-15);  // clamped above table
  for (let h = 0; h < 100000; h += 2500) {
    assert.ok(densityRatio(h) > densityRatio(h + 2500), `monotonic at ${h} m`);
  }
});

// M3.3 (§2.7): the two acts. The 40 km threshold is where densityRatio has collapsed
// far enough that aerodynamic drag effectively ceases to exist — the fixture ties the
// act boundary to the SAME density table the drag model reads.
test('atmosphereAct: the 40 km vacuum threshold, tied to the density table', () => {
  assert.equal(atmosphereAct(0), 1);
  assert.equal(atmosphereAct(39999), 1);
  assert.equal(atmosphereAct(40000), 2);
  assert.equal(atmosphereAct(100000), 2);
  // The boundary is physical, not arbitrary: air at the act break is below half a
  // percent of sea level (US Standard: ~0.33% at 40 km)...
  assert.ok(densityRatio(40000) < 0.005, `act break at ${(densityRatio(40000) * 100).toFixed(2)}% of sea-level air`);
  // ...and Act I still spans genuinely thin air (the transition is gradual; the act
  // break marks where drag stops mattering, not where the sky changes colour).
  assert.ok(densityRatio(30000) > 0.005, '30 km is still Act I and still has >0.5% air');
});

// M4 (paper p.7): the wave-drag helpers. The drag table's longitudinal row ships as a
// regression fixture next to slide 6's: for the game's 45 × 0.2 mm film the column
// bill at the paper's 1000 km/h is 0.87 MW — the 0.9 MW the plan quotes at 1 s.f.
test('densityColumnKgM2: the air column below an altitude, exact on the shared table', () => {
  approx(densityColumnKgM2(0), 0, 1e-12);                    // nothing below the anchor
  approx(densityColumnKgM2(-500), 0, 1e-12);                 // below ground clamps to 0
  // First segment (0-5 km, log-linear 1.225 -> 0.7364): ∫ρ dh = Δρ·Δh/ln(ρ1/ρ0).
  approx(densityColumnKgM2(5000), (0.7364 - 1.225) * 5000 / Math.log(0.7364 / 1.225), 1e-6);
  // The whole column to the table top, and flat above it (no more air to drag against).
  const whole = densityColumnKgM2(100000);
  assert.ok(whole > 10000 && whole < 10600, `whole column ${whole.toFixed(0)} kg/m² (effective scale height ~8.4 km)`);
  approx(densityColumnKgM2(250000), whole, 1e-9, 'capped at the table top');
  // Monotonic, and it IS the integral of densityRatio: trapezoid quadrature of the
  // exported density function over the same range must agree to quadrature error.
  let quad = 0;
  const step = 10;
  for (let h = 0; h < 100000; h += step) {
    quad += (densityRatio(h) + densityRatio(h + step)) / 2 * step * 1.225;
  }
  assert.ok(Math.abs(quad - whole) / whole < 2e-3,
    `quadrature ${quad.toFixed(0)} vs exact ${whole.toFixed(0)} kg/m² disagree`);
});

test('waveDragSpeedFactorAt: the film arrives damped by the column it climbed', () => {
  // No column below the anchor, and a standing film drags nothing.
  approx(waveDragSpeedFactorAt(0, 1000 / 3.6, 45, 0.2), 1, 1e-12);
  approx(waveDragSpeedFactorAt(100000, 0, 45, 0.2), 1, 1e-12);
  // The paper's operating point: at 1000 km/h the 9 mm² film keeps 98.7% of its speed
  // at the top of the air — longitudinal waves barely feel the atmosphere (p.7's point:
  // the longitudinal row is stress-limited, not drag-limited).
  approx(waveDragSpeedFactorAt(100000, 1000 / 3.6, 45, 0.2), 0.98693, 1e-4);
  // The damping grows with the column below: anchor < 2 km < 12 km < top, then flat.
  const f2 = waveDragSpeedFactorAt(2000, 1000 / 3.6, 45, 0.2);
  const f12 = waveDragSpeedFactorAt(12000, 1000 / 3.6, 45, 0.2);
  const fTop = waveDragSpeedFactorAt(100000, 1000 / 3.6, 45, 0.2);
  assert.ok(f2 > f12 && f12 > fTop, `damping must grow with altitude: ${f2} ${f12} ${fTop}`);
  approx(waveDragSpeedFactorAt(250000, 1000 / 3.6, 45, 0.2), fTop, 1e-12);
  // The law's width dependence: a narrower film carries less power per unit drag, so
  // it damps more (10x narrower here) — and thickness cancels out of the DAMPING
  // (drag ∝ t, carried power ∝ t), even though the drag POWER scales with t.
  const fNarrow = waveDragSpeedFactorAt(100000, 1000 / 3.6, 4.5, 0.2);
  assert.ok(fNarrow < fTop, 'a narrower film must damp more');
  approx(fNarrow, 0.88301, 1e-4);
  approx(waveDragSpeedFactorAt(100000, 1000 / 3.6, 45, 0.4), fTop, 1e-12, 'thickness cancels in the damping');
  // Asymptotic 1/(1+x) form: never 0, never negative, no clamp anywhere — even at an
  // absurd film speed (1e6 m/s) the factor just gets small (κVΣ ≈ 48 -> f ≈ 0.02).
  const fAbsurd = waveDragSpeedFactorAt(100000, 1e6, 45, 0.2);
  assert.ok(fAbsurd > 0 && fAbsurd < 0.05, `absurd speed: ${fAbsurd} should be tiny but positive`);
});

test('waveDragColumnPowerW: the drag table\'s longitudinal row is a regression fixture', () => {
  // THE ROW: 45 × 0.2 mm film at the paper's 1000 km/h -> 0.87 MW = the plan's 0.9 MW
  // at one significant figure. (The paper's own table assumes a 10 mm² circular tether;
  // this is the same quadratic law on the game's ribbon, Cd = 0.02 on the two edges.)
  const row = waveDragColumnPowerW(1000 / 3.6, 45, 0.2);
  assert.ok(row > 0.8e6 && row < 0.95e6, `longitudinal row ${(row / 1e6).toFixed(2)} MW — expected ~0.9 MW at 1000 km/h`);
  // Cubic in film speed (the exact Z·A·(V₀²−V²) form sits just under the cubic at high
  // damping), linear in thickness, zero for a standing film.
  const double = waveDragColumnPowerW(2000 / 3.6, 45, 0.2);
  assert.ok(double / row > 7 && double / row < 8, `bill should scale ~V³: got ×${(double / row).toFixed(2)}`);
  approx(waveDragColumnPowerW(1000 / 3.6, 45, 0.4) / row, 2, 1e-9, 'bill is linear in thickness');
  approx(waveDragColumnPowerW(0, 45, 0.2), 0, 1e-12);
  // The first-order form ½·Cd·2t·V³·Σ agrees with the exact loss at the paper's row
  // (damping is 1.3% there): the two readings of the same law cannot drift apart.
  const firstOrder = 0.5 * GameConfig.TETHER.DRAG_CD_LONGITUDINAL * (2 * 0.2 / 1000)
    * (1000 / 3.6) ** 3 * densityColumnKgM2(100000);
  assert.ok(Math.abs(firstOrder - row) / row < 0.02,
    `first-order ${(firstOrder / 1e6).toFixed(3)} MW vs exact ${(row / 1e6).toFixed(3)} MW`);
});

// M4 (paper p.7 + FG40 datasheet): the hot side. The local drag-heating rate is the
// p.7 "possibly by drag heating" term itself; the FG40 ceiling constants are the
// datasheet's absolute maximum ratings (verified against the Zubax FluxGrip
// reference manual, FG40 hardware chapter). The temperature between the watts and
// the ceiling is NOT modelled: no heat capacity or transfer coefficient is
// published anywhere, so these tests pin the exact watts and the exact ceiling only.
test('waveDragHeatingWM: the local drag-heating rate, the p.7 hook\'s own term', () => {
  // The helper is the law's integrand ½·ρ·Cd·2t·V³ on the LOCAL film speed (the
  // same vFilmPeakMps calculateContinuousCoupling integrates); the travelling
  // wave's damped speed is the caller's to supply, exactly as the physics
  // computes it.
  const anchor = 1000 / 3.6;
  const vAt = (h) => anchor * waveDragSpeedFactorAt(h, anchor, 45, 0.2);
  // Sea level, the paper's 1000 km/h, the 9 mm2 film: ½·ρ·Cd·2t·V³ ≈ 105 W/m.
  const q0 = waveDragHeatingWM(0, vAt(0), 0.2);
  assert.ok(q0 > 100 && q0 < 110, `sea-level rate ${q0.toFixed(1)} W/m at 1000 km/h (expected ~105)`);
  // A standing film heats nothing, at any altitude.
  approx(waveDragHeatingWM(0, 0, 0.2), 0, 1e-12);
  approx(waveDragHeatingWM(50000, 0, 0.2), 0, 1e-12);
  // Cubic in film speed, linear in thickness (the same law's scalings).
  approx(waveDragHeatingWM(0, 2 * vAt(0), 0.2) / q0, 8, 1e-9, 'rate is cubic in film speed');
  approx(waveDragHeatingWM(0, vAt(0), 0.4) / q0, 2, 1e-9, 'rate is linear in thickness');
  // The medium dies with altitude: at 30 km the rate is ~1.5% of its sea-level
  // value (densityRatio's own ratio) even though the film there is barely damped.
  const q30 = waveDragHeatingWM(30000, vAt(30000), 0.2);
  assert.ok(q30 < q0 * 0.02 && q30 > q0 * 0.01,
    `30 km rate ${q30.toFixed(2)} W/m should track the air, ~1.5% of sea level`);
  // THE CROSS-READING FIXTURE: the local rate integrated over the whole column
  // IS the column bill (q = −dP/dy by construction). Trapezoid quadrature of the
  // local rate on the travelling wave's damped speed must reproduce
  // waveDragColumnPowerW to quadrature error, so the two readings of the same
  // law can never drift.
  let quad = 0;
  const step = 10;
  for (let h = 0; h < 100000; h += step) {
    quad += (waveDragHeatingWM(h, vAt(h), 0.2) + waveDragHeatingWM(h + step, vAt(h + step), 0.2)) / 2 * step;
  }
  const bill = waveDragColumnPowerW(anchor, 45, 0.2);
  assert.ok(Math.abs(quad - bill) / bill < 2e-3,
    `quadrature ${(quad / 1e6).toFixed(3)} MW vs column bill ${(bill / 1e6).toFixed(3)} MW disagree`);
});

test('the FG40 thermal ceiling is the datasheet\'s absolute-maximum internal temperature', () => {
  // Zubax FluxGrip reference manual, FG40 hardware chapter, absolute maximum
  // ratings: internal +73 °C (the heat-deflection limit of the polymer composite
  // body; the electronics is designed to withstand 105 °C continuously) and
  // ambient minimum −40 °C. Pin the published figures so a silent edit turns red.
  assert.equal(GameConfig.FG40.MAX_INTERNAL_TEMP_C, 73);
  assert.equal(GameConfig.FG40.MIN_AMBIENT_TEMP_C, -40);
});

// ---------------------------------------------------------------------------
// M4 (paper p.10): standing-wave resonance — the anchor as a node. The p.10
// table ships as a regression fixture next to slide 6's and the drag row's:
// Long + resonance 2.5 MW/mm² at 200 km/h, 12.5 MW/mm² at 1000 km/h.
// ---------------------------------------------------------------------------
test('resonanceModeAt: the cavity law — f falls as you rise, reset at the 100 km wavelength floor', () => {
  const c = tetherWaveSpeed();
  // Both ends nodes: f_n = n·c/2h. Below 50 km the fundamental holds; its
  // wavelength 2h reaches the paper's 100 km floor exactly at 50 km, where the
  // anchor retunes to n = 2, which then holds to 100 km (one reset per climb).
  assert.equal(resonanceModeAt(1000, c).n, 1);
  assert.equal(resonanceModeAt(49999, c).n, 1);
  assert.equal(resonanceModeAt(50000, c).n, 1);   // 2h = 100 km exactly: still inside the floor
  assert.equal(resonanceModeAt(50001, c).n, 2);
  assert.equal(resonanceModeAt(100000, c).n, 2);
  // The frequency FALLS as the climber rises within each mode, and the floor
  // c/lambda_max is never crossed: the reset keeps lambda = 2h/n <= 100 km
  // everywhere. (Across the reset itself f jumps UP, the whole point of the
  // retune — pinned separately below.)
  const floorHz = c / GameConfig.TETHER.RESONANCE_LAMBDA_MAX_M;
  for (const seg of [[100, 1000, 10000, 40000, 49999], [50001, 70000, 100000]]) {
    let prevF = Infinity;
    for (const h of seg) {
      const m = resonanceModeAt(h, c);
      assert.ok(m.freqHz >= floorHz, `f(${h} m) = ${m.freqHz.toFixed(3)} Hz under the ${floorHz.toFixed(3)} Hz floor`);
      assert.ok(m.freqHz < prevF, `f must fall as the climber rises within a mode: ${m.freqHz} !< ${prevF}`);
      prevF = m.freqHz;
    }
  }
  // The reset doubles the frequency at 50 km (n 1 -> 2), and the transient is
  // one cavity round trip: 2h/c = 4.8 s there.
  approx(resonanceModeAt(50001, c).freqHz / resonanceModeAt(49999, c).freqHz, 2, 1e-3);
  approx(resonanceModeAt(50000, c).roundTripS, 2 * 50000 / c, 1e-9);
  // The paper's "period ~low 10s of seconds for longitudinal waves": the game's
  // own c gives 4.8 s at the top (in the retuned n = 2 mode) and 9.6 s for the
  // un-reset fundamental there — the paper's figure reads the full-tether
  // fundamental, so the game's periods sit at the bottom edge of its range.
  const top = resonanceModeAt(100000, c);
  assert.ok(top.periodS > 4 && top.periodS < 6, `top period ${top.periodS.toFixed(1)} s in the retuned mode`);
  approx(2 * 100000 / c, 9.59, 0.01, 'the un-reset fundamental at 100 km is the paper\'s low 10s of seconds');
  // The 1 m floor: a zero-length cavity has no mode; on the pad it rings at kHz,
  // which is why the mode is an aloft tool.
  assert.ok(resonanceModeAt(0, c).freqHz > 1000, 'on the pad the cavity rings at kHz');
});

test('resonanceSupplyW: the p.10 resonance row EXACTLY — P = sigma·v per unit section', () => {
  // The paper's table, Long + resonance: 2.5 MW/mm² at 200 km/h, 12.5 MW/mm² at
  // 1000 km/h. sigma = 45 GPa (the paper's working stress), one square millimetre.
  const sigma = 45e9, mm2 = 1e-6;
  // Drive speed = stroke x cavity rate: pick the stroke that gives the table's
  // anchor speeds at 1 Hz (the law is linear in both, so any pair making the
  // speed reproduces the row).
  const row200 = resonanceSupplyW(200 / 3.6 / (2 * Math.PI), 1, sigma, mm2);
  const row1000 = resonanceSupplyW(1000 / 3.6 / (2 * Math.PI), 1, sigma, mm2);
  approx(row200 / 1e6, 2.5, 1e-9, '2.5 MW/mm² at 200 km/h');
  approx(row1000 / 1e6, 12.5, 1e-9, '12.5 MW/mm² at 1000 km/h');
  // Linear in drive speed (the table's 5x speed -> 5x power), linear in section.
  approx(row1000 / row200, 5, 1e-12, 'resonant power is linear in anchor speed');
  approx(resonanceSupplyW(200 / 3.6 / (2 * Math.PI), 1, sigma, 9 * mm2) / row200, 9, 1e-12);
});

test('resonanceBoostFactor: the p.10 table as a ratio against the plain travelling wave', () => {
  // The plain rows are rho·c·v² (slide 6's law): 150 kW/mm² at 200 km/h, 3.7 MW/mm²
  // at 1000 km/h. The boost v_cap/v_anchor with v_cap at the paper's 45 GPa working
  // stress (maxMaterialVelocityMps at 100% budget) must turn those into the
  // resonance rows to the table's own significant figures.
  const vCap45 = maxMaterialVelocityMps(45, GameConfig.TETHER.YOUNGS_MODULUS, GameConfig.TETHER.CARBON_DENSITY, 1.0);
  const b200 = resonanceBoostFactor(200 / 3.6, vCap45);
  const b1000 = resonanceBoostFactor(1000 / 3.6, vCap45);
  assert.ok(Math.abs(b200 * 150e3 - 2.5e6) / 2.5e6 < 0.02,
    `200 km/h: boost x${b200.toFixed(1)} on 150 kW -> ${(b200 * 150e3 / 1e6).toFixed(2)} MW, the table's 2.5`);
  assert.ok(Math.abs(b1000 * 3.7e6 - 12.5e6) / 12.5e6 < 0.01,
    `1000 km/h: boost x${b1000.toFixed(2)} on 3.7 MW -> ${(b1000 * 3.7e6 / 1e6).toFixed(1)} MW, the table's 12.5`);
  // Always >= 1 in play (the stress cap keeps the anchor at or under v_cap), and
  // the guard: no drive, no boost.
  assert.equal(resonanceBoostFactor(0, vCap45), 1);
  assert.ok(resonanceBoostFactor(vCap45, vCap45) >= 1);
});

test('resonantFilmPeakMps: the film runs the local stress ceiling, drag-damped, times the buildup', () => {
  const mDef = GameConfig.MATERIALS[GameConfig.MATERIAL_DEFAULT_INDEX];
  const vMax = maxMaterialVelocityMps(mDef.strengthGpa, mDef.youngsPa, mDef.densityKgM3, 0.30);
  const span = GameConfig.MISSION.DELIVER_ALTITUDE_M;
  // Uniform film, full buildup, no air below: the ceiling is v_max itself.
  approx(resonantFilmPeakMps({ altitudeM: 0, taperRatio: 1, spanM: span, vMaxMps: vMax, widthMm: 45, thicknessMm: 0.2, buildup: 1 }),
    vMax * waveDragSpeedFactorAt(0, vMax, 45, 0.2), 1e-9);
  // With a taper the ceiling is the LOCAL one: v_max at the top, v_max/sqrt(R) at
  // the anchor — the taper's own altitude profile, filled to the budget.
  approx(resonantFilmPeakMps({ altitudeM: span, taperRatio: 4, spanM: span, vMaxMps: vMax, widthMm: 45, thicknessMm: 0.2, buildup: 1 }),
    vMax * waveDragSpeedFactorAt(span, vMax / 2, 45, 0.2), 1e-9, 'the tapered top runs v_max');
  // The buildup is the retune transient: 0 kills the film, the ramp is monotonic.
  approx(resonantFilmPeakMps({ altitudeM: 50000, taperRatio: 1, spanM: span, vMaxMps: vMax, widthMm: 45, thicknessMm: 0.2, buildup: 0 }), 0, 1e-12);
  const b1 = resonantFilmPeakMps({ altitudeM: 50000, taperRatio: 1, spanM: span, vMaxMps: vMax, widthMm: 45, thicknessMm: 0.2, buildup: 0.5 });
  const b2 = resonantFilmPeakMps({ altitudeM: 50000, taperRatio: 1, spanM: span, vMaxMps: vMax, widthMm: 45, thicknessMm: 0.2, buildup: 1 });
  approx(b2 / b1, 2, 1e-12, 'the buildup scales the film linearly');
  // And the boost over the plain film is the constant v_cap/v_anchor ratio: at the
  // default stroke (1.00 m x 92 Hz) the resonant film is the plain film x 1.082.
  const omega = GameConfig.WAVE.DEFAULT_FREQUENCY * 2 * Math.PI;
  const vAnchor = GameConfig.WAVE.DEFAULT_AMPLITUDE * omega;
  const plain = vAnchor * taperVelocityFactorAt(50000, 1, span) * waveDragSpeedFactorAt(50000, vAnchor, 45, 0.2);
  assert.ok(Math.abs(b2 / plain - vMax / vAnchor) / (vMax / vAnchor) < 0.01,
    `the boost is v_cap/v_anchor: ${(b2 / plain).toFixed(3)} vs ${(vMax / vAnchor).toFixed(3)}`);
});

// ---------------------------------------------------------------------------
// M4 (paper p.14): multi-climber power sharing — the wave's transported power
// as a SHARED budget. Plain mode carries slide 6's P = rho·c·A·V² (the p.10
// table's plain rows, pinned below); resonance mode carries the anchor's
// injection (resonanceSupplyW, fixture-pinned above). Each rider's skim caps at
// the budget minus the other's draw. The per-climber wave-boundary solve
// (partial reflections, standing-pattern perturbation) stays ABSENT by design.
// ---------------------------------------------------------------------------
test('waveTransportedPowerW: the slide-6 plain rows per unit section — the shared budget law', () => {
  // The p.10 table's plain rows ARE slide 6's law: 150 kW/mm² at 200 km/h,
  // 3.7 MW/mm² at 1000 km/h. This is the budget a plain wave puts on the table
  // for riders to split (and the numbers resonanceBoostFactor boosts).
  const mm2 = 1e-6;
  const r2 = (x) => Number(x.toPrecision(2));
  assert.equal(r2(waveTransportedPowerW(200 / 3.6, mm2) / 1e3), 150, 'P/A @ 200 km/h = 150 kW/mm^2 (slide 6)');
  assert.equal(r2(waveTransportedPowerW(1000 / 3.6, mm2) / 1e6), 3.7, 'P/A @ 1000 km/h = 3.7 MW/mm^2 (slide 6)');
  // Quadratic in film speed (5x speed = 25x power), linear in section.
  approx(waveTransportedPowerW(1000 / 3.6, mm2) / waveTransportedPowerW(200 / 3.6, mm2), 25, 1e-12);
  approx(waveTransportedPowerW(200 / 3.6, 9 * mm2) / waveTransportedPowerW(200 / 3.6, mm2), 9, 1e-12);
});

test('waveSharedBudgetW: resonant injection while resonant, drag-sapped but taper-constant plain', () => {
  const span = GameConfig.MISSION.DELIVER_ALTITUDE_M;
  // While resonant the budget IS the anchor's injection — the p.10 supply cap,
  // computed where the cavity state lives (the caller), passed straight through.
  assert.equal(waveSharedBudgetW({ altitudeM: 85000, amplitudeM: 1, freqHz: 92, taperRatio: 1, spanM: span, widthMm: 45, thicknessMm: 0.2, resonanceSupplyCapW: 12345 }), 12345);
  // Plain mode: transported power is CONSTANT along the film (the taper's own
  // law — A(alt) grows by R(alt) while V(alt) falls by sqrt(R(alt))) and only
  // drag saps it with height. With a taper the 85 km budget sits a few per
  // cent under the 2 km one, never more on this film.
  const at2k = waveSharedBudgetW({ altitudeM: 2000, amplitudeM: 1, freqHz: 92, taperRatio: 2, spanM: span, widthMm: 45, thicknessMm: 0.2 });
  const at85k = waveSharedBudgetW({ altitudeM: 85000, amplitudeM: 1, freqHz: 92, taperRatio: 2, spanM: span, widthMm: 45, thicknessMm: 0.2 });
  assert.ok(at85k < at2k && at85k / at2k > 0.95,
    `drag saps a few per cent of the budget with height, nothing more: ${(100 * at85k / at2k).toFixed(1)}%`);
  // At the shipped defaults and 85 km the plain budget is ~140 MW against a
  // ~15 kW skim — sharing a plain wave is a rounding error, the honest p.14
  // answer the 85 km beat card quotes.
  const budget = waveSharedBudgetW({ altitudeM: 85000, amplitudeM: GameConfig.WAVE.DEFAULT_AMPLITUDE, freqHz: GameConfig.WAVE.DEFAULT_FREQUENCY, taperRatio: 1, spanM: span, widthMm: 45, thicknessMm: 0.2 });
  assert.ok(budget > 1e8 && budget < 2e8, `~140 MW at 85 km on the default film: ${(budget / 1e6).toFixed(1)} MW`);
});

test('powerShareCapW: skim caps at the budget minus the other rider\'s draw, floored at zero', () => {
  assert.equal(powerShareCapW(100, 40), 60);
  assert.equal(powerShareCapW(100, 0), 100, 'no other draw: the whole budget');
  assert.equal(powerShareCapW(100, 100), 0, 'the other rider took the lot: nothing left');
  assert.equal(powerShareCapW(100, 120), 0, 'floored at zero — a skim cap, never a brake');
  // The symmetric fixed point: two identical riders, each capping at the budget
  // minus the other's draw, settle at exactly half the budget each. This is the
  // halved resonant cruise the balance harness pins end-to-end.
  approx(powerShareCapW(416e3, 208e3), 208e3, 1e-9, 'E = budget − E lands on budget/2');
});

// ---------------------------------------------------------------------------
// M4 (paper p.12/13): mode conversion. The paper ships a mode TABLE
// (longitudinal vs transverse, each travelling or standing) with a question
// attached ("Consider mode conversion above the atmosphere?"), not a
// mechanism, so the game ships the live cell as a labelled readout and marks
// the conversion itself absent (section 0: never invented).
// ---------------------------------------------------------------------------
test('waveModeCell: the run lives in the paper\'s longitudinal column; resonance is the one mode change', () => {
  // The default climb is the longitudinal TRAVELLING cell (p.12's left column).
  const plain = waveModeCell(false);
  assert.equal(plain.column, 'longitudinal');
  assert.equal(plain.pattern, 'travelling');
  assert.ok(plain.label.includes('travelling'), 'the label names the pattern in words');
  // The resonance toggle (p.10) is the one mode change the paper supports:
  // same column, travelling to standing.
  const res = waveModeCell(true);
  assert.equal(res.column, 'longitudinal');
  assert.equal(res.pattern, 'standing');
  assert.ok(res.label.includes('standing'), 'the label names the pattern in words');
  assert.notEqual(res.label, plain.label);
  // The transverse cells stay ABSENT: no input produces one, because the paper
  // offers no converter to model (p.7 kills transverse in air; p.12 only asks
  // the question above it).
  for (const v of [0, 1, true, false, null, undefined]) {
    assert.equal(waveModeCell(v).column, 'longitudinal', 'no transverse cell can ever be produced');
  }
});

test('B.14 split is gone, and M4 took the aero half too: gravity only, no drag on the climber', () => {
  // The eddy half of the split (applyEddyDrag, EDDY_FRACTION) was deleted in M2.5 — the
  // §2.3 slip integral IS the eddy interaction now, both traction and braking, so the
  // two never coexist. The aero half (the linear AIR_DRAG retention) went in M4: drag
  // is the paper's quadratic term on the WAVE now (waveDragSpeedFactorAt), so the
  // climber's own integrator applies gravity and nothing else, at any altitude.
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  assert.equal(GameConfig.PHYSICS.EDDY_FRACTION, undefined, 'EDDY_FRACTION was deleted');
  assert.equal(p.applyEddyDrag, undefined, 'applyEddyDrag was deleted');
  assert.equal(GameConfig.PHYSICS.AIR_DRAG, undefined, 'AIR_DRAG was deleted in M4 (wave drag replaced it)');
  const dt = 1 / 60;
  for (const altitude of [0, 2000, 12000, 100000]) {
    const m = { velocityY: -1000, altitude };
    p.applyGravityAndDrag(m, dt, 0);   // gravityMult 0: isolate any drag term
    approx(m.velocityY, -1000, 1e-12, `no drag on the climber at ${altitude} m`);
  }
});

test('B.15 / M3.5: the aero-kit dragMult channel is gone; M4: gravity is the only force here', () => {
  // The Aero/Streamline pickups were the ONLY writers of dragMult below 1.0, and M3.5
  // deleted the pickups — so the parameter died with them rather than living on as a
  // writer-less channel in the drag law. Pin the signature so it cannot creep back.
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  assert.equal(p.applyGravityAndDrag.length, 3, 'applyGravityAndDrag(monkey, dt, gravityMult) — no dragMult channel');
  // M4: with AIR_DRAG deleted there is no retention left to vary with altitude — a
  // coasting climber accelerates at exactly g everywhere (the wave pays the air).
  const dt = 1 / 60;
  for (const altitude of [0, 100000]) {
    const m = { velocityY: 500, altitude };
    p.applyGravityAndDrag(m, dt, 1);
    approx(m.velocityY, 500 + GameConfig.PHYSICS.GRAVITY * dt, 1e-12,
      `exactly one g of gain at ${altitude} m, no retention`);
  }
});

test('updatePosition: integrates altitude only — x is untouched (no lateral axis)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });

  // The climber is pinned centred on the film; staying centred in the FG40 gap is the
  // onboard controller's job. updatePosition must therefore never write monkey.x, and
  // there is no velocityX to integrate.
  const m = { x: 12345, y: 500, velocityY: 0, width: 40 };
  p.updatePosition(m, 1 / 60);
  assert.equal(m.x, 12345, 'updatePosition must not move the climber laterally');
  assert.equal(m.y, 0);                        // clamped below ground
  assert.equal(m.altitude, 0);

  m.y = -500;                                  // above ground
  p.updatePosition(m, 1 / 60);
  assert.equal(m.x, 12345);
  assert.equal(m.altitude, 50);                // altitude = -y / PX_PER_M
  assert.equal(m.altitude, -m.y / GameConfig.PHYSICS.ALTITUDE_CONVERSION);
  assert.ok(m.altitude >= 0, 'altitude must never be negative');

  // velocityY integrates as usual, and a stray velocityX is inert.
  const moving = { x: 100, y: -100, velocityX: 9999, velocityY: -600, width: 40 };
  p.updatePosition(moving, 0.5);
  assert.equal(moving.x, 100, 'a leftover velocityX field must have no effect');
  assert.equal(moving.y, -400);
});

test('the lateral axis is gone: no arrow input, no horizontal tunables', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  assert.equal(p.updateHorizontalVelocity, undefined, 'updateHorizontalVelocity was deleted');
  assert.equal(GameConfig.PHYSICS.HORIZONTAL_SPEED, undefined, 'HORIZONTAL_SPEED was deleted');
  assert.equal(GameConfig.PHYSICS.DRIFT_DECAY, undefined, 'DRIFT_DECAY was deleted');
});

// ---------------------------------------------------------------------------
// Altimeter landmark lookup
// ---------------------------------------------------------------------------
// The lookup was extracted to the pure module-level `altimeterLandmarkAt` (in the
// delimited pure-helpers block) and `SpaceMonkeyGame.getAltimeterLandmark` delegates
// to it, so these tests drive the real shipped code rather than a reimplementation.
test('altimeter landmark boundary lookups', () => {
  assert.equal(altimeterLandmarkAt(0).name, 'Sea Level');
  assert.equal(altimeterLandmarkAt(-50).name, 'Sea Level'); // below first still clamps to first
  assert.equal(altimeterLandmarkAt(827).name, 'Treetops');
  assert.equal(altimeterLandmarkAt(828).name, 'Burj Khalifa'); // exact boundary inclusive
  assert.equal(altimeterLandmarkAt(8848).name, 'Mt. Everest Summit');
  assert.equal(altimeterLandmarkAt(100000).name, 'Kármán Line (Space!)');
  assert.equal(altimeterLandmarkAt(9e9).name, 'ISS Orbit'); // above last clamps to last
});

test('ALTIMETER_LANDMARKS table is sorted ascending by altitude', () => {
  for (let i = 1; i < ALTIMETER_LANDMARKS.length; i++) {
    assert.ok(ALTIMETER_LANDMARKS[i].altitude > ALTIMETER_LANDMARKS[i - 1].altitude);
  }
});

// ---------------------------------------------------------------------------
// EPM charge / brownout loop (M2.8): switching watts out, extracted mechanical
// power in — drives the extracted pure epmChargeStep, the same function
// updateContinuous delegates to.
// ---------------------------------------------------------------------------
const EPM = GameConfig.EPM;
// Convenience: one step with everything defaulting to "idle at full charge".
const epmStep = (over) => epmChargeStep({
  charge: EPM.CAPACITY, brownout: false, pulsing: false, drainPerSec: 0, regenPerSec: 0,
  dt: 1 / 60, ...over,
});

test('switchingPowerW reproduces §2.5\'s 266 kW / 6.7% of 4 MW at the documented defaults', () => {
  // 128 units x 4 J x 260 Hz: two transitions per cycle per unit, two units per pair.
  approx(switchingPowerW(260, 64, 4), 266240, 1e-9);
  const pct = switchingPowerW(260, 64, 4) / GameConfig.EPM.REFERENCE_WAVE_POWER_W * 100;
  assert.ok(Math.abs(pct - 6.7) < 0.15, `266 kW should be ≈6.7% of 4 MW, got ${pct}`);
  // Flat in duty by construction — and linear in carrier, pairs, and energy per switch.
  approx(switchingPowerW(520, 64, 4), 2 * switchingPowerW(260, 64, 4), 1e-9);
  approx(switchingPowerW(260, 128, 4), 2 * switchingPowerW(260, 64, 4), 1e-9);
  // At the shipped demo defaults (92 Hz carrier, 8 pairs): ≈11.8 kW. The low carrier is
  // still what keeps the draw feasible (M2.11) — switching is linear in f — but shift 9's
  // 8-pair stack made it 16x smaller, which is why EPM.CAPACITY_J came down with it: the
  // gauge has to stay a decision, so drain must stay ~6.3 charge-points/s.
  const shipW = switchingPowerW(GameConfig.WAVE.DEFAULT_FREQUENCY, GameConfig.FG40.DEFAULT_N_PAIRS, GameConfig.FG40.E_SWITCH_J);
  assert.ok(shipW > 11e3 && shipW < 13e3, `shipped default switching ${shipW} W`);
  const drainPtsPerS = shipW / GameConfig.EPM.CAPACITY_J * GameConfig.EPM.CAPACITY;
  assert.ok(drainPtsPerS > 5.5 && drainPtsPerS < 7,
    `default drain ${drainPtsPerS.toFixed(2)} points/s must stay in the tuned band`);
  assert.ok(drainPtsPerS > GameConfig.EPM.TRICKLE,
    'the ambient trickle must never cover the switching drain, or brownout is impossible');
});

test('epm: coasting only trickles, and saturates at CAPACITY', () => {
  const dt = 0.1;
  approx(epmStep({ charge: 50, dt }).charge, 50 + EPM.TRICKLE * dt, 1e-9);
  const full = epmStep({ charge: EPM.CAPACITY, dt });
  approx(full.charge, EPM.CAPACITY, 1e-12);
  approx(full.netPerSec, 0, 1e-12);
});

test('epm: engaged with no extraction drains at TRICKLE - switching', () => {
  const dt = 0.2;
  const s = epmStep({ charge: 50, pulsing: true, drainPerSec: 10, regenPerSec: 0, dt });
  approx(s.charge, 50 + (EPM.TRICKLE - 10) * dt, 1e-9);
  approx(s.netPerSec, EPM.TRICKLE - 10, 1e-9);
});

test('epm: extraction above switching is net-positive; break-even nets exactly TRICKLE', () => {
  const dt = 0.2;
  // charge 50 keeps clear of the CAPACITY clamp so the raw rate is visible.
  const s = epmStep({ charge: 50, pulsing: true, drainPerSec: 10, regenPerSec: 20, dt });
  approx(s.netPerSec, 20 - 10 + EPM.TRICKLE, 1e-9);
  // Break-even: extraction == switching -> net is the ambient trickle alone.
  const even = epmStep({ charge: 50, pulsing: true, drainPerSec: 26.9, regenPerSec: 26.9, dt });
  approx(even.netPerSec, EPM.TRICKLE, 1e-9);
});

test('epmFlowLabel: the switching-bill balance in words, live only while firing (Shift J)', () => {
  // Firing, income above the flat bill -> earning, one decimal near zero, + sign.
  // The shipped default cruise (~13.4 kW skim vs 11.8 kW switching) is the +1.6 kW case.
  const cruise = epmFlowLabel({ engaged: true, brownout: false, extractionW: 13385, switchingW: 11776, full: true });
  assert.equal(cruise.state, 'earning');
  assert.equal(cruise.sign, 1);
  assert.equal(cruise.text, '+1.6 kW');   // NOT 'full' — engaged wins, the balance is the point

  // Firing, income below the bill -> burning, minus sign, one decimal under 10.
  const early = epmFlowLabel({ engaged: true, brownout: false, extractionW: 3054, switchingW: 11776, full: false });
  assert.equal(early.state, 'burning');
  assert.equal(early.sign, -1);
  assert.equal(early.text, '-8.7 kW');

  // A deep deficit (a hot carrier on the wall) rounds to whole kW past 9.95.
  const wall = epmFlowLabel({ engaged: true, brownout: false, extractionW: 3684, switchingW: 25600, full: false });
  assert.equal(wall.state, 'burning');
  assert.equal(wall.text, '-22 kW');

  // The decimal/whole-kW boundary: 9.95 rounds up to a whole number, 9.94 keeps its decimal.
  assert.equal(epmFlowLabel({ engaged: true, brownout: false, extractionW: 0, switchingW: 9950, full: false }).text, '-10 kW');
  assert.equal(epmFlowLabel({ engaged: true, brownout: false, extractionW: 0, switchingW: 9940, full: false }).text, '-9.9 kW');

  // Exact break-even reads as not-losing: net 0 is +, earning, one decimal.
  const even = epmFlowLabel({ engaged: true, brownout: false, extractionW: 11776, switchingW: 11776, full: false });
  assert.equal(even.state, 'earning');
  assert.equal(even.text, '+0.0 kW');

  // A latched brownout: the stack is off, so there is no balance — it shows the stall.
  const bo = epmFlowLabel({ engaged: false, brownout: true, extractionW: 0, switchingW: 11776, full: false });
  assert.deepEqual(bo, { state: 'recover', sign: -1, text: 'stalled' });

  // Not firing and not full: you are not switching, so it is not a loss — the bar
  // refills on its own and the readout says so, never a phantom negative.
  const coast = epmFlowLabel({ engaged: false, brownout: false, extractionW: 0, switchingW: 11776, full: false });
  assert.deepEqual(coast, { state: 'coast', sign: 1, text: 'coast' });

  // Not firing and at the cap: full, no caret (sign 0).
  const full = epmFlowLabel({ engaged: false, brownout: false, extractionW: 0, switchingW: 11776, full: true });
  assert.deepEqual(full, { state: 'full', sign: 0, text: 'full' });
});

test('epm: brownout latches, and tripped fires only on the transition frame', () => {
  const dt = 1 / 60;
  // Step to zero in one shot: huge dt with no extraction.
  const trip = epmStep({ charge: 0.01, pulsing: true, drainPerSec: 10, dt: 1 });
  assert.equal(trip.charge, 0 + EPM.TRICKLE); // floored at 0, then trickle applies
  assert.equal(trip.brownout, true);
  assert.equal(trip.tripped, true);
  // The very next identical step: still latched, but tripped is false — the audio
  // cue cannot machine-gun.
  const next = epmStep({ charge: trip.charge, brownout: trip.brownout, pulsing: true, drainPerSec: 10, dt });
  assert.equal(next.brownout, true);
  assert.equal(next.tripped, false);
});

test('epm: recovery needs coasting past BROWNOUT_RECOVER on trickle alone', () => {
  const dt = 1 / 60;
  // Latched, pulsing contributes nothing while latched — charge climbs on TRICKLE
  // alone, so recovery from 0 takes BROWNOUT_RECOVER / TRICKLE = 10 s.
  let charge = 0, brownout = true;
  const stepsNeeded = Math.ceil((EPM.BROWNOUT_RECOVER / EPM.TRICKLE) * 60);
  for (let i = 0; i < stepsNeeded - 1; i++) {
    const s = epmStep({ charge, brownout, pulsing: true, drainPerSec: 10, regenPerSec: 100, dt });
    charge = s.charge; brownout = s.brownout;
    assert.equal(brownout, true, `still latched below RECOVER at frame ${i} (charge ${charge})`);
  }
  const release = epmStep({ charge, brownout, pulsing: true, drainPerSec: 10, regenPerSec: 100, dt });
  assert.equal(release.brownout, false, 'latch releases at/above RECOVER');
  assert.ok(charge < EPM.BROWNOUT_RECOVER && release.charge >= EPM.BROWNOUT_RECOVER);
});

test('epm: charge never leaves [0, CAPACITY] under an adversarial sweep', () => {
  for (const dt of [1 / 240, 1 / 60, 0.5, 5]) {
    for (const drainPerSec of [0, 5, 30]) {
      for (const regenPerSec of [0, 5, 30]) {
        for (const charge of [0, 1, 50, EPM.CAPACITY]) {
          for (const brownout of [false, true]) {
            const s = epmStep({ charge, brownout, pulsing: true, drainPerSec, regenPerSec, dt });
            assert.ok(s.charge >= 0 && s.charge <= EPM.CAPACITY,
              `charge ${s.charge} out of range (dt=${dt} drain=${drainPerSec} regen=${regenPerSec} c=${charge} b=${brownout})`);
          }
        }
      }
    }
  }
});

test('epm: frame-rate independent where no clamp/latch crosses; honest about where it is not', () => {
  // No clamp or latch crossing: Euler on a constant rate is exact, so one 1/60 step
  // equals four 1/240 steps bit-for-bit.
  const run = (dt, steps) => {
    let charge = 50;
    for (let i = 0; i < steps; i++) {
      charge = epmStep({ charge, brownout: false, pulsing: true, drainPerSec: 4, regenPerSec: 10, dt }).charge;
    }
    return charge;
  };
  approx(run(1 / 60, 1), run(1 / 240, 4), 1e-9);
  // Crossing the 0 floor is sub-step dependent: with the same wall time, finer steps
  // can trip brownout LATER (or not yet) because each step re-adds trickle after the
  // floor. This is inherent to the latched model — do not "fix" it.
  const coarse = epmStep({ charge: 0.05, brownout: false, pulsing: true, drainPerSec: 15, dt: 0.5 });
  assert.equal(coarse.tripped, true);
  let c = 0.05, tripped = false;
  for (let i = 0; i < 120; i++) {           // same 0.5 s at 1/240 steps
    const s = epmStep({ charge: c, brownout: false, pulsing: true, drainPerSec: 15, dt: 1 / 240 });
    c = s.charge; tripped = tripped || s.tripped;
  }
  assert.equal(tripped, true);              // still trips, just possibly a step later
});

test('epm: netPerSec matches the HUD arrow contract and is dt=0 safe', () => {
  const zero = epmStep({ charge: 42, dt: 0 });
  assert.equal(zero.netPerSec, 0);
  approx(zero.charge, 42, 1e-12);           // dt=0 mutates nothing
  // Sign convention is what drawEPMGauge renders: up arrow iff netPerSec >= 0.
  assert.ok(epmStep({ charge: 50, pulsing: true, drainPerSec: 5, regenPerSec: 20, dt: 0.1 }).netPerSec > 0);
  assert.ok(epmStep({ charge: 50, pulsing: true, drainPerSec: 5, regenPerSec: 0, dt: 0.1 }).netPerSec < 0);
});

// ---------------------------------------------------------------------------
// Camera: snap path, fast-catchup threshold, smoothing override, no-overshoot,
// and shake. (Camera has NO look-ahead and NO clamping — an earlier plan
// claimed those were untested; they do not exist.)
// ---------------------------------------------------------------------------
test('camera: follow(..., false) snaps exactly, and targetY is recorded either way', () => {
  for (const dt of [1 / 240, 1 / 60, 0.5, 3]) {
    const cam = new Camera(GameConfig);
    cam.y = -1234;
    cam.follow(777, dt, false);
    assert.equal(cam.getY(), 777);
    assert.equal(cam.targetY, 777);
  }
  const cam = new Camera(GameConfig);
  cam.follow(555, 1 / 60, true);
  assert.equal(cam.targetY, 555);           // target recorded in smooth mode too
  assert.ok(cam.getY() !== 555);            // ...but not snapped
});

test('camera: fast-catchup threshold is absDiff > 500, strictly', () => {
  const dt = 1 / 60;
  // At exactly 500 the step uses this.smoothing (0.15); one hair past it, 0.5.
  const at = new Camera(GameConfig);
  at.follow(500, dt, true);
  approx(at.getY(), 500 * (1 - Math.pow(1 - at.smoothing, dt * 60)), 1e-9);
  const past = new Camera(GameConfig);
  past.follow(500.001, dt, true);
  approx(past.getY(), 500.001 * (1 - Math.pow(1 - 0.5, dt * 60)), 1e-9);
});

test('camera: smoothing is honoured as an instance field (landmark dwell path)', () => {
  // SpaceMonkeyGame overwrites camera.smoothing per-frame near landmarks (0.08 vs base).
  // The diff must stay <= 500 or the fast-catchup branch overrides the field with 0.5.
  const dt = 1 / 60;
  const base = new Camera(GameConfig);
  base.follow(400, dt, true);
  const dwell = new Camera(GameConfig);
  dwell.smoothing = 0.08;
  dwell.follow(400, dt, true);
  assert.ok(dwell.getY() < base.getY(), 'smaller smoothing must move the camera less per step');
  approx(base.getY(), 400 * (1 - Math.pow(1 - base.smoothing, dt * 60)), 1e-9);
});

test('camera: never overshoots the target at any dt', () => {
  const target = 1000;
  for (const dt of [1 / 240, 1 / 60, 1 / 30, 0.5, 1]) {
    const cam = new Camera(GameConfig);
    let prev = 0;
    for (let i = 0; i < 300; i++) {
      cam.follow(target, dt, true);
      const y = cam.getY();
      assert.ok(y >= prev - 1e-9, `monotone approach (dt=${dt}, step ${i})`);
      assert.ok(y <= target + 1e-9, `no overshoot (dt=${dt}, step ${i}, y=${y})`);
      prev = y;
    }
    assert.ok(target - prev < 1, `converges at dt=${dt}`);
  }
});

test('camera: shake decays linearly, floors at 0, and shake() takes the max', () => {
  const cam = new Camera(GameConfig);
  const dt = 1 / 60;
  cam.shake(10);
  assert.equal(cam.shakeIntensity, 10);
  cam.shake(4);                              // weaker shake must NOT cut the active one
  assert.equal(cam.shakeIntensity, 10);
  // follow decays shake by shakeDecay*dt and floors at 0, never negative.
  cam.shakeDecay = 1000;                     // would go negative in one step without the floor
  const origRandom = Math.random;
  Math.random = () => 0.5;                   // zero displacement: isolates the decay
  try {
    cam.follow(0, dt, true);
    assert.equal(cam.shakeIntensity, 0);
    cam.shake(5);
    cam.follow(0, dt, true);
    assert.equal(cam.shakeIntensity, 0);
  } finally {
    Math.random = origRandom;
  }
  // A custom shakeDecay (as SpaceMonkeyGame sets for milestone shakes) gives
  // duration == intensity / shakeDecay seconds.
  const m = new Camera(GameConfig);
  m.shake(6);
  m.shakeDecay = 12;                         // 0.5 s of shake
  Math.random = () => 0.5;
  try {
    for (let i = 0; i < 29; i++) m.follow(0, 1 / 60, true);
    approx(m.shakeIntensity, 6 - 12 * 29 / 60, 1e-9);
    m.follow(0, 1 / 60, true);
    assert.equal(m.shakeIntensity, 0);
  } finally {
    Math.random = origRandom;
  }
});

test('camera: shake displacement is bounded by ±intensity/2', () => {
  // Stub Math.random to hit both extremes deterministically. NOTE (not changed):
  // shake is added into this.y itself rather than applied as a render-only offset,
  // so it perturbs real camera state and is pulled back by the next smoothing step.
  const origRandom = Math.random;
  try {
    Math.random = () => 1;
    const hi = new Camera(GameConfig);
    hi.shake(10);
    hi.follow(0, 1 / 60, true);              // smoothing step from 0→0, then +5 of shake
    approx(hi.getY(), 5, 1e-9);
    Math.random = () => 0;
    const lo = new Camera(GameConfig);
    lo.shake(10);
    lo.follow(0, 1 / 60, true);
    approx(lo.getY(), -5, 1e-9);
  } finally {
    Math.random = origRandom;
  }
});

// ---------------------------------------------------------------------------
// milestoneMarkerAt (2a) — distance-milestone decision
// ---------------------------------------------------------------------------
test('milestone: crosses the exact km boundary and only when not yet passed', () => {
  const none = () => false;
  // Below the first interval there is no milestone 0.
  assert.equal(milestoneMarkerAt(999, 1000, none), null);
  assert.equal(milestoneMarkerAt(0, 1000, none), null);
  // Exactly at 1000 m -> marker 1.
  assert.equal(milestoneMarkerAt(1000, 1000, none), 1);
  assert.equal(milestoneMarkerAt(1999.9, 1000, none), 1);
  assert.equal(milestoneMarkerAt(2000, 1000, none), 2);
  // Negative altitude never yields a milestone.
  assert.equal(milestoneMarkerAt(-5000, 1000, none), null);
});

test('milestone: an already-passed marker is not re-reported', () => {
  const passed1 = (km) => km === 1;
  assert.equal(milestoneMarkerAt(1500, 1000, passed1), null); // 1 already passed
  assert.equal(milestoneMarkerAt(2500, 1000, passed1), 2);     // 2 is new
});

// ---------------------------------------------------------------------------
// shouldTriggerGameOver (2e) — run ends only after a real climb
// ---------------------------------------------------------------------------
test('gameover: a fresh spawn on the ground is not a loss', () => {
  // maxAltitude never exceeded the minimum -> ground contact is harmless.
  assert.equal(shouldTriggerGameOver(10, 0, false, 50), false);
  assert.equal(shouldTriggerGameOver(50, 0, false, 50), false);   // must strictly exceed min
  assert.equal(shouldTriggerGameOver(0, 0, false, 50), false);
});

test('gameover: climbing above the min then returning to ground ends the run, once', () => {
  assert.equal(shouldTriggerGameOver(120, 0, false, 50), true);
  assert.equal(shouldTriggerGameOver(120, -3, false, 50), true);  // below ground counts too
  // Already over -> do not retrigger.
  assert.equal(shouldTriggerGameOver(120, 0, true, 50), false);
  // Still airborne -> not yet.
  assert.equal(shouldTriggerGameOver(120, 5, false, 50), false);
});

// ---------------------------------------------------------------------------
// scaleSettingValue — slider raw -> sim value for the divided scales
// ---------------------------------------------------------------------------
test('scaleSettingValue: divided scales use SETTINGS_SCALE, others pass through', () => {
  const { WIDTH, STRESS_BUDGET } = GameConfig.SETTINGS_SCALE;
  approx(scaleSettingValue('width', 45), 45 / WIDTH, 1e-12);
  approx(scaleSettingValue('stressBudget', 30), 30 / STRESS_BUDGET, 1e-12);
  // Amplitude (real metres) and air gap (real mm) pass through unscaled (M2.2/M2.4).
  assert.equal(scaleSettingValue('amplitude', 7), 7);
  assert.equal(scaleSettingValue('airGap', 0.3), 0.3);
  // Unscaled keys and unknown keys are returned unchanged.
  assert.equal(scaleSettingValue('tension', 123), 123);
  assert.equal(scaleSettingValue('gravity', 1.5), 1.5);
  assert.equal(scaleSettingValue('nonsense', 7), 7);
});

// ---------------------------------------------------------------------------
// couplingTier (shift 7, task 4) — single source of truth for the coupling-
// quality tier. The flash colour, the colorblind glyph and the badge bar all
// derive from it, so glyph/colour can never disagree about the tier.
// ---------------------------------------------------------------------------
test('couplingTier: exact inclusive boundaries and tier bands', () => {
  assert.equal(couplingTier(GameConfig.COUPLING.PERFECT_QUALITY), 'perfect'); // >=
  assert.equal(couplingTier(GameConfig.COUPLING.GOOD_QUALITY), 'good');       // >=
  assert.equal(couplingTier(GameConfig.COUPLING.PERFECT_QUALITY - 1e-9), 'good');
  assert.equal(couplingTier(1), 'perfect');
  assert.equal(couplingTier(0), 'poor');
  assert.equal(couplingTier(-1), 'poor');
  assert.equal(couplingTier(NaN), 'poor'); // NaN >= X is false -> poor
});

test('couplingTier: badge bar, particles and stall line agree by construction', () => {
  // Every tier maps to a well-defined colour on GameConfig.GRAB; a lookup on the
  // tier name must never be undefined. (renderMonkey's badge bar, the coupling
  // particles and the stack plate's stall line all key off couplingColor/couplingTier,
  // so a divergence would fail here. The discrete-grab flash + glyph were retired in
  // M3.6 — they graded a timing game that no longer exists.)
  for (const q of [0, 0.4, 0.45, 0.7, 0.85, 0.95, 1]) {
    const tier = couplingTier(q);
    assert.notEqual(GameConfig.GRAB[tier.toUpperCase() + '_COLOR'], undefined,
      `colour for tier ${tier} at q=${q}`);
  }
});

test('couplingColor returns the GRAB colour for the correct tier at every boundary', () => {
  // The badge bar and the continuous flash both call couplingColor, so the tier->colour
  // map lives in exactly one place.
  assert.equal(couplingColor(GameConfig.COUPLING.PERFECT_QUALITY), GameConfig.GRAB.PERFECT_COLOR);
  assert.equal(couplingColor(GameConfig.COUPLING.GOOD_QUALITY), GameConfig.GRAB.GOOD_COLOR);
  assert.equal(couplingColor(GameConfig.COUPLING.GOOD_QUALITY - 1e-9), GameConfig.GRAB.POOR_COLOR);
  assert.equal(couplingColor(1), GameConfig.GRAB.PERFECT_COLOR);
});

// ---------------------------------------------------------------------------
// upgradeCrossed (shift 7, task 9) — frame-size-independent upgrade collection
// via a crossing test instead of a fixed 30 m window (which one clamped 0.1 s
// step could overrun, silently skipping an upgrade band).
// ---------------------------------------------------------------------------
test('upgradeCrossed: a jump clean over the altitude still collects it', () => {
  assert.equal(upgradeCrossed(0, 100000, 5000, false), true);
  assert.equal(upgradeCrossed(4000, 6000, 5000, false), true); // crosses inside a band
});

test('upgradeCrossed: landing exactly on it collects it (inclusive >=)', () => {
  assert.equal(upgradeCrossed(4999, 5000, 5000, false), true);
  assert.equal(upgradeCrossed(5000, 5000, 5000, false), false); // already at/above, no crossing
});

test('upgradeCrossed: descending past it never collects; stationary above never fires', () => {
  assert.equal(upgradeCrossed(6000, 4000, 5000, false), false); // descending
  assert.equal(upgradeCrossed(5000, 5000, 5000, false), false); // stationary, already above
});

test('upgradeCrossed: an already-collected upgrade never fires, even on crossing', () => {
  assert.equal(upgradeCrossed(0, 100000, 5000, true), false);
});

// ---------------------------------------------------------------------------
// restartPressDecision (shift 7, task 10) — timestamp-based restart latch.
// ---------------------------------------------------------------------------
const restart = (over) => restartPressDecision({
  paused: false, gameOver: false, now: 0, gameOverTime: 0, armedAt: 0, ...over,
});

test('restart: paused always ignores, and beats gameOver', () => {
  assert.equal(restartPressDecision({ paused: true, gameOver: true, now: 99999, gameOverTime: 0, armedAt: 0 }), 'ignore');
  assert.equal(restart({ paused: true, now: 100, armedAt: 50 }), 'ignore'); // armed but paused
});

test('restart: game-over gate is exclusive (strictly past)', () => {
  assert.equal(restart({ gameOver: true, now: 0, gameOverTime: 0 }), 'ignore');                 // inside
  assert.equal(restart({ gameOver: true, now: GAME_OVER_INPUT_GATE_MS, gameOverTime: 0 }), 'ignore'); // exactly -> exclusive >
  assert.equal(restart({ gameOver: true, now: GAME_OVER_INPUT_GATE_MS + 1, gameOverTime: 0 }), 'restart');
});

test('restart: in play and not armed -> arm; armed within the window (inclusive) -> restart', () => {
  assert.equal(restart({ now: 1000, armedAt: 0 }), 'arm');                                            // arm
  assert.equal(restart({ now: 100, armedAt: 50 }), 'restart');                                        // within
  const t = 12345;
  assert.equal(restart({ now: t + RESTART_CONFIRM_MS, armedAt: t }), 'restart');                      // exactly (inclusive <=)
  assert.equal(restart({ now: t + RESTART_CONFIRM_MS + 1, armedAt: t }), 'arm');                      // expiry re-arms
  assert.equal(restart({ now: 1e9, armedAt: 0 }), 'arm');                                             // never armed
});

// ---------------------------------------------------------------------------
// thermalStep (shift 7, task 11) — one-frame temperature/suit decision.
// Behaviour identical to the pre-refactor updateThermal; only the presentation
// ('🧥 ' prefix) and the _thermalTier read-before-write live in the orchestrator.
// ---------------------------------------------------------------------------
const [SUIT0, SUIT1, SUIT2] = GameConfig.THERMAL.SUITS;
test('thermalStep: a monotonic climb announces exactly once per tier', () => {
  // Bare -> flight suit at s0; stepping a hair past each tier boundary announces once.
  let prevTier = -1, announces = 0;
  for (const alt of [0, SUIT0.altitude, SUIT0.altitude + 1, SUIT1.altitude, SUIT1.altitude + 1, SUIT2.altitude, SUIT2.altitude + 1e5]) {
    const s = thermalStep(alt, prevTier);
    prevTier = s.tier;
    if (s.announce) announces++;
  }
  assert.equal(announces, 3); // one per suit tier
});

test('thermalStep: descent never announces and same-tier never announces', () => {
  // Descending from full space suit back to ground.
  let prevTier = 2;
  for (const alt of [SUIT2.altitude, SUIT1.altitude, SUIT0.altitude, 0]) {
    const s = thermalStep(alt, prevTier);
    assert.equal(s.announce, false);
    prevTier = s.tier;
  }
  // Same tier still doesn't announce.
  assert.equal(thermalStep(SUIT0.altitude, 0).announce, false);
});

test('thermalStep: below the first suit -> tier -1, no label, ground temperature', () => {
  const s = thermalStep(0, -1);
  assert.equal(s.tier, -1);
  assert.equal(s.label, null);
  assert.equal(s.tempC, temperatureAtAltitude(0)); // 15
  // Presentation only: thermalStep carries no coupling term (the former cold-grip
  // penalty was an invented physics input and is gone; suits are costume).
  assert.deepEqual(Object.keys(s).sort(), ['announce', 'label', 'tempC', 'tier']);
});

test('thermalStep: a fresh run starting above the top suit announces only the top tier', () => {
  // prevTier === -1 right at/above 50000 m -> only the full space suit tier announces.
  const s = thermalStep(SUIT2.altitude + 1000, -1);
  assert.equal(s.tier, 2);
  assert.equal(s.announce, true);
  assert.equal(s.label, SUIT2.label);
});

// ---------------------------------------------------------------------------
// airDensityReadout (shift 7, task 12) — formatted air-density HUD string.
// Behaviour identical to the pre-refactor inline block; only the guard moved.
// ---------------------------------------------------------------------------
test('airDensityReadout: sea level / negative behave as 0 -> 100.0%', () => {
  assert.equal(airDensityReadout(0), '100.0%');
  assert.equal(airDensityReadout(-5000), '100.0%'); // densityRatio clamps below ground
});

test('airDensityReadout: mid-stratosphere uses exponential; >= 100 km is ~0%', () => {
  const mid = airDensityReadout(40000);
  assert.match(mid, /^\d\.\de[-+]\d+%$/); // e.g. 1.x e-1 %
  assert.equal(airDensityReadout(100000), '~0%');
  assert.equal(airDensityReadout(200000), '~0%');
});

test('airDensityReadout: the 1% and 0.001% boundaries land on the higher band (>=)', () => {
  const isFixed = (s) => /%$/.test(s) && !/[eE]/.test(s);
  const isExp = (s) => /e[-+]\d+%$/.test(s);
  let a1 = -1, a2 = -1;
  for (let m = 1; m < 100000; m++) {
    if (a1 === -1 && !isFixed(airDensityReadout(m))) a1 = m;   // first non-fixed-% (1% crossing)
    if (a2 === -1 && airDensityReadout(m) === '~0%') a2 = m;    // first ~0% (0.001% crossing)
    if (a1 !== -1 && a2 !== -1) break;
  }
  assert.ok(a1 > 0 && a2 > a1, `expected 1% then 0.001% crossing (a1=${a1}, a2=${a2})`);
  // Just below the 1% boundary the readout is still fixed-% with pct >= 1 (inclusive >=).
  assert.ok(isFixed(airDensityReadout(a1 - 1)));
  assert.ok(densityRatio(a1 - 1) * 100 >= 1);
  assert.ok(isExp(airDensityReadout(a1)));
  // Just below the 0.001% boundary the readout is still exponential with pct >= 0.001.
  assert.ok(isExp(airDensityReadout(a2 - 1)));
  assert.ok(densityRatio(a2 - 1) * 100 >= 0.001);
  assert.equal(airDensityReadout(a2), '~0%');
});

// ---------------------------------------------------------------------------
// cargoDeliveryCredit (shift 7, task 13) — cargo credited on the first Kármán
// crossing. Behaviour identical to the pre-refactor inline block (note the
// NEGATED >= form that preserves NaN behaviour). The `continuous` parameter went
// with the retired discrete grab model: there is only one coupling model now, so
// the caller had nothing but a literal `true` left to pass.
// ---------------------------------------------------------------------------
const DELIVER_M = GameConfig.MISSION.DELIVER_ALTITUDE_M;
const credit = (over) => cargoDeliveryCredit({
  delivered: false, altitude: DELIVER_M, cargoKg: 100, bootstrapKg: 50, ...over,
});

test('cargoDeliveryCredit: below Kármán is null; exactly at the line credits', () => {
  assert.equal(credit({ altitude: DELIVER_M - 1 }), null);
  assert.deepEqual(credit({ altitude: DELIVER_M }), { deliveredKg: 100, bootstrapKg: 150 });
});

test('cargoDeliveryCredit: delivered latches null; credits well above the line', () => {
  assert.equal(credit({ delivered: true }), null);
  assert.deepEqual(credit({ altitude: 200000 }), { deliveredKg: 100, bootstrapKg: 150 });
});

test('cargoDeliveryCredit: bootstrap accumulates; NaN altitude is null; input not mutated', () => {
  assert.equal(credit({ cargoKg: 25, bootstrapKg: 40 }).bootstrapKg, 65);
  assert.equal(credit({ altitude: NaN }), null);
  const input = { delivered: false, altitude: DELIVER_M, cargoKg: 100, bootstrapKg: 50 };
  const before = { ...input };
  credit(input);
  assert.deepEqual(input, before);
});

test('cargoDeliveryCredit composes with throughputKgPerHour and bootstrapPct', () => {
  const c = credit({ cargoKg: 250, bootstrapKg: 0 });
  assert.ok(c);
  // The delivery credits the kg; the climb time (tracked by the game loop) turns
  // it into throughput. 250 kg in 20 min = 750 kg/h.
  approx(throughputKgPerHour(c.deliveredKg, 1200), 750, 1e-9);
  assert.ok(bootstrapPct(c.bootstrapKg) > 0);
});

// ---------------------------------------------------------------------------
// Touch play + small screens (shift 9). The game takes exactly ONE input, so a
// phone gets a hold-anywhere surface rather than a control scheme — and the copy
// and the layout have to follow the device that is actually there.
// ---------------------------------------------------------------------------
test('grabHintText never names SPACE on a touch device', () => {
  for (const compact of [false, true]) {
    const touch = grabHintText(true, compact);
    assert.ok(!/SPACE/i.test(touch), `touch hint must not mention SPACE: ${touch}`);
    assert.ok(touch.startsWith('Hold anywhere'), touch);
    assert.ok(grabHintText(false, compact).startsWith('Press SPACE'));
  }
});

test('grabHintText: the compact form is shorter and both forms say "the wave"', () => {
  for (const touch of [false, true]) {
    const full = grabHintText(touch, false);
    const compact = grabHintText(touch, true);
    assert.ok(compact.length < full.length, `${compact} should be shorter than ${full}`);
    // At 15px monospace (renderFirstHint) a character is ~9 px, so the compact form
    // has to stay inside a 360 px phone viewport with room to spare.
    assert.ok(compact.length * 9 < 360, `${compact} is too wide for a phone`);
    for (const s of [full, compact]) assert.ok(s.endsWith('catch the wave'), s);
  }
});

test('compactHudLayout switches exactly at the dashboard clearance width', () => {
  // The p.11 dashboard is a fixed 640 px plate and the controls box owns the
  // bottom-left 180 px + 10 px offset: (1024 - 640) / 2 = 192 is the first width at
  // which they clear each other, which is why the boundary is 1024 and not a
  // rounder number.
  assert.equal(COMPACT_HUD_MAX_W, 1024);
  assert.equal(compactHudLayout(1024), false);
  assert.equal(compactHudLayout(1023), true);
  assert.equal(compactHudLayout(390), true);   // iPhone portrait
  assert.equal(compactHudLayout(844), true);   // iPhone landscape
  assert.equal(compactHudLayout(1280), false); // desktop
  assert.ok((COMPACT_HUD_MAX_W - 640) / 2 > 180 + 10);
});

test('clampPlateX keeps a plate inside the viewport, left edge winning when it cannot fit', () => {
  // Fits where it was asked to sit.
  assert.equal(clampPlateX(300, 200, 1280), 300);
  // Runs off the right: pulled back to the margin.
  assert.equal(clampPlateX(1200, 200, 1280), 1280 - 200 - 6);
  // Asked for a negative x: pushed in to the margin.
  assert.equal(clampPlateX(-50, 200, 1280), 6);
  // Wider than the viewport (a long UNLOADED line on a phone): the LEFT edge wins,
  // so the start of the sentence is the part that survives.
  assert.equal(clampPlateX(120, 500, 390), 6);
  // Custom margin honoured.
  assert.equal(clampPlateX(999, 100, 400, 20), 400 - 100 - 20);
});

// Shift 10: the film is drawn as a BAND so the air gap is visible, and the sprite's hands
// are open clamps whose jaws sit CLAMP_JAW_HALF_PX from the tether centre. The band must
// keep a visible response to the film-width slider AND must never grow into those jaws:
// a band touching the clamps re-asserts contact, which is the one claim the drawing may
// not make.
test('filmBandHalfPx tracks the film-width slider and never reaches the clamp jaws', () => {
  // The 45 mm default draws the reference half-width (SEGMENT_WIDTH px).
  assert.equal(filmBandHalfPx(4.5, 12), 12);
  // Half the default film is half the band; the slider stays legible in the middle.
  assert.equal(filmBandHalfPx(2.25, 12), 6);
  // Monotonic across the whole slider range (10 mm .. 1000 mm => vineWidth 1 .. 100).
  let prev = -Infinity;
  for (let mm = 10; mm <= 1000; mm += 5) {
    const half = filmBandHalfPx(mm / 10, 12);
    assert.ok(half >= prev, `band half-width must not shrink as film width grows (${mm} mm)`);
    prev = half;
    // The invariant: daylight to the jaws at EVERY slider position.
    assert.ok(half < CLAMP_JAW_HALF_PX, `band must clear the clamp jaws (${mm} mm => ${half})`);
    assert.ok(half >= FILM_BAND_MIN_HALF_PX, `band must stay visible (${mm} mm => ${half})`);
    assert.ok(half <= FILM_BAND_MAX_HALF_PX);
  }
  // Both ends saturate rather than run away.
  assert.equal(filmBandHalfPx(1, 12), FILM_BAND_MIN_HALF_PX);
  assert.equal(filmBandHalfPx(100, 12), FILM_BAND_MAX_HALF_PX);
  // And the clearance is real, not zero.
  assert.ok(CLAMP_JAW_HALF_PX - FILM_BAND_MAX_HALF_PX >= 2);
});

// Shift A (legible wave): the drawn displacement is a labelled schematic on BOTH
// axes. Spatially, waveDrawAmpPx exaggerates the real stroke proportionally and
// caps it (the taper's thin-top factor can push a 1 m anchor stroke past the cap).
// Temporally, drawnOscillationHz maps the carrier monotonically into a sub-1.25 Hz
// band: true carrier frequency sampled by a display refresh aliases, and an
// exaggerated shape above the 3 Hz flash ceiling would break photosafety. The map
// must preserve ORDER so a hotter carrier still reads faster.
test('waveDrawAmpPx scales strokes proportionally and caps the drawing', () => {
  // Proportional below the cap: 0.5 m at PX_PER_M 10, x8 => 40 px; Wessels' 0.60 m
  // draws visibly less than the paper baseline's 1.00 m (48 vs 80).
  assert.equal(waveDrawAmpPx(0.5, 10, 8, 80), 40);
  assert.equal(waveDrawAmpPx(0.6, 10, 8, 80), 48);
  assert.equal(waveDrawAmpPx(0.05, 10, 8, 80), 4);   // slider floor stays visible-ish
  // The default stroke lands exactly on the cap; the stress-capped maximum (1.1 m)
  // saturates rather than runs away.
  assert.equal(waveDrawAmpPx(1.0, 10, 8, 80), 80);
  assert.equal(waveDrawAmpPx(1.1, 10, 8, 80), 80);
  // Zero stroke draws nothing, and monotonicity holds across the whole slider.
  assert.equal(waveDrawAmpPx(0, 10, 8, 80), 0);
  let prev = -Infinity;
  for (let cm = 5; cm <= 110; cm += 5) {
    const px = waveDrawAmpPx(cm / 100, 10, 8, 80);
    assert.ok(px >= prev, `drawn amplitude must not shrink as stroke grows (${cm} cm)`);
    prev = px;
    assert.ok(px <= 80 && px > 0);
  }
});

test('drawnOscillationHz maps carriers into a slow band, monotonically', () => {
  // Endpoints of the labelled map: 10 Hz -> 0.15, 1000 Hz -> 1.2.
  approx(drawnOscillationHz(10), 0.15);
  approx(drawnOscillationHz(1000), 1.2);
  // The shipped default sits comfortably below half the 3 Hz ceiling.
  const fDefault = drawnOscillationHz(92);
  approx(fDefault, 0.15 + (Math.log10(9.2) / 2) * 1.05, 1e-12);
  assert.ok(fDefault < 0.7, `default carrier must draw well under 1 Hz (got ${fDefault})`);
  // Monotone across the whole carrier slider, and EVERY drawn rate clears the
  // photosafety budget with margin: hard ceiling at 1.25 Hz.
  let prev = -Infinity;
  for (let hz = 10; hz <= 1000; hz += 10) {
    const out = drawnOscillationHz(hz);
    assert.ok(out > prev, `drawn rate must increase with the carrier (${hz} Hz)`);
    prev = out;
    assert.ok(out >= 0.15 && out <= 1.2, `drawn rate must stay in the labelled band (${hz} Hz => ${out})`);
    assert.ok(out <= 3 * 0.42, 'well clear of the 3 Hz flash rule');
  }
  // Out-of-band carriers clamp instead of extrapolating.
  approx(drawnOscillationHz(5), 0.15);
  approx(drawnOscillationHz(5000), 1.2);
});

// Shift B (altitude rail): a sqrt axis. Linear would crush every diegetic landmark
// but Everest under 12 % of the span; sqrt spreads the low climb while both endpoints
// stay exact and monotonicity holds across the whole mission.
test('railAltitudeToFrac: sqrt axis spreads the low climb, clamps both ends', () => {
  const M = 100000;
  assert.equal(railAltitudeToFrac(0, M), 0);
  approx(railAltitudeToFrac(M, M), 1);
  // Below ground and past the Kármán line clamp, never extrapolate.
  approx(railAltitudeToFrac(-5, M), 0);
  approx(railAltitudeToFrac(400000, M), 1);   // the ISS sits at the crown, off-span
  // The landmarks that motivated the axis: Everest at ~30 %, cruising altitude at
  // ~35 %, the act boundary and Baumgartner separated by ~1 % of rail each.
  approx(railAltitudeToFrac(8848, M), Math.sqrt(8848 / M));
  approx(railAltitudeToFrac(20000, M), Math.sqrt(0.2));
  approx(railAltitudeToFrac(40000, M), Math.sqrt(0.4));
  assert.ok(Math.abs(railAltitudeToFrac(39000, M) - railAltitudeToFrac(40000, M)) < 0.01,
    'Baumgartner and the act boundary stay distinct but close');
  let prev = -Infinity;
  for (let m = 0; m <= M; m += 2500) {
    const f = railAltitudeToFrac(m, M);
    assert.ok(f > prev, `frac must increase with altitude (${m} m)`);
    prev = f;
  }
});

test('viewportTooSmall passes every real phone and only rejects the unplaceable', () => {
  // Real devices, portrait and landscape, must all boot the game.
  for (const [w, h] of [[320, 568], [360, 640], [390, 844], [844, 390], [412, 915], [768, 1024]]) {
    assert.equal(viewportTooSmall(w, h), false, `${w}x${h} must be supported`);
  }
  assert.equal(viewportTooSmall(299, 800), true);
  assert.equal(viewportTooSmall(800, 379), true);
});

test('cleanModeRequested: ?clean / #clean on, clean=0 and lookalikes off', () => {
  assert.equal(cleanModeRequested('?clean', ''), true);
  assert.equal(cleanModeRequested('?debug&clean', ''), true);
  assert.equal(cleanModeRequested('?clean&debug', ''), true);
  assert.equal(cleanModeRequested('?clean=1', ''), true);
  assert.equal(cleanModeRequested('', '#clean'), true);
  assert.equal(cleanModeRequested('?debug', '#clean'), true);
  assert.equal(cleanModeRequested('', ''), false);
  assert.equal(cleanModeRequested('?debug', ''), false);
  assert.equal(cleanModeRequested('?clean=0', ''), false);
  assert.equal(cleanModeRequested('?cleanup', ''), false);
  assert.equal(cleanModeRequested('?x=clean', ''), false);
  // Missing/odd inputs must not throw — it runs once, at load, before anything else.
  assert.equal(cleanModeRequested(undefined, undefined), false);
  assert.equal(cleanModeRequested(null, null), false);
});

test('nextHudLevel cycles minimal -> full -> off -> minimal, and minimal is the default', () => {
  // The DEFAULT is the point of the change: a visitor lands on the climb, not on four
  // HUD blocks and a 640 px frequency table. Full detail is one keypress away.
  assert.equal(HUD_MINIMAL, 0);
  assert.equal(nextHudLevel(HUD_MINIMAL), HUD_FULL);
  assert.equal(nextHudLevel(HUD_FULL), HUD_OFF);
  assert.equal(nextHudLevel(HUD_OFF), HUD_MINIMAL);
  // Three presses always come home, from any level.
  for (const start of [HUD_MINIMAL, HUD_FULL, HUD_OFF]) {
    assert.equal(nextHudLevel(nextHudLevel(nextHudLevel(start))), start);
  }
});

test('hudLevelToast names the key that brings the instruments back', () => {
  // Minimal and off must both advertise H, or folded-away instruments look deleted.
  for (const level of [HUD_MINIMAL, HUD_OFF]) {
    assert.match(hudLevelToast(level), /\bH\b/, hudLevelToast(level));
  }
  assert.match(hudLevelToast(HUD_MINIMAL), /minimal/i);
  assert.match(hudLevelToast(HUD_FULL), /readouts/i);
  assert.match(hudLevelToast(HUD_OFF), /hidden/i);
});

// Shift 12, priority 1: the score survives as ONE line in the minimal compact plate.
// The helper mirrors renderMissionHud's maths exactly, so the two levels can never
// quote different figures for the same run.
test('minimalScoreLine: the goal before liftoff, the live pace while climbing', () => {
  const base = { cargoKg: 3, delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 0 };
  // On the ground with the clock not started: state the goal and the cargo.
  assert.equal(minimalScoreLine({ ...base, altitudeM: 0, climbElapsedS: null }),
    'score: kg/h to Kármán · cargo 3 kg');
  // Clock started but still on the deck (altitude <= 0.5): still the goal, matching
  // renderMissionHud's own condition.
  assert.equal(minimalScoreLine({ ...base, altitudeM: 0.4, climbElapsedS: 3 }),
    'score: kg/h to Kármán · cargo 3 kg');
  // Airborne but the climb clock is 0 s old (the liftoff frame itself), or the elapsed
  // is not a usable number at all: a projection over zero time is 0 kg/h, and printing
  // "pace 0 kg/h" would show a score of zero as though it were one.
  for (const climbElapsedS of [0, null, undefined, NaN, -1]) {
    assert.equal(minimalScoreLine({ ...base, altitudeM: 5000, climbElapsedS }),
      'score: kg/h to Kármán · cargo 3 kg', `elapsed ${climbElapsedS} must not print a pace`);
  }
  // Climbing: cargo x altitude fraction over climb time, the same projection as full.
  // 3 kg, halfway up, 100 s on the clock: 3 * 0.5 * 3600 / 100 = 54 kg/h.
  assert.equal(minimalScoreLine({ ...base, altitudeM: 50000, climbElapsedS: 100 }),
    'pace 54 kg/h to Kármán');
});

test('minimalScoreLine: once a best exists it rides the goal and pace lines', () => {
  const base = { cargoKg: 3, delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 0 };
  // The bootstrap-pacing sharpening: a pace read only means something against a
  // reference, and the persisted record is the one pacing reference the game owns
  // (the paper publishes no pacing figure to cite). So a returning player sees the
  // best beside the goal (the cargo-choice moment) and beside the live pace (the
  // pacing moment), while a fresh player (best 0) sees exactly the lines above.
  assert.equal(minimalScoreLine({ ...base, altitudeM: 0, climbElapsedS: null, bestKgH: 31 }),
    'score: kg/h to Kármán · cargo 3 kg · best 31 kg/h');
  assert.equal(minimalScoreLine({ ...base, altitudeM: 50000, climbElapsedS: 100, bestKgH: 31 }),
    'pace 54 kg/h to Kármán · best 31 kg/h');
  // The best rounds the same way the delivered state's does (31.4 -> 31).
  assert.equal(minimalScoreLine({ ...base, altitudeM: 50000, climbElapsedS: 100, bestKgH: 31.4 }),
    'pace 54 kg/h to Kármán · best 31 kg/h');
  // Non-finite or absent bests print no suffix, exactly like best 0.
  for (const bestKgH of [NaN, undefined, null, -5]) {
    assert.equal(minimalScoreLine({ ...base, altitudeM: 50000, climbElapsedS: 100, bestKgH }),
      'pace 54 kg/h to Kármán', `best ${bestKgH} must not print a suffix`);
  }
});

test('minimalScoreLine: after delivery it locks to the figure plus the best', () => {
  // 3 kg in 380.4 s = 28.4 kg/h; the best is the persisted one (28 kg/h -> "28").
  assert.equal(minimalScoreLine({
    cargoKg: 3, altitudeM: 100000, climbElapsedS: 400,
    delivered: true, deliveredKg: 3, deliveredInS: 380.4, bestKgH: 31,
  }), 'delivered 28 kg/h · best 31 kg/h');
  // Delivery wins over every other state, exactly as the mission block's branch order.
  const locked = minimalScoreLine({
    cargoKg: 50, altitudeM: 90000, climbElapsedS: 10,
    delivered: true, deliveredKg: 3, deliveredInS: 380.4, bestKgH: 0,
  });
  assert.equal(locked, 'delivered 28 kg/h · best 0 kg/h');
});

test('minimalScoreLine: the delivered line carries the bootstrap meter when one exists', () => {
  // The bootstrap-progress clause: the progress axis (the cumulative kg toward the
  // 600 kg tether target, the game's own S16 design number) used to show only at full
  // HUD and on the game-over screen, so a player who never presses H never learned the
  // bootstrap exists. The delivered line is the one moment the meter moves, so it
  // carries the figure, in the game-over screen's own kg/kg style.
  assert.equal(minimalScoreLine({
    cargoKg: 3, altitudeM: 100000, climbElapsedS: 400,
    delivered: true, deliveredKg: 3, deliveredInS: 380.4, bestKgH: 31, bootstrapKg: 40,
  }), 'delivered 28 kg/h · best 31 kg/h · tether 40/600 kg');
  // The clause rounds the way the best does, and the kg is not capped at the target
  // (bootstrapPct caps the percent; the meter books what climbers actually carried).
  assert.equal(minimalScoreLine({
    cargoKg: 3, altitudeM: 100000, climbElapsedS: 400,
    delivered: true, deliveredKg: 3, deliveredInS: 380.4, bestKgH: 31, bootstrapKg: 640.4,
  }), 'delivered 28 kg/h · best 31 kg/h · tether 640/600 kg');
  // Absent, zero, negative or non-finite prints no clause, so the exact-string pins
  // above (which pass no bootstrapKg) keep matching, and a fresh written state shows
  // no meter. In real play the delivered state always has one: the credit just fired.
  for (const bootstrapKg of [undefined, null, 0, NaN, -5]) {
    assert.equal(minimalScoreLine({
      cargoKg: 3, altitudeM: 100000, climbElapsedS: 400,
      delivered: true, deliveredKg: 3, deliveredInS: 380.4, bestKgH: 31, bootstrapKg,
    }), 'delivered 28 kg/h · best 31 kg/h', `bootstrapKg ${bootstrapKg} must not print a clause`);
  }
  // The clause rides the delivered line only: the meter does not move on the goal or
  // pace lines, so they never carry it even when a cumulative total exists.
  assert.equal(minimalScoreLine({
    cargoKg: 3, altitudeM: 0, climbElapsedS: null,
    delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 31, bootstrapKg: 40,
  }), 'score: kg/h to Kármán · cargo 3 kg · best 31 kg/h');
  assert.equal(minimalScoreLine({
    cargoKg: 3, altitudeM: 50000, climbElapsedS: 100,
    delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 31, bootstrapKg: 40,
  }), 'pace 54 kg/h to Kármán · best 31 kg/h');
});

test('minimalScoreLine: one short line that fits the 390 px plate, no em dash', () => {
  const states = [
    { cargoKg: 3, altitudeM: 0, climbElapsedS: null, delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 0 },
    { cargoKg: 3, altitudeM: 50000, climbElapsedS: 100, delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 0 },
    { cargoKg: 50, altitudeM: 100000, climbElapsedS: 400, delivered: true, deliveredKg: 50, deliveredInS: 388, bestKgH: 464 },
    // The widest best-bearing variants: a three-figure best beside the goal and the pace.
    { cargoKg: 50, altitudeM: 0, climbElapsedS: null, delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 464 },
    { cargoKg: 50, altitudeM: 50000, climbElapsedS: 10, delivered: false, deliveredKg: 0, deliveredInS: 0, bestKgH: 464 },
    // The widest tether-bearing variant: three-figure figures plus a meter past target.
    { cargoKg: 50, altitudeM: 100000, climbElapsedS: 400, delivered: true, deliveredKg: 50, deliveredInS: 388, bestKgH: 464, bootstrapKg: 640 },
  ];
  for (const s of states) {
    const line = minimalScoreLine(s);
    // 9px monospace is ~5.4 px/char; the 390 px phone plate has 390 - 12 - 16 = 362 px
    // of text room. A line wider than that is one the plate cannot say.
    assert.ok(line.length * 5.4 < 362, `too wide for the 390 px plate: ${line}`);
    // The owner's standing rule: no em dash in player-facing prose.
    assert.ok(!/\u2014/.test(line), `em dash in the score line: ${line}`);
  }
});
