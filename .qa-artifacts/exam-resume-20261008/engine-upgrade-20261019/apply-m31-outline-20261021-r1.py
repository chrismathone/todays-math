"""Apply the independently static-reviewed boundary graph, with a new revision."""
from pathlib import Path
import datetime
import hashlib
import json

E = Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019')
out = E / 'm31-outline-applied-20261021-r1.json'
assert not out.exists()
proposal_path = E / 'm31-outline-candidate-20261021-r1/proposal.json'
p = json.loads(proposal_path.read_text(encoding='utf-8'))
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
assert sha(p['path']) == p['originalSha256']
assert sha(p['candidate']) == p['candidateSha256']
adapter = Path('src/lib/examStudy/adapters.ts')
before = adapter.read_bytes()
needle = 'const LEGACY_FAMILY_VERSIONS: Readonly<Record<string, string>> = {\n'
text = before.decode('utf-8').replace('\r\n','\n')
assert text.count(needle) == 1
after = text.replace(needle, needle + '  "1-2|다각형|04": "20261021-outline-before-student-diagonals-r1",\n', 1)
test = Path('src/__tests__/unit/middleM1PolygonQuestionFigure.test.ts')
assert not test.exists()
Path(p['path']).write_bytes(Path(p['candidate']).read_bytes())
adapter.write_bytes(after.encode('utf-8'))
test.write_bytes((E / 'm31-outline-test-proposal-20261021-r1.ts').read_bytes())
out.write_bytes((json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    proposal=dict(path=proposal_path.as_posix(),sha256=sha(proposal_path)),
    source=dict(path=p['path'],sha256=sha(p['path'])),
    adapter=dict(path=adapter.as_posix(),beforeSha256=hashlib.sha256(before).hexdigest(),sha256=sha(adapter)),
    regression=dict(path=test.as_posix(),sha256=sha(test)),
    independentStaticReviewCommit='02535a0c0b58a3f7041ce89359a79952c951c395',
    staticGraphAssertions=30, runtimeAndRendererPending=True,
    numericalStemAnswerOrSolutionChanged=False, existingQuestionOrBankOrDBWrites=0,
    gradeRightsNativeOrPublicReleaseApproval=False),indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(localEngineFiles=2,newTestFiles=1,actualRuntimePending=True,DBWrites=0)))
