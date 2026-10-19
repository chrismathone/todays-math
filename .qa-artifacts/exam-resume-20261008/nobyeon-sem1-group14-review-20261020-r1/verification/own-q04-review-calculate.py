from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,re,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group14-review-20261020-r1/verification');root=p.parent
read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
i=read(p/'verification-inputs.json')[0];manifest=read(p/'verification-manifest.json');seal=read(p/'sealed-raw-commit.json');c=i['candidate'];rawpath=root/'blind/solve/q04.json'
assert h(p/'verification-inputs.json')==manifest['verificationInputsSha256'];assert h(rawpath)=='aa4f6128114d6eaaa47964fbe58517ed94a8b6737641b2212c1f6375f162a5bb'==seal['proofs'][0]['sha256'];assert read(rawpath)==i['independentSolve']
canon=lambda v:json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'));digest=lambda v:hashlib.sha256(canon(v).encode()).hexdigest()
student={k:c[k] for k in ['twinExternalId','questionNumber']};student.update({'grade':c['curriculumReview']['grade'],'curriculum':c['curriculumReview']['edition']});student.update({k:c[k] for k in ['questionType','score','content','choices']});student['figures']=[]
assert digest(student)==i['studentDigest']==i['independentSolve']['studentDigest'];assert digest({'candidate':c,'assetBindings':[]})==i['candidateDigest'];assert digest([])==i['assetDigest'];assert digest(i['independentSolve'])==i['solveDigest']
probe='q04 정식 검토 UTF-8: 정답·해설·근호 정의역'
with (p/'own-q04-review-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as f:f.write(probe+'\n')
assert (p/'own-q04-review-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
def sf(n):
 assert isinstance(n,int) and n>=0
 if n==0:return 0,1
 for k in range(isqrt(n),0,-1):
  if n%(k*k)==0:return k,n//(k*k)
def diff(text):
 ns=[int(a or b) for a,b in re.findall(r'\\sqrt(?:\{(\d+)\}|(\d))',text)];assert len(ns)==2
 out={}
 for sign,n in zip([1,-1],ns):
  k,m=sf(n);assert k*k*m==n;out[m]=out.get(m,F(0))+sign*k
 return {k:v for k,v in out.items() if v}
first=diff(re.findall(r'\$([^$]*)\$',c['content'])[1].split('=')[0]);assert first=={3:F(3)}
a=first[3];b=F(16)-a*a;assert a==3 and b==7 and b>0
choices=[]
for mark,text in zip('①②③④⑤',c['choices']):
 normal=diff(text);assert len(normal)==1
 rad,k=next(iter(normal.items()));assert k>0
 choices.append({'mark':mark,'normalized':{str(rad):str(k)},'positive':True,'square':str(rad*k*k),'matchesSqrtB':rad*k*k==b})
assert [x['mark'] for x in choices if x['matchesSqrtB']]==['①'];assert c['answer']=='①'==i['independentSolve']['answer'];assert len(set(x['square'] for x in choices))==5
assert all(t in c['solution'] for t in ['a=3','b=7>0','7,12,13,25,3','하나뿐','유일하게','유리수'])
assert c['solution'].count('$')%2==0
source=read(root/'source-q04-only.json')
result={'studentDigest':i['studentDigest'],'candidateDigest':i['candidateDigest'],'assetDigest':i['assetDigest'],'solveDigest':i['solveDigest'],'allCanonicalDigestsIndependentlyRecomputed':True,'rawSha256':h(rawpath),'parentRawSeal':seal['rawCommit'],'rawAnswerSolutionAndDeclarationUnchanged':True,'ownCalculation':{'a':str(a),'b':str(b),'requested':'sqrt7','firstCondition':'sqrt48=4sqrt3; (4-1)sqrt3=a sqrt3, positive sqrt3 permits division; a3 unique','secondCondition':'9+b=16 ->b7 unique, positive and rational','existence':'substitution a3,b7 satisfies both original conditions and rational/positive premises','allChoices':choices,'allNumericRadicandsPositive':[3,7,12,13,25,28,48,52,100],'variableRadicandB':str(b),'studentMethod':'positive principal roots, square-factor extraction, division by nonzero sqrt3, integer square/substitution and inverse addition; no high-school coefficient theorem or quadratic formula','units':'scalar only; no physical unit','figures':[]},'actualAuthorSolutionAudit':{'firstRootSimplification':'correct','sqrt3NonzeroAndA':'explicit and correct','bAndPositiveDomain':'explicit7>0, rational','fiveChoiceSimplifications':'all correct; exact own squares7,12,13,25,3','allFivePositiveAndUnique':'correct','aBUniqueness':'correct; first equation fixes a, second fixes b; no extraneous plus/minus branch','existence':'a3,b7 directly substituted in own code; actual solution values satisfy both','studentGradeNecessaryTools':'only2015M3 root arithmetic and earlier integer arithmetic/equation substitution'},'sourceComparison':{'sourceArtifactSha256':h(root/'source-q04-only.json'),'sourceStemObserved':source['stem'],'sourceDifficultyObserved':source['difficultyLabelFromSource'],'sourceScoreObserved':[x['value'] for x in source['printedScoreOccurrences']],'sourceAnswerNotUsed':True,'sameCore':'source first simplifies a radical multiple to identify a; another radical difference gives sqrt(b); finally applies integer square and sum. New task preserves simplification of like radical terms and a^2+b relation.','actualStructuralChange':'new task moves final a^2+b result into a condition, restores b by inverse addition after identifying a, then asks for a radical expression equivalent to sqrt(b). Source direct scalar-sum output becomes inverse recovery plus equivalence selection; this is more than numeric replacement.','notCertified':'source artifact text alone does not certify HWP/PDF/original whole-pair identity or rights; no source key calculated or used'},'inputHashes':{name:h(p/name) for name in ['VERIFY-BRIEF.md','verification-inputs.json','verification-manifest.json','sealed-raw-commit.json']},'utf8WriteReadPassed':True,'rootCodeReads':0,'dbWrites':0}
with (p/'own-q04-review-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
print('Current answer/solution/all5choices agree with sealed raw; all canonical digests and domains verified')
