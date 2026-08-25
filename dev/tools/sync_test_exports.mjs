// sync_test_exports.mjs - turn the four-edit helper ritual into one command.
//
// When a pure helper is added to the "PURE SIM HELPERS" block in
// Space_Monkey_Elevator.html, three surfaces in the test files each need the
// name added by hand (the four-edit ritual, dev/docs/DEVELOPERS.md), and a
// missed edit fails silently - the helper reads undefined in tests. This tool
// scans the block, diffs the declared helper names against the three surfaces
// (the EXPORTED_SYMBOLS array in extract.mjs, the top destructure block and the
// extraction-sanity object in pure.test.mjs), and with --write appends the
// pending names to each surface. It never touches the helper-count assertion; it
// prints the bump reminder instead.
//
//   node dev/tools/sync_test_exports.mjs          # check mode
//   node dev/tools/sync_test_exports.mjs --write  # apply + re-check
//
// Scope: a helper is "missing from a surface" only when it is also missing from
// EXPORTED_SYMBOLS (the root of the ritual). The sanity object is a curated
// subset, so a helper that was already exported long ago but predates the
// curation is deliberately not chased here. This keeps check mode green on the
// shipped tree and lets a single --write finish the pending ritual.
//
// The helper-count assertion in pure.test.mjs is the guard against this tool's
// own regex drifting, so it is never edited: when the declared count disagrees
// with it, a reminder is printed for the human to bump it by hand.
//
// Zero dependencies (node builtins only, node >= 22 ESM). All output is
// sync:-prefixed. Exit 0 when the surfaces are consistent, 1 when a helper is
// missing or an export no longer resolves, 2 on a structural failure (a block
// marker or target surface cannot be found unambiguously) - a partial state is
// never written.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { declaredPureHelpers, exportedSymbols, loadGameModule } from '../tests/extract.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const HTML = join(ROOT, 'Space_Monkey_Elevator.html');
const EXTRACT = join(HERE, '..', 'tests', 'extract.mjs');
const PURE = join(HERE, '..', 'tests', 'pure.test.mjs');

const WRITE = process.argv.includes('--write');

// The three surfaces. listRe captures [opening, body, closing]; entryLineRe
// locates a whole single-entry line (indent + name + optional comma) so the
// insert point can match the list's own formatting.
const SURFACES = [
  {
    key: 'EXPORTED_SYMBOLS',
    file: EXTRACT,
    label: 'EXPORTED_SYMBOLS (extract.mjs)',
    listRe: /(const EXPORTED_SYMBOLS\s*=\s*\[)([\s\S]*?)(\];)/,
    entryLineRe: /^([ \t]*)'([A-Za-z_$][\w$]*)',?$/gm,
    render: (name) => `'${name}',`,
  },
  {
    key: 'destructure',
    file: PURE,
    label: 'destructure (pure.test.mjs)',
    listRe: /(const\s*\{)([\s\S]*?)(\}\s*=\s*game\s*;)/,
    entryLineRe: /^([ \t]*)([A-Za-z_$][\w$]*),?$/gm,
    render: (name) => `${name},`,
  },
  {
    key: 'sanity',
    file: PURE,
    label: 'sanity (pure.test.mjs)',
    listRe: /(Object\.entries\(\{)([\s\S]*?)(\}\)\))/,
    entryLineRe: /^([ \t]*)([A-Za-z_$][\w$]*),?$/gm,
    render: (name) => `${name},`,
  },
];

function readFile(path) {
  return readFileSync(path, 'utf8');
}

function textFor(surface, extractText, pureText) {
  return surface.file === EXTRACT ? extractText : pureText;
}

// Names currently present in one surface. The export array holds single-quoted
// strings; the two JS lists hold bare identifiers (some sanity lines pack several).
function surfaceNames(surface, text) {
  const re = new RegExp(surface.listRe.source, surface.listRe.flags);
  const match = re.exec(text);
  if (!match) {
    throw new Error(`cannot find the ${surface.key} list in ${surface.file}`);
  }
  const body = match[2];
  const ids = surface.key === 'EXPORTED_SYMBOLS'
    ? [...body.matchAll(/'([A-Za-z_$][\w$]*)'/g)].map((m) => m[1])
    : [...body.matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]);
  return new Set(ids);
}

// Append names after the last single-entry line of a surface's list, matching
// its indentation. Returns the edited file text (caller writes it).
function insertNames(text, surface, names) {
  const re = new RegExp(surface.listRe.source, surface.listRe.flags);
  const match = re.exec(text);
  if (!match) {
    throw new Error(`cannot find the ${surface.key} list before writing`);
  }
  const bodyStart = match.index + match[1].length;
  const body = match[2];
  const ere = new RegExp(surface.entryLineRe.source, surface.entryLineRe.flags);
  let last = null;
  let em;
  while ((em = ere.exec(body)) !== null) last = em;
  if (!last) {
    throw new Error(`cannot locate the last ${surface.key} entry before writing`);
  }
  const indent = last[1];
  const insertAt = bodyStart + last.index + last[0].length;
  const insert = '\n' + names.sort().map((n) => indent + surface.render(n)).join('\n');
  return text.slice(0, insertAt) + insert + text.slice(insertAt);
}

function assertedHelperCount(text) {
  const m = /declaredPureHelpers\(\)\.length,\s*(\d+)\)/.exec(text);
  if (!m) {
    throw new Error('cannot find the helper-count assertion in pure.test.mjs');
  }
  return Number(m[1]);
}

function computeState() {
  const declared = declaredPureHelpers();
  const declaredSet = new Set(declared);
  const exported = exportedSymbols();
  const exportedSet = new Set(exported);
  const pending = declared.filter((n) => !exportedSet.has(n));
  const extractText = readFile(EXTRACT);
  const pureText = readFile(PURE);
  const missing = {};
  let stale = [];
  for (const surface of SURFACES) {
    const names = surfaceNames(surface, textFor(surface, extractText, pureText));
    missing[surface.key] = pending.filter((n) => !names.has(n));
  }
  const game = loadGameModule();
  stale = exported.filter((n) => game[n] === undefined);
  return {
    declared,
    declaredCount: declared.length,
    exported,
    pending,
    missing,
    stale,
    assertedCount: assertedHelperCount(pureText),
    extractText,
    pureText,
  };
}

function printReport(state) {
  console.log(`sync: declared: ${state.declaredCount} pure helpers in the delimited block`);
  for (const surface of SURFACES) {
    const miss = state.missing[surface.key];
    console.log(`sync: missing ${surface.label}: ${miss.length ? miss.join(', ') : 'none'}`);
  }
  console.log(`sync: stale exports: ${state.stale.length ? state.stale.join(', ') : 'none'}`);
}

function isConsistent(state) {
  return SURFACES.every((s) => state.missing[s.key].length === 0) && state.stale.length === 0;
}

function checkMode() {
  let state;
  try {
    state = computeState();
  } catch (err) {
    console.error(`sync: FAIL - ${err.message}`);
    process.exit(2);
  }
  printReport(state);
  if (isConsistent(state)) {
    console.log('sync: IN SYNC - the three surfaces match the pure-helpers block');
    process.exit(0);
  }
  console.log('sync: OUT OF SYNC - run with --write to append the missing helper names');
  process.exit(1);
}

function writeMode() {
  let state;
  try {
    state = computeState();
  } catch (err) {
    console.error(`sync: FAIL - ${err.message}`);
    process.exit(2);
  }
  printReport(state);
  const anyMissing = SURFACES.some((s) => state.missing[s.key].length > 0);
  if (anyMissing) {
    let extractText = state.extractText;
    let pureText = state.pureText;
    for (const surface of SURFACES) {
      const miss = [...state.missing[surface.key]].sort();
      if (!miss.length) continue;
      const edited = insertNames(textFor(surface, extractText, pureText), surface, miss);
      if (surface.file === EXTRACT) extractText = edited;
      else pureText = edited;
      console.log(`sync: wrote ${surface.label}: +${miss.join(', +')}`);
    }
    writeFileSync(EXTRACT, extractText);
    writeFileSync(PURE, pureText);
    console.log('sync: files written');
  } else {
    console.log('sync: no writes needed');
  }
  if (state.declaredCount !== state.assertedCount) {
    console.log(`sync: now bump the helper-count assertion: ${state.assertedCount} -> ${state.declaredCount}`);
  }
  console.log('sync: re-checking after write');
  const self = fileURLToPath(import.meta.url);
  const res = spawnSync(process.execPath, [self], { stdio: 'inherit' });
  process.exit(res.status === null ? 2 : res.status);
}

if (WRITE) writeMode();
else checkMode();
