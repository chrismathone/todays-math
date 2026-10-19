from pathlib import Path
import json,hashlib,re
from fractions import Fraction as F
from decimal import Decimal
p=Path('.qa-artifacts/exam-resume-20261008/inverse-root-table-engine-audit-20261019-r1');rd=lambda n:json.loads((p/n).read_text(encoding='utf-8-sig'));old=rd('scope-input.json');new=rd('scope-input-r2.json');oh={f['path']:f['sha256'] for f in old['files']};nh={f['path']:f['sha256'] for f in new['files']};changed=[path for path in oh if oh[path]!=nh[path]];assert len(changed)==1 and Path(changed[0]).name=='releaseEligibility.ts'
oracle=rd('own-decimal-rational-oracle.json');drafts=rd('own-generated-drafts.json');checked=[]
for row in oracle['results']:
 q=drafts['drafts'][row['ordinal']]['draft'];s=q['solution'];cell=row['cells'][row['selectedColumnZeroBased']];params=row['independentlyRecoveredParameters'];b=params['bRoot'];square=b*b
 assert f'b^{{2}}={square}' in s and f'b={b}' in s
 assert '정확한 관계는 $a=\\sqrt{x}/10$' in s and '실제 제곱근과 정확히 같다고 놓은 것이 아니다' in s
 m=re.search(r'100\\times\(s/10\)\+(\d+)=(\d+\.\d{2})',s);assert int(m[1])==b and F(m[2])==F(row['targetFraction'])
 m=re.search(r'10s=(\d+\.\d{2})\$, \$s=(\d+\.\d{3})',s);assert F(m[1])==10*F(cell['roundedThousandth']) and F(m[2])==F(cell['roundedThousandth'])
 assert f'대응하는 입력은 ${row["independentlyRecoveredAnswer"]}$ 하나뿐' in s
 checked.append({'ordinal':row['ordinal'],'positiveRootAndSquare':True,'exactScaleRelation':True,'approximateEquationNumerics':True,'recoveredPrintedRoot':cell['roundedThousandth'],'selectedInput':row['independentlyRecoveredAnswer'],'approximationDisclaimer':True})
x={'oldAndR2FileSetsEqual':set(oh)==set(nh),'onlyChangedFile':changed,'other13HashesIdentical':True,'typeOnlyReverseHashProof':'own-runtime-controls.json revision.reversedReturnAnnotationMatchesOriginalHash=true','all45SolutionNumericalStatementsCheckedAgainstPriorIndependentOracle':True,'solutionChecks':checked,'counts':'No new question/blind/manual/math approval count; supplemental audit checks only'}
with (p/'own-solution-and-revision-checks.json').open('x',encoding='utf-8') as f:json.dump(x,f,ensure_ascii=False,indent=2);f.write('\n')
r=rd('own-engine-audit-report.json');r['solutionNumericalAudit']={'cases':45,'allPassed':True,'evidence':'own-solution-and-revision-checks.json','scope':'positive b square; exacta=sqrt(x)/10; printed100(s/10)+bresult;10sandsnumeric; uniqueinput; approximationdisclaimer'};r['revisionEvidence']['other13ScopeHashesIdentical']=True;r['revisionEvidence']['supplementalEvidence']='own-solution-and-revision-checks.json';(p/'own-engine-audit-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
h=rd('own-audit-seal-hashes.json');h['outputs']['own-engine-audit-report.json']=hashlib.sha256((p/'own-engine-audit-report.json').read_bytes()).hexdigest();h['outputs']['own-solution-and-revision-checks.json']=hashlib.sha256((p/'own-solution-and-revision-checks.json').read_bytes()).hexdigest();(p/'own-audit-seal-hashes.json').write_text(json.dumps(h,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('report',h['outputs']['own-engine-audit-report.json']);print('solution steps checked',len(checked))
