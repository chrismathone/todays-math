from pathlib import Path
from fractions import Fraction as F
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group5-review-20261020-r2/blind');h=lambda b:hashlib.sha256(b).hexdigest();load=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));items=load(p/'student-problems.json');manifest=load(p/'blind-manifest.json');assert h((p/'student-problems.json').read_bytes())==manifest['studentProblemsSha256']
f=p/'own-nobyeon5-blind-utf8.txt';f.write_text('엄격 비교·전체 인원·가능값·순위 경계 검산\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='엄격 비교·전체 인원·가능값·순위 경계 검산\n'
exposure={'currentGroup5r2AuthorAnswersSolutionsPrivatePackageExposed':False,'priorOriginalSourceExposure':'원래노변q15의소득/지출그림과q16/17공통20명국어점수그림을소유범위r2/r3에서실제로보았고20쌍을전사했다. 원문페이지에손글씨선택표시/계산도보였다는점을이미선언했다. 그표시를새문항풀이근거로사용하지않는다. 관련대표값/산포도/산점도및노변다른문항의저자검토이력도있다.','currentBlindBoundary':'이번currentgroup5-r2의학생JSON/manifest/brief/학생SVG해시와q15/q16/q17학생PNG만확인했다. group5-r1초안·현재저자답/해설·parentworktree·private/source질문·이전저자해설을열지않았다. 전체코퍼스미노출주장없음.','numericalReadingMethod':'새PNG의인쇄축눈금과10점격자/점라벨로수치쌍을직접읽음. 픽셀길이/SVG좌표비율을점수오라클로쓰지않음.'}
# Own transcription from the CURRENT printed grid labels and named points, not prior original data.
q15={'A':(30,60),'B':(70,50),'C':(50,80),'D':(60,30),'E':(80,70)}
q16={'A':(20,30),'B':(30,50),'C':(40,60),'D':(50,40),'E':(60,30),'F':(70,60),'G':(80,80)}
q17={'A':(90,80),'B':(60,90),'C':(70,70),'D':(50,60),'E':(80,40),'F':(40,30),'G':(20,30)}
checks15={k:{'xGreaterThanA':xy[0]>q15['A'][0],'yLessThanB':xy[1]<q15['B'][1],'both':xy[0]>q15['A'][0] and xy[1]<q15['B'][1]} for k,xy in q15.items()};assert [k for k,c in checks15.items() if c['both']]==['D']
flags15=[checks15[k]['both'] for k in q15];assert flags15==[False,False,False,True,False]
groups16={'higher':[k for k,(x,y) in q16.items() if y>x],'equal':[k for k,(x,y) in q16.items() if y==x],'lower':[k for k,(x,y) in q16.items() if y<x]};assert groups16=={'higher':['A','B','C'],'equal':['G'],'lower':['D','E','F']}
required=8*F(50,100);assert required==4
choices16=[30,40,50,60,70];out16=[]
for a in choices16:
 count=len(groups16['higher'])+int(a>60);ratio=F(count,8);out16.append({'a':a,'HstrictlyImproves':a>60,'higherCount':count,'denominatorAllStudents':8,'fraction':str(ratio),'percent':str(ratio*100),'satisfies':ratio==F(1,2)})
assert [x['satisfies'] for x in out16]==[False,False,False,False,True]
# q17 exhaustive allowed integer domain; do not assume top totals are all different.
baseTotals={k:x+y for k,(x,y) in q17.items()};assert baseTotals=={'A':170,'B':150,'C':140,'D':110,'E':120,'F':70,'G':50}
runs17=[]
for a in range(80,101):
 allPts={**q17,'H':(80,a)};totals={k:x+y for k,(x,y) in allPts.items()};rank=sorted(totals,key=lambda k:totals[k],reverse=True);cut=totals[rank[1]];atOrAbove=[k for k in rank if totals[k]>=cut];assert set(atOrAbove)=={'A','H'} and len(atOrAbove)==2;assert totals[rank[1]]>totals[rank[2]]
 mean=F(sum(allPts[k][1] for k in atOrAbove),2);runs17.append({'a':a,'Htotal':totals['H'],'selected':['A','H'],'topTwoTie':totals['A']==totals['H'],'cutoffTotal':cut,'thirdTotal':totals[rank[2]],'tieAcrossCutoff':False,'secondScoreMean':str(mean),'satisfiesMean90':mean==90})
assert [x['a'] for x in runs17 if x['satisfiesMean90']]==[100]
assert [x['a'] for x in runs17 if x['topTwoTie']]==[90]
choices17=[80,85,90,95,100];flags17=[F(80+a,2)==90 for a in choices17];assert flags17==[False,False,False,False,True]
solutions={15:'横軸ではなく、가로축의1차점수는A가30점이고세로축의2차점수는B가50점이다. 따라서두조건은1차점수가30점보다크고2차점수가50점보다작다는것이다. A는자기자신의1차점수보다높지않다. B는2차점수가B와같으므로낮다는조건을만족하지않는다. C는2차80점,E는2차70점이라조건을만족하지않는다. D는1차60점>30점,2차30점<50점으로두조건을모두만족한다. 따라서정답은④이다.',16:'산점도의A(20,30),B(30,50),C(40,60)는2차점수가1차보다높다. D(50,40),E(60,30),F(70,60)는낮고G(80,80)는같으므로높은학생에포함하지않는다. 그림에나타난7명중높은학생은3명이다. 전체는H를포함한8명이고그50%는4명이므로H도2차가1차보다높아야한다. 따라서a>60이다. 보기30,40,50은60보다작고60은같으므로안되며70만가능하다. 정답은⑤이다. 이는보기중가능한값이70하나라는뜻이며문제조건만으로모든가능한a가70하나라고주장하지않는다.',17:'산점도에서A(90,80),B(60,90),C(70,70),D(50,60),E(80,40),F(40,30),G(20,30)를읽는다. 두점수의합은각각170,150,140,110,120,70,50이다. H의합은80+a이고80≤a≤100이므로160≤80+a≤180이다. 따라서허용범위의어느a에서도합이가장큰두학생은A와H이다. a=90이면A와H가170점으로같지만둘다선택되며3위B의150점과는동점이아니다. 선택된두학생의2차점수평균이90점이므로(80+a)/2=90이다. 따라서80+a=180,a=100이다. 이값은범위안의정수이고실제H합180>A합170>B합150,2차평균(80+100)/2=90이므로모든조건을만족한다. 다섯보기중100점인⑤가유일하다.'}
solutions[15]=solutions[15].replace('横軸ではなく、','')
calcs={15:{'ownCurrentGridTranscription':q15,'thresholds':{'xStrictlyAbove':30,'yStrictlyBelow':50},'allStudentsTwoConditions':checks15,'allChoiceChecks':dict(zip('①②③④⑤',flags15)),'existenceUniqueness':'실제D가두엄격부등식을충족하고A/B/C/E는각각적어도하나를충족하지않는다. 경계동일은포함하지않으며따라서학생및선택기호가유일하다. 단위는연습점수점이다.'},16:{'ownCurrentGridTranscription':q16,'separatelyGivenHfirstScore':60,'classifiedSeven':groups16,'plottedStudents':7,'allStudentsIncludingH':8,'requiredHigherCount':str(required),'allChoices':out16,'admissibleConditionOverUnrestrictedScores':'a>60; 문제에별도정수/상한을추가하지않음. 보기중가능값은70한개이나모든가능a가유일한것은아니다.','witness':'a70이면높은학생A/B/C/H의4명/전체8명=50%. G는동점이라제외. a60이면3/8이라실패.'},17:{'ownCurrentGridTranscription':q17,'baseTotals':baseTotals,'HfirstScore':80,'HsecondScoreDomain':'integer80..100 inclusive','HtotalRange':[160,180],'all21DomainCases':runs17,'allFiveChoiceMeans':{str(a):str(F(80+a,2)) for a in choices17},'allChoiceChecks':dict(zip('①②③④⑤',flags17)),'validA':[100],'rangeOfPossibleSelectedSecondScoreMean':['80','90'],'tieReasoning':'a90でなく、a=90에서는선택된A/H끼리동점이지만경계밖3위와의동점없음. 모든21경우선택집합은{A,H}로유일.','existenceUniqueness':'현재허용정수21개를모두검사했고평균조건은a100하나에서만성립. 학생해설은전수코드가아닌합범위와일차식으로증명한다.'}}
calcs[17]['tieReasoning']=calcs[17]['tieReasoning'].replace('a90でなく、','')
rows=[]
for it in items:
 q=it['questionNumber'];assert len(it['choices'])==5
 digest=h(json.dumps({k:v for k,v in it.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode());assert digest==it['studentDigest']
 figs=[]
 for fig in it['figures']:
  sha=h((p/fig['svgPath']).read_bytes());assert sha==fig['sha256'];figs.append(sha)
 preview=p.parent/f'student-preview/q{q}.png';previewSha=h(preview.read_bytes())
 surfaces={
 'stem':{'status':'student-method-proposed-in-scope','basis':('실제산점도의가로/세로점수를두엄격부등조건으로비교한다.' if q==15 else '7명의점과별도H를합친8명전체에서엄격증가비율조건을이용해가능a를판단한다.' if q==16 else '두점수합의순위와범위,선택된두학생의2차평균을연결한다.')+' 중학교산점도/자료정리·비율/평균과이전일차관계의방법만필요하다.'},
 'choices':{'status':'all-five-independently-checked','basis':('A/B/C/D/E각두조건을모두확인하여④D만참.' if q==15 else '30/40/50/60/70각각전체8명비율을정확계산하여⑤70만가능. a60동일은높다가아님.' if q==16 else '80/85/90/95/100각각선택집합과평균을계산하여⑤100만조건성립.')},
 'figuresAndTables':{'status':'student-png-actually-viewed','basis':'현재학생PNG를실제view하고인쇄눈금/격자와모든라벨의점수쌍을직접전사했다. '+('A~E다섯점모두검토.' if q==15 else '산점도A~G7점과표의H1명을구분한다. H를그림에없다고분모에서빼거나다른점으로추정하지않는다.')+' SVG해시를제공manifest와대조했고픽셀/SVG좌표길이로점수를얻지않았다.'},
 'notation':{'status':'proposed-in-scope','basis':('보다높다/낮다는엄격비교로동일을제외하며가로x/세로y를바꾸지않는다.' if q==15 else '50%는전체8명의절반이며높다와같다를구별한다. 가능한것이라는표현을유일값추정으로바꾸지않는다.' if q==16 else '정수a의포함범위80~100과합의순위/2차평균을구별한다. 순위내동점과선택경계동점은별도이다.')+' 점수단위는점이며길이나좌표픽셀단위가아니다.'},
 'answer':{'status':'independently-solved','basis':'선택기호 '+('④' if q==15 else '⑤')+'만저장하며실제학생/수치와모든보기판정은solution/evidence에기록했다. 존재및선택유일성을정확히확인했다.'},
 'studentSolution':{'status':'own-method-proposed-author-unseen','basis':'현재점의명시적비교·개수/분수비율·순위범위·평균의일차식만쓴다. 공분산/회귀/고등상관계수나원문답은사용하지않는다. 저자전체해설은아직미노출로후속검토대상.'},
 'prerequisites':{'status':'2015-M3-after-prerequisites-proposal','basis':'2015중3산점도9수05-08의쌍자료/축읽기와대표값9수05-06의평균및이전부등비교·백분율·자료개수/일차식학습후배정. 이번새학생문항의정식7면/특정학교진도/2022승인은후속해설검토와구분한다.'}}
 raw={'studentDigest':it['studentDigest'],'solverId':'independent-helper-nobyeon-sem2-group5-r2-blind-20261020','answer':'④' if q==15 else '⑤','solution':solutions[q],'evidence':{'exposure':exposure,'ownExactCalculations':calcs[q],'studentDigestVerified':True,'studentPreviewPngSha256':previewSha,'studentSvgSha256s':figs,'gradeSurfaceProposals':surfaces,'limits':['현재author/private/원문정답을열지않음','새blindraw는수학solved이나정식학년/family/권리/native/loadable승인아님','q16은가능한a조건과보기의유일선택을구분; q17은전체범위와경계동점모두검토','2022별도보류']},'status':'solved'}
 (p/'solve').mkdir(exist_ok=True)
 with (p/f'solve/q{q}.json').open('x',encoding='utf-8') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'rawSha256':h((p/f'solve/q{q}.json').read_bytes()),'answer':raw['answer'],'studentDigest':digest})
for fig in manifest['figures']:assert h((p/fig['path']).read_bytes())==fig['sha256']
with (p/'own-nobyeon5-blind-check-receipt.json').open('x',encoding='utf-8') as f:json.dump({'studentFileSha256':h((p/'student-problems.json').read_bytes()),'blindManifestSha256':h((p/'blind-manifest.json').read_bytes()),'ownScriptSha256':h(Path(__file__).read_bytes()),'UTF8Probe':'passed','studentPngsViewed':[15,16,17],'results':rows,'exposure':exposure,'calculations':calcs,'noCurrentAuthorExposure':True,'newFormalApprovals':0},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))
