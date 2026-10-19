from pathlib import Path
from fractions import Fraction as F
import json,hashlib,urllib.request,io,struct,zlib
import olefile
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q14-stage2-review-20261019-r1')
def sha(x):return hashlib.sha256(x).hexdigest()
def load(n):return json.loads((b/n).read_text(encoding='utf-8'))
def digest(x):return sha(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
names=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q14-only.json','official-locators-reference.json'];hashes={n:sha((b/n).read_bytes()) for n in names}
v=load('verification-inputs.json')[0];man=load('verification-manifest.json');seal=load('sealed-raw-commit.json');ref=load('official-locators-reference.json');source=load('source-q14-only.json')
assert hashes['verification-inputs.json']==man['verificationInputsSha256']
rp=b.parent/'nobyeon-sem1-q14-clean-blind-20261019-r1/solve/q14.json';rb=rp.read_bytes();raw=json.loads(rb)
assert sha(rb)==seal['proofs'][0]['sha256']==man['originalSolveFileHashes'][0]['sha256']
assert raw==v['independentSolve'] and digest(raw)==v['solveDigest'] and raw['studentDigest']==v['studentDigest']
assert raw['answer']==v['candidate']['answer']=='③' and digest(v['assets'])==v['assetDigest']
def mul(a,c):
 out=[0]*(len(a)+len(c)-1)
 for i,x in enumerate(a):
  for j,y in enumerate(c):out[i+j]+=x*y
 return out
p=mul([4,1],[-3,1]);s=mul([-1,1],[-1,1]);difference=[x-y for x,y in zip(p,s)]
assert p==[-12,1,1] and s==[1,-2,1] and difference==[-13,3,0]
n=F(77-difference[0],difference[1]);assert n==30 and n.denominator==1 and n>3
choices=[]
for i,x in enumerate([28,29,30,31,32]):
 value=(x+4)*(x-3)-(x-1)**2;assert value==3*x-13
 choices.append(dict(mark=chr(0x2460+i),n=x,product=(x+4)*(x-3),square=(x-1)**2,lhs=value,residual=value-77,integer=True,greaterThan3=x>3,satisfies=value==77))
assert sum(c['satisfies'] for c in choices)==1
sourceProduct=105*98;sourceSquare=101**2;assert sourceProduct-sourceSquare==89
calc=dict(coefficientOrder='constant,linear,quadratic',product=p,square=s,difference=difference,equation='3n-13=77',root=str(n),choices=choices,existence='n=30は3より大きい整数。')
calc['existence']='n=30은 3보다 큰 정수이고 34×27-29²=918-841=77이다.'
calc.update(uniqueness='이차항이 상쇄되어 계수3이 비영인 일차방정식과 동치이다. 유일한 실수해30이 정수/n>3 조건을 만족하므로 조건부 해도 유일하다.',domain='원래 다항식은 모든 실수에서 정의된다. 요청 범위는 n∈Z,n>3이고, 분모·근호·단위·도형 조건은 없다. 나누는 수3은0이 아니다.',sourceProcedureCheck=dict(product=sourceProduct,square=sourceSquare,difference=89,baseline100ProductExpansion='100²+(5-2)×100-10',baseline100SquareExpansion='100²+2×100+1',purpose='허용된 원문의 계산 구조/공식 확인용. 원문 답이나 학교를 후보 승인 oracle로 쓰지 않음.'))
# Actual primary standard text; pointers do not certify an item.
data=urllib.request.urlopen(ref['downloadUrl'],timeout=40).read();assert sha(data)==ref['actualDownloadedSha256']
o=olefile.OleFileIO(io.BytesIO(data));header=o.openstream('FileHeader').read();body=o.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',header,36)[0]&1:body=zlib.decompress(body,-15)
pos=0;rec=0;records=[]
while pos<len(body):
 h=struct.unpack_from('<I',body,pos)[0];pos+=4;tag=h&1023;size=h>>20
 if size==4095:size=struct.unpack_from('<I',body,pos)[0];pos+=4
 payload=body[pos:pos+size];pos+=size;rec+=1
 if rec in [3916,3956]:
  assert tag==67
  records.append(dict(record1based=rec,text=payload.decode('utf-16le')))
assert len(records)==2
placements=[dict(url='https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf',locator='PDF0based89/printed90; 대상 중학교3학년; 다항식의 곱셈과 인수분해;9수02-12;곱셈공식 학습',mapping='두 곱셈식 전개 및 이차항 상쇄'),dict(url='https://edubook.ice.go.kr/src/viewer/download.php?host=main&no=1&site=20210607_145706_15',locator='PDF0based53/printed54; 대상 중학교1학년;Ⅱ방정식2일차방정식;성취기준9수02-05',mapping='상쇄 후3n-13=77의 수치 일차방정식 풀이와 원식 확인')]
for item in placements:
 h=hashlib.sha256();length=0
 with urllib.request.urlopen(item['url'],timeout=40) as response:
  while True:
   block=response.read(65536)
   if not block:break
   h.update(block);length+=len(block)
 item.update(sha256=h.hexdigest(),bytes=length,read='공식 교육청의 실제 학년·단원·기준 표를 읽고 현재 q14의 단계에 대응했다. 전체 외부 문서는 저장하지 않음.')
official=dict(primaryStandards=dict(url=ref['downloadUrl'],sha256=sha(data),stream='BodyText/Section0',records=records),actualGradePlacement=placements,era=dict(url=ref['era']['url'],locator='부칙1나/다/라',scope='2025/2026중3=2015;2027중3부터2022는별도보류'),notInheritedItemApproval=True,fullExternalDocumentsSaved=False)
surfaces=dict(stem='3보다 큰 정수n, 주어진 등식과 곱셈 공식을 이용할 요구가 명확하다. 등식의 겉모양이 이차여도 전개하면 일차가 되어 중3 곱셈/중1 방정식으로 풀린다.',choices='28~32의 다섯 보기 모두3보다 큰 정수이다. 원식 좌변71,74,77,80,83을 각각 계산해③만 성립함을 확인했다.',figuresAndTables='순수 대수 문항이며 별도 그림·표·단위 가정은 없다. assets=[]이고 봉인 raw의 인쇄 확인과 현재 식/보기가 대응한다.',notation='정수n,괄호곱,제곱,등호와77은 중학교 표기이다. 정수조건이 새로운 고등 정수론을 요구하지 않고 계산된 유일해의 성질 확인만 필요하다.',answer='유일한 실수해30이 n∈Z,n>3을 만족하며③에 대응한다. 정수해를 추측이나 유한탐색만으로 주장하지 않았다.',studentSolution='현재 해설의 n²+n-12, n²-2n+1 전개→괄호 앞의 음수 분배→이차항 상쇄→3n-13=77→n=30→정수/범위→918-841=77→비영계수 유일성을 단계마다 독립 계산과 대조했다. 모두 정확하다.',prerequisites='2015 중3 다항식 곱셈공식 학습 이후에 배치하며, 동류항 정리와 중1 일차방정식이 선수이다. 실제 교육청 중1 표에서9수02-05 배치를 확인했다. 이차방정식/근의공식/인수정리/고등 수열 방법은 필요하지 않다.')
keys=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate'];checks={k:k!='unitFamilyFit' for k in keys}
evidence=dict(calculations=calc,answerCorrect='현재③은 봉인 raw 및 새 계산의n=30과 일치한다.',solutionCorrect=surfaces['studentSolution'],existenceUniqueness=calc['existence']+' '+calc['uniqueness'],choicesCorrect=choices,figureConsistent=surfaces['figuresAndTables'],sameCoreConceptAndProcedure='원문은105×98과101²를 공통기준100에서 각각 두 일차식의 곱과 제곱공식으로 계산하여 차를 구하고 공식/결과 진술을 판단한다. 후보도(n+4)(n-3)의 곱 공식과(n-1)²의 제곱공식을 적용해 차의 이차항을 상쇄한다. 제곱항의 부호는+에서-로 달라지지만 같은 제곱공식의 부호 처리를 사용한다. 원문의 공식 정오 진술 선택은 후보에서 요구하지 않으므로 그 부차목표까지 유지한다고 주장하지 않는다.',distinctPresentation='고정수의 수치 결과와 공식의 진술 정오를 선택하던 원문에서, 차의 결과77을 알려주고 입력 기준정수n을 역복원한다. 진술 조합 보기를 정수 입력 보기로 바꿔 정보방향과 응답대상을 실질적으로 바꿨다. 숫자교체만이 아니라3n-13=77이라는 역산단계가 생겼다.',naturalKorean='n>3인 정수라는 범위,등식,간단히 할 방법과 구할 대상이 자연스럽게 연결된다. n을 길이나 자연수 개수 등 다른 양으로 해석할 이유가 없고 추가조건이나 단위 혼동이 없다.',curriculumAppropriate='실제 교육부HWP에서9수02-12(3956)와9수02-05(3916)를 다시 확인했다. 공식 교육청의 실제 중3 곱셈공식 표와 중1 일차방정식 표를 현재 두 전개/상쇄/역산 단계에 각각 적용했다. 학교명이나 학년군코드만으로 승인하지 않는다.',allStudentSurfacesInScope='현재 후보의 일곱표면을 각각검토해passed.2015중3 곱셈공식과 해당선수 학습이후로한정하며 학교별중간진도나2022배치는 별도이다.',unitFamilyFit='false/pending: key/count와 넓은 Unit주제만으로 두 전개식의 상쇄에서 정수입력을 복원하는 정확한 family목표/domain를 확인할 수 없다. 이번범위에서 엔진정의를 읽지 않았으므로 강제배정하지 않는다.',scoreAppropriate='원문 중/4점이라는 제공 관찰과 저자의 응용 제안은 방향상 모순되지 않으며4점은 편집상 타당하다. 두 곱셈공식의 선택·전개,음수분배와상쇄,역산후 정수/범위검산을 요구한다. 원문의 공식진술판단은 사라지고 일차방정식 한단계가 더해져 인지부담은 달라질 수 있다. 중간수준의 응용이라는 편집판단이며 동일실측난도/정답률/학습효과를 보장하지 않는다.',curriculumSurfaceEvidence=surfaces,officialEvidence='own-q14-official-evidence.json',rawSha256=sha(rb),localRawCommit='1dd15862dcd4a8b0362a98a96d084c0beceeb9f7',parentRawCommit=seal['rawCommit'],verificationInputsSha256=hashes['verification-inputs.json'],digestBinding='candidateDigest는SHA256검증된verification-inputs의정확한값으로연결. solveDigest는봉인raw객체의sorted-key canonicalJSONSHA256와일치검증.',pendingReasons=['정확한livefamily의정의·목표·domain호환성미확정'],scope='허용stage2여섯입력과본인봉인raw및해당공식기준/학년표만사용.루트코드·다른QA·전체sourceManifest·다른원문은열지않음.')
report=dict(status='pending',studentDigest=v['studentDigest'],candidateDigest=v['candidateDigest'],assetDigest=v['assetDigest'],method='independent-solve-then-review',verifierId='fresh-independent-codex-q14-stage2-20261019-r1',solveDigest=v['solveDigest'],checks=checks,evidence=evidence,curriculumSurfaces={s:'passed' for s in surfaces},mathApproved=True,gradeApproved2015M3=True,sameMeasuredDifficultyApproved=False,year2022M3='pending-separate-placement-review',liveFamily=False,unitFamilyFit=False,sourceIdentityApproved=False,rightsApproved=False,similarityApproved=False,nativeProvenanceApproved=False,loadable=False)
assert len(checks)==12 and sum(checks.values())==11 and len(surfaces)==7
(b/'reports').mkdir(exist_ok=True)
for path,obj in [(b/'reports/q14.json',report),(b/'own-q14-calculations.json',calc),(b/'own-q14-official-evidence.json',official),(b/'own-q14-input-hashes.json',hashes)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
assert sha(rp.read_bytes())==sha(rb)
for n,h in hashes.items():assert sha((b/n).read_bytes())==h
print('ReportSHA256',sha((b/'reports/q14.json').read_bytes()))
print('12checks/11true;7surfacespassed;5choiceschecked;familyheld;rawand6inputsunchanged.')
