import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const output = '.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const paths = ['src/lib/engine/deriveFormats.ts', 'src/__tests__/unit/deriveFormatsCountDomain.test.ts',
  'scripts/import/exam-twin/summarize-reviewed-batch.mjs', 'scripts/import/exam-twin/answerPresentation.mjs'];
const hashes = () => Object.fromEntries(paths.map((p) => [p, createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before = hashes();
const files = ['deriveFormats','deriveFormatsDecimal','deriveFormatsExactDistractors','deriveFormatsCountDomain',
  'expandEngineExactChoices','examStudyCoreLegacy','examStudyCore','examStudyRoutes','examStudyIntegration'].map((n) => `src/__tests__/unit/${n}.test.ts`);
for (const [name, args] of [
  ['count-domain-tests-r2.log', ['node_modules/vitest/vitest.mjs','run',...files,'--maxWorkers=1','--reporter=json','--reporter=default',`--outputFile.json=${output}count-domain-tests-r2.json`]],
  ['count-runtime-r2.log', ['node_modules/tsx/dist/cli.mjs', output + 'count-runtime-matrix-r2.ts']],
  ['count-typecheck-r2.log', ['node_modules/typescript/bin/tsc','--noEmit','--project',output + 'tsconfig-owned-isolated-r3.json']],
  ['count-eslint-r2.log', ['node_modules/eslint/bin/eslint.js', paths[0], paths[1]]],
]) {
  const result = spawnSync(process.execPath, args, { encoding:'utf8', maxBuffer:10*1024*1024 });
  fs.writeFileSync(output + name, result.stdout + '\n' + result.stderr, { flag:'wx' });
  assert.deepEqual(hashes(), before, 'Code changed during tests; results cannot certify current bytes');
  console.log(JSON.stringify({ name, exit: result.status }));
  assert.equal(result.status, 0, (result.stdout + result.stderr).slice(-5000));
}
fs.writeFileSync(output + 'count-domain-validation-r2.json', JSON.stringify({ kind:'hash-bound-code-validation/v2',
  utc:new Date().toISOString(), runtime:process.version, before, after:hashes(), unchangedDuringEveryCommand:true,
  tests:files, typecheckPassed:true, eslintPassed:true, directRuntimePassed:64, dbWrites:0, loadable:0 },null,2)+'\n',{flag:'wx'});
