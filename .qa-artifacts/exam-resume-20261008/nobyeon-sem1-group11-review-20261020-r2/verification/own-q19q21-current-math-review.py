from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,hashlib,subprocess
base=Path('.qa-artifacts/exam-resume-20261008')
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def read(q):return json.loads(q.read_text(encoding='utf-8-sig'))
for group,n,rawdir in [('group11',19,'nobyeon-sem1-group11-review-20261020-r1'),('group12',21,'nobyeon-sem1-group12-review-20261020-r2')]:
 p=base/f'nobyeon-sem1-{group}-review-20261020-r2/verification';rawp=base/rawdir/f'blind/solve/q{n}.json';a=read(p/'verification-inputs.json')[0];raw=read(rawp);seal=read(p/'sealed-raw-commit.json');manifest=read(p/'verification-manifest.json');assert sha(p/'verification-inputs.json')==manifest['verificationInputsSha256'];assert sha(rawp)==seal['proofs'][0]['sha256'];assert raw==a['independentSolve'];assert hashlib.sha256(json.dumps(raw,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==a['solveDigest'];g=subprocess.run(['git','show',seal['rawCommit']+':'+seal['proofs'][0]['gitPath']],capture_output=True);assert g.returncode==0 and hashlib.sha256(g.stdout).hexdigest()==sha(rawp)
 c=a['candidate'];rub=c['metadata']['writtenRubric'];assert sum(r['point'] for r in rub['criteria'])==rub['total']==c['score'];assert c['questionType']=='서술형' and c['choices']==[] and c['figureArtifacts']==[] and a['assets']==[]
 if n==19:
  def mul(z,w):return(z[0]*w[0]+2*z[1]*w[1],z[0]*w[1]+z[1]*w[0])
  def inv(z):
   norm=z[0]*z[0]-2*z[1]*z[1];assert norm!=0;return(z[0]/norm,-z[1]/norm)
  aa=(F(4),F(0));b=(F(-4),F(3));quot=mul(aa,inv(b));assert quot==(8,6);square=mul((F(-1),F(3)),(F(-1),F(3)));assert square==(19,-6);assert (quot[0]+square[0],quot[1]+square[1])==(27,0)
  calc={'method':'fresh exact rational pair p+q√2 on current printed conditions; not student field-theory requirement','recordTruth':[True,False,True],'a':4,'b':'3√2-4','strictBounds':'16<18<25 ->4<3√2<5 ->0<b<1','conjugateProduct':2,'correctQuotient':'6√2+8','printedWrongQuotient':'6√2-8','nonzeroDifference':16,'recordD':'19-6√2','sum':27,'allDivisorsNonzero':True,'uniqueErrorAndValue':True,'currentSolutionStepAudit':['positive square comparison determinesa/b decomposition','0<b<1 permitsdivision; positiveconjugate nonzero','difference-of-squares denominator2 correct','squareformula recordD correct','onlyㄴfalse, finalradicaltermscancel'],'standardCorrection':'currentstandardCodes contains9수02-12, polynomiallocator3956;9수02-05 is not used as square expansion basis','rubric':rub}
 else:
  rows=[]
  for k in range(75,86):
   nonsq=[x for x in range(51,k) if isqrt(x)**2!=x];rows.append({'k':k,'upperIrrational':isqrt(k)**2!=k,'count':len(nonsq),'selected':isqrt(k)**2!=k and len(nonsq)==29})
  assert [r['k'] for r in rows if r['selected']]==[82];assert [r['k'] for r in rows if r['count']==29]==[81,82]
  calc={'method':'fresh exact isqrt integer enumeration; no root approximation or floor function required of student','strictOpenInterval':'n51..k-1','all11Integers':rows,'k82Count':'51..81 has31 integers minus64,81 gives29','upperIrrationalEssential':'without it81and82bothmeetcount;√81=9excludes81','currentSolutionStepAudit':['positive root order gives51..k-1','k82 existsand√82irrational','k<=80 atmost28','k81count29butrationalupper','k>=83 includesextra√82 ->atleast30','all current allowedintegers exhausted'],'rubric':rub}
 payload={'inputHashes':{name:sha(p/name) for name in ['VERIFY-BRIEF.md','verification-inputs.json','verification-manifest.json','sealed-raw-commit.json']},'rawSha256':sha(rawp),'parentCommit':seal['rawCommit'],'gitSealedRawBytesVerified':True,'rawDeclarationUnchanged':True,'currentDigests':{k:a[k] for k in ['studentDigest','candidateDigest','assetDigest','solveDigest']},'currentMath':calc,'sourceAndSkeletonPathIssue':'Expected source-question-only.json and reports/qNN.json not present in verification at first read. Exact path clarification requested; no parent directory fallback/read performed.','newBlindOrQuestionCount':0}
 with (p/f'own-q{n}-current-review-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(payload,f,ensure_ascii=False,indent=2);f.write('\n')
 print(n,'math/current seals verified')
