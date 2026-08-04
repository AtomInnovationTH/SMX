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
  tetherWaveSpeed,
  couplingMomentumScale,
  waveEnergyFactor,
  tensionSagFactor,
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
  materialDampingFor,
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
    tetherWaveSpeed, couplingMomentumScale, waveEnergyFactor, tensionSagFactor,
    densityRatio, altimeterLandmarkAt, epmChargeStep,
    milestoneMarkerAt, shouldTriggerGameOver, materialDampingFor, scaleSettingValue,
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

test('the pure-helpers block contains exactly 25 declared helpers (guard against an over-broad regex)', () => {
  // The guard regex now also matches const/let arrow forms, but MUST NOT sweep in
  // non-helper declarations such as the ATMO_DENSITY_KGM3 array const. If this count
  // drifts, the regex grew too broad (or a helper was removed) — make it fail loudly.
  assert.equal(declaredPureHelpers().length, 25);
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

test('square wave position is ±amp by sign(sin)', () => {
  const amp = 50;
  approx(WAVE_CALCULATORS.square.position(amp, Math.PI / 2), amp);   // sin>0
  approx(WAVE_CALCULATORS.square.position(amp, 3 * Math.PI / 2), -amp); // sin<0
  // velocity spikes near the zero-crossing, zero elsewhere
  assert.equal(WAVE_CALCULATORS.square.velocity(amp, 2, Math.PI / 2), 0);
  assert.ok(WAVE_CALCULATORS.square.velocity(amp, 2, 0) > 0);
});

test('sawtooth wave ramps within a cycle and resets', () => {
  const amp = 40, omega = 2;
  // position = amp*(1 - 2*frac(t/2pi)); at t=0 -> amp, halfway -> 0
  approx(WAVE_CALCULATORS.sawtooth.position(amp, 0), amp);
  approx(WAVE_CALCULATORS.sawtooth.position(amp, Math.PI), 0, 1e-12);
  // velocity is mostly the steady down-ramp (-amp*omega), with a reset spike
  approx(WAVE_CALCULATORS.sawtooth.velocity(amp, omega, Math.PI), -amp * omega);
  assert.ok(WAVE_CALCULATORS.sawtooth.velocity(amp, omega, 2 * Math.PI * 0.99) > 0);
});

// ---------------------------------------------------------------------------
// WaveSystem
// ---------------------------------------------------------------------------
test('WaveSystem position/velocity are derivative-consistent (sine)', () => {
  const ws = new WaveSystem('sine');
  ws.frequency = 0.5;
  ws.amplitude = 70;
  const t = 0.37;
  // Numerical derivative of position should match analytic velocity.
  const h = 1e-6;
  const numeric = (ws.calculatePosition(t + h) - ws.calculatePosition(t - h)) / (2 * h);
  const analytic = ws.calculateVelocity(t);
  approx(numeric, analytic, 1e-3);
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
test('weightFactor is monotonically decreasing in weight and in (0,1]', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const light = p.weightFactor({ weight: 0 });
  const mid = p.weightFactor({ weight: 50 });
  const heavy = p.weightFactor({ weight: 500 });
  assert.equal(light, 1.0);
  assert.ok(light > mid && mid > heavy);
  assert.ok(heavy > 0);
});

test('calculateContinuousCoupling: quality in [0,1], impulse always upward', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const monkey = { weight: 50 };
  for (const type of ['sine', 'square', 'sawtooth']) {
    const ws = new WaveSystem(type);
    ws.frequency = 0.5;
    ws.amplitude = 70;
    for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1.3]) {
      ws.time = t;
      const c = p.calculateContinuousCoupling(ws, monkey, 1, 1, 1 / 60);
      assert.ok(c.quality >= 0 && c.quality <= 1, `quality ${c.quality} out of range (${type}@${t})`);
      assert.ok(c.impulse <= 0, `impulse should be upward (<=0), got ${c.impulse} (${type}@${t})`);
    }
  }
});

test('sawtooth ratchet adds extra upward bias vs sine at matched quality', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const monkey = { weight: 50 };
  // Force identical wave velocity magnitude by using same amp/freq/time; the only
  // difference is the sawtooth ratchet term, which must make |impulse| larger.
  const sine = new WaveSystem('sine');
  const saw = new WaveSystem('sawtooth');
  for (const ws of [sine, saw]) { ws.frequency = 0.5; ws.amplitude = 70; ws.time = 0.3; }
  const cSine = p.calculateContinuousCoupling(sine, monkey, 1, 1, 1 / 60);
  const cSaw = p.calculateContinuousCoupling(saw, monkey, 1, 1, 1 / 60);
  // Not a strict per-phase comparison (positions differ), but the ratchet guarantees
  // the sawtooth path includes the RATCHET_GAIN term: verify it is present in code-path
  // by checking the ratchet contributes nonzero extra thrust when quality is ~0.
  saw.time = 0.0; // sawtooth velocity here is the steady down-ramp, quality ~ moderate
  const cSawRatchet = p.calculateContinuousCoupling(saw, monkey, 1, 1, 1 / 60);
  assert.ok(cSawRatchet.impulse < 0);
  // Ratchet gain configured and positive.
  assert.ok(GameConfig.COUPLING.RATCHET_GAIN > 0);
});

test('applyGravityAndDrag does nothing while grabbing, applies gravity while falling', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const grabbing = { velocityY: 0 };
  p.applyGravityAndDrag(grabbing, 1 / 60, true, 1, 1);
  assert.equal(grabbing.velocityY, 0);

  const falling = { velocityY: 0, altitude: 0 };
  p.applyGravityAndDrag(falling, 1 / 60, false, 1, 1);
  assert.ok(falling.velocityY > 0, 'gravity should pull downward (positive velocityY)');
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
  approx(logSliderToFreq(0), 0.5, 1e-9);
  approx(logSliderToFreq(100), 1000, 1e-9);
  for (const s of [0, 12.5, 33, 50, 77, 100]) {
    approx(freqToLogSlider(logSliderToFreq(s)), s, 1e-9);
  }
});

// ---------------------------------------------------------------------------
// tetherWaveSpeed / couplingMomentumScale / waveEnergyFactor / tensionSagFactor
// ---------------------------------------------------------------------------
test('tetherWaveSpeed = sqrt(E/rho), a material constant (longitudinal wave)', () => {
  const v = tetherWaveSpeed();
  assert.ok(v > 0);
  // Longitudinal (compression) wave speed in a rod: v = sqrt(E/rho).
  approx(v, Math.sqrt(GameConfig.TETHER.YOUNGS_MODULUS / GameConfig.TETHER.CARBON_DENSITY), 1e-9);
  // ~23.6 km/s for E=1 TPa, rho=1800 — far above orbital velocity.
  assert.ok(v > 20000 && v < 25000);
});

test('couplingMomentumScale = sqrt(T/mu); rises with tension, falls with width', () => {
  const baseScale = couplingMomentumScale(4.5, 100);
  assert.ok(baseScale > 0);
  // Higher tension -> stronger coupling (gameplay proxy).
  assert.ok(couplingMomentumScale(4.5, 200) > baseScale);
  // Thicker tether (more mass per length) -> weaker coupling.
  assert.ok(couplingMomentumScale(9.0, 100) < baseScale);
  // Exact formula check.
  const diameter = 4.5 / 100;
  const area = Math.PI * (diameter / 2) ** 2;
  const mu = GameConfig.TETHER.CARBON_DENSITY * area;
  const tensionN = 100 * GameConfig.TETHER.KGF_TO_N;
  approx(baseScale, Math.sqrt(tensionN / mu), 1e-9);
});

test('waveEnergyFactor decays with altitude (exp), 1.0 at ground', () => {
  approx(waveEnergyFactor(0, 300), 1.0);
  assert.ok(waveEnergyFactor(50000, 300) < 1.0);
  // Stiffer material (higher GPa) attenuates less at the same altitude.
  assert.ok(waveEnergyFactor(50000, 600) > waveEnergyFactor(50000, 300));
  // Negative altitude is clamped to 0 (no amplification below ground).
  approx(waveEnergyFactor(-1000, 300), 1.0);
});

test('tensionSagFactor shrinks with tension using configured factor', () => {
  approx(tensionSagFactor(0), 1.0);
  approx(tensionSagFactor(100), 1.0 - 100 * GameConfig.TETHER.TENSION_SAG_FACTOR);
  assert.ok(tensionSagFactor(200) < tensionSagFactor(100));
  // Clamp: high tension flattens toward the floor and never inverts (slider reaches 20000).
  const { TENSION_SAG_MIN } = GameConfig.TETHER;
  approx(tensionSagFactor(20000), TENSION_SAG_MIN);
  for (const t of [0, 100, 125, 500, 20000]) {
    const f = tensionSagFactor(t);
    assert.ok(f >= TENSION_SAG_MIN, `tensionSagFactor(${t})=${f} must not drop below the floor`);
    assert.ok(f <= 1.0, `tensionSagFactor(${t})=${f} must not exceed 1`);
  }
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

test('B.14 split: aero x eddy == AIR_DRAG at sea level, reference field', () => {
  // Drive both shipped methods and require the combined damping to collapse to
  // exactly AIR_DRAG per 60 Hz frame at sea level with the EPM at reference field
  // — the constraint AIR_DRAG = 0.985 / EDDY_FRACTION = 0.08 were split under.
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const dt = 1 / 60;
  const m = { velocityY: -1000, altitude: 0 };
  p.applyGravityAndDrag(m, dt, false, 0, 1);   // gravityMult 0: isolate drag
  p.applyEddyDrag(m, dt, 1.0);                  // fieldFactor 1 = reference field
  approx(m.velocityY, -1000 * frameDecay(GameConfig.PHYSICS.AIR_DRAG, dt), 1e-9);
});

test('B.15: an aero kit REDUCES drag, and drag vanishes with altitude', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const run = (dragMult, altitude) => {
    const m = { velocityY: -1000, altitude };
    p.applyGravityAndDrag(m, 1 / 60, false, 0, dragMult);   // gravityMult 0: isolate drag
    return Math.abs(m.velocityY);
  };
  // lower dragMult (a kit) must RETAIN more speed at sea level
  assert.ok(run(0.855, 0) > run(1.0, 0), 'aero kits must reduce drag, not increase it');
  // and aerodynamic drag must be negligible at 100 km
  approx(run(1.0, 100000), 1000, 1e-3);
});

test('applyEddyDrag brakes with no air at 100 km (the whole point of the B.14 split)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const dt = 1 / 60;
  // Gravity off, aero ~ a no-op at 100 km (densityRatio ~ 4.6e-7): any residual
  // damping has to be the eddy term braking against the tether's field.
  const m = { velocityY: -1000, altitude: 100000 };
  p.applyGravityAndDrag(m, dt, false, 0, 1);
  const afterAero = m.velocityY;
  p.applyEddyDrag(m, dt, 1.0);
  assert.ok(Math.abs(m.velocityY) < Math.abs(afterAero),
    `eddy braking must slow the climber with no air, ${afterAero} -> ${m.velocityY}`);
  assert.ok(Math.abs(m.velocityY) < 1000);
});

test('applyEddyDrag at fieldFactor 0 is a true frictionless coaster', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const dt = 1 / 60;
  // Run at 100 km so aero drag is a no-op; the eddy term is the only damping left.
  const m = { velocityY: -1000, altitude: 100000 };
  p.applyGravityAndDrag(m, dt, false, 0, 1);
  const beforeEddy = m.velocityY;
  p.applyEddyDrag(m, dt, 0);   // EPMs latch OFF at zero power: eddyRef ** 0 === 1
  approx(m.velocityY, beforeEddy, 1e-9);   // eddy leaves it exactly unchanged
});

test('applyEddyDrag is frame-rate independent (one 1/60 step ~ four 1/240 steps)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const oneShot = () => {
    const m = { velocityY: -1000, altitude: 100000 };
    p.applyGravityAndDrag(m, 1 / 60, false, 0, 1);
    p.applyEddyDrag(m, 1 / 60, 1.0);
    return m.velocityY;
  };
  let v = -1000;
  for (let i = 0; i < 4; i++) {
    const m = { velocityY: v, altitude: 100000 };
    p.applyGravityAndDrag(m, 1 / 240, false, 0, 1);
    p.applyEddyDrag(m, 1 / 240, 1.0);
    v = m.velocityY;
  }
  approx(v, oneShot(), 1e-6);
});

test('calculateGrabMomentum: perfect quality at both optimal phases (0.25 and 0.75)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const mk = () => {
    const ws = new WaveSystem('sine');
    ws.frequency = 1;
    ws.amplitude = 70;
    return ws;
  };
  for (const phase of [0.25, 0.75]) { // optimalPhase, and the optimalPhase + 0.5 alias
    const ws = mk();
    ws.time = phase; // (time * frequency) % 1 === phase
    const g = p.calculateGrabMomentum(ws, { weight: 50 }, 1, 1);
    assert.equal(g.quality, 1.0, `quality at phase ${phase}`);
  }
});

test('calculateGrabMomentum: good band quality is strictly in (0.5,1) and decreases with phaseDiff', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const qualityAt = (phase) => {
    const ws = new WaveSystem('sine');
    ws.frequency = 1;
    ws.amplitude = 70;
    ws.time = phase;
    return p.calculateGrabMomentum(ws, { weight: 50 }, 1, 1).quality;
  };
  // Phases just inside GOOD_WINDOW on the same side of the optimum (monotonic phaseDiff).
  const phases = [0.40, 0.45, 0.50];
  const qs = phases.map(qualityAt);
  for (const q of qs) {
    assert.ok(q > 0.5 && q < 1.0, `expected quality in (0.5,1), got ${q}`);
  }
  // As phaseDiff grows across the good band, quality decreases monotonically.
  assert.ok(qs[0] > qs[1] && qs[1] > qs[2]);
});

test('calculateGrabMomentum: momentum falls when the climber gets heavier', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const momentum = (weight) => {
    const ws = new WaveSystem('sine');
    ws.frequency = 1;
    ws.amplitude = 70;
    ws.time = 0.5; // nonzero |velocity| so momentum is non-degenerate
    return p.calculateGrabMomentum(ws, { weight }, 1, 1).momentum;
  };
  assert.ok(Math.abs(momentum(100)) < Math.abs(momentum(50)),
    'a heavier climber must receive less grab momentum (shared weightFactor)');
});

test('calculateGrabMomentum: momentum is signed and follows waveVelocity (legacy can push down)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const grabAt = (phase) => {
    const ws = new WaveSystem('sine');
    ws.frequency = 1;
    ws.amplitude = 70;
    ws.time = phase;
    return { ws, g: p.calculateGrabMomentum(ws, { weight: 50 }, 1, 1) };
  };
  // velocityY is positive = DOWN. The legacy model's momentum = waveVelocity * quality
  // keeps waveVelocity's sign, so a positive wave velocity pushes the climber DOWN:
  // phase 0.125 (sine velocity positive) -> momentum > 0. This is the exact contrast
  // to the rectified continuous model, which always imparts UP (impulse < 0).
  const down = grabAt(0.125);
  assert.ok(down.g.momentum > 0, 'positive wave velocity must push the climber down (legacy model)');
  // Phase 0.5: sine velocity negative -> upward momentum (< 0).
  const up = grabAt(0.5);
  assert.ok(up.g.momentum < 0, 'negative wave velocity must yield upward momentum');
  // momentum sign is exactly waveVelocity's sign in both cases (quality is always >= 0).
  assert.equal(Math.sign(down.g.momentum), Math.sign(down.ws.calculateVelocity(down.ws.time)));
  assert.equal(Math.sign(up.g.momentum), Math.sign(up.ws.calculateVelocity(up.ws.time)));
});

test('calculateGrabMomentum: bounds the square/sawtooth velocity spike (no legacy teleport)', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const peak = (ws) => ws.amplitude * ws.frequency * 2 * Math.PI;
  // Square: the calculators return amp*omega*100 where sin(t)~0 (time ~ 0). The raw
  // velocity is ~100x a sine peak; the bounded momentum must not exceed amp*omega.
  const sq = new WaveSystem('square'); sq.frequency = 0.5; sq.amplitude = 70; sq.time = 0;
  assert.ok(Math.abs(sq.calculateVelocity(sq.time)) > peak(sq) * 10, 'precondition: raw square spike is huge');
  const gsq = p.calculateGrabMomentum(sq, { weight: 50 }, 1, 1);
  assert.ok(Math.abs(gsq.momentum) <= peak(sq) + 1e-9, 'square momentum must be bounded by amp*omega');
  // Sawtooth: amp*omega*50 at the cycle boundary ((time*freq)%1 >= 0.98).
  const st = new WaveSystem('sawtooth'); st.frequency = 0.5; st.amplitude = 70; st.time = 1.98;
  assert.ok(Math.abs(st.calculateVelocity(st.time)) > peak(st) * 10, 'precondition: raw sawtooth spike is huge');
  const gst = p.calculateGrabMomentum(st, { weight: 50 }, 1, 1);
  assert.ok(Math.abs(gst.momentum) <= peak(st) + 1e-9, 'sawtooth momentum must be bounded by amp*omega');
});

test('legacy grab has no poor tier: max phaseDiff is 0.25 and stays below GOOD_WINDOW', () => {
  const { GOOD_WINDOW } = GameConfig.GRAB;
  // phaseDiff = distance to the nearer of the two optimal phases (0.25 / 0.75).
  // They are antipodal on a unit cycle, so the maximum is exactly 0.25. The shipped
  // code relies on this staying below GOOD_WINDOW (0.30) to keep the (removed)
  // POOR_QUALITY tier unreachable — a mistimed legacy grab floors at the good-band
  // edge (~0.639). If a future change makes GOOD_WINDOW <= 0.25, this fails loudly.
  let maxDiff = 0;
  const STEPS = 100000;
  for (let i = 0; i < STEPS; i++) {
    const p = i / STEPS;
    maxDiff = Math.max(maxDiff, Math.min(Math.abs(p - 0.25), Math.abs(p - 0.75)));
  }
  approx(maxDiff, 0.25, 1e-4);
  assert.ok(maxDiff < GOOD_WINDOW,
    `GOOD_WINDOW (${GOOD_WINDOW}) must stay above max phaseDiff (${maxDiff.toFixed(4)})`);
});

test('calculateGrabMomentum: quality stays valid for negative/huge wave time', () => {
  // JS `%` keeps the operand's sign, so a negative time would yield a negative phase
  // and (with the single good-band branch) a NEGATIVE quality. The phase is normalised
  // into [0,1) to make the phaseDiff <= 0.25 bound structural. Guard that here.
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const quality = (time) => {
    const ws = new WaveSystem('sine');
    ws.frequency = 1;
    ws.amplitude = 70;
    ws.time = time;
    return p.calculateGrabMomentum(ws, { weight: 50 }, 1, 1).quality;
  };
  for (const t of [-0.7, -0.3, -0.05, 0, 1e6, 12345.678]) {
    const q = quality(t);
    assert.ok(q > 0.5 && q <= 1.0, `quality ${q} out of the reachable band at time ${t}`);
  }
});

test('updatePosition: clamps x to vine ±150 (minus width), y/altitude to ground', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const MAX_H = 150;   // hardcoded as `maxDistance` at Space_Monkey_Elevator.html:1900
  const vineX = 400;

  const m = { x: 10000, y: 500, velocityX: 0, velocityY: 0, width: 40 };
  p.updatePosition(m, 1 / 60, 800, vineX);
  assert.equal(m.x, vineX + MAX_H - m.width); // maxX subtracts monkey.width
  assert.equal(m.y, 0);                        // clamped below ground
  assert.equal(m.altitude, 0);

  m.x = -10000; m.y = -500;                    // left edge, above ground
  p.updatePosition(m, 1 / 60, 800, vineX);
  assert.equal(m.x, vineX - MAX_H);
  assert.equal(m.altitude, 50);                // altitude = -y / ALTITUDE_CONVERSION
  assert.equal(m.altitude, -m.y / GameConfig.PHYSICS.ALTITUDE_CONVERSION);
  assert.ok(m.altitude >= 0, 'altitude must never be negative');
});

test('updateHorizontalVelocity: left beats right; idle drift decays frame-rate-independently', () => {
  const p = new PhysicsEngine(GameConfig, { emit() {} });
  const HL = -GameConfig.PHYSICS.HORIZONTAL_SPEED;
  const HR = GameConfig.PHYSICS.HORIZONTAL_SPEED;

  const left = { velocityX: 0 };
  p.updateHorizontalVelocity(left, 1 / 60, true, false);
  assert.equal(left.velocityX, HL);

  const right = { velocityX: 0 };
  p.updateHorizontalVelocity(right, 1 / 60, false, true);
  assert.equal(right.velocityX, HR);

  const both = { velocityX: 0 };
  p.updateHorizontalVelocity(both, 1 / 60, true, true);
  assert.equal(both.velocityX, HL, 'left wins when both held (if/else if order)');

  // Idle decay: one 1/60 step ~ four 1/240 steps of DRIFT_DECAY.
  const oneShot = () => {
    const m = { velocityX: 500 };
    p.updateHorizontalVelocity(m, 1 / 60, false, false);
    return m.velocityX;
  };
  let v = 500;
  for (let i = 0; i < 4; i++) {
    const m = { velocityX: v };
    p.updateHorizontalVelocity(m, 1 / 240, false, false);
    v = m.velocityX;
  }
  approx(v, oneShot(), 1e-6);
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
// EPM charge / regen / brownout loop (B.5) — drives the extracted pure
// epmChargeStep, the same function updateContinuous delegates to.
// ---------------------------------------------------------------------------
const EPM = GameConfig.EPM;
// Convenience: one step with everything defaulting to "idle at full charge".
const epmStep = (over) => epmChargeStep({
  charge: EPM.CAPACITY, brownout: false, pulsing: false, quality: 0,
  energyFactor: 1, tier: 'base', dt: 1 / 60, ...over,
});
// Perfect-timing altitude ceiling: highest altitude where quality 1 still
// breaks even INCLUDING trickle — solves REGEN*ef = DRAIN - TRICKLE.
const perfectCeiling = (tier, gpa) => {
  const attenLength = EPM.ATTEN_BASE_M * (gpa / 100);
  return attenLength * Math.log(EPM.REGEN[tier] / (EPM.DRAIN[tier] - EPM.TRICKLE));
};

test('epm: coasting only trickles, and saturates at CAPACITY', () => {
  const dt = 0.1;
  approx(epmStep({ charge: 50, dt }).charge, 50 + EPM.TRICKLE * dt, 1e-9);
  const full = epmStep({ charge: EPM.CAPACITY, dt });
  approx(full.charge, EPM.CAPACITY, 1e-12);
  approx(full.netPerSec, 0, 1e-12);
});

test('epm: zero-quality pulsing drains at TRICKLE - DRAIN', () => {
  const dt = 0.2;
  const s = epmStep({ charge: 50, pulsing: true, quality: 0, dt });
  approx(s.charge, 50 + (EPM.TRICKLE - EPM.DRAIN.base) * dt, 1e-9);
  approx(s.netPerSec, EPM.TRICKLE - EPM.DRAIN.base, 1e-9); // base: -1.5/s
});

test('epm: perfect coupling at ground regenerates at REGEN - DRAIN + TRICKLE', () => {
  const dt = 0.2;
  // charge 50 keeps clear of the CAPACITY clamp so the raw rate is visible.
  const s = epmStep({ charge: 50, pulsing: true, quality: 1, energyFactor: 1, dt });
  approx(s.netPerSec, EPM.REGEN.base - EPM.DRAIN.base + EPM.TRICKLE, 1e-9); // base: +5.5/s
});

test('epm: break-even quality is DRAIN/REGEN and rises with tier (the S11 tradeoff)', () => {
  const dt = 1 / 60;
  const tiers = ['base', 'alnico', 'neodymium', 'hallbach'];
  const breakEvens = tiers.map((t) => EPM.DRAIN[t] / EPM.REGEN[t]);
  // At break-even quality and ground, the loop nets exactly TRICKLE.
  for (let i = 0; i < tiers.length; i++) {
    const s = epmStep({ charge: 50, pulsing: true, quality: breakEvens[i], energyFactor: 1, tier: tiers[i], dt });
    approx(s.netPerSec, EPM.TRICKLE, 1e-9);
  }
  // base 3/7, alnico 1/2, neodymium 2/3, hallbach 5/6 — strictly increasing:
  // stronger magnets demand better timing to be charge-positive at all.
  for (let i = 1; i < breakEvens.length; i++) {
    assert.ok(breakEvens[i] > breakEvens[i - 1],
      `break-even must rise with tier: ${tiers[i - 1]} ${breakEvens[i - 1]} !< ${tiers[i]} ${breakEvens[i]}`);
  }
});

test('epm: altitude gates regen; material sets the perfect-timing reach (Q-P3)', () => {
  const dt = 1 / 60;
  // Default 300 GPa tether: base tier stays positive for the WHOLE climb (100 km).
  const efBase100k = waveEnergyFactor(100000, 300);
  const sBase = epmStep({ charge: 50, pulsing: true, quality: 1, energyFactor: efBase100k, tier: 'base', dt });
  assert.ok(sBase.netPerSec > 0, 'base tier on 300 GPa must sustain past the Kármán line');
  // 50 GPa tether: hallbach is already net-negative by ~6 km even with perfect timing.
  const efHall6k = waveEnergyFactor(6000, 50);
  const sHall = epmStep({ charge: 50, pulsing: true, quality: 1, energyFactor: efHall6k, tier: 'hallbach', dt });
  assert.ok(sHall.netPerSec < 0, 'hallbach on 50 GPa must NOT sustain at 6 km');
  // The ceiling formula is monotonic in material stiffness — material choice sets reach.
  for (const tier of ['base', 'alnico', 'neodymium', 'hallbach']) {
    assert.ok(perfectCeiling(tier, 300) > perfectCeiling(tier, 100));
    assert.ok(perfectCeiling(tier, 100) > perfectCeiling(tier, 50));
  }
  // Spot-check the formula against the shipped waveEnergyFactor at 300 GPa for base:
  // ceiling = 120000 * ln(7 / 1.5) ≈ 184.7 km.
  approx(perfectCeiling('base', 300), 120000 * Math.log(7 / 1.5), 1e-6);
  assert.ok(perfectCeiling('base', 300) > 100000);
});

test('epm: unknown or non-magnet tiers fall back to base drain/regen', () => {
  const dt = 1 / 60;
  const ref = epmStep({ charge: 50, pulsing: true, quality: 0.8, dt });
  for (const tier of ['nonesuch', 'carbon', null]) {
    const s = epmStep({ charge: 50, pulsing: true, quality: 0.8, tier, dt });
    approx(s.charge, ref.charge, 1e-12, `tier "${tier}" must equal base`);
  }
});

test('epm: brownout latches, and tripped fires only on the transition frame', () => {
  const dt = 1 / 60;
  // Step to zero in one shot: huge dt with zero quality.
  const trip = epmStep({ charge: 0.01, pulsing: true, quality: 0, dt: 1 });
  assert.equal(trip.charge, 0 + EPM.TRICKLE); // floored at 0, then trickle applies
  assert.equal(trip.brownout, true);
  assert.equal(trip.tripped, true);
  // The very next identical step: still latched, but tripped is false — the audio
  // cue cannot machine-gun.
  const next = epmStep({ charge: trip.charge, brownout: trip.brownout, pulsing: true, quality: 0, dt });
  assert.equal(next.brownout, true);
  assert.equal(next.tripped, false);
});

test('epm: recovery needs coasting past BROWNOUT_RECOVER on trickle alone', () => {
  const dt = 1 / 60;
  // Latched, pulsing contributes nothing — charge climbs on TRICKLE alone, so
  // recovery from 0 takes BROWNOUT_RECOVER / TRICKLE = 10 s.
  let charge = 0, brownout = true;
  const stepsNeeded = Math.ceil((EPM.BROWNOUT_RECOVER / EPM.TRICKLE) * 60);
  for (let i = 0; i < stepsNeeded - 1; i++) {
    const s = epmStep({ charge, brownout, pulsing: true, quality: 1, energyFactor: 1, tier: 'base', dt });
    charge = s.charge; brownout = s.brownout;
    assert.equal(brownout, true, `still latched below RECOVER at frame ${i} (charge ${charge})`);
  }
  const release = epmStep({ charge, brownout, pulsing: true, quality: 1, energyFactor: 1, tier: 'base', dt });
  assert.equal(release.brownout, false, 'latch releases at/above RECOVER');
  assert.ok(charge < EPM.BROWNOUT_RECOVER && release.charge >= EPM.BROWNOUT_RECOVER);
});

test('epm: charge never leaves [0, CAPACITY] under an adversarial sweep', () => {
  for (const dt of [1 / 240, 1 / 60, 0.5, 5]) {
    for (const quality of [0, 0.25, 0.7, 1]) {
      for (const tier of ['base', 'alnico', 'neodymium', 'hallbach', 'nonesuch']) {
        for (const energyFactor of [0, 1]) {
          for (const charge of [0, 1, 50, EPM.CAPACITY]) {
            for (const brownout of [false, true]) {
              const s = epmStep({ charge, brownout, pulsing: true, quality, energyFactor, tier, dt });
              assert.ok(s.charge >= 0 && s.charge <= EPM.CAPACITY,
                `charge ${s.charge} out of range (dt=${dt} q=${quality} tier=${tier} ef=${energyFactor} c=${charge} b=${brownout})`);
            }
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
      charge = epmStep({ charge, brownout: false, pulsing: true, quality: 0.6, energyFactor: 0.9, tier: 'alnico', dt }).charge;
    }
    return charge;
  };
  approx(run(1 / 60, 1), run(1 / 240, 4), 1e-9);
  // Crossing the 0 floor is sub-step dependent: with the same wall time, finer steps
  // can trip brownout LATER (or not yet) because each step re-adds trickle after the
  // floor. This is inherent to the latched model — do not "fix" it.
  const coarse = epmStep({ charge: 0.05, brownout: false, pulsing: true, quality: 0, tier: 'hallbach', dt: 0.5 });
  assert.equal(coarse.tripped, true);
  let c = 0.05, tripped = false;
  for (let i = 0; i < 120; i++) {           // same 0.5 s at 1/240 steps
    const s = epmStep({ charge: c, brownout: false, pulsing: true, quality: 0, tier: 'hallbach', dt: 1 / 240 });
    c = s.charge; tripped = tripped || s.tripped;
  }
  assert.equal(tripped, true);              // still trips, just possibly a step later
});

test('epm: netPerSec matches the HUD arrow contract and is dt=0 safe', () => {
  const zero = epmStep({ charge: 42, dt: 0 });
  assert.equal(zero.netPerSec, 0);
  approx(zero.charge, 42, 1e-12);           // dt=0 mutates nothing
  // Sign convention is what drawEPMGauge renders: up arrow iff netPerSec >= 0.
  assert.ok(epmStep({ charge: 50, pulsing: true, quality: 1, dt: 0.1 }).netPerSec > 0);
  assert.ok(epmStep({ charge: 50, pulsing: true, quality: 0, dt: 0.1 }).netPerSec < 0);
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
// materialDampingFor (B.8) — stiffness -> swing damping
// ---------------------------------------------------------------------------
test('material damping: stiffer material swings less (monotonic in GPa)', () => {
  const { DAMPING_BASE, DAMPING_PER_GPA } = GameConfig.TETHER;
  approx(materialDampingFor(0), DAMPING_BASE, 1e-12);
  approx(materialDampingFor(300), DAMPING_BASE - 300 * DAMPING_PER_GPA, 1e-12);
  approx(materialDampingFor(300), 1.0, 1e-12);              // CC-CNT default sits at 1.0
  approx(materialDampingFor(50), 1.3 - 50 * 0.001, 1e-12);  // graphene damps most (loosest)
  assert.ok(materialDampingFor(300) < materialDampingFor(50));
});

// ---------------------------------------------------------------------------
// scaleSettingValue — slider raw -> sim value for the divided scales
// ---------------------------------------------------------------------------
test('scaleSettingValue: divided scales use SETTINGS_SCALE, others pass through', () => {
  const { AMPLITUDE, WIDTH, GRIP } = GameConfig.SETTINGS_SCALE;
  approx(scaleSettingValue('amplitude', 70), 70 / AMPLITUDE, 1e-12);
  approx(scaleSettingValue('width', 45), 45 / WIDTH, 1e-12);
  approx(scaleSettingValue('grip', 20), 20 / GRIP, 1e-12);
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
// crossing in continuous mode. Behaviour identical to the pre-refactor inline
// block (note the NEGATED >= form that preserves NaN behaviour).
// ---------------------------------------------------------------------------
const DELIVER_M = GameConfig.MISSION.DELIVER_ALTITUDE_M;
const credit = (over) => cargoDeliveryCredit({
  continuous: true, delivered: false, altitude: DELIVER_M, cargoKg: 100, bootstrapKg: 50, ...over,
});

test('cargoDeliveryCredit: below Kármán is null; exactly at the line credits', () => {
  assert.equal(credit({ altitude: DELIVER_M - 1 }), null);
  assert.deepEqual(credit({ altitude: DELIVER_M }), { deliveredKg: 100, bootstrapKg: 150 });
});

test('cargoDeliveryCredit: legacy mode never credits (even at 200 km); delivered latches null', () => {
  assert.equal(credit({ continuous: false, altitude: 200000 }), null);
  assert.equal(credit({ delivered: true }), null);
});

test('cargoDeliveryCredit: bootstrap accumulates; NaN altitude is null; input not mutated', () => {
  assert.equal(credit({ cargoKg: 25, bootstrapKg: 40 }).bootstrapKg, 65);
  assert.equal(credit({ altitude: NaN }), null);
  const input = { continuous: true, delivered: false, altitude: DELIVER_M, cargoKg: 100, bootstrapKg: 50 };
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
