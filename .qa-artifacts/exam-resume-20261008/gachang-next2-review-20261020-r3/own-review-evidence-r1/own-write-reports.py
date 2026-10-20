from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent.parent;E=Path(__file__).resolve().parent;rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();items=rd(P/'verification/verification-inputs.json');(P/'verification/reports').mkdir(exist_ok=True)
common={'rawBinding':{'helperCommit':'85a11fa80b44b324ea3850140db9f1aaffd5665a','parentCommit':'6a3b70fcb1676d8fe1d03e1f81d4c99a73dde525','rawUnchanged':True,'rawTextOnlyVisualDeclarationPreserved':True,'newSolveCreditForPNGs':0},'exposure':'원문9·이전Gachang/Gangbuk원문첫페이지와그안의다른문항/손글씨, 공개코드/current166metadata 이력이이미있다. 이번현재저자답/해설/private 및해당로컬원문맥락은raw봉인후읽었다. pristine corpusblind나원문정답일치승인을주장하지않는다.','visualReviewNow':'현재학생PNG2개·solutionPNG2개와원문첫페이지를실제view_image로확인. raw시점에는PNG없어시각검토하지않았다는원래선언을수정하지않는다. 이번확인은추가노출후별도review일뿐새blind수학풀이아님.','calculationEvidence':{'path':'../../own-review-evidence-r1/own-calculations.json','sha256':sha(E/'own-calculations.json'),'passed':46,'failed':0,'method':'Own Fraction bivariate polynomial convolution and identity comparisons. AuthorBigInt/harness/test assertions not used or counted; pixel/measurement oracle absent.'},'primaryAndUnit':{'receipt':'../../own-review-evidence-r1/own-primary-receipt.json','sha256':sha(E/'own-primary-receipt.json'),'primary':'2015 9수02-12 actual official HWP Section0record3956/offset201534,PDFphysical34/printed30;documentSHA1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb','actualUnit':'068bcc39-0927-4f43-a919-24b61ca425f9,중3semester1다항식의곱셈과인수분해/인수분해','basisLimits':'기존실제공식텍스트/locator검증과현재허용curriculum-evidence/Unit캡처및실제전체방법을결합. code/학교/학년군만으로자동승인아님.','yearScope':'source2025/practice2026=2015M3afterprerequisites;2027M3/2022pending'},'separateHolds':{'unitFamilyFit':False,'exactLiveFamily':None,'wholeSourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'loadable':False,'2027M3And2022':'pending'},'sourceObservationLimits':'실제첫페이지2025/3학년/1학기기말표제와q04/q05의3/4점·구성요소를로컬question-only와대조. 전체19HWP/PDF대응·sourceidentity·원문답이나손글씨의정확성·권리를인증하지않고원문본문/이미지를Git에복사하지않음.','authorHistoricalHarness':'R1/R2float/signedzero실패와R3BigInt검사는사용자외부보존정보일뿐독립검사로실행/집계하지않았다.'}
by={4:{'checks':{
'answerCorrect':'현재②가봉인raw②와같고6uv(2u-3v)=12u²v-18uv²와두과정이름을함께검사해유일정답확인. 원문답미사용.',
'solutionCorrect':'현재저자전체풀이의공통인수6uv,빈칸2u-3v,합에서곱인수분해/곱에서합전개,분배법칙역확인과0제외불필요설명을모두검산했다.',
'existenceUniqueness':'선택문항의다항식항등식으로6uv(2u-3v)가존재. u/v를나누지않아u=0,v=0,2u-3v=0과음수값에서도유효. 특수수치일치가아니라전체다항식의계수/방향을묻고그식+두이름을모두맞춘②만유일.',
'choicesCorrect':'①식은맞지만방향이름반대,②모두맞음,③둘째항+18uv²로부호오류,④(나)는전개여야함,⑤전개둘째항-18uv로v차수누락. 모든역할을구분했다.',
'figureConsistent':'외부도형없고현재native표(가)/(나)의전/후열과㉠,u²v/uv²/6uv곱표기를실제학생·해설PNG에서확인. 잘림이나수치측정을승인근거로삼지않고표정보가JSON과일치함을확인.',
'sameCoreConceptAndProcedure':'실제원문q04는공통인수와인수/전개/인수분해/분배법칙설명을구별한다. 현재도공통인수와두방향의뜻이필수이며인수정의핵심을보존한다. 원문정답을계산하지않음.',
'distinctPresentation':'원문의주어진전개식/곱꼴에대한틀린설명선택에서현재빠진인수구성과두방향이름을표로완성하는목표로변경. 실제구성·역관계·답역할변화이며숫자교체만아님.',
'naturalKorean':'빈칸㉠과(가)/(나)순서를명시하고선택지의식·두이름순서가일치. 전개/인수분해는표현형식의변환이므로0특수값에따라과정명이바뀌지않는다. 단위/양수길이조건없는다항식문항.',
'curriculumAppropriate':'2015 9수02-12와실제M3semester1인수분해Unit학습후공통단항인수6uv를묶고분배법칙으로확인하는방법. 항의총차수가3이어도일반삼차인수분해정리/나머지정리/고등도구가필요하지않는실제전체방법을확인.',
'allStudentSurfacesInScope':'7면각basis는공통인수·분배법칙·과정정의와표읽기에한정됨을별도로설명. 코드계산/원문학교로포괄승인하지않음.',
'unitFamilyFit':'실제캡처UnitUUID/주제는맞지만빠진인수+두과정명목표가정확한livefamily정의와맞는지확인하지않았다. familyKeynull/false유지.',
'scoreAppropriate':'원문실제3점과현재3점을확인. 짧은공통인수구성·방향정의라기본~표준3점편집제안수용. preparation중라벨은실측원문난도나새동난도인증아님.'},
'surfaces':{
'stem':'공통인수/누락인수구성과두변형방향은2015 9수02-12(record3956,PDF34/30)과실제중3semester1인수분해Unit학습후기본범위. 일반고차인수분해이론아님.',
'choices':'식의부호/문자차수와인수분해·전개이름의순서를모두검사. 음수와분배/공통인수개념은해당공식학습범위,고등정리없음.',
'figuresAndTables':'외부도형없고두행전후표는식과방향을정리한다. 실제학생/해설PNG의표열/지수/㉠일치를확인했으며고급그래프/픽셀측정절차없음.',
'notation':'u²v와uv²,곱표시×/괄호,㉠,과정(가)/(나)는다항식표기와문자식의곱학습수준. 수치0으로나눠상쇄하는표기나암묵비영가정없음.',
'answer':'빈칸식과두과정이름을한꺼번에맞춘단일②. 인수분해정의와기학습표읽기외추가방법/응답부담없음.',
'studentSolution':'공통6uv묶기→곱전개재확인→각방향정의→0제외불필요로끝나는전체풀이가9수02-12안에서완결. 특수0값에서나누거나고등다항식정리를쓰지않음.',
'prerequisites':'문자식/항·인수,분배법칙,음수곱,공통인수묶기/전개방향뜻을먼저학습해야함. 현재M3semester1Unit학습후배정이며학교진도/2027M3·2022는별도보류.'}},
5:{'checks':{
'answerCorrect':'현재④가봉인raw와일치. A=(2x+3y)²,B=(x/3-5y/2)²이고C는(3x-2y)²의마지막계수4여야하므로잘못된C/4짝이정답.',
'solutionCorrect':'저자전문의두완전제곱공식,A전개,B분수전개,C가운데항-2·3x·2y와마지막4y²,재전개/유일성설명을Fraction계수곱으로각각검산. 판별식/근합곱/고등방법없음.',
'existenceUniqueness':'다항식전체항등식기준. A/B는가능k±12/±5/3중각기록이유효,모든행의k가유일하다는주장없음. C는앞항±3x와중간-12xy로상대항∓2y가정해져마지막k4유일. 고정분모비영,특정x/y=0의수치만으로제곱성판정하지않음.',
'choicesCorrect':'①A6/②A-6은필요한±12가아니며A도틀린행아님.③B-5/6은±5/3과다르고B기록옳음.④C4만요청역할충족.⑤C16이면가운데항±24xy로-12xy가불가능. 다섯보기모두검사.',
'figureConsistent':'도형자산없고실제학생/solutionPNG에서A/B/C행다항식과기록12,-5/3,2,특히1/9·25/4·-5/3분수/부호가JSON과일치함을확인. 원문표crop이나좌표오라클없음.',
'sameCoreConceptAndProcedure':'실제원문q05는여러다항식의완전제곱공식여부를판별한다. 현재도양끝제곱과가운데두배곱의관계가필수이며원문정답/개수를계산해승인하지않음.',
'distinctPresentation':'원문여러식의제곱가능성개수에서현재세계수기록검토+오류행진단+고칠계수역복원으로표조직/답역할/목표변화. 단순숫자교체가아님.',
'naturalKorean':'각다항식과그행의기록k를검사하고잘못된행하나/올바른k짝을묻는문맥명확. A/B에서다른k도가능함과기록옳음은양립하며C교정은유일. 단위없는문자식이고k를세행공통수로동시요구하지않음.',
'curriculumAppropriate':'2015 9수02-12의두항합차제곱/인수분해와실제M3semester1인수분해Unit범위. 저자전체학생방법은기학습분수사칙/부호·완전제곱공식·항대응만요구하고고등계수독립정리나판별식은필수아님.',
'allStudentSurfacesInScope':'7면각basis에완전제곱공식/표/분수/답역할/선수요구를기록. own코드의계수배열은추가검산일뿐학생필수도구아님.',
'unitFamilyFit':'캡처Unit인수분해는주제와맞지만세기록오류수정목표의정확한livefamily정의호환성은미확정. familyKeynull/false유지.',
'scoreAppropriate':'실제원문4점/현재4점확인. 두식공식확인(분수포함)과마지막항역추론으로표준4점편집제안타당. 원문중label은preparation관찰일뿐실측/동난도보장아님.'},
'surfaces':{
'stem':'완전제곱식이되게한계수기록의오류를찾는조건은2015 9수02-12(record3956,PDF34/30),실제M3semester1인수분해Unit및두항제곱공식학습후범위.',
'choices':'각행과유리수교정값을짝지어공식의2ab/제곱항을확인. 음수분수사칙과해당곱셈공식만으로충분하며판별식·근합곱불필요.',
'figuresAndTables':'native3행표는각식과기록k를정리한다. 실제네PNG중q05학생/해설에서분수/부호와대응을확인,고급통계/좌표/픽셀추론없음.',
'notation':'x²,xy,y²,상수k와고정분모9/4/3/2는다항식·유리수기초표기. 완전제곱식은전체항등식이지특정수치의제곱가능성이아님을구분.',
'answer':'유일오류C행과정수4를선택하는단일④. A/B의가능계수전체를단일화하지않고주어진기록검증과C교정만요구하므로추가고등방법없음.',
'studentSolution':'현재전문은(합/차)²공식,A/B전개확인,C의3x·2y결정및4y²복원/재전개.9수02-12와기학습분수/부호/간단한일차항계수확인으로완결,판별식이나고등계수관계없음.',
'prerequisites':'두항합차제곱공식/완전제곱식뜻/인수분해,분수·음수사칙,같은항의계수읽기를학습한뒤배정. 실제M3semester1Unit검증은선수완료가정/학교진도/2027M3·2022승인이아님.'}}}
for item in items:
 n=item['candidate']['questionNumber'];q=by[n];report={'status':'pending','studentDigest':item['studentDigest'],'candidateDigest':item['candidateDigest'],'assetDigest':item['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gachang-q04q05-full-review-20261020-r1','solveDigest':item['solveDigest'],'checks':{k:k!='unitFamilyFit'for k in q['checks']},'evidence':{**common,'questionNumber':n,'checkBasis':q['checks'],'currentUnit':item['candidate']['metadata']['assignment']['currentUnit'],'rawFileSHA256':sha(P/f'blind/solve/q{n:02}.json')},'curriculumSurfaces':{k:{'status':'passed','basis':v}for k,v in q['surfaces'].items()}};assert len(report['checks'])==12 and len(report['curriculumSurfaces'])==7;(P/f'verification/reports/q{n:02}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({f'q{n:02}':sha(P/f'verification/reports/q{n:02}.json')for n in [4,5]},indent=2))
