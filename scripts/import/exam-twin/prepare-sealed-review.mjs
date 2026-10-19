/** Bind actual Git raw-proof bytes before creating an answer-exposing packet.
 * This proves content binding, not a person's absence of prior answer exposure.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { currentPackage } from './review-exam-twins.mjs';
import { assertRawSolveReadable, newOutputPath, readJson, sha256 } from './candidatePack.mjs';

export function prepareSealedReview(packageDirectory, blindDirectory, rawCommit, rawSolveDirectory, outputDirectory, workspace = process.cwd()) {
  assert(/^[a-f0-9]{7,40}$/u.test(rawCommit), 'An explicit Git commit hash is required');
  const output = newOutputPath(outputDirectory, workspace);
  const git = (args) => execFileSync('git', args, { cwd: workspace, maxBuffer: 4 * 1024 * 1024 });
  const commit = git(['rev-parse', '--verify', `${rawCommit}^{commit}`]).toString('utf8').trim();
  git(['merge-base', '--is-ancestor', commit, 'HEAD']);
  const gitRoot = git(['rev-parse', '--show-toplevel']).toString('utf8').trim();
  const rawDirectory = fs.realpathSync(path.resolve(workspace, rawSolveDirectory));
  const relative = path.relative(gitRoot, rawDirectory);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Raw directory must belong to this Git worktree');
  const { bindings } = currentPackage(path.resolve(workspace, packageDirectory));
  const proofs = bindings.map((b) => {
    const name = `q${String(b.candidate.questionNumber).padStart(2, '0')}.json`;
    const raw = path.join(rawDirectory, name);
    const gitPath = path.relative(gitRoot, raw).replaceAll('\\', '/');
    const sealed = git(['show', `${commit}:${gitPath}`]);
    const hash = sha256(sealed);
    assert.equal(sha256(fs.readFileSync(raw)), hash, 'Working raw proof differs from the sealed Git blob');
    assert.equal(sha256(fs.readFileSync(path.resolve(workspace, blindDirectory, 'solve', name))), hash, 'Blind raw proof differs from the sealed Git blob');
    const solve = readJson(raw);
    assert.equal(solve.studentDigest, b.studentDigest, 'Sealed proof is for another student version');
    assert(solve.solverId && solve.solverId !== b.candidate.authorId, 'Author cannot be the independent solver');
    assert.equal(solve.status, 'solved', 'Only solved selected questions may expose answers');
    assertRawSolveReadable(solve, b.candidate.questionType);
    return { n: b.candidate.questionNumber, gitPath, sha256: hash, studentDigest: b.studentDigest };
  });
  // All Git checks happen before the existing tool can write authored answers.
  execFileSync(process.execPath, [fileURLToPath(new URL('./review-exam-twins.mjs', import.meta.url)),
    'verify-pack', path.resolve(workspace, packageDirectory), path.resolve(workspace, blindDirectory), output], { cwd: workspace, stdio: 'pipe' });
  const receipt = { kind: 'git-bound-pre-exposure-review/v1', createdAt: new Date().toISOString(),
    rawCommit: commit, proofs, personPriorExposureVerified: false,
    exposureDeclarationRequired: true, rawFilesModified: false, loadable: false, dbWrites: 0 };
  fs.writeFileSync(path.join(output, 'sealed-raw-commit.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 7, 'package blind rawCommit rawSolveDirectory NEW-review-directory');
  const receipt = prepareSealedReview(...process.argv.slice(2));
  console.log(JSON.stringify({ rawCommit: receipt.rawCommit, gitBoundProofs: receipt.proofs.length, loadable: 0, dbWrites: 0 }));
}
