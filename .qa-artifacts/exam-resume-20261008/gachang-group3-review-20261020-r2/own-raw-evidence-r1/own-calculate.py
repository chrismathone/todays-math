from pathlib import Path
from fractions import Fraction as F
import json,hashlib,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent.parent;B=P/'blind';E=P/'own-raw-evidence-r1'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
student=read(B/'student-problems.json');manifest=read(B/'blind-manifest.json');inputs=[B/'SOLVE-BRIEF.md',B/'student-problems.json',B/'blind-manifest.json',B/'figures/q03-1.svg'];before={str(p.relative_to(P)):sha(p) for p in inputs}
checks=[]
def ck(name,ok,detail=None):checks.append({'name':name,'passed':bool(ok),'detail':detail})
ck('student-packet-sha',sha(B/'student-problems.json')==manifest['studentProblemsSha256']);ck('svg-sha',sha(inputs[-1])==manifest['figures'][0]['sha256']==student[0]['figures'][0]['sha256'])
labels=[e.attrib['data-label'] for e in ET.parse(inputs[-1]).iter() if 'data-label' in e.attrib]
ck('vector-labels-without-length-measurement',len(labels)==4 and sum('4a+1' in s for s in labels)==1 and sum('3a+2' in s for s in labels)==1 and sum(s.startswith('$b') for s in labels)==2,labels)
# Coefficients in ascending powers of a. No factory/answer/hidden model input.
def mul(a,b):
 out=[F(0)]*(len(a)+len(b)-1)
 for i,x in enumerate(a):
  for j,y in enumerate(b):out[i+j]+=x*y
 return out
def evaluate(poly,a):return sum(v*a**i for i,v in enumerate(poly))
q3=student[0]; q6=student[1];ck('printed-ID-order',[s['questionNumber'] for s in student]==[3,6])
# Parse numerical options from the student strings only.
def option_values(q):return [F(v.strip('$')) for v in q['choices']]
bvalues=option_values(q3);tvalues=option_values(q6);ck('q3-options',[str(x) for x in bvalues]==['2','3','4','5','6']);ck('q6-options',[str(x) for x in tvalues]==['-2','-1','0','1','2'])
target=[F(6),F(-17),F(12)];table3=[]
for n,b in enumerate(bvalues,1):
 poly=mul([1-b,4],[2-b,3]); at3=(4*3+1-b)*(3*3+2-b);valid=0<b<3*3+2
 ck(f'q3/choice{n}/direct-factor-vs-expansion',evaluate(poly,F(3))==at3)
 ck(f'q3/choice{n}/domain-at-independent-witness',valid)
 table3.append({'choice':n,'b':str(b),'ascendingAreaCoefficients':[str(v) for v in poly],'areaAtA3':str(at3),'targetAtA3':str(evaluate(target,F(3))),'matchesWholePolynomial':poly==target})
ck('q3-only-choice3', [r['choice'] for r in table3 if r['matchesWholePolynomial']]==[3]);ck('q3-constant-and-linear-coefficients',mul([-3,4],[-2,3])==target)
# General constant b: a coefficient 11-7b=-17 implies 7b=28 and b=4 uniquely.
b=F(28,7);ck('q3-all-real-b-uniqueness',b==4 and 7!=0 and b*b-3*b+2==6)
# Domain is symbolic: width-height=a-1>1; b<height therefore b<width.
ck('q3-dimension-proof-bound',4*F(2)+1-(3*F(2)+2)==1 and 4*F(2)-3==5 and 3*F(2)-2==4)
for a in [F(2001,1000),F(5,2),F(3),F(1000)]:ck('q3/positive-and-original-area/'+str(a),a>2 and 0<4<3*a+2 and 4*a-3>0 and 3*a-2>0 and (4*a-3)*(3*a-2)==evaluate(target,a))
# Square roots of exact squares are their nonnegative magnitudes; no float sqrt.
ck('q6-square-A',mul([-3,1],[-3,1])==[9,-6,1]);ck('q6-square-B',mul([2,1],[2,1])==[4,4,1]);table6=[]
for n,t in enumerate(tvalues,1):
 areaA=t*t-6*t+9;areaB=t*t+4*t+4;A=abs(t-3);BB=abs(t+2);inside=F(-2)<t<F(3)
 ck(f'q6/choice{n}/exact-root-squares',A*A==areaA and BB*BB==areaB)
 ck(f'q6/choice{n}/branch-on-domain',not inside or (A==3-t and BB==t+2 and A>0 and BB>0))
 table6.append({'choice':n,'t':str(t),'strictDomain':inside,'areaA_cm2':str(areaA),'areaB_cm2':str(areaB),'sideA_cm':str(A),'sideB_cm':str(BB),'difference_cm':str(A-BB),'matches':inside and A-BB==3})
ck('q6-only-choice2',[r['choice'] for r in table6 if r['matches']]==[2]);t=F(-2,2);ck('q6-linear-unique',-2!=0 and t==-1 and 3-t-(t+2)==3);ck('q6-positive-witness-and-equations',-2<t<3 and (3-t,t+2)==(4,1) and (t*t-6*t+9,t*t+4*t+4)==(16,1))
exposure={'sameRetainedHelper':True,'currentAuthorAnswerSolutionExposure':False,'currentAuthorCodePrivateMetadataSourceContextRead':False,'priorHistory':'원문9개성분검토, 이전Gachang/Gangbuk학생풀이·봉인후저자검토·공개코드/메타데이터감사이력이있다. Gachang이전원문첫페이지는앞선q04/q05 raw봉인후검토중보았으며그페이지다른문항(q03/q06포함가능)과손글씨의부수적노출이있었다. 현재새q03/q06변형저자답·해설은보지않았다. 원문/손글씨일치가답오라클이아니며전체코퍼스최초블라인드라고주장하지않는다.','inputsRead':[str(p.relative_to(P)) for p in inputs],'visualLimitation':'학생PNG미제공. SVGXML/학생텍스트의조건·라벨만읽었고래스터화/실제이미지view_image/브라우저검토없음. 픽셀이나SVG좌표·비율을숫자길이/답계산에사용하지않음.','operations':'Light Python Fraction/integer only; no root/author/private/source reads, no heavy tests/catalog/browser/CIM/N/DB/API/model/install/new worker/worktree/session.'}
(E/'own-exposure.json').write_text(json.dumps(exposure,ensure_ascii=False,indent=2),encoding='utf-8')
solution3='남은 직사각형의 가로와 세로는 각각 (4a+1-b) cm, (3a+2-b) cm이므로 넓이는 (4a+1-b)(3a+2-b) cm²이다. 다섯 보기를 차례로 넣어 전개하면 b=2일 때 12a²-3a, b=3일 때 12a²-10a+2, b=4일 때 12a²-17a+6, b=5일 때 12a²-24a+12, b=6일 때 12a²-31a+20이다. 따라서 주어진 넓이의 식과 같은 것은 b=4인 ③뿐이다. 일반적으로 전개한 식은 12a²+(11-7b)a+(b²-3b+2)이므로 a의 일차항이 같으려면 11-7b=-17, 즉 b=4여야 하고 상수항도 6으로 일치한다. a>2에서 남는 두 변 4a-3과 3a-2는 각각 5와 4보다 크며, 0<4<3a+2도 성립하므로 실제 직사각형이 존재한다. b는 폭을 cm로 나타낸 수이고 넓이의 단위는 cm²이다.'
solution6='A와 B의 넓이는 각각 (t-3)² cm², (t+2)² cm²이다. 정사각형의 한 변은 양수이고 -2<t<3이므로 A의 한 변은 3-t cm, B의 한 변은 t+2 cm이다. A가 3 cm 더 길다는 조건에서 3-t=(t+2)+3, 따라서 -2t=2이므로 t=-1이다. 이때 A와 B의 한 변은 각각 4 cm, 1 cm이고 넓이는 16 cm², 1 cm²이므로 모든 조건을 만족한다. 일차항의 계수가 -2로 0이 아니어서 해는 유일하다. 보기 -2는 주어진 열린 범위 밖이고 B의 변도 0이다. 나머지 -1, 0, 1, 2에서 A의 변에서 B의 변을 뺀 값은 각각 3, 1, -1, -3 cm이므로 조건에 맞는 보기는 ②뿐이다.'
for q,answer,solution,data in [(q3,'③',solution3,table3),(q6,'②',solution6,table6)]:
 n=q['questionNumber'];ev={'questionId':q['twinExternalId'],'ownCalculation':'../../own-raw-evidence-r1/own-calculation-receipt.json','allFiveOptions':data,'exposure':exposure,'studentMethod':'2015M3 다항식곱셈/인수분해·제곱근성질과 앞학년일차방정식/직사각형넓이. q03은각보기직접전개만으로선택가능하므로고등일반항등식계수정리를필수방법으로쓰지않음. q06은주어진t범위에서제곱의제곱근부호를정한후일차식만해결. 근의공식/판별식/근합곱/고급부등식불필요.','visualReviewPerformed':False,'formalGradeApproval':False,'literalNotationConcern':'실제학생JSON값에서단위명령의연속역슬래시길이는모두1임을확인했다. 표시상의JSON이스케이프를중복명령오류로간주하지않는다. 학생입력은변경하지않음. PNG미제공이므로실제렌더/시각검토는미수행이며cm/cm²의수학적역할은확인했다.','existenceUniqueness':'q03 b=4에서모든a>2에두변양수·폭범위·전체넓이식일치,보기유일및일차항7b=28으로상수유일. q06 t=-1의양변길이4/1과면적16/1을확인,부호분기는열린범위로고정되고-2t=2의계수비영.'}
 (B/f'solve/q{n:02}.json').write_text(json.dumps({'studentDigest':q['studentDigest'],'solverId':'independent-helper-gachang-group3-q03-q06-20261020-r1','answer':answer,'solution':solution,'evidence':ev,'status':'solved'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
after={str(p.relative_to(P)):sha(p) for p in inputs};ck('all-inputs-unchanged',before==after);assert all(x['passed'] for x in checks)
receipt={'method':'Independent exact Fraction coefficient convolution and square magnitudes; no producer answers/parameters/pixels. Numeric samples supplement symbolic domain arguments, not floating oracle.','checks':checks,'counts':{'assertions':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks)},'q03':table3,'q06':table6,'before':before,'after':after,'rawSHA256':{f'q{q["questionNumber"]:02}':sha(B/f'solve/q{q["questionNumber"]:02}.json') for q in student},'noAutomaticGradeContentFamilyRightsNativeReleaseApproval':True}
(E/'own-calculation-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'counts':receipt['counts'],'rawSHA256':receipt['rawSHA256']}))
