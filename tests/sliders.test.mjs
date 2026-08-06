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
    // ...and is selectable on the step grid — for EVERY slider, with no exemptions.
    // width used to be exempt: its 45 mm default sat off a 10 mm grid, so the shipped
    // default was a value the player could never dial back in. Fixed by refining width's
    // step to 5 mm rather than moving the default, because 45 mm is the paper's ribbon
    // width (45 mm x 0.2 mm = 9 mm^2) and moving it would have been a balance change.
    const offStep = (d.initValue - min) / step;
    assert.ok(Math.abs(offStep - Math.round(offStep)) < 1e-9,
      `${id}: default ${d.initValue} is not on the step grid (min ${min}, step ${step})`);
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

test('width/tension/gravity slider defaults map to their plain class fields', () => {
  // These three have no GameConfig entry yet; they are plain class fields read by
  // updateDerivedReadouts/updateContinuous. Follow-up opportunity: move them into
  // GameConfig so this assert can be compared against the config (out of scope this shift).
  const width = sliderDefaults().width;
  assert.equal(scaleSettingValue('width', parseFloat(width.inputValue)), 4.5);
  const tension = sliderDefaults().tension;
  assert.equal(scaleSettingValue('tension', parseFloat(tension.inputValue)), 100);
  const gravity = sliderDefaults().gravity;
  assert.equal(scaleSettingValue('gravity', parseFloat(gravity.inputValue)), 1.0);
});

test('air-gap slider is real millimetres (M2.4 — the grip multiplier is gone)', () => {
  // The grip slider's "field strength" was an un-physical free multiplier; M1.5's
  // interim relabel as x1.00 is superseded by the REAL control: the FG40 working
  // air gap. Raw value IS the gap in mm; default 0.30 mm is §2.5's working point.
  const d = sliderDefaults().airGap;
  assert.equal(scaleSettingValue('airGap', parseFloat(d.inputValue)), 0.3);
  assert.equal(d.staticLabel, '0.30 mm', 'gap label reads millimetres');
  // The published FG40 force-vs-airgap curve spans 0.1-5 mm — the slider must not
  // offer gaps outside the measured domain (gapFluxT clamps, but the UI shouldn't lie).
  assert.equal(d.min, '0.1');
  assert.equal(d.max, '5');
});

test('N-pairs slider is the real scaling axis (M2.6), default 64 pairs', () => {
  // §2.5: ~64 opposed pairs hold 50 kg at 1 g. This replaced the magnet-material ladder
  // (an EPM contains Alnico + NdFeB together; there is no alnico -> neodymium -> hallbach
  // progression). Raw value IS the pair count.
  const d = sliderDefaults().nPairs;
  assert.equal(parseFloat(d.inputValue), GameConfig.FG40.DEFAULT_N_PAIRS);
  assert.equal(d.staticLabel, '64 pairs');
});

test('film thickness slider is real millimetres (M2.7), default the paper\'s 0.2 mm', () => {
  // 45 mm × 0.2 mm = the paper's 9 mm² ribbon. Raw value IS the thickness in mm.
  const d = sliderDefaults().thickness;
  assert.equal(parseFloat(d.inputValue), 0.2);
  assert.equal(d.staticLabel, '0.20 mm');
});

test('stress-budget slider default maps to the DECIDED §2.1 safety fraction (30%)', () => {
  // The paper's "10% of tether strength" is a fraction of stress-limited POWER, not of
  // stress (P ∝ σ²): read as a stress fraction, 10% forbids the paper's own 1000 km/h
  // operating point. The slider is a STRESS fraction of working stress, 5-60%, default
  // 30% — the reference configuration lands exactly on the paper's 1000 km/h — and the
  // label shows BOTH readings so the paper's 10% reconciles instead of contradicting.
  const d = sliderDefaults().stressBudget;
  assert.equal(scaleSettingValue('stressBudget', parseFloat(d.inputValue)), 0.30);
  assert.ok(d.staticLabel.includes('30% of stress'), 'label states the stress fraction');
  assert.ok(d.staticLabel.includes('9.0% of power'), 'label ALSO states the power fraction (0.30^2)');
  // The amplitude default is real metres (7.0 m is the honest equivalent of the old
  // "700 mm" label that was consumed as 7 m of world stroke).
  const a = sliderDefaults().amplitude;
  assert.equal(scaleSettingValue('amplitude', parseFloat(a.inputValue)), GameConfig.WAVE.DEFAULT_AMPLITUDE);
  assert.ok(a.staticLabel.endsWith(' m'), 'amplitude label is in metres');
});
