import json, hashlib, math
from fractions import Fraction as F
from pathlib import Path
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q08q09q10-clean-blind-20261019-r1')
p=json.loads((b/'student-problems.json').read_text(encoding='utf-8'))
assert hashlib.sha256((b/'student-problems.json').read_bytes()).hexdigest()==json.loads((b/'blind-manifest.json').read_text(encoding='utf-8'))['studentProblemsSha256']
# Three sign intervals exhaust real x except the zero-length endpoints.
cases=[]
for interval,a,c in [('x < -2',1,-5),('-2 < x < 3/2',3,-1),('x > 3/2',-1,5)]:
    r=F(2-c,a)
    valid= r < -2 if a==1 else (-2<r<F(3,2) if a==3 else r>F(3,2))
    cases.append(dict(interval=interval,difference=f'{a}*x+({c})',candidate=str(r),valid=valid,A=str(abs(r+2)),B=str(abs(2*r-3))))
roots=[F(t['candidate']) for t in cases if t['valid']]
assert roots==[F(1),F(3)] and sum(roots)==4
q8=dict(cases=cases,excluded=[dict(x=-2,A=0,B=7),dict(x='3/2',A='7/2',B=0)],roots=[str(r) for r in roots],sum=str(sum(roots)),choices=[dict(mark=chr(0x2460+i),value=v,valid=(v==sum(roots))) for i,v in enumerate([1,2,3,4,6])])
vals=[math.sqrt(18)/math.sqrt(2)*math.sqrt(4),math.sqrt(12)/math.sqrt(3)*math.sqrt(25),math.sqrt(2/3)*math.sqrt(3/8)*math.sqrt(16),-math.sqrt(45)/math.sqrt(5)*(-math.sqrt(16)/3)]
assert all(math.isclose(a,c) for a,c in zip(vals,[6,10,2,4]))
q9=dict(ABCD=vals,E='m/2',ranges=['0 < m/2 < 2: range=10-m/2 < 10','2 <= m/2 <= 10: range=8','m/2 > 10: range=m/2-2; equals 12 iff m=28'],choices=[dict(mark=chr(0x2460+i),m=m,E=m/2,range=max(6,10,2,4,m/2)-min(6,10,2,4,m/2),valid=(max(6,10,2,4,m/2)-min(6,10,2,4,m/2)==12)) for i,m in enumerate([20,24,26,28,32])])
q10=dict(expansion='6x^2+(2k-15)xy-5ky^2',sum='-3k-15',unique_k=8,choices=[dict(mark=chr(0x2460+i),k=k,xy=2*k-15,y2=-5*k,sum=-3*k-15,valid=(-3*k-15==-39)) for i,k in enumerate([4,6,8,10,12])])
solutions=[
'넓이를 인수분해하면 A는 (x+2)², B는 (2x-3)²이다. 따라서 양의 변의 길이는 각각 |x+2| cm, |2x-3| cm이고 x=-2, 3/2는 제외한다. A의 변에서 B의 변을 뺀 값이 2이므로 부호에 따라 나눈다. x<-2이면 x-5=2에서 x=7이지만 구간 밖이다. -2<x<3/2이면 3x-1=2에서 x=1이며 변은 A=3 cm, B=1 cm로 적합하다. x>3/2이면 5-x=2에서 x=3이며 변은 A=5 cm, B=3 cm로 적합하다. 모든 구간을 조사했고 각 일차방정식의 해는 하나뿐이므로 가능한 x는 정확히 1, 3이다. 합은 4로 ④이다. 보기 ① 1, ② 2, ③ 3, ⑤ 6은 이 합과 다르다. 넓이 단위는 cm², 변과 차의 단위는 cm이며 x의 값의 합에 길이 단위를 붙이지 않는다.',
'곱셈과 나눗셈은 왼쪽부터 계산한다. A=3×2=6, B=2×5=10, C=√(1/4)×4=2, D=(-3)×(-4/3)=4, E=m/2이다. 모든 근호 안은 양수이고 나누는 수는 0이 아니므로 정의된다. m>0이므로 t=m/2>0이다. 0<t<2이면 차는 10-t로 8보다 크고 10보다 작아 12가 될 수 없다. 2≤t≤10이면 차는 10-2=8이다. t>10이면 차는 t-2이므로 t-2=12에서 t=14, m=28이다. 이 값은 해당 구간에 있고 차가 12여서 존재하며, 각 구간을 모두 조사했으므로 유일하다. 보기 m=20,24,26,28,32의 차는 각각 8,10,11,12,14이므로 ④만 맞다. 단위는 없는 수의 계산이고 D는 음수 두 개의 곱이므로 양수이다.',
'분배법칙으로 (3x+ky)(2x-5y)=6x²-15xy+2kxy-5ky²=6x²+(2k-15)xy-5ky²이다. 두 계수의 합은 (2k-15)+(-5k)=-3k-15이므로 -3k-15=-39, -3k=-24에서 k=8이다. k=8이면 xy의 계수는 1, y²의 계수는 -40이고 합은 -39로 조건을 만족한다. 미지수의 계수 -3이 0이 아니므로 해는 유일하다. 보기 k=4,6,8,10,12의 계수 합은 각각 -27,-33,-39,-45,-51이므로 ③만 맞다. 다항식은 모든 실수 x,y에서 정의되고 나눗셈이나 근호의 제한은 없으며 k에 별도 부호 조건이나 단위는 없다.'
]
evidences=[q8,q9,q10]
(b/'solve').mkdir(exist_ok=True)
for problem,ans,sol,ev in zip(p,['④','④','③'],solutions,evidences):
    out=dict(studentDigest=problem['studentDigest'],solverId='fresh-independent-codex-20261019-r1',answer=ans,solution=sol,evidence=dict(calculations=ev,method='중3 2015: 인수분해·제곱근의 성질·일차방정식·분배법칙',imageCheck='제공된 인쇄 이미지의 조건과 다섯 보기를 직접 확인. 픽셀 측정은 사용하지 않음.',blind='지정된 여섯 파일 외의 문제·정답·출처·기존 풀이를 읽지 않음'),status='solved')
    assert isinstance(out['solution'],str) and out['answer'] in '①②③④⑤' and len(out['answer'])==1
    target=b/'solve'/f"q{problem['questionNumber']:02}.json"
    with target.open('x',encoding='utf-8',newline='\n') as f: f.write(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
with (b/'independent-calculations-20261019.json').open('x',encoding='utf-8',newline='\n') as f: f.write(json.dumps(dict(q08=q8,q09=q9,q10=q10),ensure_ascii=False,indent=2)+'\n')
for n in ['q08','q09','q10']:
    file=b/'solve'/f'{n}.json'
    obj=json.loads(file.read_text(encoding='utf-8'))
    assert obj['status']=='solved' and len(obj['answer'])==1
    print(n,hashlib.sha256(file.read_bytes()).hexdigest())
