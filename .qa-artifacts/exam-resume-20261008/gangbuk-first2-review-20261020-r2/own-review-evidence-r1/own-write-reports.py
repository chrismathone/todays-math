from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent.parent;E=Path(__file__).resolve().parent;rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();items=rd(P/'verification/verification-inputs.json');(P/'verification/reports').mkdir(exist_ok=True)
common={'reviewKind':'post-Git-seal actual whole-method review, not new blind solve','rawCommit':'04b4705df8de2b6003300866e4b722d8f7ae657c','helperRawCommit':'aa46a2fd80ed27026b404ec46021a94aa116e01d','exposure':'원문9/Gachang2/공개코드/current166metadata/Gangbukmetadata 이력이 있고 pristine corpus blind가 아니다. 현재 Gangbuk저자/원문/해설은 raw봉인 뒤 처음 노출. 실제 원문첫페이지의 손글씨와 다른 문항은 부수적으로 보였지만 답/키 일치를 승인근거로 사용하지 않음.','actualImagesViewed':['solution-preview/q01.solution.png','solution-preview/q02.solution.png','local-only original-first-page.local.png'],'calculationReceipt':{'path':'../../own-review-evidence-r1/own-calculations.json','sha256':sha(E/'own-calculations.json'),'passed':39,'failed':0,'method':'Own Fraction polynomial convolution and substitution, allchoices/3records; no author-answer or pixel oracle.'},'primaryReceipt':{'path':'../../own-review-evidence-r1/own-primary-receipt.json','sha256':sha(E/'own-primary-receipt.json'),'documentSHA256':'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb','basis':'기존 실제공식텍스트/record/page 검증과 현재허용curriculum-evidence/Unit캡처를 재대조. 학년군코드/원문학교/목록일치만으로 승인하지 않는다.','placement':'source2025/practice2026 M3=2015 after learned prerequisites;2027M3/2022pending'},'separateHolds':{'exactLiveFamily':None,'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'loadable':False,'wholePaperHwpPdfIdentity':False,'2027M3And2022':'pending'},'sourceComponentLimits':'실제원문첫페이지의2025/3학년/1학기기말 표제와 두 구성요소·3/4점·대수식을 현재로컬question-only와 대조한 관찰이다. 전체HWP/PDF대응/학교출처/권리/답키/내용유사성 기준 통과를 뜻하지 않으며 원문본문/이미지를 Git에 복사하지 않는다.'}
by={1:{'checks':{
'answerCorrect':'정리식(a-3)x²-x-6=0에서 a=3만 일차방정식이며⑤. 독립봉인raw와현재저자답이일치하고 원문답을사용하지 않았다.',
'solutionCorrect':'저자전문의 왼쪽ax²+(a-2)x-2/오른쪽3x²+(a-1)x+4→이항→a=3→남은x계수-1을 모두검산. 단순히이차항을없애는조건만썼다가항등식이되는오류없음. 해x=-6의원식대입도양변100으로자체확인.',
'existenceUniqueness':'a=3에서x²계수0,x계수-1≠0. 따라서 실제일차방정식이고x=-6으로해존재/유일. 다른실수a는이차항비영이므로요청조건불가. a나x의양수조건없다.',
'choicesCorrect':'보기a=-3,-1,1,2,3의이차항계수는-6,-4,-2,-1,0이고일차항계수는항상-1. 다섯보기중⑤만조건충족.',
'figureConsistent':'도형/표자산없음. 현재solutionPNG의양변식/정리식/보기/답과JSON을실제확인했다. 이미지수치측정이나좌표추론필요없음.',
'sameCoreConceptAndProcedure':'실제원문구성요소는다섯등식을전개·정리해차수를분류한다. 현재도최고차항상쇄여부를전개후판정하는정의·절차가핵심이며 원문정답은계산/사용하지않았다.',
'distinctPresentation':'여러식에서차수예외를고르던역할을하나의매개변수식이일차가되게입력을정하는역추론으로변경. 이차항0외에일차항비영을확인해야하는실제구조변경이며숫자교체만아님.',
'naturalKorean':'x에대한일차방정식과상수a라는역할을분명히명시. 해x와매개변수a를혼동하지않고전개/항정리기준으로차수를읽게한다. 단위없는대수이며길이/넓이양수제약을추가하지않음.',
'curriculumAppropriate':'2015 9수02-12다항식곱셈(HWPrecord3956/offset201534),9수02-13이차방정식(record3964/offset201786),PDFphysical34/printed30. 실제Unit82399e51-340d-4165-b016-3e941e65f810은중3semester1이차방정식풀이. 전체방법은기학습전개/차수/일차등식으로완결,고등방정식계수정리불필요.',
'allStudentSurfacesInScope':'아래7면의실제요구를각각검토. 현재학생해설전체가분배법칙·동류항정리·차수정의와계수비영확인으로끝나며과도한매개변수경우분류없음.',
'unitFamilyFit':'캡처Unit의기초방정식분류주제는부합하나정확한livefamily의정의/미지계수역차수목표호환은증명하지않았다. familyKeynull/false유지.',
'scoreAppropriate':'실제원문3점과현재3점확인. 전개·소거·비영계수의짧은역추론이라기본3점편집제안수용. preparation하라벨은학교실측난도아니며원문동난도/측정효과는보류.'},
'surfaces':{
'stem':'다항식을전개하여일차방정식이되게입력을구하는조건은2015 9수02-12/13과M1등식·차수선수범위. 실제M3semester1 Unit과학습후조건을함께사용하며 band나code일치만으로허용하지않음.',
'choices':'다섯정수a를넣어x²계수가없어지고x계수는남는지확인한다. 음수/계수연산과9수02-12전개수준,고등근관계/함수판정없음.',
'figuresAndTables':'도형/표없고PNG는문자식만표시. 추가기하·좌표·그림암묵조건없이주어진대수식으로완결,보기/정리식도JSON과일치.',
'notation':'a는x와구별되는상수,x²/곱/괄호는기학습다항식기호. x계수-1≠0와a-3=0의단순조건을읽으며고급항등식표기나단위혼동없음.',
'answer':'상수3에대응하는단일⑤로답한다. 다항식정리와앞학년일차방정식의결과이며원래식의해x=-6과답a를명확히구분.',
'studentSolution':'저자전문은전개→이항/동류항정리→이차항0→남은일차항비영확인.9수02-12/13과9수02-04/05(record3912/3916,PDF34/30)안에서해결되며근의공식/판별식/Vieta없음.',
'prerequisites':'분배법칙/다항식곱셈/항정리,상수·계수·차수,일차/이차방정식의뜻을먼저학습해야한다. 실제M3semester1기초Unit학습후배정,2027M3/2022나학교진도는별도pending.'}},
2:{'checks':{
'answerCorrect':'C만잘못된기록이고고친a=2로④. 독립raw와저자답이같으며A/B/C대입잔차0,0,2를Fraction으로확인.',
'solutionCorrect':'저자전체해설의A:4+2/3+1/3-5=0,B:4+2-1-5=0,C:1+3+3-5=2와수정2a=4→a2→대입0을각각검산. 두근을구하거나근·계수관계공식을사용하지않음.',
'existenceUniqueness':'원식x²계수1은모든a에서비영. 각행은그때의별도a로해석되며r+1=3,-1,2는모두비영이라a=1/3,-1,2각각유일. 틀린행은C하나이고수정값2도유일,수정후실제근대입0.',
'choicesCorrect':'①A1/3은옳은기록이지만틀린행아님,②A3은대입잔차8,③B-1은옳은행,④C2는틀린행과올바른수정값,⑤C3은잔차2그대로. 요청한역할까지충족하는선택은④뿐.',
'figureConsistent':'별도도형없고실제PNG표A/B/C의근2,-2,1및a1/3,-1,3이JSON과일치. 현재해설에서표와각행의대입을정확히대응,원문crop/픽셀계산없음.',
'sameCoreConceptAndProcedure':'실제원문은주어진한근을대입해상수를구한다. 현재도근의정의에따른대입과a의일차방정식이필수이며원문답을계산하거나비교하지않았다.',
'distinctPresentation':'단일근/입력의직접계산에서세기록진단과오류행+수정값선택으로데이터조직/답역할을변경. 잘못된행을구분해야하므로정답숫자교체에그치지않음.',
'naturalKorean':'한근과그때의a라는말및표행은각별도상수경우로읽힌다. 하나의공통a를세근에동시에요구하지않고잘못기록한행/고칠값의역할이선택지와맞는다. 명료화를원하면각행은별도의경우라고덧붙일수있으나현재그때문맥은해석가능.',
'curriculumAppropriate':'2015 9수02-13(HWPrecord3964/offset201786,PDF34/30)의이차방정식과근의기초,기학습9수02-04/05의대입/일차풀이로전체방법완결. 실제캡처Unit82399e51-340d-4165-b016-3e941e65f810=중3semester1. 근계수관계배제규정과충돌하는학생단계없음.',
'allStudentSurfacesInScope':'일곱면각basis에표/분수음수/답역할/해설전문/선수요구를기록. 성취기준명이나계산코드만으로grade자동승인하지않음.',
'unitFamilyFit':'기초이차방정식Unit과주제는맞지만3기록진단+수정목표를담는정확한livefamily정의를이범위에서검증하지않았으므로null/false유지.',
'scoreAppropriate':'원문인쇄4점과현재4점. 세행대입과하나의일차수정으로기본~표준4점편집제안은타당하지만원문보다검사량이늘어동난도/실측난도는미인증.'},
'surfaces':{
'stem':'이차방정식의근을대입한조건으로세기록을진단한다.2015 9수02-13(record3964,PDF34/30)과실제M3semester1기초Unit/선수학습후범위. 고급근이론없음.',
'choices':'행이름과유리수수정값의쌍을판정. 근대입/음수와분수사칙·앞학년일차방정식수준이며옳은값이더라도틀린행아니면배제하는단순답역할읽기.',
'figuresAndTables':'세행표는근과기록a를정리한단순자료. 실제PNG의분수1/3과음수-2,-1의대응을확인했다. 고급통계/상관/좌표/측정필요없음.',
'notation':'x²+ax+a-5=0,근x=값,분수1/3과음수는기학습식과2015이차방정식기호. a는행별상수이며명명근·상수역할을구분한다.',
'answer':'틀린C행과정수2를묶은단일④를답한다. 추가근목록이나상위학년표현을요구하지않으며수정대입확인으로충분.',
'studentSolution':'저자전문은A/B대입0확인,C대입2확인,근1고정하여2a=4,재대입0.9수02-13+9수02-04/05와유리수연산으로완결;고등Vieta/판별식/근의공식없음.',
'prerequisites':'방정식의근/해의뜻과대입,분수·음수의계산,상수와미지수역할,일차방정식을학습해야한다.이차방정식기초M3semester1이후배정이며2027M3/2022·학교진도는인증하지않음.'}}}
for item in items:
 n=item['candidate']['questionNumber'];q=by[n];report={'status':'pending','studentDigest':item['studentDigest'],'candidateDigest':item['candidateDigest'],'assetDigest':item['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gangbuk-first2-full-review-20261020-r1','solveDigest':item['solveDigest'],'checks':{k:k!='unitFamilyFit'for k in q['checks']},'evidence':{**common,'questionNumber':n,'checkBasis':q['checks'],'currentUnit':item['candidate']['metadata']['assignment']['currentUnit'],'rawFileSHA256':sha(P/f'blind/solve/q{n:02}.json')},'curriculumSurfaces':{k:{'status':'passed','basis':v}for k,v in q['surfaces'].items()}};assert len(report['checks'])==12 and len(report['curriculumSurfaces'])==7;(P/f'verification/reports/q{n:02}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({f'q{n:02}':sha(P/f'verification/reports/q{n:02}.json')for n in [1,2]},indent=2))
