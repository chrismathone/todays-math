import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeProposal, proposedEntry } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import { workerFingerprint } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial';
import { splitBlankSentence, blankKeywords, conceptEntrySchema, conceptBlankBankSchema, visibleLength } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/contracts/conceptBlank.contract';
import { bankNotationFaults } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/notation';
import { blankClashes } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/audit';
const directory = 'C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/middle-negative-tail-116';
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const inputBytes = readFileSync(`${directory}/immutable-input.json`), input = JSON.parse(inputBytes.toString('utf8'));
const begin = Number(process.argv[2]), end = Number(process.argv[3]), suffix = process.argv[4] ? `-${process.argv[4]}` : '';
if (begin < 160 || end > 276 || end <= begin) throw Error('Scope');
const manuals = readdirSync(directory).filter(file => /^manual-\d+-\d+\.json$/.test(file)).flatMap(file => JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')).map((manual: any) => ({ ...manual, file, fileSha256: sha(readFileSync(`${directory}/${file}`)), recordedAt: statSync(`${directory}/${file}`).mtime.toISOString() })));
const selected = input.rows.filter((row: any) => row.originalDisputeIndex >= begin && row.originalDisputeIndex < end);
const allowed = new Set(['bDecision','bReason','bPrompt','bAnswer','bRequiredIdeas','bQuestion','cDecision','cReason','cAfter','cMarkedSentence','cStudentSentence','cSlotAnswers','cAnswers','cSlots','cAcceptedAnswers','clozeQuestion','acceptedAnswers','cSlotEquivalents','lexicalSynonyms','equivalentExpressions','questionExclusions','coreAfter','coreReason','proposalFingerprint']);
const reviews = selected.map((row: any) => {
 const matched = manuals.filter((manual: any) => manual.index === row.originalDisputeIndex); if (matched.length !== 1) throw Error(`Missing/duplicate decision ${row.originalDisputeIndex}`);
 const manual = matched[0], raw = structuredClone(row.raw);
 if (!row.matchesSnapshot) throw Error('Stale snapshot ' + row.id);
 if (!manual.reason || !['retain','revise'].includes(manual.verdict)) throw Error('Unsettled ' + row.id);
 Object.assign(raw, manual.rawChanges ?? {});
 if (manual.B) { raw.bPrompt = manual.B.prompt; raw.bAnswer = manual.B.answer; raw.bRequiredIdeas = manual.B.requiredIdeas; raw.bQuestion = structuredClone(manual.B); if (raw.bDecision === 'exclude') throw Error('B decision conflict'); if (raw.bDecision === 'keep') raw.bDecision = 'rewrite'; }
 if (manual.C) {
  const sentence = manual.C.sentence, answers = blankKeywords(sentence), accepted = manual.C.acceptedAnswers;
  if (raw.cDecision === 'exclude') throw Error('C decision conflict');
  Object.assign(raw, { cDecision: sentence === row.original.definition ? 'keep' : 'rewrite', cReason: manual.reason, cAfter: sentence, cMarkedSentence: sentence, cStudentSentence: splitBlankSentence(sentence).map(piece => piece.kind === 'key' ? '□' : piece.text).join(''), cSlotAnswers: answers, cAnswers: answers, cAcceptedAnswers: accepted, clozeQuestion: structuredClone(manual.C), cSlots: answers.map((answer: string, index: number) => ({ index, answer, equivalentAnswers: accepted[index], equivalenceReview: 'Codex tail-116 report proposal; independent verification required' })), lexicalSynonyms: [], equivalentExpressions: [] });
  if ('acceptedAnswers' in raw) raw.acceptedAnswers = accepted;
  if ('cSlotEquivalents' in raw) raw.cSlotEquivalents = accepted;
 }
 if (raw.questionExclusions) { if (raw.bDecision !== 'exclude') delete raw.questionExclusions.term; if (raw.cDecision !== 'exclude') delete raw.questionExclusions.cloze; if (!Object.keys(raw.questionExclusions).length) delete raw.questionExclusions; }
 const candidate = normalizeProposal(raw, row.original); if (!candidate) throw Error('Incomplete candidate');
 if (raw.cDecision === 'keep' && 'sentence' in candidate.C && candidate.C.sentence !== row.original.definition) throw Error('Keep differs from immutable original ' + row.id);
 const candidateFingerprint = workerFingerprint('middle', raw); if (manual.verdict === 'revise') raw.proposalFingerprint = candidateFingerprint;
 if (manual.verdict === 'retain' && JSON.stringify(raw) !== JSON.stringify(row.raw)) throw Error('Retain mutated');
 const preservedErrors: string[] = [];
 for (const key of new Set([...Object.keys(row.raw), ...Object.keys(raw)])) if (!allowed.has(key) && JSON.stringify(raw[key]) !== JSON.stringify(row.raw[key])) preservedErrors.push(key);
 if (!manual.B && raw.bDecision === row.raw.bDecision && JSON.stringify(candidate.B) !== JSON.stringify(row.normalized.B) && !(raw.bDecision === 'exclude' && manual.rawChanges?.bReason)) preservedErrors.push('unchanged B');
 if (!manual.C && raw.cDecision === row.raw.cDecision && JSON.stringify(candidate.C) !== JSON.stringify(row.normalized.C) && !(raw.cDecision === 'exclude' && manual.rawChanges?.cReason)) preservedErrors.push('unchanged C');
 if (!manual.rawChanges?.coreAfter && JSON.stringify(candidate.coreAfter) !== JSON.stringify(row.normalized.coreAfter)) preservedErrors.push('generalDefinition');
 const entry = proposedEntry(candidate); conceptEntrySchema.parse(entry);
 if (manual.C && (raw.cMarkedSentence !== (candidate.C as any).sentence || JSON.stringify(raw.cAcceptedAnswers) !== JSON.stringify((candidate.C as any).acceptedAnswers))) preservedErrors.push('C flat/assembled');
 if (preservedErrors.length) throw Error('Preservation ' + row.id + ':' + preservedErrors.join(','));
 const batch = readdirSync(directory).find(file => /^before-\d+-\d+\.txt$/.test(file) && Number(file.split('-')[1]) <= row.originalDisputeIndex && Number(file.split('-')[2].split('.')[0]) > row.originalDisputeIndex);
 if (!batch) throw Error('No actual reading batch');
 return { originalDisputeIndex: row.originalDisputeIndex, id: row.id, sourceIndex: row.sourceIndex, currentFingerprint: row.currentFingerprint, currentNormalizedHash: row.normalized.hash, snapshotNormalizedHash: row.snapshotNormalizedHash, snapshotMatches: true, verdict: manual.verdict, reason: manual.reason, originalBlind: row.snapshotItem.review.blind, originalKey: row.snapshotItem.review.key, reader: 'Codex direct actual source/B/C/answer/criterion/generalDefinition reading; no independent approval', readAt: manual.recordedAt, inputSha256: sha(inputBytes), beforeReadingEvidence: { path: batch, byteSha256: sha(readFileSync(`${directory}/${batch}`)) }, manualEvidence: { path: manual.file, byteSha256: manual.fileSha256 }, ...(manual.verdict === 'revise' ? { proposedRawRow: raw } : {}), candidateNormalized: candidate, candidateNormalizedHash: candidate.hash, candidateFingerprint, candidateGeneralDefinition: entry.definition, preservationErrors: preservedErrors, visibleLengths: { generalDefinition: visibleLength(entry.definition), B: 'prompt' in candidate.B ? visibleLength(candidate.B.prompt) : null, C: 'sentence' in candidate.C ? visibleLength(candidate.C.sentence) : null } };
});
const bank = conceptBlankBankSchema.parse({ concepts: reviews.map((review: any) => proposedEntry(review.candidateNormalized)), ox: [], apply: [], figures: [] });
const notation = bankNotationFaults(bank), clashes = blankClashes(bank).map(group => group.map(entry => entry.id));
const path = `${directory}/candidates-${begin}-${end}${suffix}.json`; if (existsSync(path)) throw Error('Preserve fixed candidate evidence');
writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), reader: 'Codex direct tail-116 report worker', scope: { begin, endExclusive: end }, inputSha256: sha(inputBytes), reviews, validation: { count: reviews.length, uniqueIds: new Set(reviews.map((row: any) => row.id)).size, revise: reviews.filter((row: any) => row.verdict === 'revise').length, retain: reviews.filter((row: any) => row.verdict === 'retain').length, stale: 0, unprocessed: 0, contractErrors: [], notationErrors: notation, preservationErrors: [], blankClashes: clashes } }, null, 2) + '\n');
const after = reviews.map((review: any) => JSON.stringify({ index: review.originalDisputeIndex, id: review.id, role: input.rows.find((row: any) => row.id === review.id).raw.learningRole, B: review.candidateNormalized.B, C: review.candidateNormalized.C, generalDefinition: review.candidateGeneralDefinition, coreReason: review.candidateNormalized.coreReason })).join('\n') + '\n';
writeFileSync(`${directory}/after-${begin}-${end}${suffix}.txt`, after);
console.log(JSON.stringify({ path, byteSha256: sha(readFileSync(path)), validation: JSON.parse(readFileSync(path,'utf8')).validation }));
console.log(after);
