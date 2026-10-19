from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess,math
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group10-review-20261020-r1');v=p/'verification'
h=lambda b:hashlib.sha256(b).hexdigest()
canon=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
load=lambda f:json.loads(f.read_text(encoding='utf-8-sig'))
probe=v/'own-q11-q12-review-utf8.txt';probe.write_text('독립 검토: 중심각·원주각, 접선 부분과 전체\n',encoding='utf-8');assert probe.read_text(encoding='utf-8').startswith('독립 검토')
inputs=load(v/'verification-inputs.json');manifest=load(v/'verification-manifest.json');seal=load(v/'sealed-raw-commit.json')
assert h((v/'verification-inputs.json').read_bytes())==manifest['verificationInputsSha256']
pre={str(x):h(x.read_bytes()) for x in [v/'verification-inputs.json',v/'verification-manifest.json',v/'sealed-raw-commit.json',p/'blind/student-problems.json']}
primary={'normative':{'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','edition':'2015','previouslyActuallyViewed':True,'locator':'2015 tab; standards 9수04-19 원의 현과 접선, 9수04-20 원주각; 교수학습 유의사항 일반적인 원의 비례관계 제외, 접선의 길이 용어 사용 가능','scopeLimit':'원 비례·접선 곱·삼각함수·좌표 해법을 학생의 필수 방법으로 사용하지 않음'},'placement':{'url':'https://sunggok-m.goebc.kr/upload/sunggok-m/na/bbs_6150/2024/09/CCFFC34D-CA2A-756F-4010-7169B6A631FA.pdf','sha256':'57ae912bc9a352dba6181f80015631f2badded7680077d22582874f609ffadd7','previouslyActuallyViewed':True,'locator':'PDF index73 / physical74 / PRINTED72: 중3 수학 2학기; 9월9수04-19, 10월9수04-20','limit':'실제 중3 배치 근거. 경신중 특정 시험 진도·2022 교육과정·권리 인증 아님; 예전 인쇄73 잠정 표기는 사용하지 않음'}}
results=[]
for entry in inputs:
 c=entry['candidate'];q=c['questionNumber'];rawpath=p/f'blind/solve/q{q}.json';rawbytes=rawpath.read_bytes();raw=load(rawpath)
 proof=next(x for x in seal['proofs'] if x['n']==q)
 assert h(rawbytes)==proof['sha256']
 assert rawbytes==subprocess.check_output(['git','show',f'ffe08034018c8264ea2f7a53cae8f857fbeadee2:{rawpath.as_posix()}'])
 assert raw==entry['independentSolve'] and h(canon(raw))==entry['solveDigest']
 binding=next(x for x in load(p/'package/manifest.json')['bindings'] if x['studentDigest']==entry['studentDigest'])
 assert binding['candidateDigest']==entry['candidateDigest']
 candidatepath=p/'package'/binding['privateCandidatePath']
 assert h(candidatepath.read_bytes())==binding['candidateFileSha256'] and load(candidatepath)==c
 pre[str(candidatepath)]=h(candidatepath.read_bytes())
 student=next(x for x in load(p/'blind/student-problems.json') if x['questionNumber']==q)
 for key in ('content','choices','score','questionType','twinExternalId'):assert student[key]==c[key]
 asset=entry['assets'][0];specpath=p/f'package/private/q{q}/figure-1.spec.json';svgpath=p/f'package/private/q{q}/figure-1.svg'
 assert h(specpath.read_bytes())==asset['specSha256'];assert h(svgpath.read_bytes())==asset['svgSha256'];assert svgpath.read_bytes()==(p/'blind'/asset['studentPath']).read_bytes()
 pre[str(rawpath)]=h(rawbytes);pre[str(specpath)]=h(specpath.read_bytes());pre[str(svgpath)]=h(svgpath.read_bytes())
 sp=load(specpath);pts=sp['points'];dist=lambda a,b:math.dist(pts[a],pts[b]);dot=lambda a,b,o:sum((pts[a][i]-pts[o][i])*(pts[b][i]-pts[o][i]) for i in range(2))
 geometry=[]
 if q==11:
  half=F(108,2);answer=half/2;assert answer==27
  for name in 'KLMT':assert abs(dist(name,'O')-65)<1e-10
  central=lambda a,b:math.degrees(math.acos(max(-1,min(1,dot(a,b,'O')/(dist(a,'O')*dist(b,'O'))))))
  assert abs(central('K','L')-54)<1e-10 and abs(central('L','M')-54)<1e-10 and abs(central('K','M')-108)<1e-10
  assert set(sp['segments'])=={'OK','OM','KT','LT'} and sp['angles']['given']['label']=='108°' and sp['angles']['target']['points']==['K','L']
  assert c['answer']=='$27^\\circ$'
  checksOwn={'centralSplit':str(half),'inscribed':str(answer),'existence':'임의의 양의 반지름에 K=0°,L=54°,M=108°,T=234°를 잡으면 네 점이 서로 다르고 호 위치가 충족된다.','uniqueness':'T가 L을 포함하지 않는 호 KM 위라는 조건으로 작은 호 KL을 보는 원주각만 가능. T의 이동·원의 반지름과 무관하게 27°.'}
  # Exact exclusion controls for incorrect doubled/unsplit/reflex answers.
  assert all(x!=answer for x in (F(54),F(108),F(153),F(216)))
  solutionBasis='실제 저자 해설의 ∠KOL=∠LOM, 합108°, 부분54°, ∠KTL=54°÷2를 각각 검증했다. T가 작은 호 KL에 있지 않음을 발문으로 보장한다. 9수04-20 및 같은 호 중심각 성질만 필요하며 고등 방법·원의 일반 비례를 사용하지 않는다.'
  stemBasis='같은 두 작은 호와 전체 중심각108°에서 원주각을 구하는 실제 발문은 2015 9수04-20 범위이다. L과 T의 호 위치가 명시되어 보각 분기가 제거된다.'
  prereq='중심각, 작은 호, 같은 원에서 같은 길이의 호에 대한 중심각 동일, 원주각은 같은 호 중심각의 절반, 각의 덧셈·나눗셈 이후 배정. 위 실제 중3 2학기 원주각 배치에 근거하며 학교별 중간고사 진도는 보증하지 않는다.'
  core='제공 sourceReference와 이전 실제 원본 관찰은 같은 두 작은 호 및 원주각을 주고 두 호 전체 중심각을 묻는 원문 구성과 대응한다. 원문 답은 계산·비교하지 않았다. 새 문항은 전체 중심각→한 호 중심각→한 호 원주각으로 입력·출력 방향을 역전했다. 같은 호/중심각/원주각 핵심을 유지하는 실질적 역문제이나 통계적 유사도 승인은 아니다.'
 else:
  a=F(4);b=F(11)-a;d=F(16)-b;answer=a+d;s=F(11+16+13,2)
  assert (a,b,d,answer)==(4,7,9,13) and all(t>0 for t in (a,b,d))
  margins=[F(11+13-16),F(11+16-13),F(13+16-11)];assert all(t>0 for t in margins)
  assert (s-16,s-13,s-11)==(a,b,d)
  for x,y,expected in [('P','Q',110),('Q','R',160),('P','R',130),('P','U',40),('P','W',40),('Q','U',70),('Q','V',70),('R','V',90),('R','W',90)]:assert abs(dist(x,y)-expected)<1e-10
  r=sp['circles']['c']['radius']
  for contact,x,y in [('U','P','Q'),('V','Q','R'),('W','R','P')]:
   assert abs(dist(contact,'O')-r)<1e-10
   vec=[pts[y][i]-pts[x][i] for i in range(2)];rad=[pts['O'][i]-pts[contact][i] for i in range(2)]
   assert abs(sum(vec[i]*rad[i] for i in range(2)))<1e-8
   t=sum((pts[contact][i]-pts[x][i])*vec[i] for i in range(2))/sum(z*z for z in vec);assert 0<t<1
  assert c['answer']=='$13\\,\\mathrm{cm}$'
  checksOwn={'PU_PW':str(a),'QU_QV':str(b),'RV_RW':str(d),'PR':str(answer),'triangleInequalityMargins':[str(t) for t in margins],'existence':'세 변11,16,13의 엄격한 삼각부등식 성립. 내접원이 존재하며 반둘레20으로 접선 분할4,7,9를 다시 확인한다. 좌표는 그림 검증 전용이다.','uniqueness':'각 꼭짓점 접선 동일성으로 4→7→9→13이 강제된다. 삼각형의 회전·반사에도 PR은 유일.'}
  assert all(x!=answer for x in (F(4),F(7),F(9),F(20)))
  solutionBasis='실제 저자 전체 해설의 PU=PW=4, QU=QV=11−4=7, RV=RW=16−7=9, PR=4+9=13을 각각 검증했다. 분할 양수와 삼각부등식 언급도 옳다. 2015 9수04-19 접선 길이 성질과 선분 덧셈·뺄셈뿐이며 접선 곱·일반 원 비례·사인법칙은 없다.'
  stemBasis='삼각형 내접원의 세 접점과 두 변·한 접선 조각을 주고 남은 변을 묻는다. 2015 9수04-19의 한 점에서 그은 접선 길이 성질로 완결된다.'
  prereq='삼각형·내접원·접점 이해, 한 점에서 원에 그은 두 접선 길이의 동일성, 부분과 전체 선분의 덧셈·뺄셈 및 양의 길이 이후 배정. 접선 성질은 공통 빗변과 같은 반지름의 직각삼각형 합동으로 정당화 가능하다. 실제 중3 2학기 9수04-19 배치에 근거한다.'
  core='제공 sourceReference 및 이전 원본 관찰은 삼각형 세 변을 주고 꼭짓점 접선 조각을 묻는 원문 구성이다. 원문 답을 계산하지 않았다. 새 문항은 접선 조각과 두 변→빠진 전체 변으로 바꾸어 조각/전체 입력·출력 역할을 역전했다. 세 꼭짓점의 같은 접선 길이를 이어 덧셈·뺄셈하는 핵심 절차를 유지한다. 정량 유사도·권리 승인은 아니다.'
 surfaces={
 'stem':{'status':'passed','basis':stemBasis},
 'choices':{'status':'passed','basis':'실제 choices=[]인 서술형이다. 객관식 보기는 없고 5개를 가정하지 않는다. 답과 과정을 요구하는 형태 자체에 추가 학년 개념은 없다.'},
 'figuresAndTables':{'status':'passed','basis':('학생 SVG 실제 렌더에서 O,K,L,M,T와108°,x를 확인. 작은 호 K-L-M 및 반대 호 T와 연결선이 발문과 대응한다.' if q==11 else '학생 SVG 실제 렌더에서 삼각형PQR 내접원과 U∈PQ,V∈QR,W∈RP를 확인. 수치는 본문에 명시되어 그림에 없더라도 조건 누락이 아니다.')+' 현재 private SVG와 학생 SVG가 바이트 동일하고 spec/SVG 해시를 검증했다. spec 수치는 그림 존재·배치 확인 전용으로만 사용했으며 학생 답은 정확한 성질 계산으로 구했다. 별도 고등 좌표 방법이 학생에게 요구되지 않는다.'},
 'notation':{'status':'passed','basis':('∠KOM,∠KTL, 작은 호 및 도 기호는 중학교 원주각 표기이다. 네 점이 서로 다름과 T의 호 위치가 명시되어 반사각/보각 혼동을 제한한다.' if q==11 else 'PU,PW 등의 선분 길이와 cm 표기는 중학교 기하 관례이다. 해설의 중간 수치4,7,9는 같은 cm 길이 문맥이며 마지막13 cm가 명시된다.')},
 'answer':{'status':'passed','basis':('독립 raw27°와 저자 $27^\\circ$는 같은 각의 크기이다. 54° 중심각과153° 보각은 답이 아니다.' if q==11 else '독립 raw13 cm와 저자13 cm가 일치한다. 각 부분4,7,9는 모두 양수이고 최종 길이13>0이다.')},
 'studentSolution':{'status':'passed','basis':solutionBasis},
 'prerequisites':{'status':'passed','basis':prereq}}
 checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','scoreAppropriate']};checks['unitFamilyFit']=False
 evidence={'classification':{'math':'passed','grade2015M3AfterPrerequisites':'passed','content':'held','fullRelease':False},'ownExactCalculations':checksOwn,'authorSolutionReview':solutionBasis,'sourceAndStructuralReview':core,'naturalKorean':'질문 대상과 조건이 명시되고 인명·학교명 삽입이 없다. '+('L을 포함하지 않는 호 KM의 T라는 조건으로 보는 호를 분명히 한다.' if q==11 else '접점을 세 변의 순서에 맞추어 각각 지정하고 PR의 길이와 과정을 자연스럽게 요구한다.'),'scoreAndDifficulty':{'score':c['score'],'scoreAppropriateBasis':('6점 서술형으로 같은 호 중심각 동일→합의 분할→원주각 관계와 답을 설명할 수 있다.' if q==11 else '7점 서술형으로 세 꼭짓점 접선 대응→두 번의 차→전체 합 및 단위를 평가할 수 있다.')+' 제공 원문 배점과 같고 핵심을 유지하므로 배점 제안은 수용 가능. 세부 배점표나 측정된 학생 난도는 제공되지 않았다.','difficultyProposal':c['metadata']['difficultyProposal'],'difficultyApproval':'pending','basis':'기본 관계만 사용하는 제안은 이해되나 원문 관측 난도 라벨이 null이며 역방향이 항상 동일 난도라는 근거는 없다. 같은 난도/실증적 보정은 승인하지 않는다.'},'unitFamily':{'capturedUnitId':c['metadata']['assignment']['unitId'],'capturedSection':c['metadata']['assignment']['currentUnit']['section'],'unitConceptCorrespondence':'현재 개념에 대응하는 단원명 및 캡처 UUID는 확인하되 실시간 DB나 family 정의를 이번 범위에서 읽지 않았다.','familyKey':None,'unitFamilyFit':False,'basis':'정확한 입력·출력·방법·형식 전체에 대한 live family 호환성 미확인. UUID/이름/개수만으로 적합 판정하지 않는다.'},'primaryEvidence':primary,'exposure':{'rawDeclarationPreserved':True,'priorOriginalPageExposure':True,'currentAuthorFirstRead':'after helper ffe080340 and parent raw seal '+seal['rawCommit'],'claim':'현재 저자 노출 전 학생 풀이이며 원본 전체 미노출 주장 아님'},'rawSha256':h(rawbytes),'binding':{'candidatePackageByteHashAndManifestBindingVerified':True,'solveCanonicalHashVerified':True,'studentFieldsEqual':True,'privateAndStudentSvgByteEqual':True,'specSha256':asset['specSha256'],'svgSha256':asset['svgSha256']},'holds':{'sourceIdentityApproved':False,'wholePaperPairApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'loadable':False,'liveFamilyApproved':False,'curriculum2022':'pending','schoolSpecificPacing':'pending'},'limits':['수학·학년 판정과 권리·출처·native·live family 판정은 별개','원본 답안 키 비교 없음; 제공 sourceReference는 구성 대응 근거이고 전체 원본/답안 쌍 인증 아님','렌더 이미지 확인 및 바이트/spec 검증은 전체 native reader/print 인증 아님']}
 report={'status':'pending','studentDigest':entry['studentDigest'],'candidateDigest':entry['candidateDigest'],'assetDigest':entry['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gyeongsin-group10-review-20261020','solveDigest':entry['solveDigest'],'checks':checks,'evidence':evidence,'curriculumSurfaces':surfaces}
 with (v/f'reports/q{q}.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
 results.append({'q':q,'rawSha256':h(rawbytes),'reportSha256':h((v/f'reports/q{q}.json').read_bytes()),'trueChecks':sum(checks.values()),'gradeSurfacesPassed':len(surfaces),'exactMathAndSpecControls':'passed'})
assert all(h(Path(path).read_bytes())==digest for path,digest in pre.items())
with (v/'own-q11-q12-review-results.json').open('x',encoding='utf-8') as f:json.dump({'results':results,'inputBeforeAfterHashes':pre,'allInputsAndRawUnchanged':True,'primaryEvidence':primary,'noDBorAPI':True},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(results))

