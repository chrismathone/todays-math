/** CLI writes only to a NEW D:/tmp directory or this artifact's helper-output subdirectory. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareSourceSync, sha256 } from './prepare-source-sync.mjs';
import { loadRoot, BASELINE, BASELINE_HASH, ROOT, derivePreliminaryPlan, expectedPins, verifyCaptured, contentHash } from './root-inputs.mjs';

const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i++) {
  const name = args[i];
  if (!['--preliminary', '--root', '--baseline', '--baseline-hash', '--plan', '--plan-sha256', '--candidate', '--out'].includes(name) || name in options) throw Error('Unknown/duplicate option: ' + name);
  options[name] = name === '--preliminary' ? true : args[++i];
  if (!options[name] || (typeof options[name] === 'string' && options[name].startsWith('--'))) throw Error('Missing option value: ' + name);
}
if (!options['--out']) throw Error('--out must name a NEW helper-output directory');
const out = path.resolve(options['--out']);
const artifact = path.dirname(fileURLToPath(import.meta.url));
const allowed = [path.resolve('D:/tmp'), path.join(artifact, 'helper-output')];
if (!allowed.some(base => out.toLowerCase().startsWith(base.toLowerCase() + path.sep)) || fs.existsSync(out)) throw Error('Output must be NEW and inside D:/tmp or artifact/helper-output');
if (out.toLowerCase().startsWith(allowed[0].toLowerCase() + path.sep) && !path.relative(allowed[0], out).startsWith('source-sync-assist-')) throw Error('D:/tmp output must use a unique source-sync-assist- prefix');
let ancestor = path.dirname(out);
while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
if (fs.realpathSync(ancestor).toLowerCase() !== ancestor.toLowerCase()) throw Error('Output ancestor is a junction/symlink');
const loaded = await loadRoot(options['--root'] ?? ROOT);
const baselineDocument = JSON.parse(loaded.readBytes(options['--baseline'] ?? BASELINE));
const baseline = baselineDocument.parts;
const baselineHash = options['--baseline-hash'] ?? BASELINE_HASH;
if (contentHash(baseline) !== baselineHash || contentHash(loaded.BANK_PARTS) !== baselineHash) throw Error('Immutable baseline/current source mismatch');
let plan, candidateParts, mode;
if (options['--preliminary']) {
  if (options['--plan'] || options['--candidate']) throw Error('Preliminary synthesis cannot accept a final plan/candidate');
  ({ plan, candidateParts } = derivePreliminaryPlan(loaded, baseline)); mode = 'preliminary';
} else {
  if (!options['--plan'] || !/^[a-f0-9]{64}$/.test(options['--plan-sha256'] ?? '')) throw Error('Final replay requires --plan and separately pinned --plan-sha256');
  const bytes = loaded.readBytes(options['--plan']);
  if (sha256(bytes) !== options['--plan-sha256']) throw Error('Final application-plan bytes differ from pin');
  plan = JSON.parse(bytes); mode = 'final';
  if (plan.sourceCommit !== baselineDocument.sourceCommit) throw Error('Compiler sourceCommit differs from immutable baseline');
  if (options['--candidate']) { const document = JSON.parse(loaded.readBytes(options['--candidate'])); candidateParts = document.candidateParts ?? document.parts ?? document; }
}
const compilerSourceBytes = Object.fromEntries((mode === 'final' ? plan.capturedSources ?? [] : []).map(row => [row.file, loaded.readBytes(row.file)]));
const input = { mode, plan, baseline, candidateParts, sources: loaded.sources, manuscriptBytes: loaded.manuscriptBytes, ledgerBytes: loaded.ledgerBytes, compilerSourceBytes };
input.expected = expectedPins(input); input.expected.baselineHash = baselineHash;
const result = prepareSourceSync(input, loaded.deps);
verifyCaptured(loaded);
fs.mkdirSync(out, { recursive: true });
const write = (relative, bytes) => { const file = path.join(out, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); return { file: relative, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) }; };
const outputFiles = [];
for (const output of result.outputs) {
  outputFiles.push(write('before/' + output.file, output.before));
  outputFiles.push(write('after/' + output.file, output.after));
}
outputFiles.push(write('application-plan.json', JSON.stringify(plan, null, 2) + '\n'));
outputFiles.push(write('candidate-parts.json', JSON.stringify(candidateParts ?? loaded.deps.prepareBankSourceChanges({ plan, baseline, sources: loaded.sources }).candidateParts, null, 2) + '\n'));
outputFiles.push(write('changed-turns-reread.json', JSON.stringify(result.reread, null, 2) + '\n'));
outputFiles.push(write('unchanged-segments.json', JSON.stringify(result.outputs.map(({ file, edits, unchangedSegments }) => ({ file, edits, unchangedSegments })), null, 2) + '\n'));
outputFiles.push(write('input-byte-sha.json', JSON.stringify({ root: loaded.root, rootCommit: loaded.rootCommit, files: [...loaded.captured.values()] }, null, 2) + '\n'));
const manifest = { status: result.status, root: loaded.root, rootCommit: loaded.rootCommit, out, mode, baselineHash, candidateBankHash: plan.candidateBankHash,
  summary: result.summary, definitionReasonGaps: plan.definitionReasonGaps ?? [], productionFilesWritten: false, finalCompilePerformed: false, semanticApproval: 'Not performed; Root/Claude own per-ID mathematics and final release',
  pins: input.expected, manuscriptOutputs: result.outputs.map(({ file, beforeSha256, afterSha256, edits }) => ({ file, beforeSha256, afterSha256, changedStringTokens: edits.length })), outputFiles };
write('output-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ status: manifest.status, out, rootCommit: loaded.rootCommit, baselineHash, candidateBankHash: plan.candidateBankHash,
  summary: { ...result.summary, definitionChangesWithoutManuscriptTurns: result.summary.definitionChangesWithoutManuscriptTurns.length },
  definitionReasonGaps: plan.definitionReasonGaps ?? [], inputFiles: loaded.captured.size, outputManifest: path.join(out, 'output-manifest.json'), productionFilesWritten: false }, null, 2));
