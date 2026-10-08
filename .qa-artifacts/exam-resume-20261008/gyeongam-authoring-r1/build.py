import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,math
from drafts import DATA
ROOT=Path(__file__).resolve().parent;REPO=ROOT.parents[2]
assert not (ROOT/'author-freeze.json').exists(),'Sealed packet: make a new revision.'
def sha(b):return hashlib.sha256(b).hexdigest()
def put(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
SOURCE=json.loads((ROOT/'evidence/source-final/questions.json').read_text(encoding='utf-8'))
BANK=json.loads((ROOT/'evidence/reference-snapshots/bank-read-fresh-r2-20261008.json').read_text(encoding='utf-8'))
REG=json.loads((ROOT/'evidence/reference-snapshots/registry-read-20261008.json').read_text(encoding='utf-8'))
CURR=json.loads((ROOT/'evidence/reference-snapshots/curriculum-evidence.json').read_text(encoding='utf-8'))
UNITS={u['section']:u for u in BANK['units']};CODES={c['code']:c for c in CURR['achievement_standards']}
AUTHOR='orca-codex-exam-twin-author-geometry-20261008'
FIGS={};GEOMETRY={}
def v2(n,pts,seg,scale=20,circles=None,angles=None,regions=None,arcs=None,width=70,labels=None):
    obj=dict(version=2,theme='exam-thin',style=dict(font_size=18,angle_font_size=17,angle_radius=18,angle_label_distance=30,padding=22,show_points=False),points={k:[float(x*scale),float(-y*scale)] for k,(x,y) in pts.items()},segments=seg,labels=labels if labels is not None else {k:k for k in pts if not k.startswith('_')})
    if circles:obj['circles']={k:dict(v,radius=v['radius']*scale) for k,v in circles.items()}
    if angles:obj['angles']={'angle_'+k:v for k,v in angles.items()}
    if regions:obj['regions']=regions
    if arcs:obj['arcs']=arcs
    FIGS.setdefault(n,[]).append((obj,width));GEOMETRY.setdefault(n,[]).append(dict(points=pts,scale=scale,coordinateUse='private construction model; SVG y down'))
def ang(v,p,q,label=None,right=False):
    d=dict(vertex=v,points=[p,q]);
    if right:d.update(right=True,radius=8)
    if label:d['label']=label
    return d
def edge(p,q,**kw):return dict(points=[p,q],**kw)
FIGS[1]=[(dict(version='elem-1',kind='barChart',values=[dict(label=k,value=v) for k,v in DATA[1]['givens']['knownRows']],yMax=10,yStep=2,yLabel='도수(명)',xLabel='책의 종류'),70)]
FIGS[9]=[(dict(version='elem-1',kind='scatterPlot',points=DATA[9]['givens']['points'],xMin=0,xMax=80,xStep=10,yMin=0,yMax=80,yStep=10),70)]
v2(10,{'R':(0,0),'P':(12,0),'Q':(0,16)}, {'PR':['P','R'],'RQ':['R','Q'],'QP':['Q','P']},10,angles={'R':ang('R','P','Q',right=True)})
# First q11 is an explicit pictorial projection; the second is metric geometry.
v2(11,{'F':(0,0),'G':(4,0),'B':(0,4),'C':(4,4),'E':(1.5,1.5),'H':(5.5,1.5),'A':(1.5,5.5),'D':(5.5,5.5)},
   {'FG':['F','G'],'GH':['G','H'],'HD':['H','D'],'DC':['D','C'],'CB':['C','B'],'BA':['B','A'],'AD':['A','D'],'BF':['B','F'],'CG':['C','G'],'FE':edge('F','E',dash='4 3'),'EH':edge('E','H',dash='4 3'),'AE':edge('A','E',dash='4 3'),'BD':['B','D'],'FD':['F','D']},25,width=55)
GEOMETRY[11][0]['coordinateUse']='nonmetric cube pictorial projection; no projected angle claim'
v2(11,{'F':(0,0),'B':(0,4),'D':(4*math.sqrt(2),4)}, {'BF':['B','F'],'BD':['B','D'],'FD':['F','D']},25,width=55,angles={'B':ang('B','F','D',right=True),'theta':ang('F','B','D',r'$\theta$')})
v2(12,{'P':(0,0),'R':(18,0),'Q':(18,9)}, {'PR':['P','R'],'RQ':['R','Q'],'QP':['Q','P']},9,angles={'R':ang('R','P','Q',right=True)})
p=math.radians(30);q=math.radians(55)
v2(13,{'O':(0,0),'A':(1,0),'B':(0,1),'P':(math.cos(p),math.sin(p)),'Q':(math.cos(q),math.sin(q)),'H':(math.cos(p),0),'K':(math.cos(q),0),'T':(1,math.tan(p)),'U':(1,math.tan(q))},
   {'OA':['O','A'],'OB':['O','B'],'OT':['O','T'],'OU':['O','U'],'AU':['A','U'],'PH':edge('P','H',dash='4 3'),'QK':edge('Q','K',dash='4 3')},135,
   circles={'c':dict(center='O',radius=1,draw=False)},arcs={'quarter':dict(circle='c',**{'from':'A','to':'B','dir':'ccw'})},
   angles={'A':ang('A','O','U',right=True),'H':ang('H','O','P',right=True),'K':ang('K','O','Q',right=True)})
rt2=math.sqrt(2)
v2(18,{'A':(-5*(1+rt2),0),'D':(-5,0),'B':(0,0),'C':(0,5)},
   {'AB':['A','B'],'BC':['B','C'],'CA':['C','A'],'AD':edge('A','D',ticks=1),'DC':edge('D','C',ticks=1)},14,
   angles={'B':ang('B','D','C',right=True),'D':ang('D','B','C',r'$45^\circ$')})
# AD mark is part of AB, so avoid drawing a duplicate heavy line by splitting AB.
FIGS[18][0][0]['segments'].pop('AB');FIGS[18][0][0]['segments']['DB']=['D','B']
r=4
v2(19,{'O':(0,0),'_V':(0,r),'B':(r,0),'A':(r/2,r*math.sqrt(3)/2),'C':(r/2,0),'D':(r,r*math.sqrt(3))},
   {'OB':['O','B'],'OV':['O','_V'],'OD':['O','D'],'AC':['A','C'],'BD':['B','D']},25,
   circles={'c':dict(center='O',radius=r,draw=False)},arcs={'quarter':dict(circle='c',**{'from':'B','to':'_V','dir':'ccw'})},
   angles={'O':ang('O','B','A',r'$60^\circ$'),'C':ang('C','A','B',right=True),'B':ang('B','O','D',right=True)},
   regions={'quad':dict(fill='#eeeeee',boundary=[{'seg':['A','C']},{'seg':['C','B']},{'seg':['B','D']},{'seg':['D','A']}])})

near={1:['산포도|05'],2:['산포도|05','산포도|11T'],3:['산포도|11T'],4:['산포도|05','산포도|06'],5:['산포도|07'],6:['산포도|04','산포도|07'],7:['산포도|11T'],8:['산포도|04','산포도|08'],9:['상자그림과 산점도|06','상자그림과 산점도|07','상자그림과 산점도|12'],10:['삼각비|01'],11:['삼각비|07'],12:['삼각비|02','삼각비|03'],13:['삼각비|12','삼각비|14'],14:['삼각비|08'],16:['산포도|05','산포도|11T'],17:['산포도|02','산포도|03','산포도|08'],18:['삼각비의 활용|01'],19:['삼각비의 활용|12']}
why={1:'05는수치5명자료에서평균이며 새누락도수/범주최빈값규칙이 아니다.',2:'05는원자료평균,11T는평균과중앙값이같은하나의자료이다. 새홀짝두중앙값→공통a→11개합친평균의전체조건과목표가 없다.',3:'11T는평균=중앙값의조건이며 새홀수/짝수두중앙값과a<b의두가림카드복구가 아니다.',4:'06은두집단개수/평균에서전체평균을구한다. 새전후총합과세추가값중하나복구의전체규칙이없다.',5:'07은이동뒤표준편차의정방향단일값이다. 새이동뒤평균/표준편차를주고원래두기록을복구하는전체목표가없다.',6:'04는알려진분산/배율/이동량에서새분산,07은새표준편차이다. 새표준편차에서양의배율과새평균을복구하는전체규칙은없다.',7:'11T의평균=중앙값정방향미지수와달리 고정자료+미지4정수의가능중앙값전체구간/존재를묻는다. 해당중3live family확인불가.',8:'04의이름과달리실제규칙은배율변환분산이다.08은완전수치자료→분산이다. 새평균/제곱합→분산/표준편차역기록과일치하지않는다.',9:'06은한축이상개수,07은두축이상10명→백분율/경계제외,12는비율이다. 새12명/50경계포함/두축이상집단제외개수의전체조건/목표와다르다.',10:'01은두직각변에서피타고라스로한각의단일비를묻는다. 새세변/두각의수치기록→삼각비이름복구를지원하지않는다.',11:'07은입체에서단일비이며 새정육면체윗면대각선/cos의두기록과실제단면제시를함께지원하는규칙이확인되지않았다.',12:'02는한비+한변→직접다른한변,03은한비→다른비이다. 새빗변+tan→두직각변제곱식복구의전체목표가없다.',13:'12는사분원각/길이기록→수치비값,14는같은각의세비극값이다. 새두위치의세실제길이변화기록이아니다.',14:'08은두특수값의한연산이다. 새두곱의합기록에서양의계수k를복구하는전체조건/목표가없다.',16:'05는완전자료평균,11T는평균=중앙값미지값이다. 새부분도수/알려진평균→극단값복구/대표값선택/이유서술의전체규칙이없다.',17:'02/03은평균중심편차를입력으로쓸때이며08은원자료→분산이다. 새기준학생차의평균이0이아닌자료와실제평균→기준학생/원표준편차의두서술부분이아니다.',18:'활용01의전체갈래가새D내부/AD=CD/45도/전체AB→BC/특정22.5도tan의증명및12점서술을지원하지않는다. 특정숫자각키를invent하지않는다.',19:'활용12의일반사각형넓이정방향과새사분원60도/수선/반직선교점/사다리꼴넓이→양의반지름역목표의전체조건이일치하지않는다.'}
# Compare the actual branches, including inverse branches, rather than titles.
why[9]='06은서로다른x값7명의한축이상개수,07은7명의x>y개수,12는10명/두축이상/경계값제외의백분율이다. 새12명/반복x허용/50경계포함/두축이상집단을제외한개수의전체입력과목표를지원하지않는다.'
why[11]='07의실제입력은직육면체의가로/세로/높이이며8개정수피타고라스쌍갈래에서하나의비를구한다. 새정육면체/무리수면대각선과cos의두기록/제시된실제BFD단면을함께지원하는갈래는확인되지않았다. 07의표시는심화하,새응용난도는단면제시를근거로한작성자제안만이다.'
why[19]='활용12는두대각선과끼인각으로사각형넓이를구하거나그넓이에서미지대각선을역산한다. 실제두갈래모두대각선곱과sin넓이공식을쓴다. 새사분원60도/수선/반직선교점/직각변비와사다리꼴넓이에서반지름을복구하는전체입력/절차와다르다. 기존역산갈래의존재도이새전체규칙의지원근거가되지않는다.'
RULES=['src/lib/middle/m3Stat2.ts','src/lib/middle/m3Trig.ts','src/lib/middle/generate.ts','src/lib/middle/types.ts','prisma/seed-data/units.ts','scripts/import/exam-twin/candidatePack.mjs','scripts/import/exam-paper/solver_rules.json','scripts/figure/engine-catalog.json','docs/planning/09-figure-engine-guide.md','.agents/skills/typesafe-ai/SKILL.md']
rr=[]
for rel in RULES:
    b=(REPO/rel).read_bytes();dest=ROOT/'evidence/repository-rules'/(rel+'.txt' if rel.endswith('.ts') else rel);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
    rr.append(dict(repositoryPath=rel,copyPath=str(dest.relative_to(ROOT)).replace('\\','/'),sha256=sha(b)))
put(ROOT/'evidence/repository-rules/receipt.json',rr)
observed=[dict(questionNumber=q['number'],sourceContentDigest=q['sourceContentDigest'],rawStructuredGivenData=q['structuredGivenData'],figureGivenObservation=q['figureGivenObservation'],readOnly=True,sourceObservationNotConstructed=True) for q in SOURCE['questions']]
put(ROOT/'evidence/source-observations.json',dict(method='exact fields from safe source; no answers/no reconstructed raw statistical data',observations=observed))
ledger=[];taxonomy=[]
for n in range(1,20):
    src=SOURCE['questions'][n-1];assert src['number']==n
    if n==15:
        ledger.append(dict(questionNumber=15,status='held-before-authoring',candidatePath=None,sourceQuestionId=src['sourceQuestionId'],sourceContentDigest=src['sourceContentDigest'],referenceScore=src['scoreEvidence']['referenceParentScore'],reason='一般예각 A에서두삼각비 sin A,cos A의대소로제곱근부호를선택하는핵심이다. 실제직각변비교로설명할여지는있지만2015공식「삼각비사이의관계는다루지않는다」와이일반비교의적용경계는현근거로확정하지못했다. 고정수치각으로바꾸면같은핵심을보존하지못한다.',basis=dict(restrictionId='no_ratio_identities',exactText='삼각비 사이의 관계는 다루지 않는다.',pdfPhysicalPage=39,pdfPrintedPage=35,hwpRecord=4440,hwpParagraph=908),reopenCriteria='일반 A의기하적변비교→제곱근부호단계를이공식제한에어긋나지않게가르칠수있다는문항별공식/전문범위근거와독립전체학생면검토. 학교출제/기존registry15/AI신뢰도는승인이아니다.',authorAnswerCreated=False,independentApprovals=0,directUseAllowed=False))
        continue
    d=DATA[n];folder=ROOT/'candidates'/f'q{n:02}';score=src['scoreEvidence']['referenceParentScore'];unit=UNITS[d['unitSection']]
    assert score==src['scoreEvidence']['selectedHwpPdfPrintedParentScore']
    if d['rubric']:assert sum(x['score'] for x in d['rubric'])==score
    assert [x['number'] for x in d['children']]==src['subquestionNumbers']
    if d['children']:assert [x['score'] for x in d['children']]==[x['score'] for x in src['subQuestions']]
    md=dict(questionNumber=n,sourceDataObservationLedger=f'../../evidence/source-observations.json#/observations/{n-1}',newDataStatus='author-constructed-not-source-observation',givens=d['givens'],newFigureConstructionModel=GEOMETRY.get(n,[]))
    put(folder/'math-data.json',md);mdhash=sha((folder/'math-data.json').read_bytes())
    assets=[]
    for i,(fg,width) in enumerate(FIGS.get(n,[]),1):
        name=f'stem-{i}';put(folder/(name+'.spec.json'),fg)
        assets.append(dict(role='stem',specPath=name+'.spec.json',svgPath=name+'.svg',intendedWidthMm=width,mathDataPath='math-data.json',mathDataSha256=mdhash))
    standards=[dict(code=CODES[code]['code'],text=CODES[code]['verified_text'],locator=CODES[code].get('original_2015_pdf_locator')) for code in d['codes']]
    surfaceNames=['stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites']
    surfaces={k:dict(status='author-proposed',evidence=({'stem':'新본문조건/표/자료조직과점순서명시','choices':'actual-option parser로14객관식의유일정답/중복검사;written choices=[]','figuresAndTables':'새스펙/로컬strictSVG/70mm이하실미리보기와데이터결합','notation':'2015중등표기,도단위/예각,정렬/평균/편차정의;벡터/라디안/상위통계기호없음','answer':'새정확답/단위/서술부분과MC동그라미번호','studentSolution':d['procedure'],'prerequisites':standards}[k])) for k in surfaceNames}
    compared=[e for e in REG['entries'] if e['key'] in ['3-2|'+k for k in near[n]]];assert len(compared)==len(near[n])
    modes=['structure','representation']
    if n in [1,2,3,4,5,6,8,10,12,14,16,17,18,19]:modes.append('inverse-target')
    if n in [1,9,16,17]:modes.append('material')
    c=dict(schemaVersion=1,questionNumber=n,twinExternalId=f'exam-twin-gyeongam-2025-2-mid-author-r1-q{n:02}',authorId=AUTHOR,content=d['content'],choices=d['choices'],answer=d['answer'],solution=d['solution'],score=score,questionType='객관식' if n<=15 else '서술형',facts=dict(givens=d['givens'],mathDataPath='math-data.json',mathDataSha256=mdhash,rawSourceObservationPath='../../evidence/source-observations.json',rawSourceObservationSha256=sha((ROOT/'evidence/source-observations.json').read_bytes()),newDataStatus='author-constructed',sourceScoreEvidence=src['scoreEvidence'],authorRubric=d['rubric'],subQuestions=d['children']),figureArtifacts=assets,
       variantDelta=dict(modes=modes,before=d['before'],after=d['after'],sharedConcept=d['concept'],sharedProcedure=d['procedure']),
       curriculumReview=dict(grade='중3',edition='2015',standardCodes=d['codes'],allowedProcedure=d['procedure'],forbiddenAvoided=['任意삼각비관계식','원/외접원비례법칙/원의거듭제곱','사인/코사인법칙','반각/덧셈정리','삼각비넓이공식','라디안/벡터','상위통계/최적화'],status='author-proposed',wholeSurfaceGate='7 surfaces mapped to specific procedure/prerequisites; source school/registry is not grade approval',specificRisk=d['risk'],independentReviewStatus='pending-other-worker'),studentSurfaceReview=surfaces,
       sourceReference=dict(externalId=src['sourceQuestionId'],sourceExamExternalId=SOURCE['inventoryExamId'],sourceLogicalExamId=SOURCE['examId'],questionNumber=n,sourceContentSha256=sha(src['stem'].encode('utf-8')),sourceContentDigest=src['sourceContentDigest'],sourcePacketPath='../../evidence/source-final/questions.json',sourcePacketSha256=sha((ROOT/'evidence/source-final/questions.json').read_bytes()),sourceFinalCommit='4cc9278da',jsonPointer=f'/questions/{n-1}',originalReferenceScore=score,originalReferenceSubQuestions=src['subQuestions'],referenceFigures=[dict(path='../../evidence/source-final/'+i['file'],sha256=i['sha256'],page=i['page'],referenceOnly=True) for i in src['images']],sourceIdentityDecision=SOURCE['identityDecision'],originalAnswerSolutionWithheld=True,realSchool='경암중',studentSchoolAlias='온빛누리중학교',directUseAllowed=False),
       metadata=dict(grade='중3',curriculum=dict(sourceExam='2015',target='2015'),sourceExamYear=2025,sourceIdentityStatus='root-final-question-only-packet4cc9278da;native/full-pair-not-approved',realSchool='경암중',studentSchoolAlias='온빛누리중학교',questionType='객관식' if n<=15 else '서술형',score=score,difficultyProposal=d['difficulty'],difficultyStatus='author-proposed-independent-review-pending',problemTypeProposal='객관식' if n<=15 else '서술형',problemTypeStatus='author-proposed',scoreStatus='reference-parent-total-and-subparts-preserved;rubric-author-proposed',assignment=dict(status='pending',unitId=unit['id'],unitSection=unit['section'],familyKey=None,evidence=dict(bankCapturedAt=BANK['capturedAt'],notCurrentDbAssertion=True,unitSeedOrderIndex=unit['orderIndex'],comparedRegistryEntries=compared,wholeRuleComparison=why[n],reopenCriteria='실제기존rule의새given/질문/전체절차/서술부분/난도가일치하는문항별증거및독립분류검토;가까운제목자동배정금지')),independentSolveStatus='pending-other-worker',independentReviewStatus='pending-other-worker',rightsStatus='pending',nativeStatus='pending',sourceCustodyStatus='pending',similarityStatus='pending',publishStatus='not-authorized',loadStatus='not-authorized',directUseAllowed=False))
    put(folder/f'q{n:02}.json',c)
    ledger.append(dict(questionNumber=n,status='authored-proposal',candidatePath=f'candidates/q{n:02}/q{n:02}.json',sourceContentDigest=src['sourceContentDigest'],referenceScore=score,score=score,sourceSubquestionNumbers=src['subquestionNumbers'],figures=len(assets),unitProposal=unit['id'],familyKey=None,independentApprovals=0,directUseAllowed=False))
    taxonomy.append(dict(questionNumber=n,unit=unit,comparedNotAssigned=near[n],fullRuleComparison=why[n],familyKey=None))
put(ROOT/'consideration-ledger.json',dict(authorId=AUTHOR,sourceParentsConsidered=19,sourceLeavesConsidered=20,authoredParents=18,authoredLeaves=19,authoredMC=14,authoredWritten=4,heldBeforeAuthoring=[15],excludedBeforeAuthoring=[],sourceParentScoreTotal=sum(q['scoreEvidence']['referenceParentScore'] for q in SOURCE['questions']),authoredParentScoreTotal=sum(r['score'] for r in ledger if r['status']=='authored-proposal'),parentScoreNotAddedToSubpartScores=True,independentApprovals=0,ledger=ledger))
put(ROOT/'evidence/taxonomy-comparisons.json',dict(bankCapturedAt=BANK['capturedAt'],notCurrentDbAssertion=True,comparisons=taxonomy))
put(ROOT/'evidence/instruction-read.json',dict(agentRulesPath='D:/todays-math/AGENTS.md',agentRulesSha256=sha(Path('D:/todays-math/AGENTS.md').read_bytes()),skillPath='.agents/skills/typesafe-ai/SKILL.md',skillSha256=sha((REPO/'.agents/skills/typesafe-ai/SKILL.md').read_bytes()),liveDocsRead=['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/concepts/how-to-build-with-system-one','https://docs.typesafe.ai/cookbooks/hierarchical_classification','https://docs.typesafe.ai/confidence'],dateKst='2026-10-08',modelApiCalls=0,appCallsSkills=False,deterministicMathInCode=True))
print('Built18 new candidates/19 leaves/9 new specs; all19 source parents considered; q15 held before authoring; score95/100 source; zero approvals.')
