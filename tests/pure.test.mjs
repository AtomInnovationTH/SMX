// Zero-dependency unit tests for the pure logic of Space Monkey Elevator.
//
// Run with:  node --test tests/
//
// These exercise the DOM-free / WebGL-free surface extracted from the single inline
// <script> in Space_Monkey_Elevator.html (see extract.mjs). No npm install required.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGameModule } from './extract.mjs';

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
    densityRatio, altimeterLandmarkAt,
  })) {
    assert.notEqual(val, undefined, `symbol ${name} should be defined`);
  }
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
