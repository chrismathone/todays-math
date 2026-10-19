from pathlib import Path
import json,hashlib,urllib.request,io,olefile,zlib,struct,datetime
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q20-grade-scope-20261020-r1');src=p/'source-q20-only.json';inputBytes=src.read_bytes();expected='ee7511ea5fcb3c67a2cd767ad7e5aeaa24c83b613b6900ca43e5d6b7ce498bf6';assert hashlib.sha256(inputBytes).hexdigest()==expected
q=json.loads(inputBytes.decode('utf-8-sig'))['question'];assert q['number']==20 and q['choices']==[];assert q['stem'].count('2x^{2}-x-')==2;assert q['stem'].count('\\left(')==2
probe=p/'own-utf8-probe-r2.txt';probeText='q20 \ud559\ub144 \ubc94\uc704 \ub3c5\ub9bd \uac80\ud1a0 \u00b7 UTF-8 \uc77d\uae30 \uc4f0\uae30 \uac80\uc99d\n'
if not probe.exists():
 with probe.open('x',encoding='utf-8',newline='\n') as f:f.write(probeText)
assert probe.read_text(encoding='utf-8')==probeText

def sha(b):return hashlib.sha256(b).hexdigest()
def put(n,v):
 assert n.startswith('own-')
 if n=='own-q20-primary-evidence.json' and (p/n).exists():return
 with (p/n).open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
u='https://www.moe.go.kr/boardCnts/fileDown.do?m=&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84';b=urllib.request.urlopen(u,timeout=60).read();assert sha(b)=='1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb';o=olefile.OleFileIO(io.BytesIO(b));data=o.openstream('BodyText/Section0').read();flag=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0];data=zlib.decompress(data,-15) if flag&1 else data;i=0;n=0;records={}
while i<len(data):
 header=struct.unpack_from('<I',data,i)[0];i+=4;size=header>>20
 if size==4095:size=struct.unpack_from('<I',data,i)[0];i+=4
 payload=data[i:i+size];i+=size;n+=1
 if 3932<=n<=4075:records[n]={'tag':header&1023,'payload':payload}
texts={k:v['payload'].decode('utf-16le',errors='replace') for k,v in records.items() if v['tag']==67};assert '[9수02-12]' in texts[3956];assert '다음의 경우' in texts[4015];assert '단항식' in texts[3995];assert '역관계' in texts[4055]
paraphrases={3932:'단항식×다항식과 다항식÷단항식 연산의 원리/계산',3956:'다항식 곱셈/인수분해 표준9수02-12',3975:'인수·인수분해·완전제곱식 등 문자와 식 학습요소',3991:'단항식 곱셈/나눗셈에 필요한 자연수 지수법칙 정도',3995:'다항식 나눗셈은 단항식으로 나누어 다항식 몫이 되는 경우로 한정',4011:'수의 연산/소인수분해의 다항식 확장 관점',4015:'다항식 곱셈·인수분해 취급 사례의 열거 도입',4055:'다항식 곱셈과 인수분해의 역관계/유사 관계 탐구 활동',4059:'이차방정식의 실수해 범위',4063:'교수학습 상황의 사용 가능 용어 목록',4071:'과도하게 복잡한 방정식/부등식 활용 제외',4075:'이차방정식의 근과 계수 관계 제외'}
locators=[{'stream':'BodyText/Section0','record1based':k,'tag':67,'payloadSha256':sha(records[k]['payload']),'ownParaphrase':v} for k,v in paraphrases.items()]
# Only two short exact textual excerpts, not full copyrighted sections.
quotes={str(k):texts[k].replace('\r','').strip() for k in [3995,4015]};assert sum(len(t.split()) for t in quotes.values())<=25
formulas=[]
for k in [4023,4029,4035,4041,4047,4053]:
 v=records[k];assert v['tag']==88;length=struct.unpack_from('<H',v['payload'],4)[0];script=v['payload'][6:6+2*length].decode('utf-16le');formulas.append({'record1based':k,'tag':88,'script':script,'payloadSha256':sha(v['payload'])})
pu='https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf';ph=hashlib.sha256();pn=0
with urllib.request.urlopen(pu,timeout=60) as response:
 while True:
  block=response.read(65536)
  if not block:break
  ph.update(block);pn+=len(block)
ku='https://askmath.kosac.re.kr/mathEduProcess/index.do';kb=urllib.request.urlopen(ku,timeout=60).read();kt=kb.decode('utf-8',errors='replace')
# Public course HTML only, no video, login, API or original question material.
ebs=[]
for url in ['https://mid.ebs.co.kr/course/view?courseId=100007228&left=series','https://mid.ebs.co.kr/course/view?courseId=100004615']:
 try:
  eb=urllib.request.urlopen(url,timeout=60).read();ebs.append({'url':url,'actualHttpBodySha256':sha(eb),'bytes':len(eb),'fullHtmlSaved':False})
 except Exception as exc:ebs.append({'url':url,'directHashStatus':'pending','error':str(exc),'actualWebTextRead':True})
primary={'observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'moe2015':{'title':'교육부 고시 제2020-236호 별책8 수학과 교육과정 수정','indexUrl':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=81884&lev=0','downloadUrl':u,'documentSha256':sha(b),'bytes':len(b),'actualInspectedRecordRange':[3932,4075],'method':'실제 HWP 메모리 다운로드/압축플래그/Section0 raw-deflate/순차 record header/tag67와tag88 수식 복원. 일반 표준 또는 검색 snippet만 보지 않음.','locators':locators,'shortExactText':quotes,'allSixFormulaObjects':formulas,'wholeMethodLimit':'열거된 기본 공식과 역관계 활동 조항은 직접 확인. 공통 이차식을 한 덩어리로 놓고 그 안에서 인수분해한 다음 되돌려 추가 인수분해하는 전체 사차 과제를 허용하는 명시적 깊이/예제는 이 구간에서 확인하지 못함. 사차식 전부 금지라는 명시문도 확인하지 못함.'},'actual2015M3Placement':{'url':pu,'documentSha256':ph.hexdigest(),'bytes':pn,'zeroBasedPdfPagesRead':[89,90],'printedPages':['90','91'],'webLocators':'lines5342-5350:중3/단원/9수02-12;5398-5402:공통인수·완전제곱식;5410-5421:곱셈공식/직사각형활동;5434-5448:총정리/문제풀이','ownObservedText':'실제 중3 인수분해 단원에서 공통인수/완전제곱식과 대수막대/곱셈공식 관계를 지도한다.','notEstablished':'교과서 문제풀이 또는 총정리라는 일반 표현은 공통 이차식 치환의 전 과정이나 그 평가 깊이의 허용을 증명하지 않는다.'},'officialCurriculumCrosscheck':{'url':ku,'htmlSha256':sha(kb),'rawHtmlTextMatchLimit':'Raw UTF8 substring assertion did not match rendered curriculum wording; hash identifies fetched bytes only. Course-specific context was inspected in actual web text at cited lines, not inferred absent from raw HTML.','webLocators':{'middle':'491-513 표준/취급공식/평가유의사항','otherCourse':'2075-2092 [12기수02-03] 등 기본수학의 문자와식 절'},'ownObservation':'치환 인수분해 제외 문구를 찾았으나 다른 과목12기수 문맥이다. 이를2015중3의 직접금지 조항으로 옮겨 붙이지 않았다. 반대로 고등학교 인수분해/인수정리 표준으로 중3 사용을 허가하지도 않는다.'},'publicEbsCourseLeads':{'httpHashRecords':ebs,'course100007228':{'actualWebLines':{'edition':'607-608:2022개정NEW중학3/2022개정강좌제목','target':'630:수강대상3학년','topic':'696,851-853:17강/공통부분이있는식의인수분해'},'observed':'공통부분을 다루는 실제 강좌 목록은 있지만2022개정이라고 명시한다.','notUsedForApproval':'2015 배치의 근거로 사용하지 않음. 강의 실제 수식/단계와 공통 이차식까지의 깊이는 열람하지 않아2022배치 승인도 하지 않음.'},'course100004615':{'url':'https://mid.ebs.co.kr/course/view?courseId=100004615','observed':'실제 중3 강좌 페이지에 공통부분 전개와 복잡한 인수분해 목록이 있으나2015문자열 검색은0건.','limit':'발행/적용 교육과정 및 공통 이차식 치환의 구체적 수식·전 과정이 미확인. 목록/강좌학년만으로 승인하지 않음.'}},'boundedSearchLimits':['공식go.kr/re.kr/edu.kr의 중3·2015·공통부분/치환 조합 검색에서 직접 해당 전체 방법의 배치 자료를 얻지 못함. 검색0건이 교육과정 금지나 방법 부재의 증명은 아님.','EBS course page HTML/강의목록만 읽음. API/로그인/다운로더/영상/자료실 접근하지 않았고 source answer를 검색하지 않음.'],'fullExternalDocumentsOrPagesCommitted':False}
put('own-q20-primary-evidence.json',primary)
steps=[{'step':1,'wholeStudentDemand':'반복되는 이차식 부분을 식의 한 덩어리로 인식하고 새 문자로 잠시 이름 붙인다.','supportedComponents':'대입/문자식/공통부분이라는 기초 관점과 개별 기본공식은 관찰됨.','wholeDepthStatus':'pending:2015중3에서 이차식을 블록으로 놓는 해당 깊이의 직접 예제/지도근거 미확보.'},{'step':2,'wholeStudentDemand':'두 괄호와 바깥 상수항을 그대로 유지한 채 새 문자에 대한 이차식으로 보고 인수분해한다.','supportedComponents':'기본 이차 인수분해 공식 자체는 교육부 열거 대상.','wholeDepthStatus':'pending:원래 사차 구조에서의 발견·치환·상수항 처리 전체과정의 평가범위는 구성요소 승인과 별개.'},{'step':3,'wholeStudentDemand':'새 문자를 원래 이차식으로 되돌린 뒤 생긴 인수들을 필요한 만큼 다시 인수분해한다.','supportedComponents':'개별 이차식 인수분해와 역분배의 대수적 타당성은 기본 연산으로 설명 가능.','wholeDepthStatus':'pending:되돌림 뒤까지 완결하는 전체 다단계 학생 절차의 실제2015중3 배치 확인 필요.'},{'step':4,'wholeStudentDemand':'곱을 되전개하여 원래의 괄호 구조와 같은 식인지 확인하고 서술한다.','supportedComponents':'교육부 record4055의 곱셈/인수분해 역관계 지도와 연결.','wholeDepthStatus':'pending:서술형6점의 실제 해설·부분점수·최종표현 검토는 별도. source 정답/인수 목록은 계산하지 않음.'}]
# The only algebra control is a general composition identity, not this source's answer.
# A formal polynomial identity remains valid under replacing its variable by a polynomial.
def mul(a,b):
 out=[0]*(len(a)+len(b)-1)
 for i,x in enumerate(a):
  for j,y in enumerate(b):out[i+j]+=x*y
 while len(out)>1 and out[-1]==0:out.pop()
 return out
def add(a,b):return [(a[i] if i<len(a) else 0)+(b[i] if i<len(b) else 0) for i in range(max(len(a),len(b)))]
def compose(a,t):
 out=[0]
 for c in reversed(a):out=add(mul(out,t),[c])
 return out
# No numerical q20 coefficients used: symbolic-independent verification schema only.
formal={'algebraicPrinciple':'다항식 항등식에서 같은 문자를 같은 다항식으로 대입하면 등식이 보존된다. 대수적 타당성과 교육과정 허용 깊이는 별개.','scope':'source계수/정답/최종인수/선택지 계산 없이 일반 polynomial composition 연산의 분배 일관성만 검증','checked':True,'notGradeEvidence':True}
# Pure abstract coefficient-array distributivity control, unrelated to source values.
a=[1,1];bvec=[1,-1];block=[0,0,1];assert compose(mul(a,bvec),block)==mul(compose(a,block),compose(bvec,block))
controls={'inputSha256':expected,'probeSha256':sha(probe.read_bytes()),'probeRoundTripPassed':True,'sourceShapeOnly':{'twoQuadraticFactors':True,'sameQuadraticPrefixInBoth':True,'plusOuterConstant':True,'compositeDegree':4,'expressionExpanded':False,'answerOrFinalFactorsComputed':False},'formalControl':formal,'policyChecks':{'noSchoolOrDifficultyAsPermission':True,'noGenericBandOnlyApproval':True,'noHighSchoolTheoremAsPermission':True,'noCrossCourseSubstitutionBanImported':True,'noBlanketAllQuarticExclusion':True,'newQuestionCount':0}}
put('own-q20-reproducible-checks.json',controls)
future={k:{'status':'pending','basis':'작성된 새 후보가 없고 전체 방법의2015중3 허용 깊이가 미확정이다. 실제 후보의 이 표면을 별도로 심사해야 한다.','evidence':'현재는 source-q20-only의 구조 분류/공식근거 확인만 수행. 후보 '+label+' 승인 또는 개별 수학정답 검증을 하지 않았다.'} for k,label in [('stem','본문'),('choices','보기/응답형식'),('figuresAndTables','그림·표'),('notation','표기'),('answer','답'),('studentSolution','학생해설'),('prerequisites','전체선수학습/방법')]}
report={'kind':'independent-before-authoring-whole-method-grade-scope','questionNumber':20,'status':'before-authoring-pending','inputSha256':expected,'target':{'sourceAcademicYear':2025,'practiceAcademicYear':2026,'curriculum':'2015','grade':'중3','afterPolynomialFactorizationLearning':True,'m3From2027':'2022 actual placement separately pending'},'decision':'개별 기본공식과 실제 중3 인수분해 단원 배치는 확인했으나, 공통 이차식을 한 덩어리로 취급하여 인수분해하고 되돌린 후 끝까지 인수분해하는 전체 과제의2015중3 허용 깊이를 직접 확정하지 못했다. 따라서 저작 전pending. 사차식이라는 이유의 일괄 제외나 학교 원문의 학년을 근거로 한 승인은 하지 않는다.','wholeMethodOutlineWithoutSourceKey':steps,'observed':['교육부 원문의 취급 공식6개/다항식나눗셈 제한/역관계 활동과 평가유의사항 실제 확인.','인천 공식 자료의2015시기 실제 중3 단원/공통인수·완전제곱식 지도 확인.','EBS의 공통부분 인수분해 목록 단서도 실제 열었으나 한 강좌는2022개정 명시, 다른 목록은2015확정/구체적인 전체수식절차 미확인.'],'inferred':['공통식을 같은 새 문자로 이름 붙이고 되돌리는 조작은 고등 인수정리/나머지정리 없이 다항식 연산의 정당성으로 설명 가능하다. 이 설명이 그 복합 발견과제의 중3 교육과정 허용 깊이를 자동 보증하지 않는다.','원래 식을 무조건 전개하면 사차식이 되지만 차수만으로 허용/금지를 판정할 수 없다.'],'unknown':['공통 이차식 블록의 인식→새문자의 이차 인수분해→되돌림→추가 인수분해/검산 전체깊이를 실제2015중3에 배치하는 공식/일차자료','source의6점/부분점수/중난도와 향후후보 목표난도·학생서술 rubric 적절성','2022중3 실제 별도배치 및 후보별적합성'],'resolveCondition':'2015개정으로 확인되는 공식 지도자료/검정교과서 등에서 공통 이차식 블록까지의 실제 전 과정 예제·지도깊이를 확보하고, 교육부 취급 범위와의 양립 및 전체 선수학습을 명시해야 한다. 제목/개별 공식/학년라벨만 추가해도 해소되지 않는다.','futureCandidateSurfaces':future,'candidateExists':False,'candidateAuthoredOrRead':False,'sourceAnswerOrKeyComputed':False,'studentBlindApproval':False,'mathApproved':False,'gradeApproved2015M3':False,'explicitOutOfGradeRejection':False,'arbitraryAllQuarticExclusion':False,'sourceIdentityApproved':False,'rightsApproved':False,'nativeApproved':False,'loadable':False,'auditDiagnostics':['Initial stdin UTF8 probe failed intended Korean content check; original probe preserved and escaped-Unicode r2 probe passed.','Raw HTML substring assertion did not match; actual web text was read with course context, not interpreted absent.','Formal composition control initially compared noncanonical trailing-zero arrays; normalized representation and rechecked exact identity. No source-answer calculation.'],'counts':{'newAuthored':0,'newBlind':0,'newMathApproval':0,'newGradeApproval':0,'changeTo125':0},'evidenceFiles':['own-q20-primary-evidence.json','own-q20-reproducible-checks.json','own-utf8-probe-r2.txt'],'boundaries':'단일허용입력+공식공개primary만 읽음. 부모root/code/다른QA/원본파일/미래후보/DB/API에 접근하지 않음. 전체외부문서/페이지는 저장·stage하지 않음.'}
put('own-q20-scope-report.json',report)
assert src.read_bytes()==inputBytes
put('own-q20-seal-hashes.json',{'inputSha256':sha(inputBytes),'inputUnchanged':True,'outputs':{n:sha((p/n).read_bytes()) for n in ['own-utf8-probe-r2.txt','own-q20-primary-evidence.json','own-q20-reproducible-checks.json','own-q20-scope-report.json']},'commandProbe':'actual Get-Location/git status; escaped-Unicode UTF8 exclusive write/read equality checked','probeDiagnostic':'First stdin probe did not preserve Korean through shell encoding; initial own-utf8-probe.txt preserved. New r2 Unicode-escape probe verifies intended Korean UTF8 bytes independently.','rootWrites':0,'externalFullDocumentsStaged':False})
print('report '+sha((p/'own-q20-scope-report.json').read_bytes()));print('primary '+sha((p/'own-q20-primary-evidence.json').read_bytes()))
