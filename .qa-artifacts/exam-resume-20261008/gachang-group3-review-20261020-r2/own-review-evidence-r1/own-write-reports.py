from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent.parent;E=P/'own-review-evidence-r1';read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();items=read(P/'verification/verification-inputs.json');primary=read(E/'own-primary-unit-receipt.json')
common={'reviewType':'post-Git-seal current full review, not fresh blind solve','rawHelperCommit':'c621b7d17cef1e4e6db495d52bdb298dabb71a73','parentRawSeal':'c89b1a152f63981ed643df85d62759ed270e7da6','exposure':'이전원문9/Gachang/Gangbuk/공개코드검토이력이있고Gachang이전원문첫페이지의다른문항/손글씨를이전raw봉인후부수적으로보았다. 현재q03/q06저자답/해설/원문context는현행raw봉인후처음검토. 원문답/손글씨일치를오라클이나승인근거로사용하지않음. 전체코퍼스최초blind주장없음.','primaryReceipt':{'path':'../../own-review-evidence-r1/own-primary-unit-receipt.json','sha256':sha(E/'own-primary-unit-receipt.json'),'placement':'2015M3source2025/practice2026afteralllistedprerequisites;2027M3/2022pending'},'ownMathReceipt':{'path':'../../own-review-evidence-r1/own-calculations.json','sha256':sha(E/'own-calculations.json'),'assertions':52,'passed':52,'failed':0,'raw40NotSummed':True},'imageObservations':{'actuallyViewed':['gachang-group3-source-context-local-20261020-r2/original-first-page.local.png','engine-upgrade-20261019/gachang-group3-figure-white-preview-r2.png'],'originalPage':'Observed actual2025firstsemesterfinal M3math header and q03/q06 printed4points; current component formulas/roles correspond to supplied staged question-only records. Handwritten marks incidental; not used as answers.','newFigure':'White remaining top-left rectangle, gray right/bottom removed strips; full width/height and two b labels readable, consistent with text. No pixel/coordinate arithmetic oracle.','notProvided':'Full new student/solution PNGs; no full native/print/layout/overflow/parity certification. Grade decisions refer to actual complete text/vector/table mathematical surfaces, not unviewed rendered flow.'},'sourceAndReleaseHolds':{'wholeHwpPdfSourceIdentity':False,'rightsApproved':False,'similarityApproved':False,'exactLiveFamily':None,'unitFamilyFit':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'loadable':False,'2027M3/2022Approved':False},'rawPresealNotationDiagnostic':'Initial displayedJSONescaping concern corrected BEFORErawseal; olddraft/diagnostics preserved. Actual student command slash runs are1. Current raw/declarations not rewritten.'}
by={3:{'checks':{
'answerCorrect':'독립raw③/b4와현재저자답일치. 5개b의실제넓이식중12a²-17a+6과동일한것은b4뿐.',
'solutionCorrect':'저자전체:남은두변4a+1-b,3a+2-b→곱전개12a²+(11-7b)a+(1-b)(2-b)→11-7b=-17→b4→상수6/길이양수확인. 모든전개식과수치는독립Fraction계산과일치.',
'existenceUniqueness':'b4에서a>2이면남는가로4a-3>5/세로3a-2>4이고0<4<3a+2. a의계수11-7b=-17은계수-7비영인단순일차관계로b4유일. 특정한a에서만맞는수치식이아닌a에대한전체넓이식의동일성.',
'choicesCorrect':'b2/3/4/5/6의오름차순계수는각각(0,-3,12),(2,-10,12),(6,-17,12),(12,-24,12),(20,-31,12). 모두폭범위/양수변을만족하지만전체넓이식이일치하는③만정답.',
'figureConsistent':'새whitePNG직접관찰에서남은부분은좌상단흰직사각형,제거띠는우측/하단회색. 4a+1/3a+2와두b라벨은본문과같다. exactspec/SVG/blindSVGhash일치. spec a3/b4는존재작도증인만확인했고좌표/픽셀로답을얻지않음. 전체문항렌더승인은보류.',
'sameCoreConceptAndProcedure':'원문q03은내부일정폭길을제외한직사각형넓이를곱셈식으로정리하는문제. 새문항도남은두길이를구성하고두일차식의곱을전개하는핵심을유지. 원문답값은계산/승인오라클로사용하지않음.',
'distinctPresentation':'잔디밭내부길/직접넓이표현선택을종이우측·하단외부띠절단/주어진다항식에서공통폭역산으로변경. 목표·연산방향과도형위상이실질적으로변했고숫자만교체한것이아님.',
'naturalKorean':'a에대한식,상수b,띠폭과남은넓이의역할이명확. 오른쪽/아래쪽의같은폭을새도형과맞춰읽을수있고양수조건/단위명확. Fullstudent/solutionPNG줄흐름은미검토.',
'curriculumAppropriate':'2015 9수02-12의두일차식곱전개와앞학년넓이/일차방정식. 실제M3semester1 다항식곱셈Unite63d61c6...학습후. 현재해설은명시된단순전개식의a항을대응시켜입력을구하며고등일반항등식계수정리/판별식을필수화하지않는다. 독립풀이의보기직접전개로도완결.',
'allStudentSurfacesInScope':'현재발문/5보기/새벡터의수학라벨/단위/답/전체해설/선수범위를각각7면으로검토. 이미지미제공은전체레이아웃검증한계이나숨은수학조건을만들지않으며필요표현의학년판정을막지않음.',
'unitFamilyFit':'실제캡처Unit e63d61c6-2b41-4c83-a74b-a605fd343c42는M3sem1다항식곱셈으로개념상맞지만exactlivefamily/목표·파라미터의동일한실제정의는미확인. familyKey=null과분리하여false유지.',
'scoreAppropriate':'원문실제인쇄4점과현재4점확인. 도형두변구성/전개/폭역산/양수재확인으로4점목표는타당한편집제안. staged중은준비자료라벨관찰이며실제학교측정난도/동일난도승인아님. 기본~응용은광범위하여별도보정필요.'},
'surfaces':{
'stem':'띠폭b를역산하는직사각형넓이문장. 초등넓이와2015M3 9수02-12두일차식곱학습후,단순일차관계9수02-05로해결. 원문학교/코드만으로허용하지않음.',
'choices':'5개의양의정수폭에대해남은두변곱을전개하여식비교. 부호/동류항/M3곱셈범위,5보기모두자체전개했고③만일치. 고등다항식일반정리불필요.',
'figuresAndTables':'직접본새white벡터PNG의사각형·오른쪽/아래쪽띠·두b와길이라벨은초등넓이수준. spec/SVGhash와본문을검산. FullnewPNG/readerlayout미검토를명시하되수학표현의학년판정은가능.',
'notation':'a상수b/일차식/이차넓이식은M3다항식. 길이cm와넓이cm²를구별하고실제JSON명령역슬래시1확인. a>2와0<b<3a+2는앞학년부등식읽기,고급함수영역분석없음.',
'answer':'답은③에대응하는폭수b4. 전개결과와단순11-7b=-17에서정해지며양수길이/넓이/상수항검산. 원래a를답으로오해하지않음.',
'studentSolution':'저자전체단계직접재계산:두변구성→곱전개→a항대응단순일차식→상수항6/양수변/유일확인. 9수02-12/앞학년9수02-05범위,일반고차항등식계수법으로확장허가하지않음.',
'prerequisites':'직사각형넓이/길이양수/단위,분배법칙·동류항·계수·다항식곱셈과일차방정식을학습해야함. 실제M3sem1Unit e63d61c6...이후조건. source2025/practice2026=2015한정,2027/2022학교진도별도보류.'}},
6:{'checks':{
'answerCorrect':'독립raw②/t-1과현재저자답일치. 이때A/B의변4/1,넓이16/1,차3cm확인.',
'solutionCorrect':'전체해설은넓이를(t-3)²/(t+2)²로정리하고-2<t<3에서양의제곱근3-t,t+2를선택. 차식1-2t=3→t-1→범위/면적/양수변대입. 모두정확하고추가근호방정식제곱이나판별식없음.',
'existenceUniqueness':'열린범위가두변양수와부호분기를고정. 남은일차식의t계수-2는비영이어서유일해-1. -1은범위내이고변4,1인실제정사각형존재. 양끝-2/3은각각한변0인퇴화형이므로포함불가.',
'choicesCorrect':'t=-2/-1/0/1/2에서양의제곱근길이차는5/3/1/-1/-3; -2는범위밖이고B변0. 실제허용선택중차3인②만정답.',
'figureConsistent':'도형자산없음. 현재nativeMarkdown표의A넓이t²-6t+9와B넓이t²+4t+4는본문/해설과맞고행/열의대상역할명확. 실제전체렌더표의줄흐름/폭/nativeparity는미검토·별도보류.',
'sameCoreConceptAndProcedure':'원문q06의문자대입후두근호식을완전제곱식으로정리하고주어진범위에따라양의제곱근을선택하는핵심을유지. 원문답/손글씨일치가승인근거아님.',
'distinctPresentation':'원문의보조문자대입/두근호차를단순화하는정방향을두정사각형넓이표/양수변의차조건에서입력t복원으로변경. 대수에서기하단위·표로표현/목표방향이실질적으로바뀜.',
'naturalKorean':'표의A/B넓이,한변이3cm더길다는방향,실수t와열린범위가분명. 넓이차가아닌변길이차로해설일치. 원문표기복사/학교명없음;최종표렌더미검토.',
'curriculumAppropriate':'주성취2015 9수01-07의제곱근뜻/성질,9수02-12완전제곱곱셈/인수분해선수,9수02-05일차관계. 실제M3sem1rootsUnit1682f01b...이나곱셈공식을먼저배웠다는조건필수. 절댓값함수형식/고등근호방정식도구없이양수근을선택한다.',
'allStudentSurfacesInScope':'현재두넓이표와모든보기/근호부호/길이단위/전체학생해설/필수선수를7면별도평가. 수학정보는JSON/표원문에완전하고fullPNG미제공을학년/레이아웃혼동없이구분. 학년면은선수학습후에한정.',
'unitFamilyFit':'실제rootsUnit1682f01b-5293-4672-91cd-07fc02e305ac는M3sem1이나완전제곱곱셈선수Unit e63d61c6...까지학습해야한다. 현재문자조건은이를요구하지만prerequisiteUnits구조목록에는roots만기재. 정확한livefamily호환정의미확인/familyKeynull이므로false.',
'scoreAppropriate':'원문인쇄4점과현재4점일치. 완전제곱정리/범위에맞는양수변/일차역산/대입검산으로4점편집목표는수용가능. staged중라벨은관찰자료이며문항난도실측/기본~응용보정/동일학교난도승인은아님.'},
'surfaces':{
'stem':'두넓이에서한변차로t를구하는문장. 제곱근성질9수01-07와일차방정식/정사각형넓이로해결하며M3전반학습후가능. 넓이차로해석하지않도록명시됨.',
'choices':'실수정수5보기를범위로먼저거른후양수제곱근의길이차로검산. -2퇴화/범위밖,나머지4개의차3/1/-1/-3을확인. 제곱근/음수기초계산범위.',
'figuresAndTables':'벡터없고native표는A/B두행과단일넓이열. 명시된두다항식이완전제곱으로대응되어기하·표읽기는초등/M3선수범위. Fullrender미제공이나행/열수학정보는완전하여학년판정가능,배치인증은하지않음.',
'notation':'t실수,열린구간-2<t<3,cm/cm²단위와양수길이를구별. 형식절댓값함수기호를학생에게요구하지않고범위에서3-t와t+2를직접선택. 고등부호함수/근호방정식유형으로확장하지않음.',
'answer':'②는t=-1이라는입력값. 변4cm/1cm,넓이16cm²/1cm²와구별해적는다. 계수-2비영인일차관계로유일하고범위/양수조건을모두충족.',
'studentSolution':'저자전체식/문장을현재raw와독립52검사로대조:완전제곱→양의근→길이차→일차식→대입검산. 9수01-07+9수02-12선수+9수02-05안에서완결. 판별식/근합곱/제곱해생기는무연근방법없음.',
'prerequisites':'제곱근뜻과성질뿐아니라완전제곱식의곱셈공식/인수분해9수02-12와일차방정식/부호/넓이·양수길이를학습해야함. rootsUnit순번469에서즉시자동배정불가,곱셈Unit e63d61c6...학습후조건. 2015M3source2025/practice2026한정;2027/2022는별도보류.'}}}
for item in items:
 n=item['candidate']['questionNumber'];v=by[n];report={'status':'pending','studentDigest':item['studentDigest'],'candidateDigest':item['candidateDigest'],'assetDigest':item['assetDigest'],'solveDigest':item['solveDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gachang-group3-full-review-20261020-r1','checks':{k:k!='unitFamilyFit' for k in v['checks']},'evidence':{**common,'questionNumber':n,'checkBasis':v['checks'],'actualUnit':item['candidate']['metadata']['assignment']['currentUnit'],'rawSHA256':sha(P/f'blind/solve/q{n:02}.json'),'renderingSeparateHold':True},'curriculumSurfaces':{k:{'status':'passed','basis':b,'evidence':{'primaryReceipt':'../../own-review-evidence-r1/own-primary-unit-receipt.json','calculations':'../../own-review-evidence-r1/own-calculations.json','placementCondition':'afterallnamedprerequisites2015M3only'}} for k,b in v['surfaces'].items()}};assert len(report['checks'])==12 and len(report['curriculumSurfaces'])==7;(P/f'verification/reports/q{n:02}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(E/'own-source-and-render-observations.json').write_text(json.dumps({'actuallyViewedImages':common['imageObservations'],'sourceOriginalLocalOnlyNoGit':True,'sourceAnswerKeyComputation':False,'sourceCoreAndChange':{str(n):{'sameCore':v['checks']['sameCoreConceptAndProcedure'],'substantiveChange':v['checks']['distinctPresentation'],'difficultyScore':v['checks']['scoreAppropriate']} for n,v in by.items()},'q06PrerequisiteMetadataSupportGap':'requiresLearnedBeforeAssignment explicitly includes complete-square multiplication formula, but structuralprerequisiteUnits lists rootsUnit only. Propose later separately versioned metadata addition of multiplicationUnit e63d61c6-2b41-4c83-a74b-a605fd343c42; currentinputs untouched, afterprereqs grade support is conditional.','allSeparateHolds':common['sourceAndReleaseHolds']},ensure_ascii=False,indent=2),encoding='utf-8')
print('fresh reports q03/q06 written; each11true+familyfalse,7surface individual basis')
