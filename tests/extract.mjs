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
  'milestoneMarkerAt',
  'shouldTriggerGameOver',
  'materialDampingFor',
  'scaleSettingValue',
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

// The delimited pure-helpers block markers in the source HTML. Everything between
// them is expected to be a top-level pure function that the harness can export.
const PURE_BLOCK_START = '===== PURE SIM HELPERS';
const PURE_BLOCK_END = '===== END PURE SIM HELPERS';

// Scan the delimited pure-helpers block for `function <name>(` declarations and
// return the declared names. Lets a test fail loudly when a helper is added to the
// block but forgotten in EXPORTED_SYMBOLS (the three-edit ritual, DEVELOPERS.md).
export function declaredPureHelpers() {
  const html = readFileSync(SOURCE_HTML, 'utf8');
  const start = html.indexOf(PURE_BLOCK_START);
  const end = html.indexOf(PURE_BLOCK_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('extract.mjs: pure-helpers block markers not found in source HTML');
  }
  const block = html.slice(start, end);
  const names = [];
  const re = /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(block)) !== null) names.push(m[1]);
  return names;
}

// The exported list, exposed so a test can diff it against declaredPureHelpers().
export function exportedSymbols() {
  return EXPORTED_SYMBOLS.slice();
}

// Scrape the settings sliders out of the source HTML (shift 7, task 1). SpaceMonkeyGame
// cannot be instantiated in tests (no DOM), so this reads, per slider id: the static
// <input> value/min/max/step, the static <span id="...Value"> label text, and the matching
// entry from initGame()'s sliderDefaults object literal. A test diffs these for internal
// consistency and asserts that scaleSettingValue()/logSliderToFreq() map the raw default
// back onto the simulation default, so the next drifted default fails loudly.
export function sliderDefaults() {
  const html = readFileSync(SOURCE_HTML, 'utf8');
  const ids = ['frequency', 'amplitude', 'width', 'tension', 'grip', 'gravity', 'weight'];
  const out = {};
  for (const id of ids) {
    const inputMatch = html.match(new RegExp(`<input type="range" id="${id}"([^>]*)>`));
    const attrs = {};
    if (inputMatch) {
      const attrRe = /([\w-]+)="([^"]*)"/g;
      let m;
      while ((m = attrRe.exec(inputMatch[1])) !== null) attrs[m[1]] = m[2];
    }
    const labelMatch = html.match(new RegExp(`<span id="${id}Value">([^<]*)</span>`));
    const initMatch = html.match(new RegExp(`${id}:\\s*\\{\\s*value:\\s*([^,]+),\\s*label:\\s*'([^']*)'`));
    out[id] = {
      inputValue: attrs.value,
      min: attrs.min,
      max: attrs.max,
      step: attrs.step,
      staticLabel: labelMatch ? labelMatch[1] : null,
      initValue: initMatch ? Number(initMatch[1]) : null,
      initLabel: initMatch ? initMatch[2] : null,
    };
  }
  return out;
}
