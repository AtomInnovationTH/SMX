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
  // Shift 9: 3 kg, not 50. A 50 kg payload needed a 128-pair / 5.2 m stack, which could
  // only ever be drawn as a schematic; 3 kg on 8 pairs holds the same thrust-to-weight
  // (and the same ~6 minute climb) at a scale the picture can be honest about.
  assert.equal(GameConfig.MONKEY.WEIGHT, 3, 'the config default the UI must match');
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
  // air gap. Raw value IS the gap in mm; M2.11's default 0.15 mm is as tight as the
  // flutter margin allows at 100 kgf pretension (flutter = 0.1 mm; at 0.10 mm the
  // margin hits zero and the controller unloads — the constraint is real).
  const d = sliderDefaults().airGap;
  assert.equal(scaleSettingValue('airGap', parseFloat(d.inputValue)), 0.15);
  assert.equal(d.staticLabel, '0.15 mm', 'gap label reads millimetres');
  // The published FG40 force-vs-airgap curve spans 0.1-5 mm — the slider must not
  // offer gaps outside the measured domain (gapFluxT clamps, but the UI shouldn't lie).
  assert.equal(d.min, '0.1');
  assert.equal(d.max, '5');
});

test('N-pairs slider is the real scaling axis (M2.6), default 8 pairs', () => {
  // Shift 9: the demo stack. 8 pairs = 16 units = 33 cm, carrying 3 kg at the same
  // thrust-to-weight the old 128-pair / 50 kg default flew. Raw value IS the pair count,
  // and 8 is also the count renderFg40Stack draws, so the schematic is now literal.
  const d = sliderDefaults().nPairs;
  assert.equal(parseFloat(d.inputValue), GameConfig.FG40.DEFAULT_N_PAIRS);
  assert.equal(GameConfig.FG40.DEFAULT_N_PAIRS, 8);
  assert.equal(d.staticLabel, '8 pairs');
  // Gassend's §2.5 anchor — ~64 pairs for 50 kg — stays reachable at the top of the
  // slider, so the deck's own operating point is still one drag away.
  assert.equal(parseFloat(d.max), 64);
});

test('carrier default is the energy-feasible end of the band (M2.11): 92 Hz', () => {
  // §2.5/§2.3: switching watts grow with the carrier while extraction F·v is capped by
  // v_max, so for a 45-130 GPa film class the loop only closes at the low end. The
  // plan's "~260 Hz" screen-fit default predates the energy loop; the physics won.
  const d = sliderDefaults().frequency;
  assert.equal(parseFloat(d.inputValue), 0);
  assert.ok(Math.abs(logSliderToFreq(0) - GameConfig.WAVE.DEFAULT_FREQUENCY) < 1e-9);
  assert.equal(d.staticLabel, '92.0 Hz');
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
  // The amplitude default is real metres, and M2.11 put it just under the stress cap at
  // the shipped 92 Hz carrier (1.08 m) so the label reads true out of the box.
  // "700 mm" label that was consumed as 7 m of world stroke).
  const a = sliderDefaults().amplitude;
  assert.equal(scaleSettingValue('amplitude', parseFloat(a.inputValue)), GameConfig.WAVE.DEFAULT_AMPLITUDE);
  assert.ok(a.staticLabel.endsWith(' m'), 'amplitude label is in metres');
});

test('taper slider is the anchor:top section ratio (M4, p.9), default 1.0 = uniform film', () => {
  // The raw value IS the ratio R (documented pass-through in scaleSettingValue). The
  // default is the uniform film — the pre-taper model exactly, which is what keeps the
  // committed balance trace valid — and the paper's own worked example (R = 4, a
  // 500 km/h anchor for 1000 km/h aloft) sits on the step grid.
  const d = sliderDefaults().taper;
  assert.equal(scaleSettingValue('taper', parseFloat(d.inputValue)), 1.0);
  assert.equal(d.staticLabel, '1.0 : 1');
  assert.equal(d.min, '1', 'no inverted taper (R < 1 would fatten the film aloft)');
  assert.equal(parseFloat(d.max), 10);
  assert.ok((4 - parseFloat(d.min)) % parseFloat(d.step) === 0, 'the paper\'s R = 4 example is selectable');
});
