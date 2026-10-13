// 노변 저작 r1 — 새 FigureSpec v2 를 기존 서버 벡터 엔진(strict · typeset · sanitize)으로 SVG 로 만든다.
// 경상 저작(gyeongsang-remaining-authoring-r1/render_assets.mts)과 같은 길을 이 작업트리 안에서 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(out, '../../..');
process.env.PYTHONDONTWRITEBYTECODE = '1';
process.env.FIGURE_ENGINE_PATH = path.join(repo, 'vendor/figure-engine');
process.chdir(repo);
const {renderFigureSpec} = await import(pathToFileURL(path.join(repo, 'src/lib/figure/renderFigureSpec.ts')).href);
const sha = (p: string) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rows = JSON.parse(fs.readFileSync(path.join(out, 'assets-to-render.json'), 'utf8'));
const receipt: any[] = [];
for (const row of rows) {
  assert.equal(sha(row.spec.path), row.spec.sha256, `spec changed: ${row.spec.path}`);
  const spec = JSON.parse(fs.readFileSync(row.spec.path, 'utf8'));
  const output = path.resolve(row.svgPath);
  assert(output.startsWith(out + path.sep));
  const result = await renderFigureSpec(spec, {strict: true, typeset: true});
  receipt.push({...row, strict: true, typeset: true, result: result.ok ? 'rendered' : result.error,
    droppedDimensions: result.ok ? [...(result.droppedDimensions ?? [])] : []});
  if (!result.ok) {
    fs.writeFileSync(path.join(out, 'strict-render-failure.json'), JSON.stringify(receipt, null, 2) + '\n');
    throw Error(`q${row.questionNumber}: ${result.error}`);
  }
  assert.equal(result.droppedDimensions?.length ?? 0, 0);
  fs.writeFileSync(output, result.svg);
  receipt.at(-1).svgSha256 = sha(output);
}
const engineFiles = ['src/lib/figure/renderFigureSpec.ts', 'scripts/figure/render_spec.py', 'scripts/figure/engine_path.py', 'src/lib/figure/mathjaxSubstitute.ts'];
fs.writeFileSync(path.join(out, 'strict-render-receipt.json'), JSON.stringify({
  method: 'current existing server vector engine, strict=true, typeset=true, sanitize boundary',
  engineFiles: engineFiles.map((f) => ({path: f, sha256: sha(path.join(repo, f))})),
  assets: receipt, newVectorCount: receipt.length, originalCropsUsedAsStudentAssets: false,
  pythonBytecodeDisabled: true, sharedDependenciesWritten: false, inferenceApiCalls: 0,
  nativeReaderParity: false, independentFigureApproval: false,
}, null, 2) + '\n');
console.log(JSON.stringify({rendered: receipt.length, strict: true, typeset: true, dropped: 0}));
