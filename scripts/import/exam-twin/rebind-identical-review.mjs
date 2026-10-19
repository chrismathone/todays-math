/** Relocate review provenance only. No review, approval, model, DB or writer. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { currentPackage, auditCollectedPack } from './review-exam-twins.mjs';
import { prepareSealedReview } from './prepare-sealed-review.mjs';
import { assertRawSolveReadable, bindCandidate, digest, newOutputPath, readJson, sha256 } from './candidatePack.mjs';

const workflow = fileURLToPath(new URL('./review-exam-twins.mjs', import.meta.url));
const nameFor = (n) => `q${String(n).padStart(2, '0')}.json`;
const json = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
const hash = (p) => sha256(fs.readFileSync(p));
function requireSame(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
}
function tree(root) {
  const result = {};
  const visit = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      assert(!item.isSymbolicLink(), 'Input trees must not contain symlinks');
      if (item.isDirectory()) visit(p);
      else { assert(item.isFile(), 'Only ordinary input files are supported'); result[path.relative(root, p)] = hash(p); }
    }
  };
  visit(root);
  return result;
}
function readText(p) {
  return new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p));
}
function within(root, file) {
  const r = path.relative(root, file);
  return !r || (!r.startsWith('..') && !path.isAbsolute(r));
}

/** selectionIndex: path to {questions:[{n,id,candidate:<path>,sha256}]}.
 * Paths resolve against workspace. Selection must bijectively match old IDs.
 * Failures throw code NEW_REVIEW_REQUIRED and never copy a report first.
 * An interrupted/failed NEW root is retained for evidence; never overwritten.
 */
export function rebindIdenticalReview({ oldRoot, selectionIndex, rawCommit, rawSolveDir, newRoot, workspace = process.cwd() }) {
  try {
    return rebind({ oldRoot, selectionIndex, rawCommit, rawSolveDir, newRoot, workspace });
  } catch (cause) {
    const error = new Error(`NEW_REVIEW_REQUIRED: ${cause.message}`, { cause });
    error.code = 'NEW_REVIEW_REQUIRED';
    throw error;
  }
}

function rebind({ oldRoot, selectionIndex, rawCommit, rawSolveDir, newRoot, workspace }) {
  workspace = fs.realpathSync(workspace);
  const resolve = (p) => path.resolve(workspace, p);
  const old = fs.realpathSync(resolve(oldRoot));
  const raw = fs.realpathSync(resolve(rawSolveDir));
  const output = newOutputPath(newRoot, workspace);
  // Reject internal junction aliases too (including aliases into dependencies
  // or old evidence). The underlying helper already rejects external escapes.
  for (let ancestor = path.dirname(output); path.relative(workspace, ancestor) !== ''; ancestor = path.dirname(ancestor)) {
    assert(ancestor !== path.dirname(ancestor), 'Output ancestry must reach workspace');
    if (fs.existsSync(ancestor)) assert(!fs.lstatSync(ancestor).isSymbolicLink(), 'Output symlink/junction aliases are forbidden');
  }
  assert(!within(old, output) && !within(raw, output), 'NEW root must not modify an input tree');
  const indexPath = resolve(selectionIndex);
  const indexSha = hash(indexPath);
  const selection = readJson(indexPath);
  assert.deepEqual(Object.keys(selection).sort(), ['questions'], 'Expected strict questions selection index');
  assert(Array.isArray(selection.questions) && selection.questions.length > 0, 'Empty selection');
  const questions = selection.questions.map((q) => {
    requireSame(Object.keys(q).sort(), ['candidate', 'id', 'n', 'sha256'], 'Unexpected selection fields');
    assert(Number.isInteger(q.n) && q.n > 0 && typeof q.id === 'string' && q.id.startsWith('exam-twin-'));
    assert(typeof q.candidate === 'string' && /^[a-f0-9]{64}$/u.test(q.sha256));
    const file = fs.realpathSync(resolve(q.candidate));
    assert(!within(path.dirname(file), output), 'NEW root must not modify author input directories');
    requireSame(hash(file), q.sha256, 'CURRENT author raw SHA mismatch');
    const candidate = readJson(file);
    requireSame(candidate.twinExternalId, q.id, 'CURRENT author ID mismatch');
    requireSame(candidate.questionNumber, q.n, 'CURRENT author number mismatch');
    return { ...q, file };
  });
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length, 'Duplicate selected ID');
  assert.equal(new Set(questions.map((q) => q.n)).size, questions.length, 'Duplicate selected number');
  const beforeTree = tree(old);
  const rawTree = tree(raw);
  const before = currentPackage(path.join(old, 'package'));
  const beforeAudit = auditCollectedPack(path.join(old, 'package'), path.join(old, 'blind'), path.join(old, 'verification'));
  requireSame(questions.map((q) => q.id).sort(), before.bindings.map((b) => b.candidate.twinExternalId).sort(), 'Exact old/current ID set required');
  const oldById = new Map(before.bindings.map((b) => [b.candidate.twinExternalId, b]));
  assert.equal(oldById.size, before.bindings.length, 'Duplicate old ID');
  const oldInputs = readJson(path.join(old, 'verification/verification-inputs.json'));
  assert.equal(oldInputs.length, questions.length, 'Verification input cardinality mismatch');
  const inputById = new Map(oldInputs.map((i) => [i.candidate.twinExternalId, i]));
  assert.equal(inputById.size, oldInputs.length, 'Duplicate verification ID');
  assert(/^[a-f0-9]{7,40}$/u.test(rawCommit), 'Explicit raw Git commit required');
  const git = (...args) => execFileSync('git', args, { cwd: workspace, maxBuffer: 8 * 1024 * 1024 });
  const commit = git('rev-parse', '--verify', `${rawCommit}^{commit}`).toString('utf8').trim();
  git('merge-base', '--is-ancestor', commit, 'HEAD');
  const gitRoot = fs.realpathSync(git('rev-parse', '--show-toplevel').toString('utf8').trim());
  assert(within(gitRoot, raw) && raw !== gitRoot, 'Raw proof directory must belong to this Git worktree');
  const proofRows = questions.map((q) => {
    const b = oldById.get(q.id), input = inputById.get(q.id);
    assert(input, 'Old reviewed input ID missing');
    requireSame(q.n, b.candidate.questionNumber, 'ID cannot be rebound to another question number');
    requireSame(input.candidate, b.candidate, 'Old reviewed private candidate mismatch');
    for (const k of ['candidateDigest', 'studentDigest', 'assetDigest']) requireSame(input[k], b[k], `Old verification ${k} mismatch`);
    const name = nameFor(q.n), rawFile = path.join(raw, name);
    const gitPath = path.relative(gitRoot, rawFile).replaceAll('\\', '/');
    const sealed = git('show', `${commit}:${gitPath}`);
    requireSame(fs.readFileSync(rawFile), sealed, 'Working raw differs from Git blob');
    requireSame(fs.readFileSync(path.join(old, 'blind/solve', name)), sealed, 'Old blind raw differs from Git blob');
    const solve = readJson(rawFile);
    assertRawSolveReadable(solve, b.candidate.questionType);
    assert(solve.status === 'solved' && solve.solverId && solve.solverId !== b.candidate.authorId, 'Independent solved proof required');
    requireSame(solve.studentDigest, b.studentDigest, 'Raw student digest mismatch');
    requireSame(input.independentSolve, solve, 'Old reviewed solve changed');
    requireSame(input.solveDigest, digest(solve), 'Old input solve digest mismatch');
    const reportFile = path.join(old, 'verification/reports', name);
    const report = readJson(reportFile);
    assert(['verified', 'pending', 'rejected'].includes(report.status), 'Review status required');
    assert(report.method === 'independent-solve-then-review' && report.verifierId && report.verifierId !== b.candidate.authorId, 'Independent report required');
    for (const k of ['candidateDigest', 'studentDigest', 'assetDigest']) requireSame(report[k], b[k], `Report ${k} mismatch`);
    requireSame(report.solveDigest, digest(solve), 'Report solve digest mismatch');
    return { q, b, name, rawFile, reportFile, reportSha256: hash(reportFile), reportStatus: report.status, gitPath, rawSha256: sha256(sealed), solveDigest: digest(solve) };
  });
  // No old files or author inputs are rewritten. All output lives under NEW root.
  fs.mkdirSync(output, { recursive: true });
  const run = (...args) => execFileSync(process.execPath, [workflow, ...args], { cwd: workspace, stdio: 'pipe' });
  run('freeze', path.join(output, 'package'), ...questions.map((q) => q.file));
  const after = currentPackage(path.join(output, 'package'));
  const afterById = new Map(after.bindings.map((b) => [b.candidate.twinExternalId, b]));
  const rows = proofRows.map((p) => {
    const next = afterById.get(p.q.id);
    assert(next, 'Direct freeze lost selected ID');
    requireSame(fs.readFileSync(next.candidateFile), fs.readFileSync(p.b.candidateFile), 'Entire private candidate bytes changed (including answer/solution/source/grade/classification metadata)');
    for (const k of ['candidateFileSha256', 'candidateDigest', 'studentDigest', 'assetDigest']) requireSame(next[k], p.b[k], `Reviewed ${k} changed`);
    const binding = after.manifest.bindings.find((b) => b.privateCandidatePath === next.privateCandidatePath);
    requireSame(binding.authoredInput, { path: p.q.file, sha256: p.q.sha256 }, 'Direct CURRENT author freeze binding mismatch');
    return { id: p.q.id, n: p.q.n, authoredInput: binding.authoredInput, candidateFileSha256: next.candidateFileSha256, candidateDigest: next.candidateDigest, studentDigest: next.studentDigest, assetDigest: next.assetDigest, solveDigest: p.solveDigest, rawSha256: p.rawSha256, reportSha256: p.reportSha256, reportStatus: p.reportStatus, entirePrivateCandidateBytesIdentical: true };
  });
  run('blind', path.join(output, 'package'), path.join(output, 'blind'));
  for (const p of proofRows) fs.copyFileSync(p.rawFile, path.join(output, 'blind/solve', p.name), fs.constants.COPYFILE_EXCL);
  const seal = prepareSealedReview(path.join(output, 'package'), path.join(output, 'blind'), commit, raw, path.join(output, 'verification'), workspace);
  const newInputs = readJson(path.join(output, 'verification/verification-inputs.json'));
  for (const p of proofRows) {
    const i = newInputs.find((x) => x.candidate.twinExternalId === p.q.id);
    requireSame(i.solveDigest, p.solveDigest, 'New sealed solve digest changed');
    requireSame(hash(p.reportFile), p.reportSha256, 'Old report changed during rebind');
    const currentAuthor = bindCandidate(p.q.file);
    requireSame(currentAuthor.candidateFileSha256, p.q.sha256, 'CURRENT author changed before report carry');
    requireSame(currentAuthor.assetDigest, p.b.assetDigest, 'CURRENT author assets changed before report carry');
    requireSame(currentAuthor.studentDigest, p.b.studentDigest, 'CURRENT author student changed before report carry');
  }
  // Only after all candidates/assets/Git proofs match may unchanged reports carry.
  for (const p of proofRows) {
    const target = path.join(output, 'verification/reports', p.name);
    fs.copyFileSync(p.reportFile, target, fs.constants.COPYFILE_EXCL);
    requireSame(hash(target), p.reportSha256, 'Report bytes changed');
    readText(target); // Strict UTF-8 reopen, including Korean/glyphs.
  }
  const afterAudit = auditCollectedPack(path.join(output, 'package'), path.join(output, 'blind'), path.join(output, 'verification'));
  for (const r of afterAudit.results) {
    const oldResult = beforeAudit.results.find((x) => x.twinExternalId === r.twinExternalId);
    for (const key of ['studentDigest', 'candidateDigest', 'assetDigest', 'solveDigest', 'reportSha256', 'mathematicalVerified', 'gradeReviewed']) requireSame(r[key], oldResult[key], `Collected ${key} changed`);
    assert(oldResult.reasons.every((reason) => r.reasons.includes(reason)), 'An old hold disappeared');
    assert(r.loadable === false && r.overallVerified === false, 'Rebinding cannot release');
  }
  requireSame(tree(old), beforeTree, 'Old pack/proof/report bytes changed');
  requireSame(tree(raw), rawTree, 'Raw proof bytes changed');
  requireSame(hash(indexPath), indexSha, 'Selection index changed during rebind');
  for (const q of questions) requireSame(hash(q.file), q.sha256, 'CURRENT author changed during rebind');
  const receipt = { kind: 'identical-reviewed-payload-author-lineage-rebinding/v2', oldRoot: old, selectionIndex: { path: indexPath, sha256: indexSha }, rawCommit: seal.rawCommit,
    oldPackageDigest: before.manifest.packageDigest, currentPackageDigest: after.manifest.packageDigest, oldGates: before.manifest.gates, currentGates: after.manifest.gates,
    rows, beforeAudit, afterAudit, preservedOldFileHashes: beforeTree, preservedRawFileHashes: rawTree,
    oldFilesModified: false, newMathematicalReviewClaimed: false, newMathApprovals: 0, newGradeApprovals: 0, newRightsApprovals: 0, loadable: 0, dbWrites: 0,
    limitations: ['Byte identity reuses existing reports; no new substantive review or person-level exposure certification.', 'Pending/rejected reports and all old held reasons remain held; source/rights/similarity/native provenance are separate.', 'A failed NEW root is retained for inspection and cannot be reused or overwritten.'] };
  json(path.join(output, 'rebind-receipt.json'), receipt);
  requireSame(readJson(path.join(output, 'rebind-receipt.json')), receipt, 'Receipt UTF-8 reopen mismatch');
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 7, 'old-reviewed-root CURRENT-selection-index rawCommit rawSolveDir NEW-root');
    const [oldRoot, selectionIndex, rawCommit, rawSolveDir, newRoot] = process.argv.slice(2);
    const result = rebindIdenticalReview({ oldRoot, selectionIndex, rawCommit, rawSolveDir, newRoot });
    console.log(JSON.stringify({ rebound: result.rows.length, newMathApprovals: 0, newGradeApprovals: 0, newRightsApprovals: 0, loadable: 0 }));
  } catch (error) {
    console.error(error.code === 'NEW_REVIEW_REQUIRED' ? error.message : `NEW_REVIEW_REQUIRED: ${error.message}`);
    process.exitCode = 1;
  }
}
