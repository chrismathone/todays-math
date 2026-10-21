"""Retain R1; constrain both given angle arcs to the fitted parallelogram."""
from pathlib import Path
import hashlib
import json

ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
R1 = ROOT / '.qa-artifacts/exam-resume-20261008/m28-parameter-figure-candidate-20261021-r1/own-m2Quad.ts'
raw = R1.read_bytes()
assert hashlib.sha256(raw).hexdigest() == '3ed5332cf5ff2e535c3aa3f641a3965b2db704d981a917fabd6dc26f0579b6b6'
text = raw.decode('utf-8').replace('\r\n', '\n')
start = text.index('function figCondAngles(')
end = text.index('\n}\n', start) + 3
before = text[start:end]
needle = '''  return {
    version: 2,
    points: fitPts(pts),'''
addition = '''  const points = fitPts(pts);
  let angleRadius: number | undefined;
  if (theta !== undefined) {
    // Radius is in the fitted diagram's units. Keep the given A/C arcs inside
    // both nonincident sides even when the supplementary B/D angle is small.
    const A = points.A!;
    const B = points.B!;
    const C = points.C!;
    const abX = A[0] - B[0], abY = A[1] - B[1];
    const bcX = C[0] - B[0], bcY = C[1] - B[1];
    const twiceArea = Math.abs(abX * bcY - abY * bcX);
    const clearance = Math.min(twiceArea / Math.hypot(abX, abY), twiceArea / Math.hypot(bcX, bcY));
    angleRadius = Math.min(18, 0.65 * clearance);
    if (!Number.isFinite(angleRadius) || angleRadius <= 0) throw new Error("角 표시 여유가 없습니다");
  }
  return {
    version: 2,
    points,'''
assert before.count(needle) == 1
after = before.replace(needle, addition)
after = after.replace('arcs: 1 },', 'arcs: 1, ...(angleRadius === undefined ? {} : { radius: angleRadius }) },')
assert after.count('radius: angleRadius') == 2
after = after.replace('角 표시', '각 표시')
candidate = text[:start] + after + text[end:]
encoded = candidate.replace('\n', '\r\n').encode('utf-8') if b'\r\n' in raw else candidate.encode('utf-8')
(OUT / 'candidate-m2Quad.ts').write_bytes(encoded)
sha = hashlib.sha256(encoded).hexdigest()
runner = (OUT.parent / 'm28-figure-preview-20261021-r1/native-once.cjs').read_text(encoding='utf-8')
runner = runner.replace("path.join(root,'.qa-artifacts/exam-resume-20261008/m28-parameter-figure-candidate-20261021-r1/own-m2Quad.ts')", "path.join(__dirname,'candidate-m2Quad.ts')")
runner = runner.replace('3ed5332cf5ff2e535c3aa3f641a3965b2db704d981a917fabd6dc26f0579b6b6', sha)
(OUT / 'native-once.cjs').write_bytes(runner.encode('utf-8'))
for name in ['run_native_once.py', 'render_contact.py']:
    (OUT / name).write_bytes((OUT.parent / 'm28-figure-preview-20261021-r1' / name).read_bytes())
record = dict(candidateSHA256=sha, previousCandidateSHA256=hashlib.sha256(raw).hexdigest(),
              onlyHelperChangedFromR1=True, geometryAndAllGivenMarksPreserved=True,
              productionModuleReplaced=False, R1Disposition='failed visual containment for9/16 despite native success', dbWrites=0)
(OUT / 'candidate.json').write_bytes((json.dumps(record, indent=2) + '\n').encode('utf-8'))
print(json.dumps(record))
