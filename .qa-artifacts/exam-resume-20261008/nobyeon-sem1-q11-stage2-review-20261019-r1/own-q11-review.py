from pathlib import Path
from fractions import Fraction as F
import json,hashlib,urllib.request,io,struct,zlib
import olefile
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q11-stage2-review-20261019-r1')
def read(n): return json.loads((b/n).read_text(encoding='utf-8'))
def sha(data): return hashlib.sha256(data).hexdigest()
def digest(obj): return sha(json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())
allowed=['VERIFY-BRIEF.md','sealed-raw-commit.json','verification-manifest.json','verification-inputs.json','source-q11-only.json','official-locators-reference.json']
input_hashes={n:sha((b/n).read_bytes()) for n in allowed}
v=read('verification-inputs.json')[0]; manifest=read('verification-manifest.json'); seal=read('sealed-raw-commit.json'); ref=read('official-locators-reference.json')
assert input_hashes['verification-inputs.json']==manifest['verificationInputsSha256']
rawpath=b.parent/'nobyeon-sem1-q11-clean-blind-20261019-r1/solve/q11.json'
rawbytes=rawpath.read_bytes(); raw=json.loads(rawbytes)
assert sha(rawbytes)==seal['proofs'][0]['sha256']==manifest['originalSolveFileHashes'][0]['sha256']
assert raw==v['independentSolve'] and digest(raw)==v['solveDigest']
assert raw['studentDigest']==v['studentDigest'] and raw['answer']==v['candidate']['answer']=='③'
assert digest(v['assets'])==v['assetDigest']
# Re-read precisely the three relevant official standard records, not earlier item approvals.
data=urllib.request.urlopen(ref['downloadUrl'],timeout=40).read()
assert sha(data)==ref['actualDownloadedSha256']
o=olefile.OleFileIO(io.BytesIO(data)); head=o.openstream('FileHeader').read(); body=o.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',head,36)[0]&1: body=zlib.decompress(body,-15)
records=[]; pos=0; index=0
while pos<len(body):
 h=struct.unpack_from('<I',body,pos)[0];pos+=4;tag=h&1023;size=h>>20
 if size==4095:size=struct.unpack_from('<I',body,pos)[0];pos+=4
 payload=body[pos:pos+size];pos+=size;index+=1
 if index in [3776,3916,3956]:
  assert tag==67
  records.append(dict(record1based=index,text=payload.decode('utf-16le')))
assert len(records)==3
# New exact arithmetic for current candidate after raw sealing.
a=F(3,4); target=F(-21,4); k=(a-target)/(2*a)
checks_choices=[]
for i,t in enumerate([2,3,4,5,6]):
 c0=a*a;c1=-2*a*t;c2=F(t*t)
 checks_choices.append(dict(mark=chr(0x2460+i),k=t,constant=str(c0),linearCoefficient=str(c1),quadraticCoefficient=str(c2),aPlusB=str(a+c1),valid=a+c1==target and c0==F(9,16) and t>0))
assert k==4 and sum(x['valid'] for x in checks_choices)==1
calculation=dict(expansion='k²x²-2kax+a²',a=str(a),b=str(target-a),k=str(k),choices=checks_choices,domain='a,k>0; b=-2ka<0; xは全実数で多項式が定義される; 単位なし',uniqueness='a²=9/16,a>0でa=3/4が唯一。-2a=-3/2≠0なのでkも唯一。',coefficientMeaning='a,kはxに関する定数。bはxの一次の項の係数であり、x²の係数k²や定数項a²と区別する。')
# Evidence prose below is written for the reviewer in Korean.
calculation['domain']='a,k>0인 실수 상수; b=-2ka<0; 다항식은 모든 실수 x에서 정의됨; 단위 없음.'
calculation['uniqueness']='a²=9/16과 a>0으로 a=3/4 하나. -2a=-3/2≠0이므로 k의 일차방정식도 해가 하나.'
calculation['coefficientMeaning']='a,k는 x에 관한 상수. b는 일차항 x의 계수이며 이차항 계수 k², 상수항 a²와 구별한다.'
source=read('source-q11-only.json')['question']
keys=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']
checks={key:key!='unitFamilyFit' for key in keys}
standard='교육부 2020-236 별책8의 실제 HWP 해시를 확인하고 3776[9수01-07] 제곱근의 뜻/성질, 3916[9수02-05] 일차방정식 풀이/활용, 3956[9수02-12] 다항식 곱셈/인수분해를 직접 다시 읽었다. 현재 문항은 제곱공식으로 계수를 읽고 양의 제곱근과 수치 일차방정식으로 상수를 복원하므로 이 기준에 대응한다.'
surface_evidence=dict(stem='양수 상수 a,k, 전개식의 x 계수 b, 상수항 9/16과 a+b=-21/4, 구할 k가 명시된다. 곱셈 공식/제곱근/일차방정식으로 모두 해석된다.',choices='보기 2,3,4,5,6은 양의 정수이며 계산된 a+b를 전부 비교했다. ③만 맞고 보기의 표기나 수 크기에 범위 밖 요소가 없다.',figuresAndTables='그림·표·외부 시각 자산이 없는 순수 다항식 문항이다. 인쇄 확인은 봉인 raw의 printedCheck와 일치하고 assets=[]이다.',notation='(kx-a)²,x,b,a,k 및 유리수 분수는 중학교 다항식/제곱근/방정식 표기이다. k는 상수이고 x가 다항식의 문자이다.',answer='k=4는 양수이고 ③에 해당한다. 숫자 결과는 calculations, 원시 answer는 선택 기호 한 글자이다.',studentSolution='현 후보 해설을 순서대로 확인했다: 상수항 a²/일차항 -2ka 식별→a=3/4→b=-6→-(3/2)k=-6→k=4→16x²-6x+9/16 재전개→합 -21/4 확인→유일성. 모든 단계가 봉인 독립 풀이 및 새 정확한 분수 계산과 일치한다.',prerequisites='다항식의 곱셈/제곱 공식 학습 이후, 양수의 제곱근 및 중1 일차방정식 선수가 필요하다. a²=9/16을 일반 이차방정식 공식으로 풀지 않고 양의 제곱근으로 처리한다. 고등 항등식의 미정계수법이나 연립방정식 이론은 요구하지 않는다.')
evidence=dict(answerCorrect='현재 후보 ③은 봉인 raw ③과 일치하며 새 계산에서도 k=4이다.',solutionCorrect=surface_evidence['studentSolution'],existenceUniqueness=calculation['uniqueness']+' a=3/4,k=4를 원식에 대입하면 b=-6,상수항9/16,합-21/4로 모든 조건이 실제 성립한다.',choicesCorrect=checks_choices,figureConsistent=surface_evidence['figuresAndTables'],sameCoreConceptAndProcedure='허용된 원문은 (3x-a)²의 상수항과 a>0으로 a를 정하고 일차항 b를 찾아 a+b를 구한다. 후보도 제곱공식의 일차항/상수항 구별, 상수항에서 양의 제곱근 복원, 계수와 합의 관계를 사용하므로 핵심을 유지한다.',distinctPresentation='원문에서 수치로 주어진 선두 인수계수 3 대신 양수 상수 k를 두고, 원문의 출력 a+b를 후보의 조건으로 바꾸었다. 상수항→양의 a 복원은 그대로 남기고, 주어진 합→b 복원→k를 정하는 일차방정식으로 질문 방향을 실제 역전했다. 수치·문장 순서 교체만의 차이가 아니다.',naturalKorean='상수와 계수의 대상 및 전개 전/후가 명확하다. 발문의 조사 “(kx-a)²을”은 수식을 “제곱”으로 읽을 때 자연스럽고 조건을 해석하는 데 혼동이 없다. a+b의 a는 제곱식 안의 상수이고 b는 x의 계수라고 명확히 정의된다.',curriculumAppropriate=standard,allStudentSurfacesInScope='일곱 surface를 현재 후보에 각각 새로 적용했고 모두 passed. 다른 문항의 학년 승인을 상속하지 않는다.',unitFamilyFit='false/pending: 다항식 곱셈 Unit은 주제상 관련되지만 목록의 family key/count만으로 현재 상수항+계수합에서 k를 복원하는 목표·절차·domain의 정확한 호환성을 확정할 수 없다. 새 review-only family 구현 예정이라는 부모 설명도 실제 정의/등록/학년 승인 근거로 사용하지 않는다.',scoreAppropriate='4점은 제곱공식의 계수 해석, 양의 제곱근 선택, 유리수 합의 역산과 일차방정식 및 대입 확인을 묶는 계산·응용 문제로 편집상 타당하다. 단순 직접 합 계산보다 질문 방향이 역전되어 한 단계 늘지만 긴 경우분류는 없어 중간 수준 내지 기본~응용 경계로 판단한다. 저자 variant의 “원문4점/중” 중 난도 중은 제공 출처 difficultyLabelFromSource=하와 다르므로 원문 사실로 채택하지 않는다. 응용은 질문 역전의 분류로 수용하되 동일 실측 난도·정답률·학습효과는 주장하지 않는다.',calculations=calculation,curriculumSurfaceEvidence=surface_evidence,officialEvidence='own-q11-official-evidence.json',era='본 검토는 2025/2026 중3의 2015 교육과정에 한정한다. 동일 세션에서 확인한 교육부 2022-33 부칙1 나/다/라의 2025 중1→2026 중2→2027 중3 순차 적용에 따라 2027/2022 재출판은 별도 검토로 보류한다.',eraUrl=ref['era']['url'],rawSha256=sha(rawbytes),localRawCommit='14ae52bfd03b640299a0ff1efde158551d3a5a39',parentRawCommit=seal['rawCommit'],verificationInputsSha256=input_hashes['verification-inputs.json'],candidateDigestBinding='SHA256 검증된 verification-inputs 안의 exact candidateDigest를 그대로 사용. 미정의 candidate projection으로 임의 재계산하지 않음.',pendingReasons=['정확한 기존/신규 family 정의와 등록의 목표·절차·domain 호환성 미확정'],scope='봉인 raw와 허용된 stage2 여섯 파일 및 해당 공식 기준 세 레코드만 사용. 원문 전체 manifest/다른 문제/새 엔진 소스는 열지 않음.')
report=dict(status='pending',studentDigest=v['studentDigest'],candidateDigest=v['candidateDigest'],assetDigest=v['assetDigest'],method='independent-solve-then-review',verifierId='fresh-independent-codex-q11-stage2-20261019-r1',solveDigest=v['solveDigest'],checks=checks,evidence=evidence,curriculumSurfaces={s:'passed' for s in surface_evidence},mathApproved=True,gradeApproved2015M3=True,unitFamilyFit=False,liveFamily=False,sourceIdentityApproved=False,rightsApproved=False,similarityApproved=False,nativeProvenanceApproved=False,loadable=False)
assert len(checks)==12 and sum(checks.values())==11 and len(report['curriculumSurfaces'])==7
(b/'reports').mkdir(exist_ok=True)
outputs=[(b/'reports/q11.json',report),(b/'own-q11-official-evidence.json',dict(url=ref['downloadUrl'],sha256=sha(data),hashMatched=True,stream='BodyText/Section0',records=records,itemSpecificMapping=standard,notInheritedItemApproval=True)),(b/'own-q11-calculations.json',calculation),(b/'own-q11-input-hashes.json',input_hashes)]
for path,obj in outputs:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
assert sha(rawpath.read_bytes())==sha(rawbytes)
for n,h in input_hashes.items():assert sha((b/n).read_bytes())==h
print('q11 report SHA256',sha((b/'reports/q11.json').read_bytes()))
print('12 checks: 11 passed; unitFamilyFit held; 7 surfaces passed; raw and six inputs unchanged.')
