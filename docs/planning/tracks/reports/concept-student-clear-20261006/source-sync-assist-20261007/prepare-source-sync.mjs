/** Pure preparation. No filesystem, process, network, database or activation operations. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const FINAL_STATUS = 'content-reviewed-plan; print-and-memory-activation-pending';
export const PRELIMINARY_STATUS = 'preliminary-current-question-proposal; NOT compiled or approved';
export const GRADES = { e3: '초3', e4: '초4', e5: '초5', e6: '초6', m1: '중1', m2: '중2', m3: '중3' };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha256(JSON.stringify(value));
const key = path => JSON.stringify(path);
const position = row => key([row.sectionKey, row.turnIndex]);

/** Locate JSON tokens without normalizing whitespace, line endings or untouched bytes. */
export function jsonLocations(text) {
  JSON.parse(text);
  let at = 0;
  const nodes = new Map();
  const whitespace = () => { while (/\s/.test(text[at] ?? '') && at < text.length) at++; };
  function string() {
    const start = at++;
    while (at < text.length) {
      const ch = text[at++];
      if (ch === '\\') at++;
      else if (ch === '"') return JSON.parse(text.slice(start, at));
    }
    throw Error('Unclosed JSON string');
  }
  function value(path) {
    whitespace();
    const start = at;
    if (text[at] === '"') string();
    else if (text[at] === '{') {
      at++; whitespace(); const properties = new Set();
      while (text[at] !== '}') {
        const property = string(); whitespace(); assert.equal(text[at++], ':');
        assert.ok(!properties.has(property), 'Duplicate JSON property'); properties.add(property);
        value([...path, property]); whitespace();
        if (text[at] !== ',') break;
        at++; whitespace();
      }
      assert.equal(text[at++], '}');
    } else if (text[at] === '[') {
      at++; whitespace(); let index = 0;
      while (text[at] !== ']') {
        value([...path, index++]); whitespace();
        if (text[at] !== ',') break;
        at++; whitespace();
      }
      assert.equal(text[at++], ']');
    } else {
      while (at < text.length && !/[\s,\]}]/.test(text[at])) at++;
    }
    nodes.set(key(path), { start, end: at });
  }
  value([]); whitespace(); assert.equal(at, text.length);
  return nodes;
}

function patchJson(before, edits, expected) {
  const ordered = [...edits].sort((a, b) => a.start - b.start);
  let end = 0;
  for (const edit of ordered) {
    assert.ok(edit.start >= end && edit.end >= edit.start, 'Overlapping JSON edits');
    end = edit.end;
  }
  let after = before;
  for (const edit of [...ordered].reverse())
    after = after.slice(0, edit.start) + edit.replacement + after.slice(edit.end);
  assert.deepEqual(JSON.parse(after), expected, 'Token edits do not match planner output');
  // Each unedited source segment is reused verbatim; this also covers metadata and newlines.
  const segments = []; let oldAt = 0, newAt = 0;
  for (const edit of ordered) {
    const length = edit.start - oldAt;
    assert.equal(after.slice(newAt, newAt + length), before.slice(oldAt, edit.start));
    segments.push({ beforeStart: oldAt, afterStart: newAt, characters: length,
      sha256: sha256(before.slice(oldAt, edit.start)) });
    newAt += length + edit.replacement.length; oldAt = edit.end;
  }
  assert.equal(after.slice(newAt), before.slice(oldAt));
  segments.push({ beforeStart: oldAt, afterStart: newAt, characters: before.length - oldAt,
    sha256: sha256(before.slice(oldAt)) });
  return { before, after, beforeSha256: sha256(before), afterSha256: sha256(after), edits: ordered, unchangedSegments: segments };
}

function validateLedger(scripts, corrections) {
  const sections = new Map(scripts.map(script => [script.sectionKey, script]));
  assert.equal(sections.size, scripts.length, 'Duplicate manuscript section');
  const ids = new Set(), positions = new Set();
  for (const row of corrections) {
    assert.ok(!ids.has(row.id) && !positions.has(position(row)), 'Duplicate correction ID or position');
    ids.add(row.id); positions.add(position(row));
    const turn = sections.get(row.sectionKey)?.dialogue[row.turnIndex];
    assert.ok(turn, `Missing ledger location: ${row.id}`);
    assert.equal(turn.markdown, row.new, `Stale correction new value: ${row.id}`);
    assert.deepEqual(turn.source, row.source, `Stale correction provenance: ${row.id}`);
  }
}

/** deps are the authoritative Root prepareBankSourceChanges/materializeGrade/planner/withAssessments. */
export function prepareSourceSync(input, deps) {
  const { plan, baseline, sources, manuscriptBytes, ledgerBytes, expected, mode = 'final' } = input;
  assert.ok(['final', 'preliminary'].includes(mode), 'Unknown preparation mode');
  assert.equal(plan.status, mode === 'final' ? FINAL_STATUS : PRELIMINARY_STATUS, 'Final compiler status required');
  assert.equal(hash(baseline), expected.baselineHash, 'Original baseline hash is stale');
  assert.equal(plan.baselineHash, expected.baselineHash, 'Plan baseline mismatch');
  assert.equal(plan.candidateBankHash, expected.candidateBankHash, 'Candidate hash pin mismatch');
  assert.equal(hash(plan), expected.planHash, 'Plan hash pin mismatch');
  assert.equal(plan.revision, deps.questionRevision, 'Application-plan question revision mismatch');
  assert.equal(sha256(ledgerBytes), expected.ledgerSha256, 'Correction ledger byte preimage changed');
  assert.deepEqual(Object.keys(manuscriptBytes), Object.keys(GRADES), 'Exactly seven ordered manuscripts required');
  for (const [code, bytes] of Object.entries(manuscriptBytes))
    assert.equal(sha256(bytes), expected.manuscriptSha256[code], `Manuscript byte preimage changed: ${code}`);
  if (mode === 'final') {
    assert.ok(typeof plan.sourceCommit === 'string' && plan.sourceCommit.length, 'Compiler sourceCommit required');
    assert.ok(Array.isArray(plan.capturedSources) && plan.capturedSources.length >= 7, 'Fresh compiler capturedSources required');
    const seen = new Set();
    for (const row of plan.capturedSources) {
      assert.ok(!seen.has(row.file) && /^[a-f0-9]{64}$/.test(row.sha256), 'Invalid compiler source manifest');
      seen.add(row.file);
      assert.equal(sha256(input.compilerSourceBytes?.[row.file] ?? ''), row.sha256, `Compiler input drift: ${row.file}`);
    }
  }
  const originalEntries = new Map(Object.entries(baseline).flatMap(([part, bank]) => bank.concepts.map(entry => [entry.id, { part, entry }])));
  const changed = new Map(plan.definitionChanges.map(row => [row.id, row]));
  assert.equal(changed.size, plan.definitionChanges.length, 'Duplicate definition change');
  for (const row of changed.values()) {
    const original = originalEntries.get(row.id);
    assert.ok(original && original.part === row.part, `Definition source mismatch: ${row.id}`);
    assert.equal(row.before, original.entry.definition, `Definition before mismatch: ${row.id}`);
    assert.ok(row.before !== row.after && row.reason?.trim(), `Definition reason/change missing: ${row.id}`);
    const reviewed = plan.reviewedRows.find(review => review.id === row.id);
    assert.equal(row.contentHash, reviewed?.contentHash, `Definition review fingerprint mismatch: ${row.id}`);
  }
  let candidate;
  if (mode === 'final') {
    candidate = deps.prepareBankSourceChanges({ plan, baseline, sources }).candidateParts;
    if (input.candidateParts) assert.deepEqual(input.candidateParts, candidate, 'Supplied source-plan candidate differs');
  } else {
    assert.ok(input.candidateParts, 'Preliminary mode needs explicitly synthesized candidate parts');
    candidate = input.candidateParts;
    assert.ok(!plan.examplePromptChanges?.length, 'Preliminary synthesis does not approve source-example corrections');
    const reconstructed = Object.fromEntries(Object.entries(baseline).map(([part, bank]) => [part, deps.withAssessments({ ...bank,
      concepts: bank.concepts.map(entry => ({ ...entry, definition: changed.get(entry.id)?.after ?? entry.definition })) }, plan.assessmentTables[part])]));
    assert.deepEqual(candidate, reconstructed, 'Preliminary candidate differs from definition/assessment plan');
  }
  assert.equal(hash(candidate), expected.candidateBankHash, 'Stale candidate BANK_PARTS');
  assert.deepEqual(Object.keys(candidate), Object.keys(baseline), 'Candidate part scope/order changed');
  for (const [part, bank] of Object.entries(baseline)) {
    const next = candidate[part];
    assert.deepEqual({ ...next, concepts: [] }, { ...bank, concepts: [] }, `Unrelated bank forms changed: ${part}`);
    assert.equal(next.concepts.length, bank.concepts.length, 'Concept count changed');
    for (let index = 0; index < bank.concepts.length; index++) {
      const original = bank.concepts[index], entry = next.concepts[index];
      assert.equal(entry.id, original.id, 'Concept order changed');
      assert.equal(entry.definition, changed.get(entry.id)?.after ?? original.definition, `Unplanned definition: ${entry.id}`);
    }
  }
  const ledger = JSON.parse(ledgerBytes);
  assert.deepEqual(ledger.corrections, deps.staticCorrections, 'STATIC_CORRECTIONS differs from captured ledger');
  const current = Object.values(manuscriptBytes).flatMap(bytes => JSON.parse(bytes));
  validateLedger(current, ledger.corrections);
  const baselineMaterialized = [], materialized = [];
  for (const [code, grade] of Object.entries(GRADES)) {
    baselineMaterialized.push(...deps.materializeGrade(grade, baseline[code]));
    materialized.push(...deps.materializeGrade(grade, candidate[code]));
  }
  const generated = new Map(materialized.map(script => [script.sectionKey, script]));
  const oldGenerated = new Map(baselineMaterialized.map(script => [script.sectionKey, script]));
  const expectedTurns = [];
  for (const script of current) {
    assert.equal(script.dialogue.length, generated.get(script.sectionKey)?.dialogue.length, `Dialogue position mismatch: ${script.sectionKey}`);
    for (const [turnIndex, turn] of script.dialogue.entries()) {
      if (turn.source.kind !== 'bank-concept' || !changed.has(turn.source.entryId)) continue;
      const old = oldGenerated.get(script.sectionKey)?.dialogue[turnIndex];
      const desired = generated.get(script.sectionKey)?.dialogue[turnIndex];
      assert.ok(old && desired, 'Missing generated bank turn');
      assert.deepEqual({ ...turn, markdown: '' }, { ...desired, markdown: '' }, `Bank turn provenance/position changed: ${script.sectionKey}#${turnIndex}`);
      assert.equal(turn.markdown, old.markdown, `Independently changed bank text; investigate: ${script.sectionKey}#${turnIndex}`);
      if (turn.markdown !== desired.markdown) {
        assert.ok(turn.purpose !== 'opening', 'Definition must not rewrite an opening');
        expectedTurns.push({ sectionKey: script.sectionKey, turnIndex, entryId: turn.source.entryId, before: turn.markdown, after: desired.markdown });
      }
    }
  }
  const planned = deps.planManuscriptCorrections({ current, materialized, corrections: ledger.corrections, changes: plan.definitionChanges });
  assert.deepEqual(planned.turnChanges.map(({ sectionKey, turnIndex, entryId, before, after }) => ({ sectionKey, turnIndex, entryId, before, after })), expectedTurns, 'Expected changed bank-source turns missing');
  const changesByPosition = new Map(planned.turnChanges.map(row => [position(row), row]));
  validateLedger(planned.scripts, planned.corrections);
  const outputs = [];
  for (const [code, bytes] of Object.entries(manuscriptBytes)) {
    const scripts = JSON.parse(bytes), locations = jsonLocations(bytes), edits = [];
    for (const [s, script] of scripts.entries()) {
      for (const [t, turn] of script.dialogue.entries()) {
        const change = changesByPosition.get(position({ sectionKey: script.sectionKey, turnIndex: t }));
        if (change) edits.push({ ...locations.get(key([s, 'dialogue', t, 'markdown'])), replacement: JSON.stringify(change.after), path: [s, 'dialogue', t, 'markdown'] });
      }
    }
    const next = planned.scripts.filter(script => script.grade === GRADES[code]);
    outputs.push({ file: `src/lib/textbook/scripts/${code}.json`, ...patchJson(bytes, edits, next) });
  }
  const ledgerLocations = jsonLocations(ledgerBytes), ledgerEdits = [];
  for (let i = 0; i < ledger.corrections.length; i++) {
    const prior = ledger.corrections[i], next = planned.corrections[i];
    assert.deepEqual({ ...next, new: prior.new, reason: prior.reason }, prior, `Earlier correction baseline changed: ${prior.id}`);
    for (const field of ['new', 'reason']) if (next[field] !== prior[field])
      ledgerEdits.push({ ...ledgerLocations.get(key(['corrections', i, field])), replacement: JSON.stringify(next[field]), path: ['corrections', i, field] });
  }
  const appended = planned.corrections.slice(ledger.corrections.length);
  if (appended.length) {
    const newline = ledgerBytes.includes('\r\n') ? '\r\n' : '\n';
    const replacement = appended.map(row => JSON.stringify(row, null, 2).split('\n').map(line => '    ' + line).join(newline)).join(',' + newline);
    const start = ledger.corrections.length ? ledgerLocations.get(key(['corrections', ledger.corrections.length - 1])).end : ledgerLocations.get(key(['corrections'])).start + 1;
    ledgerEdits.push({ start, end: start, replacement: (ledger.corrections.length ? ',' : '') + newline + replacement, path: ['corrections', 'append'] });
  }
  outputs.push({ file: 'src/lib/textbook/scripts/static-corrections.json', ...patchJson(ledgerBytes, ledgerEdits, { ...ledger, corrections: planned.corrections }) });
  // Reverting corrections must recover exactly the same semantic first-manuscript baseline.
  const revert = (scripts, corrections) => { const copy = structuredClone(scripts); const bySection = new Map(copy.map(s => [s.sectionKey, s])); for (const row of corrections) bySection.get(row.sectionKey).dialogue[row.turnIndex].markdown = row.old; return copy; };
  assert.deepEqual(revert(planned.scripts, planned.corrections), revert(current, ledger.corrections), 'First manuscript baseline changed');
  const reread = planned.turnChanges.map(row => ({ ...row, sourceDefinitionBefore: changed.get(row.entryId).before, sourceDefinitionAfter: changed.get(row.entryId).after, reason: changed.get(row.entryId).reason, evidence: 'Actual manuscript/source correspondence only; per-ID mathematics remains Root/Claude' }));
  return { status: mode === 'final' ? 'final-plan preparation only; activation pending' : PRELIMINARY_STATUS, productionFilesWritten: false, studentRecordsWritten: false, outputs, turnChanges: planned.turnChanges, reread,
    summary: { sections: current.length, turns: current.reduce((n, s) => n + s.dialogue.length, 0), changedTurns: planned.turnChanges.length, definitionChanges: changed.size, priorCorrections: ledger.corrections.length, updatedPriorCorrections: ledgerEdits.filter(e => e.path[2] === 'new').length, appendedCorrections: appended.length,
      byGrade: Object.entries(GRADES).map(([code, grade]) => ({ code, changedTurns: planned.turnChanges.filter(row => current.find(s => s.sectionKey === row.sectionKey)?.grade === grade).length })),
      definitionChangesWithoutManuscriptTurns: plan.definitionChanges.filter(row => !current.some(s => s.dialogue.some(t => t.source.kind === 'bank-concept' && t.source.entryId === row.id))).map(row => ({ id: row.id, part: row.part, reason: 'Base manuscripts do not include this source ID (plus parts stay bank-only)' })) } };
}
