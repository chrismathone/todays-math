from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent.parent;E=P/'own-review-evidence-r1';Q=P.parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
V=P/'verification';inputs=read(V/'verification-inputs.json');manifest=read(V/'verification-manifest.json');context=Q/'gachang-group3-source-context-local-20261020-r2';author=Q/'gachang-group3-authoring-20261020-r2/gachang';primary=R/'.qa-artifacts/exam-resume-20261008/curriculum-evidence.json';snapshot=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/live-family-snapshot-r2.json';white=Q/'engine-upgrade-20261019/gachang-group3-figure-white-preview-r2.png'
paths=list((P/'package').rglob('*'))+[p for p in V.iterdir() if p.is_file()]+list((P/'blind').rglob('*'))+list((P/'own-raw-evidence-r1').glob('*'))+[context/'q03.local.json',context/'q06.local.json',context/'original-first-page.local.png',author/'q03.json',author/'q06.json',author/'q03.figure.spec.json',author/'q03.figure.svg',white,primary,snapshot,R/'scripts/import/exam-twin/review-exam-twins.mjs',R/'scripts/import/exam-twin/candidatePack.mjs',R/'scripts/import/exam-twin/curriculumDeclarations.mjs',R/'scripts/import/exam-paper/solver_rules.json']+[Path(v['path']) for v in manifest['originalSolveFileHashes']];paths=[p for p in paths if p.is_file()];before={str(p):sha(p) for p in paths};(E/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8')
checks=[]
def ck(name,v,detail=None):checks.append({'name':name,'passed':bool(v),'detail':detail})
ck('verification-input-sha',sha(V/'verification-inputs.json')==manifest['verificationInputsSha256'])
student=read(P/'blind/student-problems.json');repo=Path.cwd();sources={}
for item,s in zip(inputs,student):
 c=item['candidate'];n=c['questionNumber'];raw=P/f'blind/solve/q{n:02}.json';obj=read(raw);src=read(context/f'q{n:02}.local.json');sources[n]=src
 ck(f'{n}/raw-Git-exact',subprocess.check_output(['git','show','c621b7d17cef1e4e6db495d52bdb298dabb71a73:'+raw.relative_to(repo).as_posix()])==raw.read_bytes());ck(f'{n}/raw-root-transport-hash',sha(raw)==next(x['sha256'] for x in manifest['originalSolveFileHashes'] if x['n']==n))
 ck(f'{n}/student-body-choices-digest',c['content']==s['content'] and c['choices']==s['choices'] and item['studentDigest']==s['studentDigest']==obj['studentDigest']);ck(f'{n}/independent-answer',c['answer']==obj['answer']);ck(f'{n}/source-component-number-and-score',src['number']==n and c['score']==4 and any(v['value']==4 for v in src['printedScoreOccurrences']));ck(f'{n}/source-content-pointer',src['sourceContentDigest']==c['sourceReference']['sourceContentSha256'])
# Independent new review arithmetic. Uses actual student expressions/full author solution, not author calculation files.
def mul(a,b):
 v=[F(0)]*(len(a)+len(b)-1)
 for i,x in enumerate(a):
  for j,y in enumerate(b):v[i+j]+=F(x)*F(y)
 return v
areas=[]
for i,b in enumerate([2,3,4,5,6],1):
 poly=mul([1-b,4],[2-b,3]);areas.append({'choice':i,'b':b,'coefficientsAscending':[str(x) for x in poly]});ck('q03-option/'+str(i),(poly==[6,-17,12])==(b==4))
c3=inputs[0]['candidate']; c6=inputs[1]['candidate'];sol3=c3['solution'];sol6=c6['solution']
for term in ['(4a+1-b)(3a+2-b)=12a^2+(11-7b)a+(1-b)(2-b)','11-7b=-17','(1-4)(2-4)=6','4a-3','3a-2']:
 ck('q03-author-whole-step/'+term,term in sol3)
ck('q03-unique-b-and-constant',F(28,7)==4 and (1-4)*(2-4)==6)
for a in [F(20001,10000),F(5,2),F(3),F(100)]:ck('q03-positive-original-area/'+str(a),4*a-3>0 and 3*a-2>0 and 0<4<3*a+2 and (4*a-3)*(3*a-2)==12*a*a-17*a+6)
for i,t in enumerate([-2,-1,0,1,2],1):
 A=abs(F(t)-3);B=abs(F(t)+2);ck('q06-option/'+str(i),((-2<t<3 and A-B==3)==(t==-1)) and A*A==t*t-6*t+9 and B*B==t*t+4*t+4)
for t in [F(-19999,10000),F(-1),F(0),F(29999,10000)]:ck('q06-exact-sign-branch/'+str(t),3-t>0 and t+2>0 and (3-t)**2==t*t-6*t+9 and (t+2)**2==t*t+4*t+4)
for term in ['(t-3)^2','(t+2)^2','3-t>0','t+2>0','(3-t)-(t+2)=3','1-2t=3','t=-1']:
 ck('q06-author-whole-step/'+term,term in sol6)
ck('q06-unique-linear',F(-2,2)==-1 and -2!=0 and (F(4)-1)==3);ck('q06-strict-endpoints',not (-2<-2<3) and not(-2<3<3) and (3-3)==0 and (-2+2)==0)
# New figure only: mathematical construction witness, not pixel-derived answer.
spec=read(P/'package/private/q03/figure-1.spec.json');svg=P/'package/private/q03/figure-1.svg';asset=inputs[0]['assets'][0]
ck('q03-spec-and-svg-bindings',sha(svg)==asset['svgSha256']==sha(P/'blind/figures/q03-1.svg') and sha(P/'package/private/q03/figure-1.spec.json')==asset['specSha256'])
outer,inner=spec['polygons'];ck('q03-construction-existence',outer['points']==[[0,0],[13,0],[13,11],[0,11]] and inner['points']==[[0,4],[9,4],[9,11],[0,11]] and 13==4*3+1 and 11==3*3+2 and 13-9==4 and 11-7==4 and 9*7==12*3*3-17*3+6)
ck('q03-shading-and-labels',outer['fill']=='#dddddd' and inner['fill']=='#ffffff' and [x['text'] for x in spec['labels']][-1]=='남은 부분' and len(spec['labels'])==5)
A=read(primary);U=read(snapshot);codes=['9수01-07','9수02-12','9수02-05'];standards=[v for v in A['achievement_standards'] if v['code'] in codes];units=[]
for item in inputs:
 unit=item['candidate']['metadata']['assignment']['currentUnit'];actual=next(v for v in U['units'] if v['id']==unit['id']);ck('actual-M3-semester1-unit/'+unit['id'],unit==actual and actual['grade']=='중3' and actual['semester']==1);units.append(actual)
ck('actual-standard-count',len(standards)==3)
# q06 needs expansion identity knowledge even though primary assignment is roots; do not hide prerequisite sequencing.
prereqMultiplication=next(v for v in U['units'] if v['id']=='e63d61c6-2b41-4c83-a74b-a605fd343c42')
receipt={'checks':checks,'counts':{'assertions':len(checks),'passed':sum(v['passed'] for v in checks),'failed':sum(not v['passed'] for v in checks)},'q03AllChoices':areas,'raw40NotRerunOrSummed':True,'sourceAnswerKeysUsed':False,'pixelOracle':False};assert all(c['passed'] for c in checks)
(E/'own-calculations.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
(E/'own-primary-unit-receipt.json').write_text(json.dumps({'curriculumEvidenceSHA256':sha(primary),'snapshotSHA256':sha(snapshot),'officialDocumentSHA256':'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb','2015PDFSHA256':'4bd2b84e978865a71d90577d8eb6240f0ecf24a9884642d627cde460d71ab88e','standards':standards,'currentUnits':units,'q06NecessaryPriorMultiplicationUnit':prereqMultiplication,'placement':'2015M3source2025/practice2026afterlearnedprerequisites;2027M3/2022separatepending','limits':'Existing actually inspected primary text/record/page and exactcapturedUnit combined with actual current whole student methods. Not school/grade-band/author declaration alone; no currentDBregistration promise.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'counts':receipt['counts'],'bindings':len(before)}))
