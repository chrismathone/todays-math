"""Prepare M2 figure labels, retaining the two actual given sides only."""
from pathlib import Path
import hashlib
import json

ROOT = Path.cwd()
OUT = ROOT / '.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m2-pytha-given-dims-candidate-20261021-r1'
assert not OUT.exists()
rel = 'src/lib/middle/m2Pytha.ts'
raw = (ROOT / rel).read_bytes()
text = raw.decode('utf-8').replace('\r\n', '\n')
def once(old, new):
    global text
    assert text.count(old) == 1
    text = text.replace(old, new, 1)
once('  dimA: string;\n  dimB: string;\n}): Record<string, unknown> {\n  const { legA, legB, hyp, dimA, dimB } = opts;',
     '  dimA?: string;\n  dimB?: string;\n  dimHyp?: string;\n}): Record<string, unknown> {\n  const { legA, legB, hyp, dimA, dimB, dimHyp } = opts;')
once('      ca: { points: ["C", "A"], label: dimA, side: "auto" },\n      cb: { points: ["C", "B"], label: dimB, side: "auto" },',
     '      ...(dimA ? { ca: { points: ["C", "A"], label: dimA, side: "auto" } } : {}),\n'
     '      ...(dimB ? { cb: { points: ["C", "B"], label: dimB, side: "auto" } } : {}),\n'
     '      ...(dimHyp ? { ab: { points: ["A", "B"], label: dimHyp, side: "auto" } } : {}),')
start = text.index('  // ── 10 피타고라스')
end = text.index('  // ── 11 피타고라스', start)
block = text[start:end]
assert block.count('          dimA: `${b} cm`,') == 1
replacement = block.replace('          dimA: `${b} cm`,',
    '          // CA is a derived length; show only the CB and AB given in the stem.\n          dimHyp: `${c} cm`,', 1)
text = text[:start] + replacement + text[end:]
target = OUT / rel
target.parent.mkdir(parents=True)
target.write_bytes(text.encode('utf-8'))
assert (ROOT / rel).read_bytes() == raw
manifest = dict(kind='m2-pytha-given-only-figure-label-candidate/v1',
    status='unapplied-static-review-and-runtime-pending', handoff='M2',
    typeKey='2-2|피타고라스 정리|10', path=rel,
    originalSha256=hashlib.sha256(raw).hexdigest(),candidate=target.relative_to(ROOT).as_posix(),
    candidateSha256=hashlib.sha256(target.read_bytes()).hexdigest(),
    changed='Only dimension attachment: CB=a and AB=c; derived CA=b unlabelled. Geometry and numeric text stay unchanged.',
    helperOtherConsumer='09 keeps its given CA and CB labels; no hypotenuse label',
    futureFamilyVersionRequired='20261021-given-only-altitude-dimensions-r1',
    actualSeedOrRendererExecutions=0, productionChanged=False, DBWrites=0,
    officialWholeGradeRightsNativeOrReleaseApproved=False)
(OUT/'proposal.json').write_bytes((json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(candidateFiles=1,applied=False)))
