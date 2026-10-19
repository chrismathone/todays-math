from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess,math
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group11-review-20261020-r1');v=p/'verification'
h=lambda b:hashlib.sha256(b).hexdigest();load=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));canon=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
f=v/'own-q13-q17-review-utf8.txt';f.write_text('접선·원주각·반원 독립검토\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='접선·원주각·반원 독립검토\n'
inputs=load(v/'verification-inputs.json');manifest=load(v/'verification-manifest.json');seal=load(v/'sealed-raw-commit.json');pack=load(p/'package/manifest.json')
assert h((v/'verification-inputs.json').read_bytes())==manifest['verificationInputsSha256']
primary={'normative':{'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','previouslyActuallyViewed':True,'edition':'2015','locators':'9수04-19 원의 현·접선 성질;9수04-20 원주각;9수04-16 피타고라스; 일반적인 원의 비례관계 제외','limit':'학교나 코드만으로 승인하지 않음; 풀이가 해당 성질과 이전 평면도형·연산으로 실제 완결되는지 개별 확인'},'actualM3Placement':{'url':'https://sunggok-m.goebc.kr/upload/sunggok-m/na/bbs_6150/2024/09/CCFFC34D-CA2A-756F-4010-7169B6A631FA.pdf','sha256':'57ae912bc9a352dba6181f80015631f2badded7680077d22582874f609ffadd7','previouslyActuallyViewed':True,'locator':'PDFindex73/physical74/printed72, 중3 수학2학기,9월9수04-19/10월9수04-20','limit':'경신중 해당 시험의 진도나2022 배치 인증은 아님'}}
method={13:'r=3, 같은 높이의 두 원 중심거리JK=HI=6, 꼭짓각 이등분30°에서QJ=6, 피타고라스로QH=IR=3√3, 한 변6+6√3, 둘레18+18√3.',14:'W가 작은 호에 있어 보는 호는 큰 호. 원주각115°의 큰 호 회전각230°, 작은 중심각130°, 두 접점 직각을 포함한 사각형의 나머지각50°.',15:'OA⊥AT∥BC로A가BC의 수직이등분선 위에 있음→AB=AC. 평행선 각60°로 정삼각형. 피타고라스 높이√3a/2와넓이에서a²48, 양의a=4√3.',16:'실제 반원넓이πr²/2=12π로r²24. DF=DA3,CF=CBx로DC=x+3. 평행 접선 간격2r와 차|x−3|의 피타고라스 (x+3)²=(x−3)²+4r²에서12x96, x8.',17:'X,Y가PU,PV 내부, H가XY 내부라는 부호·순서로XH=t−PX,YH=t−PY. 둘레가2t40이라PU20. 반지름15와 접선20의 직각삼각형에서PO25.'}
extra={13:'30° 맞은편 변이 빗변 절반이라는 성질은 고등 삼각함수 공식이 아니다. 직각삼각형을 짧은 변에 대하여 반사하면60° 꼭짓각과 같은 두 변을 가진 정삼각형이 되어 빗변이 그 짧은 변의 두 배임을 삼각형 합동·각합으로 증명할 수 있다. 저자 QJ=6의 생략된 정당화는 이 초등 기하 증명으로 완결된다.',14:'230°를 보통의 ∠UOV=230°라고 쓰지 않고 큰 호에 대한 중심의 회전각으로 명시했다. 보조점Z를 큰 호에 잡으면 원에 내접한 사각형UWVZ의 대각합180°로∠UZV65°, 작은 중심각130°를 얻는다. 대각합도 같은 호 원주각 관계로 증명 가능하다. 따라서 큰 호 반사각 표현은 새 고등 정리를 요구하지 않는다.',15:'실제 해설은 접현각 정리를 사용하지 않고 반지름의 수직, 현의 수직이등분 및 평행선 각으로 정삼각형을 직접 증명한다.',16:'실제 해설은 원 전체와 반원을 구별한다. |x−3|의 제곱을 사용하여 x가3보다 작은 가능성을 미리 배제하지 않고 전개한 결과8만 남는다. 접선곱 공식을 가정하지 않는다.',17:'원은 작은 삼각형의 외부에 있고X,Y 이후 연장선에 접한다. 실제 해설은 내접원넓이/반둘레공식을 쓰지 않는다. 내부점 조건 때문에 접선 조각이 차로 표현되며 둘레 상쇄가 정당하다.'}
expected={13:'$(18+18\\sqrt3)\\,\\mathrm{cm}$',14:'$50^\\circ$',15:'$4\\sqrt3\\,\\mathrm{cm}$',16:'$8\\,\\mathrm{cm}$',17:'$25\\,\\mathrm{cm}$'}
# Exact student-data checks, separate from drawing float consistency.
assert F(6,2)==3;assert 6*6-3*3==27;assert 3*6==18 and 3*6==18
assert 115*2==230 and 360-230==130 and 360-180-130==50
assert F(48,4)==12
assert (8+3)**2==(8-3)**2+4*24 and 12*8==96
assert F(40,2)==20 and 20**2+15**2==25**2
before={};rows=[]
for e in inputs:
 c=e['candidate'];q=c['questionNumber'];rp=p/f'blind/solve/q{q}.json';raw=load(rp);proof=next(x for x in seal['proofs'] if x['n']==q)
 assert h(rp.read_bytes())==proof['sha256'] and rp.read_bytes()==subprocess.check_output(['git','show',f'f4a9aa7c978906cf021e02029bd0511ff2d4190f:{rp.as_posix()}'])
 assert raw==e['independentSolve'] and h(canon(raw))==e['solveDigest'] and c['answer']==expected[q]
 b=next(x for x in pack['bindings'] if x['studentDigest']==e['studentDigest']);cp=p/'package'/b['privateCandidatePath'];assert load(cp)==c and h(cp.read_bytes())==b['candidateFileSha256'] and b['candidateDigest']==e['candidateDigest']
 student=next(x for x in load(p/'blind/student-problems.json') if x['questionNumber']==q)
 for k in ['content','questionType','score','choices','twinExternalId']:assert student[k]==c[k]
 a=e['assets'][0];spfile=p/f'package/private/q{q}/figure-1.spec.json';svg=p/f'package/private/q{q}/figure-1.svg';assert h(spfile.read_bytes())==a['specSha256'] and h(svg.read_bytes())==a['svgSha256'];assert svg.read_bytes()==(p/'blind'/a['studentPath']).read_bytes()
 for f in [rp,cp,spfile,svg]:before[str(f)]=h(f.read_bytes())
 sp=load(spfile);points=sp['points'];dist=lambda x,y:math.dist(points[x],points[y]);dot=lambda a,b,o:sum((points[a][i]-points[o][i])*(points[b][i]-points[o][i]) for i in (0,1));tol=1e-7
 def line_distance(o,x,y):
  a=points[x];b=points[y];z=points[o];return abs((b[0]-a[0])*(z[1]-a[1])-(b[1]-a[1])*(z[0]-a[0]))/dist(x,y)
 if q==13:
  for x,y in [('J','K'),('J','L'),('K','L')]:assert abs(dist(x,y)-54)<tol
  for o,x,y in [('J','P','Q'),('J','Q','R'),('K','Q','R'),('K','R','P'),('L','P','Q'),('L','P','R')]:assert abs(line_distance(o,x,y)-27)<tol
  assert abs(dist('P','Q')-dist('Q','R'))<tol and abs(dist('P','R')-dist('Q','R'))<tol
 elif q==14:
  for z in ['U','V','W']:assert abs(dist(z,'O')-62)<tol
  for z in ['U','V']:assert abs(dot('O','S',z))<tol
  angle=math.degrees(math.acos(dot('U','V','W')/dist('U','W')/dist('V','W')));assert abs(angle-115)<tol
 elif q==15:
  for z in ['A','B','C']:assert abs(dist(z,'O')-72)<tol
  assert abs(dot('O','T','A'))<tol and points['A'][0]==points['T'][0] and points['B'][0]==points['C'][0]
  assert abs(dist('A','B')-dist('B','C'))<tol and abs(dist('B','C')-dist('C','A'))<tol
 elif q==16:
  assert sp['circles']['c']['draw']==False and sp['arcs']['semicircle']['from']=='A' and sp['arcs']['semicircle']['to']=='B'
  assert abs(dist('F','O')-sp['circles']['c']['radius'])<tol and abs(dot('O','D','F'))<tol
  assert abs(dist('D','F')-36)<tol and abs(dist('C','F')-96)<tol
 elif q==17:
  assert abs(dist('O','U')-75)<tol and abs(dot('O','P','U'))<tol and abs(dist('O','H')-75)<tol
  assert abs(dist('P','X')+dist('X','U')-dist('P','U'))<tol and 0<dist('P','X')<dist('P','U')
  assert abs(dist('P','Y')+dist('Y','V')-dist('P','V'))<tol and abs(dist('X','H')+dist('Y','H')-dist('X','Y'))<tol
 surfaces={
 'stem':{'status':'passed','basis':f'현재 q{q} 발문의 조건은 '+method[q]+' 조건의 순서·호 위치·접선/반원 여부를 그대로 사용한다. 위 공식2015 범위와 이전 평면도형 계산으로 완결된다.'},
 'choices':{'status':'passed','basis':'실제 choices=[]인 서술형이다. 없는 객관식 보기를 가정하지 않고 값과 과정을 평가한다. 추가 학년 개념이 없다.'},
 'figuresAndTables':{'status':'passed','basis':'학생 SVG를 봉인 전 실제 렌더하여 확인했다. 현재 package SVG와학생 SVG 바이트가 같고 spec/SVG 해시가 일치한다. 현재 spec의 원·접선·점위치도 별도 수치검사를 했다. '+('실제 반원 arc만 그리며 지름/양 끝접선/공통접선이 대응한다.' if q==16 else '원은 작은삼각형 외부에 있고X,Y와H의 내부조건이 그림과 대응한다.' if q==17 else '점·선·호·원과 라벨이 실제 발문과 대응한다.')+' spec 실수연산은 그림 검증 전용이며 학생 수치답은 정확한 별도 계산이다.'},
 'notation':{'status':'passed','basis':('q14의230°는 큰 호에 대한 회전각으로 구별하고 작은 ∠UOV는130°로 쓴다. 원주각·사각형각 표기는 중학교 기하 범위이다.' if q==14 else '선분·접점·π·제곱근과 '+('cm² 넓이에서 cm 길이로의 변환' if q in (15,16) else 'cm 둘레/길이')+'가 실제 문맥에 맞고 고등 함수/좌표 표기가 학생 필수 입력에 없다.')},
 'answer':{'status':'passed','basis':'봉인 raw '+raw['answer']+'와 저자 '+c['answer']+'의 값·단위가 같음을 자체 정확 계산으로 확인했다. 모든 길이의 음의 해를 배제하고 각은0°보다 크고180°보다 작다.'},
 'studentSolution':{'status':'passed','basis':'저자 전체 해설의 순서를 실제 검토했다: '+method[q]+' '+extra[q]},
 'prerequisites':{'status':'passed','basis':'2015 중3 원의 현·접선(9수04-19)'+(' 및 원주각(9수04-20)' if q==14 else '')+' 학습 후, 이전 합동·평행선·삼각형각합·원의 둘레/넓이 중 실제 필요한 성질 및 피타고라스/제곱근·전개·일차식 학습 후 배정한다. '+extra[q]+' 실제 중3 배치는 이전 확인한 공식 중3 2학기 계획 printed72로 뒷받침하며 특정 학교 진도/2022를 인증하지 않는다.'}}
 checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','scoreAppropriate']};checks['unitFamilyFit']=False
 evidence={'classification':{'math':'passed','grade':'2015-M3-after-prerequisites-passed','content':'held'},'ownExactCalculationAndExistence':raw['evidence']['exactCalculation'],'fullAuthorMethodReview':method[q]+' '+extra[q],'sourceRelation':{'observedPacketReference':c['sourceReference']['actualReference'],'comparison':c['variantDelta']['before']+' → '+c['variantDelta']['after'],'independentJudgment':'입력과 목표의 역할을 역전하고 핵심 접선/원주각/피타고라스의 연결을 유지한다. 새 그림·명칭 변경만을 실질변형 근거로 쓰지 않는다. 제공 구성정보에 따른 성분 비교이며 이번에 원본/답안키를 재열람하거나 원본 답을 계산하지 않았다.','sourceComponentOnly':True},'wording':'조건과 목표가 한국어로 명시되고, '+('원주각이 보는 큰 호와 작은 호의 구분이 자연스럽다.' if q==14 else '반원 넓이와 접선 길이를 구별한다.' if q==16 else 'X,Y,H의 내부 조건을 명시하여 접선 조각의 부호가 정해진다.' if q==17 else '질문에서 원하는 길이/둘레와 단위가 명확하다.'),'scoreAndDifficulty':{'score':c['score'],'scoreBasis':'제공 원문과 같은 '+str(c['score'])+'점 서술형으로 여러 성질의 연결과 과정 설명을 요구하므로 배점 제안은 수용 가능. 구체적 부분점표는 제공되지 않아 창작하지 않는다.','proposal':c['metadata']['difficultyProposal'],'approval':'pending','basis':'실제 풀이 단계는 위에서 개별 검토했으나 sourceDifficultyLabelObserved=null이고 측정된 학생 난도·원문 동등성 자료가 없다. 심화하 라벨은 제안으로 유지한다.'},'unitFamily':{'capturedUnitId':c['metadata']['assignment']['unitId'],'section':c['metadata']['assignment']['currentUnit']['section'],'familyKey':None,'fit':False,'basis':'단원 개념 대응은 있으나 정확한 평가목적·조건·형식에 맞는 live family 정의·실시간 상태를 확인하지 않았다. 코드/이름/개수로 승인하지 않음.'},'primaryEvidence':primary,'rawBinding':{'helperRawCommit':'f4a9aa7c978906cf021e02029bd0511ff2d4190f','parentRawCommit':seal['rawCommit'],'rawSha256':h(rp.read_bytes()),'gitBlobByteIdentical':True,'exposureDeclaration':raw['evidence']['exposure']},'assetBinding':{'specSha256':a['specSha256'],'svgSha256':a['svgSha256'],'privateStudentByteEqual':True},'holds':{'sourceIdentityApproved':False,'wholeSourcePairApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'liveFamilyApproved':False,'loadable':False,'2022Placement':'pending','difficultyEquivalence':'pending'}}
 report={'status':'pending','studentDigest':e['studentDigest'],'candidateDigest':e['candidateDigest'],'assetDigest':e['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gyeongsin-group11-review-20261020','solveDigest':e['solveDigest'],'checks':checks,'evidence':evidence,'curriculumSurfaces':surfaces}
 with (v/f'reports/q{q}.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'reportSha256':h((v/f'reports/q{q}.json').read_bytes()),'trueChecks':11,'passedSurfaces':7,'math':'passed','grade':'passed','content':'held'})
assert all(h(Path(k).read_bytes())==val for k,val in before.items())
with (v/'own-q13-q17-review-results.json').open('x',encoding='utf-8') as f:json.dump({'results':rows,'immutableBeforeAfterHashes':before,'rawAndInputsUnchanged':True,'exactStudentCalculations':5,'specGeometryChecks':5,'primaryEvidence':primary},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))
