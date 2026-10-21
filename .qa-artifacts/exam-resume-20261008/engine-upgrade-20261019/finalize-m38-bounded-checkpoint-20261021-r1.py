"""Seal bounded math results without claiming the RAM-blocked wider checks."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
E = B / 'engine-upgrade-20261019'
def ref(path):
    p = Path(path)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())
old = B / 'engine-upgrades-progress-r45.json'
out = B / 'engine-upgrades-progress-r46.json'
assert not out.exists()
x = json.loads(old.read_text(encoding='utf-8'))
red = E / 'm38-red-20261021-r1.json'
green = E / 'm38-green-20261021-r1.json'
r, g = (json.loads(p.read_text(encoding='utf-8')) for p in (red, green))
assert r['numFailedTests'] == 8 and g['success'] and g['numPassedTests'] == 8 and g['numFailedTests'] == 0
independent = B / 'm38-priority-math-postchange-20261021-r1/own-dynamic-report.json'
assert ref(independent)['sha256'] == '0ffc998f8a59505876b3da6b35f0fa3375fefd431c1b57e99caf99b37ba6d94e'
assert json.loads(independent.read_text(encoding='utf-8'))['executionFinished']
changed = ['src/lib/middle/m2GeoSim.ts', 'src/lib/middle/m2Center.ts', 'src/lib/middle/m2Mono.ts',
    'src/lib/examStudy/adapters.ts', 'src/__tests__/unit/middleM2Mono.test.ts',
    'src/__tests__/unit/middleM2FeasibleConditions.test.ts']
paths = list(dict.fromkeys([p['path'] for p in x['code']] + changed))
code = [ref(p) for p in paths]
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
finding = dict(id='U65', area='M8/M9/M19 feasible triangles and M20 disjoint exponent unknowns',
    status='implemented-bounded-math-pass-wider-regression-types-lint-pending-memory',
    code=[ref(p) for p in changed], parentRed=ref(red), parentGreen=ref(green),
    parentPrototypeCases=8, parentActualApiSeedsPerType=100, parentForcedParameterCases=373,
    repositoryTestBigIntSpellingDiffersFromPrototype=True,
    independent=ref(independent), independentCommit='ae9fab55ee5534c465b0cdf3ab907c3718161c02',
    independentActualOutputs=120, independentTargetedMathOutputs=105,
    previousMathOutputCountNotNewQuestions=True, widerChecksExecuted=False,
    gradeRightsNativeOrPublicReleaseApproval=False, issuedQuestionOrBankOrDBWrites=0)
x.update(kind='exam-engine-upgrades-progress/v46', version=46, createdAt=now, previous=ref(old),
    report='docs/planning/tracks/reports/exam-engine-middle-feasible-inputs-20261021.md', code=code,
    checkpointDelta='U65 exact reviewed r3 code applied after actual sealed prechange replay; bounded parent8 and independent105 target outputs pass, broader9files/types/lint explicitly pending RAM. Existing questions/DB unchanged.',
    pendingM38=dict(findings=['M8','M9','M19','M20'],status=finding['status'],
        productionMathChanged=True, independent=ref(independent), widerChecksPending=True),
    currentMainRuntimeValidation=dict(parentPrototype=ref(green), prototypeTestsPassed=8,
        independent=ref(independent), widerRegressionTypeAndLintPending=True,
        headAtCheck=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
        mainAtCheck=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()),
    wholeEngineComplete=False, wholeExtractionComplete=False, dbWrites=0, operationalLoads=0, deployed=False)
x['items'].append(finding)
x['validations']['U65BoundedMath']=finding
out.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
ip=B/'continuation-index.json';raw=ip.read_bytes();a=json.loads(raw);before=a['latestEngineCheckpoint'];after={**before,'utc':now,'progress':out.as_posix(),'sha256':ref(out)['sha256']}
needle=json.dumps(before,ensure_ascii=False,indent=2).replace('\n','\n  ').encode()
replacement=json.dumps(after,ensure_ascii=False,indent=2).replace('\n','\n  ').encode()
assert raw.count(needle)==1
ip.write_bytes(raw.replace(needle,replacement,1))
print(json.dumps(dict(codeFiles=len(code),boundedMathPassed=True,widerChecksPending=True,DBWrites=0)))
