from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,hashlib,urllib.request,io,struct,zlib
import olefile
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q13-stage2-review-20261019-r1')
def sha(x):return hashlib.sha256(x).hexdigest()
def load(n):return json.loads((b/n).read_text(encoding='utf-8'))
def digest(x):return sha(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
names=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q13-only.json','official-locators-reference.json']
hashes={n:sha((b/n).read_bytes()) for n in names}
v=load('verification-inputs.json')[0];man=load('verification-manifest.json');seal=load('sealed-raw-commit.json');ref=load('official-locators-reference.json')
assert hashes['verification-inputs.json']==man['verificationInputsSha256']
rp=b.parent/'nobyeon-sem1-q13-clean-blind-20261019-r1/solve/q13.json';rb=rp.read_bytes();raw=json.loads(rb)
assert sha(rb)==seal['proofs'][0]['sha256']==man['originalSolveFileHashes'][0]['sha256']
assert raw==v['independentSolve'] and digest(raw)==v['solveDigest'] and raw['studentDigest']==v['studentDigest']
assert raw['answer']==v['candidate']['answer']=='③' and digest(v['assets'])==v['assetDigest']
# Independently multiply exact radical sums from the five currently printed records.
def mul(a,c):
 out={}
 for n,x in a.items():
  for m,y in c.items():
   z=n*m;factor=next(d for d in range(isqrt(z),0,-1) if z%(d*d)==0);inner=z//(factor*factor)
   out[inner]=out.get(inner,F(0))+F(x)*F(y)*factor
 return {n:x for n,x in out.items() if x}
def sub(a,c):
 out={n:a.get(n,F(0))-c.get(n,F(0)) for n in set(a)|set(c)}
 return {n:x for n,x in out.items() if x}
def encode(a):return {str(n):str(c) for n,c in sorted(a.items())}
printed=[('가',{2:3,1:-1},{2:3,1:-1},{1:19,2:-6}),('나',{6:1,10:1},{6:1,10:1},{1:16,15:2}),('다',{11:1,1:3},{11:1,1:-3},{1:2}),('라',{7:1,1:2},{7:1,1:-4},{1:-1,7:2}),('마',{3:4,5:1},{3:1,5:-2},{1:2,15:-7})]
rows=[];wrong=[]
for label,left,right,stated in printed:
 actual=mul(left,right);error=sub(actual,stated)
 if error:wrong.append(label)
 rows.append(dict(label=label,computed=encode(actual),stated=encode(stated),computedMinusStated=encode(error),correct=not error))
assert wrong==['나','라']
choiceRows=[]
for i,pair in enumerate(v['candidate']['choices']):
 parts=[x.strip() for x in pair.split(',')]
 choiceRows.append(dict(mark=chr(0x2460+i),pair=parts,exactWrongSet=set(parts)==set(wrong)))
assert sum(c['exactWrongSet'] for c in choiceRows)==1 and choiceRows[2]['exactWrongSet']
calc=dict(records=rows,choices=choiceRows,wrongRecords=wrong,nonzeroErrorProof='(나)의 실제값-기록값=2√15>0, (라)는 -4√7<0이므로 두 오류가 확실하다.',domain='모든 피제곱수는 양수이다. 분모·미지수·길이·단위가 없어 추가 정의역 제외가 없다.',signs='(라)는 √7<4이므로 양수×음수로 음수이다. (마)도 √3<2√5이므로 음수이고 2-7√15와 일치한다.',uniqueness='다섯 기록 중 나·라만 틀리고, 다섯 보기 중 그 쌍은 ③ 하나뿐이다.')
# Read primary standard text, not inherited item approvals.
data=urllib.request.urlopen(ref['downloadUrl'],timeout=40).read();assert sha(data)==ref['actualDownloadedSha256']
o=olefile.OleFileIO(io.BytesIO(data));header=o.openstream('FileHeader').read();body=o.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',header,36)[0]&1:body=zlib.decompress(body,-15)
p=0;index=0;records=[]
while p<len(body):
 h=struct.unpack_from('<I',body,p)[0];p+=4;tag=h&1023;size=h>>20
 if size==4095:size=struct.unpack_from('<I',body,p)[0];p+=4
 payload=body[p:p+size];p+=size;index+=1
 if index in [3788,3956]:
  assert tag==67
  records.append(dict(record1based=index,text=payload.decode('utf-16le')))
assert len(records)==2
placement=[dict(url='https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202202101132253081.pdf',locator='PDF zero-based38 / printed38; 과목 수학·대상 중학교3학년; 4차시9수01-10 근호 사칙계산·분모의 유리화',appliesTo='현재 다섯 기록의 근호 곱셈·간단히 하기와 동류항 정리'),dict(url='https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf',locator='PDF zero-based89 / printed90; 대상 중학교3학년; 다항식의 곱셈과 인수분해;9수02-12; 곱셈공식 학습',appliesTo='현재 가·나의 제곱공식, 다의 합차곱, 라·마의 분배법칙')]
for item in placement:
 h=hashlib.sha256();size=0
 with urllib.request.urlopen(item['url'],timeout=40) as response:
  while True:
   block=response.read(65536)
   if not block:break
   h.update(block);size+=len(block)
 item.update(sha256=h.hexdigest(),bytes=size,observation='동일 세션에서 실제 읽은 공식 교육청의 학년·기준 표를 현재 q13의 해당 계산 단계에 새로 적용. 다른 문항의 승인 결과를 재사용하지 않음.')
official=dict(primaryStandards=dict(url=ref['downloadUrl'],sha256=sha(data),stream='BodyText/Section0',records=records),actualM3Placement=placement,scope='2015 중3, 출처학년도2025/연습학년도2026. 2027중3의2022과정 배치는 별도 검토로 보류.',era=dict(url=ref['era']['url'],locator='부칙1 나/다/라'),notInheritedItemApproval=True,fullExternalDocumentsSaved=False)
surfaces=dict(stem='다섯 기록의 등호 오른쪽을 검사하여 틀린 두 기록을 고르라는 대상과 개수가 명확하다. 각 기록은 중3 근호 계산과 곱셈 공식으로 직접 판단한다.',choices='가~마의 두 기록을 묶은 다섯 보기이다. 전 보기의 기록 집합을 실제 오류 집합과 비교했으며 ③만 일치한다. 새로운 범위 밖 수나 기호를 추가하지 않는다.',figuresAndTables='다섯 식은 텍스트 기록이며 그림·표·척도 의존 조건이 없다. assets=[]이고 봉인 raw의 인쇄 확인과 현재 후보의 식/보기가 대응한다.',notation='근호, 제곱, 음수 부호, 곱의 괄호와 등호는 중학교 표기이다. 오류로 제시한 등호를 참인 전제로 사용할 필요가 없으며 왼쪽을 계산해 대조한다.',answer='틀린 기록은 나·라, 정답은 ③이다. 나의 누락 계수와 라의 부호 오류를 각각 비영 차이로 확인하여 선택답의 존재와 유일성을 보였다.',studentSolution='현 해설은 가=19-6√2, 나=16+4√15, 다=2, 라=-1-2√7, 마=2-7√15로 다섯 식을 모두 정확히 계산하고 나·라만 고친다. √60=2√15와 라·마의 교차항까지 봉인 풀이와 새 정확 계산에 일치한다.',prerequisites='중3 근호 사칙계산·제곱인수 꺼내기와 다항식 곱셈/제곱공식·합차공식 학습 이후. 중1 부호 연산·동류항, 중2 지수·다항식 계산은 선수이다. 일반 고등 항등성 판정 이론이나 복소수·방정식 공식은 요구하지 않는다.')
keys=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']
checks={key:key!='unitFamilyFit' for key in keys}
evidence=dict(calculations=calc,answerCorrect='현재 답 ③은 봉인 raw 및 새 정확 계산과 일치한다.',solutionCorrect=surfaces['studentSolution'],existenceUniqueness=calc['uniqueness']+' 각 근호는 양의 피제곱수로 정의되고, 두 오류의 차이가 각각 비영이므로 오판 여지가 없다.',choicesCorrect=choiceRows,figureConsistent=surfaces['figuresAndTables'],sameCoreConceptAndProcedure='원문의 다섯 선택지는 제곱식 두 개, 합과 차의 곱 하나, 서로 다른 두 일차식의 곱 두 개를 계산하고 근호를 간단히 하여 빈칸 값을 읽는다. 후보도 같은 다섯 공식 구조를 전개하고 유리수항/근호항의 계수를 정리하는 핵심 계산 절차를 유지한다. 원문의 마지막 빈칸 대소 비교는 후보에서 요구되지 않으므로 그 목표까지 유지한다고 주장하지 않는다.',distinctPresentation='빈칸에 들어갈 수들 중 최댓값을 고르는 직접 계산·순서 비교에서, 완성된 다섯 등식의 정확성을 검토하고 두 오류 기록의 쌍을 선택하는 목표로 바뀌었다. 근호 간단히 하기의 계수 누락과 동류항 부호 오류를 별개로 판단해야 한다. 숫자나 문자 교체만의 변형이 아니다. 저자 설명의 “고친다”는 해설에서 교정값을 보여준다는 의미이며 학생 발문은 교정값의 서술 제출까지 요구하지 않는다.',naturalKorean='“등호 오른쪽이 잘못된 기록 두 개”가 판단할 부분과 선택 개수를 명확히 한다. 가~마와 두 기록을 묶은 보기의 대응이 자연스럽고, 불필요한 상황 설정·학교명·단위 혼동이 없다.',curriculumAppropriate='실제 교육부 HWP의9수01-10(3788),9수02-12(3956)을 다시 읽고 각 근호 연산·곱셈 공식에 대응했다. 공식 교육청의 실제 중3 학년 배치 표 두 곳을 함께 적용했다. 출신 학교·학년군 코드·기존 다른 문항의 학년 승인만으로 판정하지 않는다.',allStudentSurfacesInScope='현재 후보의 일곱 표면을 개별 검토하여 passed. 2015 중3의 해당 단원 학습 이후 범위에 한정하며 2022 배치는 별도 보류한다.',unitFamilyFit='false/pending: key/count로는 근호 계산식 다섯 개의 오류 판정과 쌍 선택이라는 완결 목표를 지원하는 정확한 live family를 확인할 수 없다. 이 범위에서 실제 엔진 정의를 읽지 않았으므로 혼합 A19 등 어떤 후보도 강제 배정하지 않는다.',scoreAppropriate='4점·기본 제안은 편집상 타당하다. 다섯 식에 제곱공식·합차공식·분배법칙을 적용하고 두 전형적 오류를 가려내는 수준이며 새 선수 개념은 없다. 원문의 빈칸 다섯 개 계산 및 최댓값 비교가, 다섯 등식 재계산 및 두 오류 선택으로 바뀌어 검산·읽기 부담은 조금 달라질 수 있다. source의 하 표기와 저자의 기본 제안은 낮은 계산 수준이라는 방향에서 부합하지만 동일한 실측 난도/정답률로 보정됐다는 뜻은 아니다.',curriculumSurfaceEvidence=surfaces,officialEvidence='own-q13-official-evidence.json',rawSha256=sha(rb),localRawCommit='a498d3e881a3cbb599419bd5d504f0944a8e6a7c',parentRawCommit=seal['rawCommit'],verificationInputsSha256=hashes['verification-inputs.json'],candidateDigestBinding='해시가 일치하는 verification-inputs의 exact candidateDigest 사용. solveDigest는 봉인 raw 객체의 sorted-key canonicalJSONSHA256로 검증.',pendingReasons=['정확한 live family의 정의·목표·절차·보기 형식 호환 미확정'],scope='허용 stage2 여섯 입력과 본인 봉인 raw 및 해당 공식 기준/학년 배치 표만 사용. 루트 코드·다른 QA·전체 sourceManifest·저자 별도 계산 파일은 열지 않음.')
report=dict(status='pending',studentDigest=v['studentDigest'],candidateDigest=v['candidateDigest'],assetDigest=v['assetDigest'],method='independent-solve-then-review',verifierId='fresh-independent-codex-q13-stage2-20261019-r1',solveDigest=v['solveDigest'],checks=checks,evidence=evidence,curriculumSurfaces={s:'passed' for s in surfaces},mathApproved=True,gradeApproved2015M3=True,year2022M3='pending-separate-placement-review',liveFamily=False,unitFamilyFit=False,sourceIdentityApproved=False,rightsApproved=False,similarityApproved=False,nativeProvenanceApproved=False,loadable=False)
assert len(checks)==12 and sum(checks.values())==11 and len(surfaces)==7
(b/'reports').mkdir(exist_ok=True)
for path,obj in [(b/'reports/q13.json',report),(b/'own-q13-calculations.json',calc),(b/'own-q13-official-evidence.json',official),(b/'own-q13-input-hashes.json',hashes)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
assert sha(rp.read_bytes())==sha(rb)
for n,h in hashes.items():assert sha((b/n).read_bytes())==h
print('ReportSHA256',sha((b/'reports/q13.json').read_bytes()))
print('12checks/11true;7surfacespassed;5records+5choiceschecked;familyheld;rawand6inputsunchanged.')
