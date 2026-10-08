/** Read-only Root loader, using its private tsx API and tsconfig. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { GRADES, sha256, PRELIMINARY_STATUS } from './prepare-source-sync.mjs';

export const ROOT = 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006';
export const BASELINE = 'D:/tmp/concept-student-clear-20261006/baseline.json';
export const BASELINE_HASH = 'c1fb425f0536e8f0f304ec5317511ad44219cc3be230b199571a769109e61f25';
export const contentHash = value => sha256(JSON.stringify(value));

export async function loadRoot(root = ROOT) {
  root = path.resolve(root);
  const captured = new Map();
  const readBytes = file => {
    file = path.resolve(file);
    const bytes = fs.readFileSync(file);
    captured.set(file, { file, bytes: bytes.length, sha256: sha256(bytes) });
    return bytes.toString('utf8');
  };
  const rootCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const { tsImport } = await import(pathToFileURL(path.join(root, 'node_modules/tsx/dist/esm/api/index.mjs')).href);
  const imported = new Set();
  const load = async relative => {
    const file = path.join(root, relative);
    const module = await tsImport(pathToFileURL(file).href, { parentURL: import.meta.url, tsconfig: path.join(root, 'tsconfig.json'), onImport: url => {
      if (url.startsWith('file:')) {
        const importedPath = fileURLToPath(new URL(url));
        if (!importedPath.includes('node_modules')) imported.add(importedPath);
      }
    } });
    return module.default ?? module;
  };
  const manuscript = await load('scripts/qa/concept-blank/student-clear/manuscript.ts');
  const materialize = await load('src/lib/textbook/scripts/materialize.ts');
  const sourcePlan = await load('scripts/qa/concept-blank/student-clear/source-plan.ts');
  const proposals = await load('scripts/qa/concept-blank/student-clear/proposals.ts');
  const bank = await load('src/lib/concept-blank/bank/index.ts');
  const corrections = await load('src/lib/textbook/scripts/corrections.ts');
  const assessments = await load('src/lib/concept-blank/bank/assessment.ts');
  const require = createRequire(path.join(root, 'package.json'));
  for (const file of Object.keys(require.cache)) {
    const clean = file.split('?')[0];
    if (clean.toLowerCase().startsWith(root.toLowerCase() + path.sep) && !clean.includes('node_modules')) imported.add(clean);
  }
  for (const file of imported) if (fs.existsSync(file)) readBytes(file);
  readBytes(path.join(root, 'tsconfig.json'));
  // Loaded code and production data must match the authoritative latest commit.
  const manuscriptBytes = Object.fromEntries(Object.keys(GRADES).map(code => [code, readBytes(path.join(root, `src/lib/textbook/scripts/${code}.json`))]));
  const ledgerBytes = readBytes(path.join(root, 'src/lib/textbook/scripts/static-corrections.json'));
  const sources = Object.fromEntries(Object.keys(bank.BANK_PARTS).map(part => [part, readBytes(path.join(root, `src/lib/concept-blank/bank/${part.replace(/plus$/, '-plus')}.ts`))]));
  const production = [...captured.keys()].filter(file => {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    return relative.startsWith('src/') || relative.startsWith('scripts/');
  });
  if (production.length) execFileSync('git', ['diff', '--quiet', 'HEAD', '--', ...production], { cwd: root });
  return { root, rootCommit, captured, readBytes, manuscriptBytes, ledgerBytes, sources, BANK_PARTS: bank.BANK_PARTS,
    deps: { planManuscriptCorrections: manuscript.planManuscriptCorrections, materializeGrade: materialize.materializeGrade, prepareBankSourceChanges: sourcePlan.prepareBankSourceChanges, staticCorrections: corrections.STATIC_CORRECTIONS, withAssessments: assessments.withAssessments, questionRevision: assessments.QUESTION_REVISION },
    proposalRows: proposals.proposalRows, normalizeProposal: proposals.normalizeProposal, proposedEntry: proposals.proposedEntry };
}

/** No compiler invocation and no fabricated independent packet approval. */
export function derivePreliminaryPlan(loaded, baseline) {
  const original = new Map(Object.entries(baseline).flatMap(([part, bank]) => bank.concepts.map(entry => [entry.id, { part, entry }])));
  const byId = new Map();
  const reportRoot = 'docs/planning/tracks/reports/concept-student-clear-20261006';
  const proposalFiles = ['e3e4/audit.json', 'e5e6/audit.json', 'm1m2m3/audit.json'].map(relative => path.join(loaded.root, reportRoot, relative));
  const definitionChanges = [], reviewedRows = [], definitionReasonGaps = [];
  const assessmentTables = Object.fromEntries(Object.keys(baseline).map(part => [part, {}]));
  for (const file of proposalFiles) {
    for (const row of loaded.proposalRows(JSON.parse(loaded.readBytes(file)))) {
      const source = original.get(row.id);
      if (!source || byId.has(row.id)) throw Error('Unknown/duplicate proposal: ' + row.id);
      const normalized = loaded.normalizeProposal(row, source.entry);
      if (!normalized) throw Error('Incomplete current proposal: ' + row.id);
      let candidate = loaded.proposedEntry(normalized);
      if (candidate.definition !== source.entry.definition && (typeof normalized.coreReason !== 'string' || !normalized.coreReason.trim())) {
        definitionReasonGaps.push({ id: row.id, part: source.part, before: source.entry.definition, proposedAfter: candidate.definition,
          rawCoreReasonPresent: Object.hasOwn(row, 'coreReason'), rawCoreReason: row.coreReason ?? null, normalizedCoreReason: normalized.coreReason ?? null,
          rawBReason: row.bReason ?? null, rawCReason: row.cReason ?? null, rawFinalEditorialReason: row.codexFinalEditorial?.reason ?? null,
          proposalFile: file, proposalFileSha256: loaded.captured.get(path.resolve(file)).sha256,
          blocker: 'Missing coreReason; excluded from preliminary definition changes; final compiler must resolve' });
        candidate = { ...candidate, definition: source.entry.definition };
      }
      byId.set(row.id, candidate);
      assessmentTables[source.part][row.id] = { bQuestion: candidate.bQuestion, clozeQuestion: candidate.clozeQuestion, ...(candidate.questionExclusions ? { questionExclusions: candidate.questionExclusions } : {}) };
      reviewedRows.push({ id: row.id, part: source.part, contentHash: normalized.hash, independentPackets: [] });
      if (candidate.definition !== source.entry.definition) {
        definitionChanges.push({ part: source.part, id: row.id, before: source.entry.definition, after: candidate.definition, reason: normalized.coreReason, contentHash: normalized.hash });
      }
    }
  }
  if (byId.size !== original.size) throw Error(`Incomplete current proposal scope: ${byId.size}/${original.size}`);
  const candidateParts = Object.fromEntries(Object.entries(baseline).map(([part, bank]) => [part, { ...bank, concepts: bank.concepts.map(entry => byId.get(entry.id)) }]));
  const plan = { status: PRELIMINARY_STATUS, revision: Object.values(candidateParts)[0].concepts[0].questionRevision,
    sourceCommit: loaded.rootCommit, baselineHash: contentHash(baseline), candidateBankHash: contentHash(candidateParts), count: original.size, assessmentTables,
    definitionChanges: definitionChanges.sort((a, b) => [...original.keys()].indexOf(a.id) - [...original.keys()].indexOf(b.id)),
    reviewedRows: [...original.keys()].map(id => reviewedRows.find(row => row.id === id)), proposalFiles, definitionReasonGaps,
    note: 'Current-question synthesis only; independentPackets are intentionally empty; cannot enter final preparation.' };
  return { plan, candidateParts };
}

export function expectedPins(input) {
  return { baselineHash: contentHash(input.baseline), candidateBankHash: input.plan.candidateBankHash, planHash: contentHash(input.plan), ledgerSha256: sha256(input.ledgerBytes),
    manuscriptSha256: Object.fromEntries(Object.entries(input.manuscriptBytes).map(([code, bytes]) => [code, sha256(bytes)])) };
}

export function verifyCaptured(loaded) {
  for (const row of loaded.captured.values())
    if (sha256(fs.readFileSync(row.file)) !== row.sha256) throw Error('Input changed during preparation: ' + row.file);
}
