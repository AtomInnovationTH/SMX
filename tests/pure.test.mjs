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
  gapFluxT,
  pairCouplingK,
  stackDryMassKg,
  stackLengthM,
  stackPhaseOffset,
  flutterAmplitudeMm,
  freqDecadeColumn,
  switchingPowerW,
  slipThrustMeanN,
  safePersistedNumber,
  missionScore,
  bootstrapPct,
  densityRatio,
  temperatureAtAltitude,
  thermalSuitIndex,
  coldGripFactor,
  altimeterLandmarkAt,
  epmChargeStep,
  milestoneMarkerAt,
  shouldTriggerGameOver,
  scaleSettingValue,
  couplingTier,
  couplingColor,
  upgradeCrossed,
  restartPressDecision,
  GAME_OVER_INPUT_GATE_MS,
  RESTART_CONFIRM_MS,
  thermalStep,
  airDensityReadout,
  cargoDeliveryCredit,
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
    gapFluxT, pairCouplingK, stackDryMassKg, stackLengthM, stackPhaseOffset, flutterAmplitudeMm,
    freqDecadeColumn, switchingPowerW, slipThrustMeanN,
    densityRatio, altimeterLandmarkAt, epmChargeStep,
    milestoneMarkerAt, shouldTriggerGameOver, scaleSettingValue,
    couplingTier, couplingColor, upgradeCrossed, restartPressDecision, thermalStep,
    airDensityReadout, cargoDeliveryCredit,
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

test('the pure-helpers block contains exactly 35 declared helpers (guard against an over-broad regex)', () => {
  // The guard regex now also matches const/let arrow forms, but MUST NOT sweep in
  // non-helper declarations such as the ATMO_DENSITY_KGM3 array const. If this count
  // drifts, the regex grew too broad (or a helper was removed) — make it fail loudly.
  assert.equal(declaredPureHelpers().length, 35);
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
  const monkey = { velocityY: 0 };
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
    const monkey = { velocityY: -u * vFilmPeak * GameConfig.PHYSICS.ALTITUDE_CONVERSION };
    const c = p.calculateContinuousCoupling(ws, monkey, args);
    assert.ok(c.thrustN < prev, `thrust must fade as slip closes (u=${u})`);
    prev = c.thrustN;
  }
  // Outrunning the crest: the gate is empty and thrust is exactly 0 (not clamped mid-fade).
  for (const u of [1.0, 1.2]) {
    const monkey = { velocityY: -u * vFilmPeak * GameConfig.PHYSICS.ALTITUDE_CONVERSION };
    const c = p.calculateContinuousCoupling(ws, monkey, args);
    assert.equal(c.thrustN, 0, `u=${u}: gate empty, thrust exactly 0`);
  }
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
  // window and confirm 60 Hz and 144 Hz integration converge.
  const base = GameConfig.PHYSICS.AIR_DRAG; // 0.985
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
  // Stack length: the shipped default is 128 pairs ≈ 5.2 m (decision 6: 64 pairs ≈ 2.6 m),
  // a few percent of a wavelength (λ ≈ 227 m at the 92 Hz default) — compact against λ,
  // so the stack reads the LOCAL film phase, with a real travelling firing sequence.
  approx(stackLengthM(64, GameConfig.FG40.PITCH_M), 64 * GameConfig.FG40.PITCH_M, 1e-12);
  assert.ok(stackLengthM(64, GameConfig.FG40.PITCH_M) > 2.3 && stackLengthM(64, GameConfig.FG40.PITCH_M) < 2.9);
  const lambdaDefault = tetherWaveSpeed() / GameConfig.WAVE.DEFAULT_FREQUENCY;
  const stackFrac = stackLengthM(GameConfig.FG40.DEFAULT_N_PAIRS, GameConfig.FG40.PITCH_M) / lambdaDefault;
  assert.ok(stackFrac > 0.01 && stackFrac < 0.06, `default stack spans ${(stackFrac * 100).toFixed(1)}% of λ`);
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
  // Shipped default: 128 × 0.041 m = 5.248 m at 92 Hz → ~0.023 λ (near-unison firing).
  const spanDefault = Math.abs(stackPhaseOffset(GameConfig.FG40.DEFAULT_N_PAIRS, GameConfig.FG40.PITCH_M, 92, c)) / (2 * Math.PI);
  assert.ok(Math.abs(spanDefault - 0.0232) < 2e-3, `default stack spans ${spanDefault.toFixed(4)} λ`);
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

test('missionScore = deliveredKg × delivery altitude km', () => {
  const km = GameConfig.MISSION.DELIVER_ALTITUDE_M / 1000;
  approx(missionScore(0), 0);
  approx(missionScore(250), 250 * km);
  assert.ok(missionScore(500) > missionScore(250));
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

test('coldGripFactor is 1.0 when warm and capped when cold', () => {
  const { PENALTY_CAP } = GameConfig.THERMAL;
  assert.equal(coldGripFactor(0, -20), 1.0);        // warmer than threshold
  assert.equal(coldGripFactor(-20, -20), 1.0);      // exactly at threshold
  const cold = coldGripFactor(-100, -20);           // far below threshold
  assert.ok(cold < 1.0 && cold >= 1.0 - PENALTY_CAP);
  approx(cold, 1.0 - PENALTY_CAP);                  // saturates at the cap
  // A better-rated suit (lower shiveringAt) restores grip at the same temperature.
  assert.ok(coldGripFactor(-50, -60) > coldGripFactor(-50, -20));
});

// ---------------------------------------------------------------------------
// B.14/B.15 — vacuum-correct drag & the aero-kit fix
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

test('B.14 split is gone: aero drag alone is the full AIR_DRAG retention at sea level', () => {
  // The eddy half of the split (applyEddyDrag, EDDY_FRACTION) was deleted in M2.5 — the
  // §2.3 slip integral IS the eddy interaction now, both traction and braking, so the
  // two never coexist. Aero drag keeps the whole AIR_DRAG retention.
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  assert.equal(GameConfig.PHYSICS.EDDY_FRACTION, undefined, 'EDDY_FRACTION was deleted');
  assert.equal(p.applyEddyDrag, undefined, 'applyEddyDrag was deleted');
  const dt = 1 / 60;
  const m = { velocityY: -1000, altitude: 0 };
  p.applyGravityAndDrag(m, dt, 0, 1);   // gravityMult 0: isolate drag
  approx(m.velocityY, -1000 * frameDecay(GameConfig.PHYSICS.AIR_DRAG, dt), 1e-9);
});

test('B.15: an aero kit REDUCES drag, and drag vanishes with altitude', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const run = (dragMult, altitude) => {
    const m = { velocityY: -1000, altitude };
    p.applyGravityAndDrag(m, 1 / 60, 0, dragMult);   // gravityMult 0: isolate drag
    return Math.abs(m.velocityY);
  };
  // lower dragMult (a kit) must RETAIN more speed at sea level
  assert.ok(run(0.855, 0) > run(1.0, 0), 'aero kits must reduce drag, not increase it');
  // and aerodynamic drag must be negligible at 100 km
  approx(run(1.0, 100000), 1000, 1e-3);
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
  // At the shipped defaults (92 Hz carrier, 128 pairs): ≈188 kW = 4.7% of the paper's
  // 4 MW budget — the low carrier is what keeps the switching draw feasible (M2.11).
  const shipW = switchingPowerW(GameConfig.WAVE.DEFAULT_FREQUENCY, GameConfig.FG40.DEFAULT_N_PAIRS, GameConfig.FG40.E_SWITCH_J);
  assert.ok(shipW > 180e3 && shipW < 200e3, `shipped default switching ${shipW} W`);
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

test('couplingTier: glyph, flash colour and badge colour agree by construction', () => {
  // Every tier maps to a well-defined colour on GameConfig.GRAB; a lookup on the
  // tier name must never be undefined. (renderEffects keys the glyph by the same
  // tier and renderMonkey's badge bar by the same helper, so a divergence would fail.)
  const glyph = { perfect: '\u2713', good: '\u223C', poor: '\u2717' };
  for (const q of [0, 0.4, 0.45, 0.7, 0.85, 0.95, 1]) {
    const tier = couplingTier(q);
    assert.notEqual(glyph[tier], undefined, `glyph for tier ${tier} at q=${q}`);
    assert.notEqual(GameConfig.GRAB[tier.toUpperCase() + '_COLOR'], undefined,
      `flash colour for tier ${tier} at q=${q}`);
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

test('thermalStep: below the first suit -> tier -1, no label, bare shivering floor', () => {
  const s = thermalStep(0, -1);
  assert.equal(s.tier, -1);
  assert.equal(s.label, null);
  assert.equal(s.tempC, temperatureAtAltitude(0)); // 15
  // coldFactor uses BARE_SHIVERING_AT and sits in [1 - PENALTY_CAP, 1].
  approx(s.coldFactor, coldGripFactor(temperatureAtAltitude(0), GameConfig.THERMAL.BARE_SHIVERING_AT), 1e-12);
  assert.ok(s.coldFactor >= 1 - GameConfig.THERMAL.PENALTY_CAP && s.coldFactor <= 1);
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

test('cargoDeliveryCredit composes with missionScore and bootstrapPct', () => {
  const c = credit({ cargoKg: 250, bootstrapKg: 0 });
  assert.ok(c);
  approx(missionScore(c.deliveredKg), 250 * (DELIVER_M / 1000), 1e-9);
  assert.ok(bootstrapPct(c.bootstrapKg) > 0);
});
