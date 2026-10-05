import test from 'node:test';
import assert from 'node:assert/strict';
import { certifiedQueueBindings, collectFileReferences, collectQueueFileReferences, contentSha256, currentPlanState, planSource, validateCertificate, valueSha256 } from './admission-plan.mjs';
import { resolve } from 'node:path';

function fixture() {
  const questions = [
    { id: 'old', sourceNumber: 1, prompt: '기존 문제', metadata: { sourceRecordId: 'source', sourceAudioSha256: 'original' },
      audioRange: { startMs: 100, endMs: 5000 }, choices: [{ id: 'a', text: '기존 보기' }], answerChoiceId: 'a' },
    { id: 'new', sourceNumber: 2, prompt: '두 번째 문제', instruction: '대화를 듣고 고르시오.',
      metadata: { sourceRecordId: 'source', sourceAudioSha256: 'original' }, image: { opaque: 'unchanged' } },
    { id: 'held', sourceNumber: 3, prompt: '세 번째 문제', metadata: { sourceRecordId: 'source', sourceAudioSha256: 'original' } },
  ];
  const audio = { assetId: 'full-original', sha256: 'playback', durationMs: 5000 };
  const document = { id: 'set', revision: 9, title: '원본', retainedUnknownProperty: { keep: true },
    groups: [{ id: 'group', audio, transcript: { text: '원문 그대로' }, reviews: {}, questions }] };
  const baseline = { id: 'set', revision: 9, document };
  const source = { sourceRecordId: 'source', setId: 'set', revision: 9, groupId: 'group', audio,
    sourceAudioSha256: 'original', documentSha256: valueSha256(document), assignedAgent: 'claude', reconstructed: false, questions };
  const records = questions.map(question => ({ sourceRecordId: 'source', setId: 'set', revision: 9,
    documentSha256: source.documentSha256, questionId: question.id, sourceNumber: question.sourceNumber,
    sourceAudioSha256: 'original', playbackSha256: 'playback', provider: 'claude', reconstructed: false,
    status: question.id === 'old' ? 'preserved' : question.id === 'held' ? 'held' : 'admitted',
    reasons: question.id === 'held' ? ['uncertain cue'] : [],
    ...(question.id === 'held' ? {} : { audioRange: question.audioRange ?? { startMs: 2500, endMs: 5000 } }),
    ...(question.id !== 'new' ? {} : { evidenceGrade: 'numbered_probe', nativeEvidence: { source: 'actual' },
      proofKey: { probe: 'actual' }, cueNumber: 2, scopeQuestionNumbers: [2] }),
  }));
  const inventory = { records: [source] };
  const snapshot = { snapshots: [baseline] };
  const certificate = { schemaVersion: 1, evidenceContractVersion: 1, completeReplay: true,
    productionApplicationAuthorized: false, writesDatabase: false, writesStorage: false, writesMedia: false, humanReviewed: false,
    errors: [], records, sourceChecks: [{ sourceRecordId: 'source', status: 'passed', reason: null }],
    preservedExisting: [{ sourceRecordId: 'source', questionId: 'old', audioRange: questions[0].audioRange }],
    counts: { sources: 1, questions: 3, providers: { claude: 3 }, outcomes: { preserved: 1, admitted: 1, held: 1 },
      evidenceGrades: { numbered_probe: 1 } } };
  return { inventory, snapshot, certificate, source, baseline };
}

test('adopts only a new proven start, preserving original content, metadata, media, existing range and held question', () => {
  const f = fixture();
  const records = validateCertificate(f.inventory, f.snapshot, f.certificate);
  const plan = planSource(f.source, f.baseline, records);
  assert.equal(plan.next.revision, 10);
  assert.deepEqual(plan.next.groups[0].audio, f.source.audio);
  assert.deepEqual(plan.next.groups[0].questions[0], f.baseline.document.groups[0].questions[0]);
  assert.deepEqual(plan.next.groups[0].questions[2], f.baseline.document.groups[0].questions[2]);
  assert.deepEqual(plan.next.groups[0].questions[1].audioRange, { startMs: 2500, endMs: 5000 });
  assert.deepEqual(plan.next.groups[0].questions[1].image, { opaque: 'unchanged' });
  assert.deepEqual(plan.next.retainedUnknownProperty, { keep: true });
  assert.equal(f.baseline.document.revision, 9);
});

for (const [name, corrupt] of [
  ['partial replay', f => { f.certificate.completeReplay = false; }],
  ['duplicate question', f => { f.certificate.records[1] = f.certificate.records[0]; }],
  ['replaced existing start', f => { f.certificate.records[0].audioRange = { startMs: 110, endMs: 5000 }; }],
  ['shortened end', f => { f.certificate.records[1].audioRange.endMs = 3000; }],
  ['fabricated previous verification', f => { f.certificate.records[1].status = 'preserved'; }],
  ['wrong current question identity', f => { f.certificate.records[1].sourceNumber = 9; }],
  ['wrong playback', f => { f.certificate.records[1].playbackSha256 = 'other'; }],
  ['failed source clock', f => { f.certificate.sourceChecks[0].status = 'held'; }],
  ['human review promotion', f => { f.certificate.humanReviewed = true; }],
  ['changed frozen content', f => { f.snapshot.snapshots[0].document.title = 'edited'; }],
  ['inconsistent outcome totals', f => { f.certificate.counts.outcomes.admitted = 2; }],
  ['held row with a guessed range', f => { f.certificate.records[2].audioRange = { startMs: 4000, endMs: 5000 }; }],
]) {
  test(`rejects ${name}`, () => {
    const f = structuredClone(fixture());
    corrupt(f);
    assert.throws(() => validateCertificate(f.inventory, f.snapshot, f.certificate));
  });
}

test('restart requires the exact committed document plus matching audit and rejects concurrent edits', () => {
  const f = fixture();
  const plan = planSource(f.source, f.baseline, validateCertificate(f.inventory, f.snapshot, f.certificate));
  assert.equal(currentPlanState(f.baseline, plan, false), 'pending');
  assert.equal(currentPlanState({ revision: 10, document: plan.next }, plan, true), 'already_applied');
  const reorderKeys = value => Array.isArray(value) ? value.map(reorderKeys) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, reorderKeys(item)]))
    : value;
  assert.equal(currentPlanState({ revision: 10, document: reorderKeys(plan.next) }, plan, true), 'already_applied');
  assert.equal(contentSha256(reorderKeys(plan.next)), plan.nextSha256);
  assert.throws(() => currentPlanState({ revision: 10, document: plan.next }, plan, false));
  const concurrent = structuredClone(plan.next);
  concurrent.title = 'teacher edit';
  assert.throws(() => currentPlanState({ revision: 10, document: concurrent }, plan, true));
  assert.throws(() => currentPlanState({ revision: 11, document: plan.next }, plan, true));
});

test('binds nested native/probe/request/mapping artifacts and rejects conflicting hashes', () => {
  const a = 'a'.repeat(64), b = 'b'.repeat(64);
  const references = collectFileReferences({ rows: [{ proofKey: { probe: { path: '/probe.json', sha256: a } },
    nativeEvidence: { cachePath: '/cache.json', cacheSha256: a, energyPath: '/energy.f64', energySha256: b },
    mappingEvidence: { alignment: { path: '/alignment.json', sha256: b } } }] });
  assert.deepEqual([...references.keys()], ['/probe.json', '/cache.json', '/energy.f64', '/alignment.json']);
  collectFileReferences({ request: { path: '/request.json', sha256: a } }, references);
  assert.equal(references.get('/request.json'), a);
  assert.throws(() => collectFileReferences({ path: '/probe.json', sha256: b }, references));
});

test('a source with no new admitted starts keeps its original revision and document', () => {
  const f = fixture();
  f.certificate.records[1] = { ...f.certificate.records[1], status: 'held', reasons: ['no match'], audioRange: undefined };
  f.certificate.counts.outcomes = { preserved: 1, held: 2 };
  f.certificate.counts.evidenceGrades = {};
  const plan = planSource(f.source, f.baseline, validateCertificate(f.inventory, f.snapshot, f.certificate));
  assert.equal(plan.markers.length, 0);
  assert.deepEqual(plan.next, f.baseline.document);
});

test('a stale discovery header resolves only through its consuming inventory while raw bytes stay unchanged', () => {
  const original = 'a'.repeat(64), rebased = 'b'.repeat(64);
  const queue = { schemaVersion: 1, evidenceContractVersion: 1, provider: 'claude',
    inventoryPath: '/old.json', inventorySha256: rebased,
    records: [{ probeEvidence: { path: '/probe.json', sha256: original } }] };
  const before = structuredClone(queue);
  const refs = collectFileReferences({ inventoryPath: '/old.json', inventorySha256: original });
  const audit = collectQueueFileReferences(queue, refs,
    { provider: 'claude', inventory: { path: '/rebased.json', sha256: rebased } });
  assert.deepEqual(queue, before);
  assert.equal(refs.get('/old.json'), original);
  assert.equal(refs.get('/rebased.json'), rebased);
  assert.equal(refs.get('/probe.json'), original);
  assert.equal(audit.labelDiffers, true);
  assert.deepEqual(audit.observed, { path: '/old.json', sha256: rebased });
});

test('the queue header exception cannot hide changed hashes, providers or nested probe references', () => {
  const hash = 'a'.repeat(64), wrong = 'b'.repeat(64);
  const binding = { provider: 'grok', inventory: { path: '/inventory.json', sha256: hash } };
  const queue = { schemaVersion: 1, evidenceContractVersion: 1, provider: 'grok',
    inventoryPath: '/old.json', inventorySha256: hash, records: [] };
  assert.throws(() => collectQueueFileReferences({ ...queue, inventorySha256: wrong }, new Map(), binding));
  assert.throws(() => collectQueueFileReferences({ ...queue, provider: 'claude' }, new Map(), binding));
  const refs = collectFileReferences({ path: '/probe.json', sha256: hash });
  assert.throws(() => collectQueueFileReferences({ ...queue,
    records: [{ inventoryPath: '/probe.json', inventorySha256: wrong }] }, refs, binding));
});

test('a certified queue with no discovery path binds its explicit inventory without inventing a raw header', () => {
  const hash = 'a'.repeat(64), refs = new Map();
  const queue = { schemaVersion: 1, evidenceContractVersion: 1, provider: 'grok', inventorySha256: hash, records: [] };
  const audit = collectQueueFileReferences(queue, refs,
    { provider: 'grok', inventory: { path: '/inventory.json', sha256: hash } });
  assert.equal(Object.hasOwn(queue, 'inventoryPath'), false);
  assert.equal(audit.observed, null);
  assert.equal(audit.labelDiffers, false);
  assert.equal(refs.get('/inventory.json'), hash);
});

function queueAuthorityFixture() {
  const ref = (path, digit) => ({ path, sha256: digit.repeat(64) });
  const oldInv = ref('/old-inventory.json', 'a'), oldClock = ref('/old-clock.json', 'b');
  const oldCert = ref('/old-cert.json', 'c'), newInv = ref('/new-inventory.json', 'd');
  const complete = inputs => ({ schemaVersion: 1, evidenceContractVersion: 1, completeReplay: true, errors: [], writesDatabase: false,
    writesStorage: false, humanReviewed: false, inputs });
  const old = complete({ inventory: oldInv, clock: oldClock, claude: ref('/old-queue.json', 'e') });
  const current = complete({ inventory: newInv, grok: ref('/new-queue.json', 'f'),
    ancestorCertificate: oldCert, ancestorInventory: oldInv, ancestorClock: oldClock });
  const values = new Map([
    [newInv.path, { ref: newInv, value: { verifiedAncestor: { certificate: oldCert, inventory: oldInv, clock: oldClock } } }],
    [oldInv.path, { ref: oldInv, value: {} }], [oldCert.path, { ref: oldCert, value: old }],
  ]);
  const read = async r => {
    const found = values.get(r.path);
    assert.equal(r.sha256, found?.ref.sha256, 'Reader must enforce immutable bytes');
    return found.value;
  };
  return { current, old, values, read, oldInv, oldCert };
}

test('only explicitly authenticated ancestor certificates supply queue inventory bindings', async () => {
  const f = queueAuthorityFixture();
  const bindings = await certifiedQueueBindings(f.current, f.read);
  assert.equal(bindings.size, 2);
  assert.deepEqual(bindings.get(resolve('/old-queue.json')).inventory, f.oldInv);
  const bad = structuredClone(f.current);
  bad.inputs.ancestorInventory = { ...f.oldInv, path: '/unrelated.json' };
  await assert.rejects(() => certifiedQueueBindings(bad, f.read), /Ancestor queue authority differs/);
  f.old.completeReplay = false;
  await assert.rejects(() => certifiedQueueBindings(f.current, f.read), /Unverified queue binding certificate/);
});

test('an undeclared ancestor, wrong ancestor input or cycle cannot supply queue authority', async () => {
  const f = queueAuthorityFixture();
  f.values.get('/new-inventory.json').value = {};
  await assert.rejects(() => certifiedQueueBindings(f.current, f.read), /Undeclared ancestor/);
  f.values.get('/new-inventory.json').value = { verifiedAncestor: {
    certificate: f.oldCert, inventory: f.oldInv, clock: f.current.inputs.ancestorClock } };
  f.old.inputs.inventory = { ...f.oldInv, path: '/other.json' };
  await assert.rejects(() => certifiedQueueBindings(f.current, f.read), /Ancestor certificate input differs/);
  f.old.inputs.inventory = f.oldInv;
  const ancestor = { certificate: f.oldCert, inventory: f.oldInv, clock: f.current.inputs.ancestorClock };
  f.values.get(f.oldInv.path).value.verifiedAncestor = ancestor;
  Object.assign(f.old.inputs, { ancestorCertificate: ancestor.certificate, ancestorInventory: ancestor.inventory,
    ancestorClock: ancestor.clock });
  await assert.rejects(() => certifiedQueueBindings(f.current, f.read), /Cyclic queue authority/);
});
