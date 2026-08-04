// Zero-dependency extractor for the single inline <script> in the source HTML.
//
// The whole game lives in one <script> block in Space_Monkey_Elevator.html. To unit
// test the *pure* logic (no DOM, no WebGL, no audio) we:
//   1. read the source HTML,
//   2. slice out the body of the single largest <script> block,
//   3. append a `return { ... }` exposing the top-level pure symbols,
//   4. wrap it in `new Function(...)` and invoke it with no-op / in-memory stubs.
//
// The bottom `window.addEventListener('load', ...)` only *registers* a handler under
// the stub (which never fires), so no game ever boots during extraction.
//
// This file intentionally has no dependencies beyond Node built-ins.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_HTML = join(__dirname, '..', 'Space_Monkey_Elevator.html');

// Pure / top-level symbols safe to expose for testing. Everything here is either a
// pure function, a config holder, or a DOM-free class.
const EXPORTED_SYMBOLS = [
  'GameConfig',
  'WAVE_CALCULATORS',
  'WaveSystem',
  'PhysicsEngine',
  'Camera',
  'ALTIMETER_LANDMARKS',
  'logSliderToFreq',
  'freqToLogSlider',
  'frameDecay',
  'tetherWaveSpeed',
  'couplingMomentumScale',
  'waveEnergyFactor',
  'tensionSagFactor',
  'safePersistedNumber',
  'missionScore',
  'bootstrapPct',
  'densityRatio',
  'temperatureAtAltitude',
  'thermalSuitIndex',
  'coldGripFactor',
  'altimeterLandmarkAt',
  'epmChargeStep',
];

// Pull out the body of the single largest <script> block.
function extractScriptBody(html) {
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let largest = '';
  while ((match = re.exec(html)) !== null) {
    if (match[1].length > largest.length) largest = match[1];
  }
  if (!largest) throw new Error('extract.mjs: no <script> block found in source HTML');
  return largest;
}

// In-memory localStorage stub.
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

// Minimal no-op DOM/window stubs. getElementById returns null so all DOM wiring
// is skipped; addEventListener is a no-op so the load handler never fires.
function makeStubs() {
  const noop = () => {};
  const localStorage = makeLocalStorage();
  const documentStub = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      getContext: () => null,
      style: {},
      setAttribute: noop,
      appendChild: noop,
      addEventListener: noop,
      querySelector: () => null,
    }),
    addEventListener: noop,
    body: { appendChild: noop, classList: { add: noop, remove: noop } },
  };
  const windowStub = {
    addEventListener: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280,
    innerHeight: 800,
    requestAnimationFrame: noop,
    localStorage,
    navigator: { maxTouchPoints: 0 },
  };
  return {
    window: windowStub,
    document: documentStub,
    localStorage,
    performance: { now: () => 0 },
    requestAnimationFrame: noop,
    navigator: windowStub.navigator,
    console,
    setTimeout: noop,
    clearTimeout: noop,
    AudioContext: function () { return { createOscillator: () => ({}), createGain: () => ({}) }; },
  };
}

let _cached = null;

// Load and evaluate the pure surface of the game once, returning the exposed symbols.
export function loadGameModule() {
  if (_cached) return _cached;
  const html = readFileSync(SOURCE_HTML, 'utf8');
  const body = extractScriptBody(html);
  const returnStmt = `;return { ${EXPORTED_SYMBOLS.join(', ')} };`;
  const stubs = makeStubs();
  const argNames = Object.keys(stubs);
  const argValues = Object.values(stubs);

  let factory;
  try {
    factory = new Function(...argNames, body + returnStmt);
  } catch (err) {
    throw new Error('extract.mjs: failed to parse extracted script body: ' + err.message);
  }
  const exported = factory(...argValues);

  // Sanity: confirm the script actually parsed and the core symbols exist.
  for (const name of ['GameConfig', 'WAVE_CALCULATORS', 'WaveSystem', 'PhysicsEngine']) {
    if (exported[name] === undefined) {
      throw new Error(`extract.mjs: expected symbol "${name}" was not exported (extraction likely broke)`);
    }
  }
  _cached = exported;
  return exported;
}
