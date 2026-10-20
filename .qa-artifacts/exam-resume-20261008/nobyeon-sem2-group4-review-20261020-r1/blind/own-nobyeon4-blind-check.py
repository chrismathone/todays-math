from pathlib import Path
from fractions import Fraction as F
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group4-review-20261020-r1/blind');h=lambda b:hashlib.sha256(b).hexdigest();load=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));items=load(p/'student-problems.json');manifest=load(p/'blind-manifest.json');assert h((p/'student-problems.json').read_bytes())==manifest['studentProblemsSha256']
f=p/'own-nobyeon4-blind-utf8.txt';f.write_text('경사로·계산기록·편차의 독립 풀이\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='경사로·계산기록·편차의 독립 풀이\n'
exposure={'currentAuthorAnswerSolutionPrivatePackageExposed':False,'priorSourceAndRelatedExposure':'이전노변1학기문항,노변2학기q09~14학생/저자/질문전용원문및q15~17소유범위검토에서원본페이지와관련삼각비·대표값·편차·분산에노출되었다. 이번currentq18~20저자답/해설/비공개패키지나원문질문은열지않았다. 원본전체코퍼스의완전미노출을주장하지않는다.','studentOnlyInputs':'허용된학생JSON/brief/blindmanifest/SVG및student-preview q18/q19/q20 PNG만읽었다. 세PNG를실제view했다.','pixelsOrCoordinatesAsNumericalOracle':False}
# q18 exact rational arithmetic on PRINTED table values, not an unprovided true trig oracle.
s=F(3420,10000);height=F(684,10);length=height/s;assert length==200 and 0<s<1 and length>height>0
roundedTenths=(length*10+F(1,2)).numerator//(length*10+F(1,2)).denominator;assert roundedTenths==2000
roundingCell=(F(3999,20),F(4001,20));assert roundingCell[0]<=length<roundingCell[1]
# Optional check: if 0.3420 were nearest four-decimal sine, its induced length interval also rounds to 200.0.
low=height/F(34205,100000);high=height/F(34195,100000);assert roundingCell[0]<low<high<roundingCell[1]
# q19 exact Q(sqrt2) ring, each coefficient a rational. No generic trig identity.
add=lambda x,y:(x[0]+y[0],x[1]+y[1])
mul=lambda x,y:(x[0]*y[0]+2*x[1]*y[1],x[0]*y[1]+x[1]*y[0])
A=2*F(1,2)*F(1,2);specialProduct=F(1,3)*F(1,2)*3 # (sqrt3/3)*(sqrt3/2)
B=(specialProduct,F(1,2));E=(F(-1),F(1));assert A==F(1,2) and specialProduct==F(1,2) and B==(F(1,2),F(1,2))
assert mul(B,E)==(A,F(0));assert mul((F(1),F(1)),(F(-1),F(1)))==(F(1),F(0))
recordTruth={'ㄱ':A==F(1,2),'ㄴ':B==(F(1),F(1)),'ㄷ':F(1)==F(1)};assert list(recordTruth.values())==[True,False,True]
# q20 infer mean independently from every given numerical deviation.
means=[42-2,36-(-4),39-(-1)];assert means==[40,40,40];M=40
sigmaSquared=F(6);unknownSum=-(2-4-1);unknownSquareSum=5*sigmaSquared-(2**2+(-4)**2+(-1)**2);product=F(unknownSum**2-unknownSquareSum,2)
assert (unknownSum,unknownSquareSum,product)==(3,9,0)
# uv=0 plus u+v=3 gives only the two real branches, not a finite integer guess.
branches=[(0,3),(3,0)];admissible=[(M+u,M+v) for u,v in branches if M+u<M+v];assert admissible==[(40,43)]
values=[42,36,39,40,43];dev=[x-M for x in values];assert F(sum(values),5)==40 and sum(dev)==0 and F(sum(d*d for d in dev),5)==6
answers={18:'200.0 m',19:'ㄴ, B=(√2+1)/2, E=√2−1',20:'(1) M=40; (2) a=40, b=43'}
solutions={18:'직각삼각형 PQR에서 ∠QPR=20°이고 PQ는 빗변, QR는 그 각의 맞은편 변이다. 사인의 정의에 따라 sin20°=QR/PQ이다. 표의 근삿값0.3420을 사용하면 PQ≈68.4÷0.3420=200이다. 따라서 소수 첫째 자리까지 나타낸 경사로의 길이는200.0 m이다. 표의 값을 사용한 근삿값이지 실제 삼각비를 정확히0.3420이라고 둔 등식은 아니다. 주어진 높이가 양수이고0<sin20°<1이므로 빗변은 높이보다 크며 양의 길이가 하나로 정해진다.',19:'sin30°=1/2, cos60°=1/2이므로 A=2×(1/2)×(1/2)=1/2이다. 또 cos45°=√2/2, tan30°=√3/3, cos30°=√3/2를 각각 대입하면 B=√2/2+(√3/3)×(√3/2)=√2/2+1/2=(√2+1)/2이다. tan45°=1이므로 ㄱ과ㄷ은옳고 ㄴ만잘못되었다. 따라서 ㄴ의바른값은 B=(√2+1)/2이다. B>0이므로 나눗셈이가능하고 E=A/B=(1/2)/((√2+1)/2)=1/(√2+1)이다. 분모와분자에√2−1을곱하면 E=(√2−1)/((√2+1)(√2−1))=√2−1이다. 답은 ㄴ, B=(√2+1)/2, E=√2−1 순서이다. 특수각의값을각각대입했으며삼각비사이의일반항등식을쓰지않았다.',20:'편차는 자료에서 평균을 뺀 값이므로42−M=2에서 M=40이다. 36−40=−4,39−40=−1도표와일치한다. u=a−40,v=b−40이라하자. 편차의합은0이므로2−4−1+u+v=0에서u+v=3이다. 표준편차가√6이므로분산은6이고, (2²+(−4)²+(−1)²+u²+v²)/5=6이다. 따라서u²+v²=9이다. (u+v)²=u²+2uv+v²에대입하면9=9+2uv이므로uv=0이다. u+v=3을함께만족하는두경우는(u,v)=(0,3),(3,0)이다. a<b이므로u<v여야하여(u,v)=(0,3)만가능하다. 따라서(1)M=40,(2)a=40,b=43이다. 실제다섯자료의합은200이어서평균40, 편차제곱합은30이어서분산6·표준편차√6이므로모든조건을만족한다.'}
calcs={18:{'table':{'sin20':'0.3420','cos20':'0.9397','tan20':'0.3640'},'requestedRole':'ramp hypotenuse PQ, not horizontal PR or height QR','height':'342/5 m','usedRatio':'171/500','exactDivisionOfPrintedApproximation':str(length),'answerToOneDecimal':'200.0 m','roundingIntervalFor200point0':[str(x) for x in roundingCell],'optionalFourDecimalInputRoundingLengthBounds':[str(low),str(high)],'domainExistenceUniqueness':'20°는예각,주어진높이68.4>0, 실제직각삼각형에서맞은편/빗변비는양수이고1미만. 주어진양의높이와각으로빗변유일. 표근삿값으로나누는수0.3420≠0, 출력은표사용근사/반올림값. 그림좌표를재어길이계산하지않음.'},19:{'exactSpecialAngles':{'sin30':'1/2','cos60':'1/2','cos45':'√2/2','tan30':'√3/3','cos30':'√3/2','tan45':'1'},'A':str(A),'tan30TimesCos30':str(specialProduct),'BcoefficientsQsqrt2':[str(x) for x in B],'EcoefficientsQsqrt2':[str(x) for x in E],'recordsTruth':recordTruth,'wrongRecord':'ㄴ','orderedAnswerRoles':['wrong record symbol ㄴ','corrected B=(√2+1)/2','E=√2−1 with rational denominator'],'nonzeroDenominator':'B=(√2+1)/2>0; √2+1>0; rationalization denominator2−1=1≠0','existenceUniqueness':'모든특수각값이정의되고주어진산술식으로A,B,E가각각유일. 잘못된기록은3개중ㄴ하나. 무차원수라길이단위나%를붙이지않음.','ringCheck':'B*E=A exact in Q(√2); (√2+1)(√2−1)=1. No decimal radical approximation.'},20:{'meansFromThreeKnownDeviations':means,'unknownDeviationSum':str(unknownSum),'unknownDeviationSquareSum':str(unknownSquareSum),'unknownDeviationProduct':str(product),'allRealBranchesOfProductZero':branches,'orderedAdmissiblePairs':admissible,'data':values,'deviations':dev,'sum':sum(values),'mean':str(F(sum(values),5)),'deviationSum':sum(dev),'deviationSquareSum':sum(d*d for d in dev),'variance':str(F(sum(d*d for d in dev),5)),'standardDeviation':'√6','domainExistenceUniqueness':'a,b의자연수조건은없으므로실수범위에서uv=0의모든두분기를검토했다. a<b로순서를유일하게선택하고값40,43은양수이지만양수조건을가정해해를누락하지않았다. 분모5>0, 표준편차는양의제곱근. 물리단위는미제공.'}}
rows=[]
for it in items:
 q=it['questionNumber'];assert it['choices']==[] and it['questionType']=='서술형'
 digest=h(json.dumps({k:v for k,v in it.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode());assert digest==it['studentDigest']
 preview=p.parent/f'student-preview/q{q}.png';previewSha=h(preview.read_bytes());figs=[]
 for fig in it['figures']:
  actual=h((p/fig['svgPath']).read_bytes());assert actual==fig['sha256'];figs.append(actual)
 surfaces={
 'stem':{'status':'student-method-proposed-in-scope','basis':('실제직각삼각형의사인정의와제공근삿값·나눗셈·반올림으로완결한다.' if q==18 else '세특수각의삼각비값을각각대입해산술오류기록을교정하고근호분모를유리화한다. 일반삼각비항등식은사용하지않는다.' if q==19 else '평균·편차·분산/표준편차정의와이전곱셈공식/인수분해를써두실수자료를찾는다.')},
 'choices':{'status':'not-applicable-written','basis':'실제choices=[]인서술형이다. '+('기록ㄱ/ㄴ/ㄷ의세주장은각각검산했다.' if q==19 else '객관식5보기를가정하지않고요청된서술답역할을유지했다.')},
 'figuresAndTables':{'status':'student-png-actually-viewed','basis':('학생PNG의경사로·20°·수선/직각표시와삼각비세근삿값표를실제확인했다.' if q==18 else '학생PNG의A/B/E식·세기록과요청순서를실제확인하고표의세값을모두검산했다.' if q==19 else '학생PNG의다섯자료/편차쌍과두문항(1)(2)을실제확인했다. 알려진3개편차에서동일M을검산했다.')+' 픽셀/SVG좌표로답을얻지않았다.'},
 'notation':{'status':'proposed-in-scope','basis':('sin/cos/tan20°표와m·소수첫째자리의구별은중학교삼각비/근사표현범위이다.' if q==18 else '특수각삼각비·분수·근호및A/B/E,기록ㄱㄴㄷ는제시된역할을유지한다. B의바른값과E를혼동하지않는다.' if q==19 else '편차a−M/b−M,표준편차√6,자료순서a<b와(1)(2)역할을구별한다. 자료의실제단위는미제공이다.')},
 'answer':{'status':'independently-solved','basis':'문자열답 '+answers[q]+'에요청순서와단위를그대로기록했다. 정확분수/근호계산으로도출했고존재·유일성및분모조건을확인했다.'},
 'studentSolution':{'status':'own-method-proposed-author-unseen','basis':('9수04-17/18의실제직각삼각비정의와제공표사용만필요하다.' if q==18 else '특수각30/45/60의정확값대입·근호사칙계산·분모유리화만필요하다. 삼각비사이일반관계/고등삼각함수도구는없다.' if q==19 else '9수05-06/07의평균/편차/산포와이전중3다항식전개·인수분해의곱0분기만필요하다.')+' 저자전체해설은미노출이므로후속정식검토가필요하다.'},
 'prerequisites':{'status':'2015-M3-after-prerequisites-proposal','basis':('2015중3삼각비정의/활용·특수각값및이전실수/근호계산·근삿값반올림을학습한뒤배정한다.' if q!=20 else '2015중3대표값/분산/표준편차와이전일차식·다항식곱셈공식/인수분해·실수범위곱0성질을학습한뒤배정한다.')+' 이번학생전용단계의방법제안이며정식7면/특정학교진도/2022배치승인은아니다.'}}
 raw={'studentDigest':it['studentDigest'],'solverId':'independent-helper-nobyeon-sem2-group4-blind-20261020','answer':answers[q],'solution':solutions[q],'evidence':{'exposure':exposure,'ownExactCalculations':calcs[q],'studentDigestVerified':True,'studentPreviewPngSha256':previewSha,'studentSvgSha256s':figs,'gradeSurfaceProposals':surfaces,'limits':['정식학년/내용/출처/권리/family/native/release승인아님','현재저자답·해설미노출;수학solved와후속전체해설학년검토구분','기존원문소유범위r2/r3작업과raw는변경하지않음']},'status':'solved'}
 (p/'solve').mkdir(exist_ok=True)
 with (p/f'solve/q{q}.json').open('x',encoding='utf-8') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'rawSha256':h((p/f'solve/q{q}.json').read_bytes()),'answer':answers[q],'status':'solved','studentDigest':digest})
for fig in manifest['figures']:assert h((p/fig['path']).read_bytes())==fig['sha256']
with (p/'own-nobyeon4-blind-check-receipt.json').open('x',encoding='utf-8') as f:json.dump({'studentFileSha256':h((p/'student-problems.json').read_bytes()),'blindManifestSha256':h((p/'blind-manifest.json').read_bytes()),'ownScriptSha256':h(Path(__file__).read_bytes()),'UTF8WriteReadProbe':'passed','viewedStudentPngs':[18,19,20],'results':rows,'calculations':calcs,'exposure':exposure,'noCurrentAuthorExposure':True,'noPixelOrHigherGradeAnswerOracle':True},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))
