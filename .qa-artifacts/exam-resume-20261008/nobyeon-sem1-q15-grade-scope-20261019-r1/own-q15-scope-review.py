from pathlib import Path
import urllib.request,hashlib,io,olefile,zlib,struct,json,re
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q15-grade-scope-20261019-r1');src=p/'source-q15-only.json'
def h(b):return hashlib.sha256(b).hexdigest()
def put(n,v):
 with (p/n).open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
sourceBytes=src.read_bytes();source=json.loads(sourceBytes.decode('utf-8-sig'));q=source['question'];assert q['number']==15 and q['stem'].startswith('$x^{3}');assert len(q['choices'])==5
u='https://www.moe.go.kr/boardCnts/fileDown.do?m=&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84';doc=urllib.request.urlopen(u,timeout=60).read();assert h(doc)=='1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb';o=olefile.OleFileIO(io.BytesIO(doc));flag=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0];d=o.openstream('BodyText/Section0').read();d=zlib.decompress(d,-15) if flag&1 else d;i=0;n=0;rs={}
while i<len(d):
 header=struct.unpack_from('<I',d,i)[0];i+=4;size=header>>20
 if size==4095:size=struct.unpack_from('<I',d,i)[0];i+=4
 payload=d[i:i+size];i+=size;n+=1;rs[n]={'tag':header&1023,'payload':payload}
actualText={n:rs[n]['payload'].decode('utf-16le',errors='replace') for n in range(3890,4079) if n in rs and rs[n]['tag']==67}
assert '다음의 경우' in actualText[4015];assert '단항식' in actualText[3995];assert '역관계' in actualText[4055]
formulas={}
for n in [4023,4029,4035,4041,4047,4053]:
 v=rs[n]['payload'];assert rs[n]['tag']==88;length=struct.unpack_from('<H',v,4)[0];script=v[6:6+length*2].decode('utf-16le');formulas[str(n)]={'tag':88,'script':script,'payloadSha256':h(v)}
assert formulas['4023']['script']=='m(a+b)`=`ma+mb'
par={3896:'문자식 기초/방정식 절차의 앞뒤 맥락',3932:'단항식과 다항식의 곱셈/다항식을 단항식으로 나누기',3956:'9수02-12 다항식 곱셈 및 인수분해',3975:'인수·인수분해·완전제곱식 등을 학습요소로 열거',3991:'자연수 지수법칙을 단항식 곱셈/나눗셈에 필요한 정도로 한정',3995:'다항식 나눗셈은 단항식으로 나누어 다항식 몫이 되는 경우에 한정',4011:'수의 사칙연산/소인수분해의 다항식 확장 관점',4015:'다항식 곱셈/인수분해의 취급 경우 열거 도입',4055:'곱셈과 인수분해의 역관계 및 유사 관계 활동',4059:'이차방정식은 실수해인 경우',4067:'평가 유의사항 절 시작',4071:'과도하게 복잡한 방정식/부등식 활용을 제외',4075:'이차방정식 근과 계수 관계를 제외'}
locators=[{'record1based':k,'tag':67,'payloadSha256':h(rs[k]['payload']),'ownParaphrase':v} for k,v in par.items() if k in actualText]
# Cross-check actual official curriculum page, not search snippets.
ku='https://askmath.kosac.re.kr/mathEduProcess/index.do';kb=urllib.request.urlopen(ku,timeout=60).read();kt=kb.decode('utf-8',errors='replace');assert '나머지정리' in kt and '고등학교에서 추가된' in kt
pu='https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf';ph=hashlib.sha256();pn=0
with urllib.request.urlopen(pu,timeout=60) as response:
 while True:
  chunk=response.read(65536)
  if not chunk:break
  ph.update(chunk);pn+=len(chunk)
primary={'moe':{'url':u,'sha256':h(doc),'bytes':len(doc),'stream':'BodyText/Section0','inspectedRangeRecords1based':[3890,4078],'rangePurpose':'문자와 식 해당 영역의 표준·학습요소·교수학습 유의사항 전체 및 평가 유의사항 끝까지 실제 tag67을 읽고,4015 뒤의 수식 객체tag88을 직접 복원. 일반 표준 한 줄만으로 판정하지 않음.','locators':locators,'allSixFormulaObjects':formulas,'interpretation':'공통인수 m(a+b)=ma+mb와 두항 제곱, 제곱의 차, 일차식×일차식 형태가 열거됨. 삼차 사항 묶기 자체의 항목/예제는 이 목록에 직접 보이지 않는다. 목록에 없다는 사실만으로 일체의 삼차식이 명시적 금지라고 바꾸어 쓰지 않음.','divisionExclusion':'다항식÷일차다항식 일반 나눗셈은 단항식 나눗셈 한정을 넘어선다. source 선택지를 시험하려고 이를 기본 방법으로 사용하지 않음.'},'actualM3Placement':{'url':pu,'streamSha256':ph.hexdigest(),'bytes':pn,'zeroBasedPdfPagesInspected':[89,90],'printedPages':['90','91'],'webLines':'5342-5402,5410-5421,5434-5448','actualObservation':'대상 중3/다항식 인수분해/9수02-12를 명시. 공통인수·완전제곱식 도입, 대수막대로 직사각형 만들기 및 곱셈공식 관계/문제풀이를 설명.','limitation':'이 실제 중3 자료는 해당 단원 배치를 뒷받침하지만 삼차 사항 묶기→공통일차식 재추출의 전체 과제 또는 그 평가범위의 직접 예시는 확인되지 않음. 학교명/교과서 문제풀기라는 일반 언급으로 그 예시를 추정하지 않음.'},'kosacOfficialCurriculumCrosscheck':{'url':ku,'htmlSha256':h(kb),'bytes':len(kb),'actualWebLines':'491-513: 중학교 표준/제한/여섯 공식; 678-698: 고등 수학 인수분해와 나머지정리/인수정리 학습요소, 추가 공식','observed':'실제 페이지의 중학교 취급 공식 목록 및 제한이 MOE 추출과 일치. 고등 선택중심 수학에는 나머지정리·인수정리와 추가 인수분해 범위가 별도 제시됨.','interpretation':'고등학교에서 다룬다는 사실만으로 단순 분배법칙까지 중학교 금지라는 역추론은 하지 않음. 고등 인수정리/나머지정리를 중3 허가 근거로도 쓰지 않음.'},'retrievalLimits':['부산 공식 PDF URL은 웹 도구 UnexpectedStatusCode로 열지 못했다. 해당 문서에 관한 새 확인 주장은 없음.','MOE Section0의 고등10수학 code 문자열 검색은 불일치했고 다른 BodyText 구간에서도 나머지정리 text hit를 얻지 못함. 부재로 해석하지 않고 고등 범위 대조는 실제 KOSAC 페이지에 한정.'],'notSaved':'전체 HWP/PDF/HTML 및 페이지 이미지 저장·Git 포함 없음. 관련 식(일반 수학 항등식), 짧은 자체 요약과 해시/locator만 저장.'}
put('own-q15-primary-hash-locators.json',primary)
# Formal identity checks only; these variables are an algebraic schema, not an authored item.
# Sparse exact integer polynomial dictionary: exponent tuple -> coefficient.
zero=(0,0,0,0)
def var(i):return {tuple(1 if j==i else 0 for j in range(4)):1}
def add(*ps):
 out={}
 for poly in ps:
  for e,c in poly.items():out[e]=out.get(e,0)+c
 return {e:c for e,c in out.items() if c}
def neg(poly):return {e:-c for e,c in poly.items()}
def mul(a,b):
 out={}
 for e,c in a.items():
  for f,d in b.items():
   ef=tuple(x+y for x,y in zip(e,f));out[ef]=out.get(ef,0)+c*d
 return {e:c for e,c in out.items() if c}
a,bv,c,dv=[var(i) for i in range(4)]
common=add(mul(a,c),mul(a,dv))==mul(a,add(c,dv))
grouping=add(mul(a,c),mul(a,dv),mul(bv,c),mul(bv,dv))==mul(add(a,bv),add(c,dv))
differenceSquares=add(mul(a,a),neg(mul(bv,bv)))==mul(add(a,bv),add(a,neg(bv)))
assert common and grouping and differenceSquares
checks={'sourceShapeOnly':{'degree':3,'nonzeroTerms':4,'selectionTask':'which expression is not a factor','answerKeyCalculated':False,'choicesEvaluated':False},'exactFormalSchemaChecks':{'commonFactorIdentity':common,'groupingByRepeatedDistributivity':grouping,'differenceOfSquares':differenceSquares,'method':'四つの形式変数の指数tupleをキーにした整数係数辞書の加算/乗算。浮動小数・数値サンプル・source係数での因数分解・高等定理なし。'},'gradeBoundary':'恒等式の正しさは学年配置の証明ではない。完全なsource手順の公式配置はpending。'}
checks['exactFormalSchemaChecks']['method']='4個の形式変数による疎な整数係数多項式の加算・乗算を厳密比較。sourceの係数で因数分解したり選択肢を評価せず、一般の分配法則を検査。'
checks['exactFormalSchemaChecks']['method']='? ????? ?? tuple? key? ?? ???? ??? ???? ?????? ?? ??. source ??? ????? ??? ?? ?? ?? ???? ???? ??.'
checks['gradeBoundary']='???? ??? ???? ?? ??? ??? ???. source? ?? ??? ?? ?? ??? pending.'
put('own-q15-reproducible-checks.json',checks)
method=[{'step':1,'requiredAction':'삼차 사항식의 앞 두 항과 뒤 두 항을 묶고, 각 묶음의 공통 단항식을 밖으로 꺼낸다.','gradeBasis':'단항식×다항식의 역분배/공통인수 공식은 관찰됨.','gradeStatus':'component-supported'}, {'step':2,'requiredAction':'두 묶음에서 같은 일차식이 생김을 알아보고, 그것을 다시 공통인수로 꺼낸다.','gradeBasis':'반복 분배법칙으로 대수적으로 정당화 가능. 그러나 삼차 사항식의 항 묶기와 공통 일차식 인식 전체 과정을 이2015중3 평가 범위로 직접 배치한 일차자료를 확보하지 못했다.','gradeStatus':'whole-procedure-pending'}, {'step':3,'requiredAction':'남은 이차 부분에 제곱의 차 공식을 적용하고 원래 식으로 곱셈 전개가 되돌아가는지 확인한다.','gradeBasis':'제곱의 차 공식 및 인수분해/곱셈의 역관계는 MOE에 직접 열거.','gradeStatus':'component-supported'}, {'step':4,'requiredAction':'인수의 뜻에 따라 주어진 형태들이 곱의 인수로 표현되는지 검토한다.','gradeBasis':'인수/인수분해는 실제 학습요소. 그렇다고 고등 인수정리나 다항식÷일차식 나눗셈을 허가하지 않음.','gradeStatus':'depends-on-whole-procedure'}]
report={'kind':'pre-authoring-independent-grade-scope-review','questionNumber':15,'status':'pending','target':{'sourceAcademicYear':2025,'practiceAcademicYear':2026,'grade':'중3','curriculum':'2015','m3From2027':'pending separate actual 2022 placement'},'sourceInputSha256':h(sourceBytes),'candidateExists':False,'authoredCandidateCreated':False,'sourceAnswerCalculated':False,'sourceAnswerKeyUsed':False,'gradeApproved':False,'explicitlyRejected':False,'decision':'일반9수02-12가 중3에 있다는 근거 및 구성 공식의 존재만으로 삼차 사항 묶기 전체 학생 방법을 승인할 수 없다. 실제 조사에서 전체 절차의 중3 배치가 충분히 확정되지 않아 pending. 삼차라는 차수만으로 명시적 범위 밖 reject를 꾸며내지도 않는다.','completeMethodAuditWithoutSourceKey':method,'observed':['교육부2015 원문 표준뿐 아니라 교수학습/평가 유의사항과 여섯 수식 객체를 실제 읽음.','공통인수·제곱의 차 및 곱셈/인수분해 역관계는 실제 열거되어 있음.','다항식을 단항식으로 나누는 제한이 실제 명시되어 있음.','실제 인천 중3 단원 자료는 공통인수·완전제곱식 등의 학습 배치를 명시함.'],'inferred':['이 source 형태는 항을 묶고 같은 일차식을 다시 인수로 꺼내는 방법으로 접근 가능하다. 이 방법의 대수적 정당성은 기본 분배법칙에서 나온다.','개별 조작이 중학교 공식과 연결된다는 것과 해당 삼차 사항의 전체 발견/검토 과제가 교육과정 중3 배정 범위라는 것은 별개의 주장이다.'],'unknown':['삼차 사항 묶기 전체 방법을 명시적으로 허용/배치하는 실제2015중3 일차자료','그 전체 방법에 대한 학교 진도/선수학습 보장','2022개정 중3의 실제 별도 배치'],'notEvidence':['source 학교/학년 표기/난도하/4점이라는 라벨','일반적9수02-12 문장만','정확한 항등식 코드 통과만','고등 인수정리/나머지정리/조립제법 또는 일반 다항식÷일차식 연산을 아는 학생의 풀이'],'blockedMethods':{'polynomialDivisionByLinear':'중학교 단항식 나눗셈 한정을 넘어서는 일반 알고리즘은 승인 근거로 삼지 않음.','factorOrRemainderTheorem':'고등학교 별도 학습 범위이며 이 source의 중3 허가 근거로 사용하지 않음.','degreeOnlyRule':'삼차식이면 전부금지라는 규칙은 확인된 원문에 없어 만들지 않음.'},'neededToResolve':'정확한 grouping/cubic four-term 전체 절차와 인수 선택 과제가2015중3에 실제 배치됨을 보여 주는 공식 원문/지도자료 및 제한과의 양립 근거. 없으면 새 문항 작성·학년 승인 계속 보류.','evidenceFiles':['own-q15-primary-hash-locators.json','own-q15-reproducible-checks.json'],'counts':{'newAuthored':0,'newBlindSolve':0,'newMathApproval':0,'newGradeApproval':0},'sourceIdentityApproved':False,'rightsApproved':False,'nativeApproved':False,'loadable':False}
put('own-q15-scope-report.json',report)
assert src.read_bytes()==sourceBytes
put('own-q15-audit-hashes.json',{'inputSha256':h(sourceBytes),'inputUnchanged':True,'outputs':{n:h((p/n).read_bytes()) for n in ['own-q15-scope-report.json','own-q15-primary-hash-locators.json','own-q15-reproducible-checks.json']},'officialDocumentsStored':False,'answerKeyCalculated':False,'newQuestionCount':0})
print('report '+h((p/'own-q15-scope-report.json').read_bytes()));print('primary '+h((p/'own-q15-primary-hash-locators.json').read_bytes()))
