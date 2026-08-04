// Regression test (shift 7, task 1): the Weight slider must default to 50 kg in every
// representation — the static <input value>, the static label span and initGame()'s
// sliderDefaults reset entry — and scaleSettingValue()/logSliderToFreq() must map each
// raw default back to the simulation default. SpaceMonkeyGame cannot be instantiated in
// tests (no DOM), so this scrapes the source HTML instead of reading live game state.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGameModule, sliderDefaults } from './extract.mjs';

const game = loadGameModule();
const { GameConfig, scaleSettingValue, logSliderToFreq } = game;

test('slider defaults agree across the static input, label span and initGame reset', () => {
  const defs = sliderDefaults();
  for (const id of Object.keys(defs)) {
    const d = defs[id];
    // <input value> numeric == initGame reset value
    assert.equal(parseFloat(d.inputValue), d.initValue, `${id}: input value vs initGame reset`);
    // static label span text == initGame reset label
    assert.equal(d.staticLabel, d.initLabel, `${id}: label span vs initGame reset`);
    // default sits within [min,max]
    const min = parseFloat(d.min), max = parseFloat(d.max), step = parseFloat(d.step);
    assert.ok(d.initValue >= min && d.initValue <= max, `${id}: default within min/max`);
    // ...and is selectable on the step grid. NOTE: width's default (45 mm) is NOT on
    // its 10 mm step grid (10,20,...,40,50...) — a pre-existing quirk, out of scope this
    // shift (fixing it would change the tuned 4.5-width default). Assert the strict
    // boundary for the other six, which are all on-grid.
    if (id !== 'width') {
      const offStep = (d.initValue - min) / step;
      assert.ok(Math.abs(offStep - Math.round(offStep)) < 1e-9, `${id}: default on a step boundary`);
    }
  }
});

test('weight slider default maps to GameConfig.MONKEY.WEIGHT', () => {
  const d = sliderDefaults().weight;
  assert.equal(scaleSettingValue('weight', parseFloat(d.inputValue)), GameConfig.MONKEY.WEIGHT);
  assert.equal(GameConfig.MONKEY.WEIGHT, 50, 'the config default the UI must match');
});

test('amplitude/frequency slider defaults map to the wave config', () => {
  const a = sliderDefaults().amplitude;
  assert.equal(scaleSettingValue('amplitude', parseFloat(a.inputValue)), GameConfig.WAVE.DEFAULT_AMPLITUDE);
  const f = sliderDefaults().frequency;
  // frequency bypasses scaleSettingValue (log scale) and maps through logSliderToFreq
  assert.equal(logSliderToFreq(parseFloat(f.inputValue)), GameConfig.WAVE.DEFAULT_FREQUENCY);
});

test('width/tension/grip/gravity slider defaults map to their plain class fields', () => {
  // These four have no GameConfig entry yet; they are plain class fields read by
  // updateDerivedReadouts/updateContinuous. Follow-up opportunity: move them into
  // GameConfig so this assert can be compared against the config (out of scope this shift).
  const width = sliderDefaults().width;
  assert.equal(scaleSettingValue('width', parseFloat(width.inputValue)), 4.5);
  const tension = sliderDefaults().tension;
  assert.equal(scaleSettingValue('tension', parseFloat(tension.inputValue)), 100);
  const grip = sliderDefaults().grip;
  assert.equal(scaleSettingValue('grip', parseFloat(grip.inputValue)), 1.0);
  const gravity = sliderDefaults().gravity;
  assert.equal(scaleSettingValue('gravity', parseFloat(gravity.inputValue)), 1.0);
});
