from pathlib import Path
from fractions import Fraction as F
import json,hashlib
P=Path(__file__).resolve().parent.parent;B=P/'blind';E=P/'own-raw-evidence-r1';E.mkdir(exist_ok=True);read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
probe=E/'own-utf8-probe.txt';probe.write_text('독립 풀이 UTF-8 쓰기·읽기 확인: 제곱·음수·넓이\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='독립 풀이 UTF-8 쓰기·읽기 확인: 제곱·음수·넓이\n'
students=read(B/'student-problems.json');manifest=read(B/'blind-manifest.json');assert sha(B/'student-problems.json')==manifest['studentProblemsSha256'];assert sha(B/'figures/q09-1.svg')==manifest['figures'][0]['sha256']
checks=[]
def ck(name,pass_):checks.append({'name':name,'pass':bool(pass_)});assert pass_,name
# Own exact algebra: (a+1)^2+a^2=221 =>2(a+11)(a-10)=0.
for a in map(F,[-11,-3,0,1,10,11]):ck('q09-factor-identity/'+str(a),a*a+(a+1)**2-221==2*(a+11)*(a-10))
roots=[F(-11),F(10)];positive=[a for a in roots if a>0 and a+1>0];ck('q09-unique-positive-pair',positive==[10]);ck('q09-existence-perimeter-area',4*11-4*10==4 and 100+121==221)
q9choices=[]
for value in [17,19,21,23,25]:
 # since b-a=1, area difference t implies a=(t-1)/2,b=(t+1)/2.
 a=F(value-1,2);b=F(value+1,2);valid=a>0 and b>0 and b-a==1 and a*a+b*b==221;q9choices.append({'areaDifferenceCm2':value,'impliedSidesCm':[str(a),str(b)],'areaSumCm2':str(a*a+b*b),'valid':valid})
ck('q09-all-five-unique', [r['areaDifferenceCm2'] for r in q9choices if r['valid']]==[21])
# A=(3x-2)(x-4), so roots 2/3,4; exactly one integer.
for x in map(F,[-2,0,F(2,3),1,4,5]):ck('q10-A-factor-identity/'+str(x),3*x*x-14*x+8==(3*x-2)*(x-4))
ck('q10-A-integer-root-unique',F(2,3).denominator!=1 and 3*4**2-14*4+8==0)
# x=4 -> B=12+4k-k²=-(k-6)(k+2).
for k in [-6,-4,-2,2,6,0,1]:ck('q10-k-factor-identity/'+str(k),16+4*k-(k*k+4)==-(k-6)*(k+2))
q10choices=[{'k':k,'negative':k<0,'B_at_unique_integer_x4':16+4*k-(k*k+4),'valid':k<0 and 16+4*k-(k*k+4)==0} for k in [-6,-4,-2,2,6]];ck('q10-all-five-unique',[r['k'] for r in q10choices if r['valid']]==[-2]);ck('q10-existence-both-equations',3*16-56+8==0 and 16-8-(4+4)==0)
exposure={'currentAuthorAnswersOrSolutionsExposed':False,'declarationBeforeStudentRead':True,'priorExposure':'以前に原本9コンポーネント、Gachang原本最初のページ1〜6（以前のraw封印後）、関連手動問題・公開/内部エンジン・メタデータ/code監査を閲覧。今回q09/q10の現行author答/解説・source/package/privateは未閲覧。全コーパス未見とは主張しない。','group4PrivateStillUnexposed':True,'noOriginalAnswerOracle':True}
solutions={9:'정사각형 A의 한 변을 a cm라 하자. 둘레 차가 4 cm이므로 B의 한 변은 (a+1) cm이다. 따라서 a²+(a+1)²=221, 즉 2a²+2a-220=0이다. 2(a+11)(a-10)=0이므로 a=-11 또는 a=10이다. 길이는 양수이므로 a=10만 가능하고 B의 한 변은 11 cm이다. 두 넓이의 차는 11²-10²=21 cm²이므로 ③이다. 실제 둘레 차는 44-40=4 cm, 넓이의 합은 121+100=221 cm²이다. 보기 17,19,21,23,25 cm²를 차로 가정하면 변의 쌍은 각각 (8,9),(9,10),(10,11),(11,12),(12,13)이고, 넓이의 합은 145,181,221,265,313 cm²이다. 따라서 ③만 조건을 만족한다.',10:'A를 인수분해하면 (3x-2)(x-4)=0이므로 x=2/3 또는 x=4이다. 같은 x가 정수이므로 x=4만 가능하다. 이를 B에 대입하면 16+4k-(k²+4)=0, 즉 k²-4k-12=(k-6)(k+2)=0이다. 따라서 k=6 또는 k=-2이고, 음수 조건에 의해 k=-2만 가능하므로 ③이다. x=4,k=-2를 원래 두 식에 넣으면 각각 48-56+8=0, 16-8-8=0으로 실제 해가 존재한다. 보기 k=-6,-4,-2,2,6에 대한 B의 좌변은 각각 -48,-20,0,16,0이다. ⑤의 6도 식은 만족하지만 음수가 아니므로 제외되며 ③만 남는다.'}
receipt={'solverId':'independent-retained-helper-gachang-group5-r2','exposure':exposure,'method':'Exact Fraction/integer polynomial identities and factored zero-product branches only; no Vieta/discriminant/generalquadraticsystem method.','q09':{'choices':q9choices,'allAlgebraicSidesA':['-11','10'],'uniquePositiveSidesCm':[10,11],'areaDifferenceCm2':21},'q10':{'Aroots':['2/3','4'],'uniqueIntegerX':4,'kRoots':[6,-2],'uniqueNegativeK':-2,'choices':q10choices},'checks':checks,'counts':{'total':len(checks),'passed':sum(r['pass'] for r in checks),'failed':0},'visual':{'actualPNGsViewed':['blind/student-preview/q09.png','blind/student-preview/q10.png'],'svgLabels':'A,B squares read; no coordinates/pixels used for lengths','pathDiagnostics':'Sibling preview lookup q9.png and q09.png failed; authorized blind-only listing located actual blind/student-preview. No author/source reads.','noPhysicalNativePrintApproval':True},'gradeLimits':'2015M3 after polynomial factorization/quadratic solving and <=M2 area/perimeter/signed rational prerequisites. No whole-template/student learning/2022/rights/family/native/release approval.','inputs':{str(p.relative_to(P)):sha(p) for p in [B/'SOLVE-BRIEF.md',B/'student-problems.json',B/'blind-manifest.json',B/'figures/q09-1.svg',B/'student-preview/q09.png',B/'student-preview/q10.png']}}
(E/'own-calculation-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');(E/'own-exposure.json').write_text(json.dumps(exposure,ensure_ascii=False,indent=2),encoding='utf-8');(B/'solve').mkdir(exist_ok=True)
for item in students:
 n=item['questionNumber'];out={'studentDigest':item['studentDigest'],'solverId':receipt['solverId'],'answer':'③','solution':solutions[n],'evidence':{'ownCalculationReceipt':'../../own-raw-evidence-r1/own-calculation-receipt.json','ownCalculationSHA256':sha(E/'own-calculation-receipt.json'),'exposure':exposure,'exactChecks':receipt[f'q{n:02}'],'methodGrade':'인수분해와 곱이 0인 경우, 정수·음수 조건을 차례로 사용. 일반 이차연립방정식 풀이·판별식·근과 계수의 관계는 사용하지 않음.','visualLimitation':'학생 PNG만 실제 확인. 그림 좌표·픽셀은 수치 근거로 사용하지 않음. 네이티브/인쇄 승인 아님.'},'status':'solved'};assert isinstance(out['solution'],str) and out['answer'] in '①②③④⑤' and len(out['answer'])==1;(B/'solve'/f'q{n:02}.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
summary={'raws':{f'q{n:02}':{'sha256':sha(B/'solve'/f'q{n:02}.json'),'answer':'③','status':'solved'} for n in [9,10]},'calculationSHA256':sha(E/'own-calculation-receipt.json'),'checks':receipt['counts']};(E/'own-seal-receipt.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))

