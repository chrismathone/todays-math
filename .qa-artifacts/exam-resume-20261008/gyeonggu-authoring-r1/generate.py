"""Owned offline author build. Reads only the frozen question packet/snapshots.
No DB, original answer files, model, HTTP, or production mutations.
"""
from pathlib import Path
import json, math, hashlib
from drafts import DATA

ROOT=Path(__file__).resolve().parent
if (ROOT/'author-freeze.json').exists(): raise RuntimeError('Frozen author packet: create a new revision; do not overwrite.')
REPO=ROOT.parents[2]
AUTHOR='orca-codex-exam-twin-author-geometry-20261008'
def sha(b): return hashlib.sha256(b).hexdigest()
def write(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
S=json.loads((ROOT/'evidence/source-provisional/questions.json').read_text(encoding='utf-8'))
B=json.loads((ROOT/'evidence/reference-snapshots/bank-read-fresh-r2-20261008.json').read_text(encoding='utf-8'))
R=json.loads((ROOT/'evidence/reference-snapshots/registry-read-20261008.json').read_text(encoding='utf-8'))
C=json.loads((ROOT/'evidence/reference-snapshots/curriculum-evidence.json').read_text(encoding='utf-8'))
UNITS={u['section']:u for u in B['units']}
CODES={c['code']:c for c in C['achievement_standards']}
FIGS={}
COORDS={}
def spec(n, pts, segments, scale=20, circles=None, angles=None, regions=None, arcs=None, labels=None, width=70, suffix='1'):
    # Input coordinates are mathematical (y up); engine coordinates are y down.
    obj=dict(version=2,theme='exam-thin',style=dict(font_size=18,angle_font_size=17,angle_radius=16,angle_label_distance=26,padding=22,show_points=False),
        points={k:[float(p[0]*scale),float(-p[1]*scale)] for k,p in pts.items()},
        segments={k:([v[0],v[1]] if isinstance(v,(tuple,list)) else v) for k,v in segments.items()},
        labels={k:k for k in pts if not k.startswith('_')})
    if labels is not None: obj['labels']=labels
    if circles: obj['circles']={k:dict(v,radius=v['radius']*scale) for k,v in circles.items()}
    if angles: obj['angles']={'angle_'+k:v for k,v in angles.items()}
    if regions: obj['regions']=regions
    if arcs: obj['arcs']=arcs
    if n not in COORDS: COORDS[n]={}
    COORDS[n][suffix]=dict(points={k:list(p) for k,p in pts.items()},scale=scale)
    FIGS.setdefault(n,[]).append((suffix,obj,width))
def a(v,p,q,label=None,right=False,arcs=None,radius=None,distance=None):
    o=dict(vertex=v,points=[p,q])
    if right:o['right']=True;o['radius']=8
    if label:o['label']=label
    if arcs:o['arcs']=arcs
    if radius:o['radius']=radius
    if distance:o['label_distance']=distance
    return o
def edge(x,y,**kw):return dict(points=[x,y],**kw)
def poly(*names):return {'boundary':[{'seg':[names[i],names[(i+1)%len(names)]]} for i in range(len(names))],'fill':'#eeeeee'}
rt=math.sqrt
spec(1,{'R':(0,0),'P':(12,0),'Q':(0,5)},{'RP':('R','P'),'RQ':('R','Q'),'PQ':('P','Q')},12,angles={'R':a('R','P','Q',right=True)})
spec(3,{'R':(0,0),'P':(4,0),'Q':(0,3)},{'RP':('R','P'),'RQ':('R','Q'),'PQ':('P','Q')},35,angles={'R':a('R','P','Q',right=True)})
spec(4,{'Q':(0,0),'R':(13,0),'P':(25/13,60/13),'M':(25/13,0)},
    {'QP':('Q','P'),'PR':('P','R'),'QR':('Q','R'),'PM':edge('P','M',dash='4 3')},14,
    angles={'M':a('M','P','R',right=True),'t':a('P','Q','M',r'$\theta$',radius=20,distance=32),'p':a('P','M','R',r'$\phi$',radius=20,distance=32)})
ang=math.radians(40)
spec(6,{'O':(0,0),'A':(1,0),'B':(0,1),'P':(math.cos(ang),math.sin(ang)),'H':(math.cos(ang),0),'D':(1,math.tan(ang))},
    {'OA':('O','A'),'OB':('O','B'),'OD':('O','D'),'PH':edge('P','H',dash='4 3'),'AD':('A','D')},130,
    circles={'c':dict(center='O',radius=1,draw=False)},arcs={'quarter':dict(circle='c',**{'from':'A','to':'B','dir':'ccw'})},
    angles={'H':a('H','P','O',right=True),'A':a('A','O','D',right=True),'t':a('O','A','P',r'$\theta$')})
spec(8,{'H':(0,0),'A':(0,9),'B':(-9,0),'C':(9*math.tan(math.radians(35)),0)},
    {'AB':('A','B'),'AC':('A','C'),'BC':('B','C'),'AH':edge('A','H',dash='4 3')},11,
    angles={'H':a('H','A','C',right=True),'B':a('B','A','H',r'$45^\circ$'),'A':a('A','H','C',r'$35^\circ$')})
spec(9,{'C':(0,0),'A':(0,15),'B':(-20,0),'D':(-7.5,0),'E':(-12,6)},
    {'AB':('A','B'),'BC':('B','C'),'CA':('C','A'),'AD':('A','D'),'DE':edge('D','E',dash='4 3')},9,
    angles={'C':a('C','A','B',right=True),'E':a('E','A','D',right=True),'a1':a('A','B','D',arcs=1,radius=35),'a2':a('A','D','C',arcs=1,radius=35),'t':a('D','A','C',r'$\theta$')})
h=2*rt(3)
spec(10,{'B':(0,0),'A':(0,h),'E':(h,0),'C':(h+2,0),'D':(h+2,h),'F':(h+2,2)},
    {'AB':('A','B'),'BC':('B','C'),'CD':('C','D'),'DA':('D','A'),'AE':('A','E'),'AF':('A','F'),'EF':('E','F')},32,
    angles={'a1':a('A','B','E',r'$45^\circ$',radius=24,distance=36),'a2':a('A','E','F',r'$30^\circ$',radius=36,distance=48),'E':a('E','A','F',right=True)})
spec(11,{'A':(-3,3),'B':(3,3),'C':(3,-3),'D':(-3,-3),'H':(0,0)},
    {'AB':('A','B'),'BC':('B','C'),'CD':('C','D'),'DA':('D','A'),'AC':edge('A','C',dash='4 3'),'BD':edge('B','D',dash='4 3')},22,width=55,suffix='1')
spec(11,{'A':(0,0),'H':(3*rt(2),0),'O':(3*rt(2),rt(6))},
    {'AH':('A','H'),'HO':('H','O'),'OA':('O','A')},27,angles={'H':a('H','A','O',right=True),'A':a('A','H','O',r'$30^\circ$')},width=55,suffix='2')
spec(12,{'H':(0,0),'A':(0,6),'B':(-2*rt(3),0),'C':(6,0)},
    {'AB':('A','B'),'AC':('A','C'),'BC':('B','C'),'AH':edge('A','H',dash='4 3')},18,
    angles={'H':a('H','A','C',right=True),'B':a('B','A','H',r'$60^\circ$'),'C':a('C','H','A',r'$45^\circ$')})
s=6*(1+rt(3));AA=(s/2,s*rt(3)/2)
spec(13,{'B':(0,0),'C':(s,0),'A':AA,'D':(6,6*rt(3)),'E':(6,0),'F':(AA[0]/2,AA[1]/2)},
    {'AB':('A','B'),'BC':('B','C'),'CA':('C','A'),'DC':('D','C'),'DE':edge('D','E',dash='4 3'),'CF':edge('C','F',dash='4 3')},10,
    angles={'E':a('E','D','C',right=True),'F':a('F','A','C',right=True),'D':a('D','A','C',r'$105^\circ$',radius=18,distance=30)},regions={'area':poly('A','D','C')})
spec(14,{'O':(0,0),'M':(0,-8),'A':(-6,-8),'B':(6,-8)},
    {'AB':('A','B'),'OM':('O','M'),'OA':('O','A')},8,
    circles={'c':dict(center='O',radius=10)},angles={'M':a('M','O','A',right=True)},
    labels={'O':'O','A':'A','B':'B','M':dict(text='M',dx=14,dy=-12)})
aa=math.radians(64);AA=(-1,0);BB=(math.cos(aa),math.sin(aa));CC=(BB[0],-BB[1])
spec(15,{'O':(0,0),'A':AA,'B':BB,'C':CC,'M':((AA[0]+BB[0])/2,BB[1]/2),'N':((AA[0]+CC[0])/2,CC[1]/2)},
    {'AB':('A','B'),'AC':('A','C'),'BC':('B','C'),'OM':edge('O','M',ticks=1),'ON':edge('O','N',ticks=1)},90,
    circles={'c':dict(center='O',radius=1)},angles={'M':a('M','O','A',right=True),'N':a('N','O','A',right=True)})
spec(16,{'O':(0,0),'P':(10,0),'B':(8,0),'A':(6.4,4.8)},
    {'OP':('O','P'),'OA':('O','A'),'AP':('A','P')},10,
    circles={'c':dict(center='O',radius=8)},angles={'A':a('A','O','P',right=True)},
    labels={'O':'O','P':'P','A':'A','B':dict(text='B',dx=7,dy=23)})
FIGS[16][-1][1]['style'].update(show_points=True,point_radius=1.6)
Rbig=rt(65)
spec(17,{'O':(0,0),'H':(0,4),'A':(-7,4),'B':(7,4),'_or':(Rbig,0),'_ol':(-Rbig,0),'_ir':(4,0),'_il':(-4,0)},
    {'AB':('A','B'),'OH':('O','H'),'OA':('O','A')},10,
    circles={'outer':dict(center='O',radius=Rbig),'inner':dict(center='O',radius=4)},angles={'H':a('H','O','B',right=True)},
    regions={'ring':dict(fill='#eeeeee',boundary=[{'arc':dict(circle='outer',**{'from':'_or','to':'_ol','dir':'ccw'})},{'arc':dict(circle='outer',**{'from':'_ol','to':'_or','dir':'ccw'})},{'seg':['_or','_ir']},{'arc':dict(circle='inner',**{'from':'_ir','to':'_il','dir':'cw'})},{'arc':dict(circle='inner',**{'from':'_il','to':'_ir','dir':'cw'})},{'seg':['_ir','_or']}])})
spec(18,{'B':(0,0),'C':(12,0),'O':(6,0),'A':(0,3),'D':(12,12),'E':(2.4,4.8),'F':(12,3)},
    {'AB':('A','B'),'BC':('B','C'),'CD':('C','D'),'DA':('D','A'),'AF':edge('A','F',dash='4 3')},13,
    circles={'c':dict(center='O',radius=6,draw=False)},arcs={'semi':dict(circle='c',**{'from':'B','to':'C','dir':'cw'})},
    angles={'B':a('B','A','C',right=True),'C':a('C','B','D',right=True),'F':a('F','A','D',right=True)})
spec(19,{'B':(0,0),'C':(5,0),'O':(2.5,0),'A':(0,5),'D':(5,5),'E':(5,1.25),'F':(4,2)},
    {'AB':('A','B'),'BC':('B','C'),'CD':('C','D'),'DA':('D','A'),'AE':('A','E'),'OF':edge('O','F',dash='4 3')},32,
    circles={'c':dict(center='O',radius=2.5,draw=False)},arcs={'semi':dict(circle='c',**{'from':'B','to':'C','dir':'cw'})},
    angles={'F':a('F','O','A',right=True),'B':a('B','A','C',right=True),'D':a('D','A','E',right=True)})
P=(9-3*rt(3),3*rt(3)-3)
spec(21,{'B':(0,0),'C':(6,0),'A':(0,6),'D':(6,2*rt(3)),'P':P,'H':(P[0],0)},
    {'AB':('A','B'),'BC':('B','C'),'CD':('C','D'),'AC':('A','C'),'BD':('B','D'),'PH':edge('P','H',dash='4 3')},30,
    angles={'A':a('A','B','C',r'$45^\circ$',radius=25,distance=36),'D':a('D','B','C',r'$60^\circ$',radius=25,distance=36),'B':a('B','A','C',right=True),'C':a('C','B','D',right=True),'H':a('H','P','C',right=True)})
spec(22,{'A':(0,0),'O':(6,0),'P':(4.5,1.5*rt(3)),'Q':(4.5,-1.5*rt(3)),'C':(3,rt(3)),'B':(3,-rt(3)),'D':(3,0),'_U':(5.5,5.5/rt(3)),'_V':(5.5,-5.5/rt(3))},
    {'lineAP':('A','_U'),'lineAQ':('A','_V'),'BC':('B','C'),'AO':edge('A','O',dash='4 3'),'OP':edge('O','P',dash='4 3'),'OQ':edge('O','Q',dash='4 3')},23,
    circles={'c':dict(center='O',radius=3)},angles={'A':a('A','P','Q',r'$60^\circ$',radius=28,distance=43),'P':a('P','A','O',right=True),'Q':a('Q','A','O',right=True)})
r=2*rt(3)
spec(23,{'O':(0,0),'P':(-2*r,0),'A':(-r/2,r*rt(3)/2),'B':(-r/2,-r*rt(3)/2)},
    {'PA':('P','A'),'PB':('P','B'),'OA':edge('O','A',dash='4 3'),'OB':edge('O','B',dash='4 3'),'OP':edge('O','P',dash='4 3')},24,
    circles={'c':dict(center='O',radius=r)},angles={'A':a('A','O','P',right=True),'B':a('B','O','P',right=True)},
    regions={'outside':dict(fill='#eeeeee',boundary=[{'seg':['P','A']},{'arc':dict(circle='c',**{'from':'A','to':'B','dir':'ccw'})},{'seg':['B','P']}])})

# Every relevant rule is copied byte-exact from the integrated repository for review.
RULE_PATHS=['src/lib/middle/m3Trig.ts','src/lib/middle/m3.ts','src/lib/middle/m3Tangent.ts','src/lib/middle/generate.ts','src/lib/middle/types.ts','prisma/seed-data/units.ts','scripts/import/exam-twin/candidatePack.mjs','scripts/import/exam-paper/solver_rules.json','scripts/figure/engine-catalog.json','docs/planning/09-figure-engine-guide.md','.agents/skills/typesafe-ai/SKILL.md']
rule_receipt=[]
for rel in RULE_PATHS:
    src=REPO/rel; dest=ROOT/'evidence/repository-rules'/(rel+'.txt' if rel.endswith('.ts') else rel)
    dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(src.read_bytes())
    rule_receipt.append(dict(repositoryPath=rel,copyPath=str(dest.relative_to(ROOT)).replace('\\','/'),sha256=sha(src.read_bytes())))
write(ROOT/'evidence/repository-rules/receipt.json',dict(integratedParent='7e1e8080ad5741b53d9bb7ebf8e3a72ff5596db5',ownMerge='eed3c53835c4923dc5807ffe61629700206ec41c',files=rule_receipt))
near={1:['삼각비|01'],2:['삼각비|02','삼각비|03'],3:['삼각비|01','삼각비|20'],4:['삼각비|04','삼각비|05'],5:['삼각비|14','삼각비|16'],6:['삼각비|12','삼각비|16'],7:['삼각비|08'],8:['삼각비의 활용|01','삼각비의 활용|06'],9:['삼각비|05'],10:['삼각비|18'],11:['삼각비의 활용|02'],12:['삼각비의 활용|03','삼각비의 활용|06'],13:['삼각비의 활용|05','삼각비의 활용|08'],14:['원과 직선|01','원과 직선|02'],15:['원과 직선|06'],16:['원과 직선|07'],17:['원과 직선|08'],18:['원과 직선|11'],19:['원과 직선|11','원과 직선|16'],21:['삼각비의 활용|05','삼각비의 활용|08'],22:['원과 직선|10'],23:['원과 직선|09','원주각|03']}
why={1:'01은 두 직각변을 주고 단일 각의 한 비를 묻는다. 새 문항은 빗변/한 직각변으로 복구한 뒤 서로 다른 두 각의 cos/tan 기록을 묻는다.',2:'02는 비로 바로 구하는 한 변만 묻고 03은 길이 없이 다른 비를 묻는다. 두 실제 변을 구하고 피타고라스를 거치는 기록형은 둘 중 어느 규칙도 전부 지지하지 않는다.',3:'01은 단일 비,20은 같은 각의 두 비를 입력으로 계산한다. 두 변에서 서로 다른 두 각의 비를 복구한 후 곱의 포함 구간을 묻는 전체 규칙이 없다.',4:'04/05의 닮음 규칙은 새 문항의 빗변 수선/두 넓이로 공통 높이/두 cos의 차라는 전체 기록을 지원하지 않는다.',5:'14는 같은 각의 sin/cos/tan 중 하나의 극값이다. 새 네 카드는 여러 각의 특수값/같은 함수 크기를 비교하고 양 끝 카드의 쌍을 묻는다.16의 표도 없다.',6:'12는 각과 PH/OH/AD의 길이를 모두 입력으로 주고 비의 값을 읽는다. 새 문항은 AD의 기록에서 각을 식별해 PH/OH를 복구한다.16 단일 표 조회와도 전체 순서가 다르다.',7:'08은 두 특수값의 한 연산이다. 새 문항의 세 계산 기록, 특히 세 항의 나눗셈-뺄셈과 세 값 조합은 단일 규칙의 전체 범위를 넘는다.',8:'01/06은 다른 변/높이를 목표로 한다. 주어진 높이에서 45도 쪽 밑변과35도 쪽 밑변을 복구하여 합의 표현을 묻는 갈래 확인이 없다.',9:'05의 전체 생성 갈래에는 각의 이등분선과 제시된 접선 아닌 수선E를 합동/AA닮음으로 해석하여 DC와tan을 동시 복구하는 조건이 없다.',10:'18의 전체 갈래가 새 직사각형45/30/다른45도 길이합으로 cos15를 구하는 조직을 지원하지 않는다. 특수각 이름만으로 배정할 수 없다.',11:'활용02의 사각뿔은 옆면-밑면 각과 반변으로 높이를 구한다. 새 문항은 꼭짓점-중심의 반대각선과OAH각, 높이·부피 두 기록이다.',12:'활용03은 한 관측점/나무·사다리·연의 단일 직각삼각형이다.06은 주어진 밑변에서 높이. 새 문항은 높이에서 양쪽60/45도 밑변합을 복구한다.',13:'05/08의 조건은 새 정삼각형 위D의105도와 주어진 부분넓이에서BD를 역산하는 전체 절차가 아니다. 수선 두 개/밑변 바깥 높이/양의 실근을 포함한 난도 검토가 필요하다.',14:'01은 반지름+중심거리로 현,02는 현+중심거리로 반지름이다. 새 반지름+현으로 중심거리라는 역목표 갈래가 없다.',15:'06은 꼭짓점각을 수치로 주어 밑각을 구한다. 새 문항은 두 밑각의 일차식을 맞추어 x와꼭짓점각을 함께 구한다.',16:'07은 두 직각삼각형 길이나30도 조건으로 한 길이. 새 넓이로 접선 길이를 복구하고 원밖 구간을 구하는 전체 조건이 없다.',17:'08 mode3는 현→고리넓이, 다른 모드는 두 반지름/하나의 반지름과현→길이이다. 고리넓이→유일 현인 역목표 규칙이 없다. 접선이 핵심이므로 원의 접선 Unit을 제안한다.',18:'11 mode1은 두 평행 접선 높이→같은점 접선 합→피타고라스 지름→네변 둘레이다. 점 이름 회전만 대응하면 새 givens/목표/절차 모두 일치한다. 규칙 난도는 심화하이다.',19:'11은 반원 양끝 높이/지름을 주는 사다리꼴,16은 전체원과 직사각형세변 접촉이다. 새 정사각형 둘레에서 내부접선점의 모서리거리 DE를 구하는 전체반원 규칙은 확인되지 않는다.',21:'05/08 단일삼각형 길이/넓이와 다르게 교차연결대, 네 서술 소문항과 미지수높이의 두 수평분할을 포함한다. 단일 family 배정 불가.',22:'10 mode4는 반지름/60도로 둘레를 구한다. 새 둘레→접선길이 증명→반지름→AO 역산과 서술형 세부분은 전체규칙에 없다.',23:'09는 두접선 길이/각/현 길이이고 원주각03은 중심각과 원주각. 새 접선 바깥영역 넓이→반지름/OP 역산과 세 소문항을 지원하지 않는다.'}
near[5]=['삼각비|14','삼각비|15','삼각비|16']
why[5]='14는 같은 각의 sin/cos/tan 중 하나의 극값,15는 일반각의 근호/부호 식,16은 표의 단일값 조회이다. 새 문항은 서로 다른 네 각의 값 비교→양 끝 카드 제거→남은30도 특수값의 정확한 차를 구한다. 어떤 규칙도 새 입력/목표/전체 순서를 모두 지지하지 않는다.'
GIVENS={
  1:dict(PQ=13,QR=5,rightAngle='R',unit='cm'),
  2:dict(AB='10sqrt(2)',sinA='3/5',rightAngle='C',unit='cm'),
  3:dict(PR=4,QR=3,rightAngle='R',record='tanP*sinQ',lengthUnit='same unspecified unit'),
  4:dict(PQ=5,PR=12,rightAngle='P',altitudeFoot='M on QR',record='cos(QPM)-cos(MPR)',unit='cm'),
  5:dict(cards={'가':'sin30','나':'cos30','다':'cos75','라':'tan55'},organization='remove minimum and maximum; subtract smaller remaining value from larger'),
  6:dict(radius=1,ADTableRecord='0.8391',angleCandidates=[36,40,50,54],quarterCircle=True,foot='H from P to OA',D='ray OP intersects perpendicular at A',rounding='use given 4-place table'),
  7:dict(records=['sin60*cos30','tan45*sin30','sin45/cos60-tan30']),
  8:dict(AH=9,ABHdeg=45,CAHdeg=35,HInsideBC=True,unit='cm'),
  9:dict(AB=25,AC=15,rightAngle='C',AD='internal bisector BAC;D on BC',E='perpendicular foot from D to AB',unit='cm'),
  10:dict(shape='rectangle ABCD',AB='2sqrt(3)',BAEdeg=45,EAFdeg=30,AEperpendicularEF=True,EOnBC=True,FOnCD=True,unit='cm'),
  11:dict(base='square ABCD',baseSide=6,H='base diagonal intersection and O altitude foot',OAHdeg=30,unit='cm'),
  12:dict(AH=6,HInsideBC=True,ABGroundAngle=60,ACGroundAngle=45,unit='cm'),
  13:dict(shape='equilateral ABC',DInsideAB=True,ADCdeg=105,areaADC='18sqrt(3)',E='foot D to BC',F='foot C to line AB',unit='cm,cm^2'),
  14:dict(radius=10,AB=12,M='foot O to AB',unit='cm'),
  15:dict(OMequalsON=True,M='foot O to AB',N='foot O to AC',angleB='x+28',angleC='2x-2',angleUnit='degree'),
  16:dict(radius=8,areaOAP=24,tangency='PA at A',pointOrder=['O','B','P'],BOnCircle=True,unit='cm,cm^2'),
  17:dict(annulusArea='49pi',twoConcentricRadii='R>r>0',AB='outer chord tangent to inner circle at H',unit='cm,cm^2'),
  18:dict(AB=3,CD=12,BC='semicircle diameter',tangencies={'AB':'B','CD':'C','AD':'E'},EInsideAD=True,F='foot A to CD',unit='cm'),
  19:dict(squarePerimeter=20,BC='interior semicircle diameter',EInsideCD=True,AE='tangent at F',FInsideAE=True,unit='cm'),
  21:dict(AC='6sqrt(2)',BACdeg=45,BDCdeg=60,ABandDCVertical=True,BCIsSameBaseline=True,P='AC intersect BD',H='foot P to BC',unit='cm'),
  22:dict(perimeterABC='6sqrt(3)',PAQdeg=60,pointOrders=[['A','C','P'],['A','B','Q']],tangencies={'AP':'P','AQ':'Q','BC':'D'},DInsideBC=True,unit='cm'),
  23:dict(angleAPBtoMinorAOB=[1,2],outsideMinorArcArea='12sqrt(3)-4pi',PAandPBTangent=True,region='outside circle bounded by PA,PB,and minor AB',unit='cm,cm^2'),
}
# Primary purpose q17 uses tangency; this is an explicit author Unit proposal.
DATA[17]['unitSection']='원의 접선'
DATA[18]['difficulty']='심화하'
ledger=[]
for n in range(1,24):
    source=next(q for q in S['questions'] if q['number']==n)
    if n==20:
        ledger.append(dict(questionNumber=n,status='excluded-before-authoring',candidatePath=None,sourceDigest=source['sourceDigest'],reason='제3소문항은 임의 예각 x,z의 여각 tan 곱을 요구한다. 공식 제한 no_ratio_identities: 삼각비 사이의 관계는 다루지 않는다. 앞의 선분 읽기만 작성하거나 고정각으로 바꾸면 원문의 전체 핵심 절차를 보존하지 못한다.',curriculumEvidence='curriculum-evidence.json: official_middle_restrictions/no_ratio_identities, 원2015 PDF 물리39쪽/인쇄35쪽,2020고시 HWP record4440/p908',reopenCriteria='전체3부분을 유지하면서 금지 관계식 없이 중3/2015에서 합법적인 방법이라는 구체적 공식 근거/독립 검토. 원학교 출제 이력은 근거가 아니다.',sourceProvenance='pending',directUseAllowed=False))
        continue
    d=DATA[n]; unit=UNITS[d['unitSection']]
    score=next(x['value'] for x in source['scoreOccurrences'] if x['parentTotalMarked']) if n>=20 else source['scoreOccurrences'][0]['value']
    if d['subparts']: assert sum(d['subparts'])==score
    folder=ROOT/'candidates'/f'q{n:02}'
    artifacts=[]
    for suff,fg,w in FIGS.get(n,[]):
        stem=f'stem-{suff}'
        write(folder/(stem+'.spec.json'),fg)
        artifacts.append(dict(role='stem',specPath=stem+'.spec.json',svgPath=stem+'.svg',intendedWidthMm=w))
    # Only q18 has a full deterministic rule match. No title/nearest-family assignment.
    family='mid:3-2|원과 직선|11' if n==18 else None
    regentries=[e for e in R['entries'] if e['key'] in ['3-2|'+v for v in near[n]]]
    assert len(regentries)==len(near[n])
    if family: assert any(f['unit_id']==unit['id'] and f['family_key']==family for f in B['liveFamilies'])
    sf=sha(source['stem'].encode('utf-8'))
    modes=['structure','representation']
    if n in [8,12,14,18]:modes.append('context')
    if n in [6,8,12,13,14,16,17,19,21,22,23]:modes.append('inverse-target')
    standards=[CODES[k] for k in d['codes']]
    review=dict(grade='중3',edition='2015',standardCodes=d['codes'],allowedProcedure=d['sharedProcedure'],forbiddenAvoided=['삼각비 사이 일반 관계식','원과 비례/원의 거듭제곱','사인법칙/코사인법칙','삼각비 넓이공식','삼각함수 덧셈정리','벡터 연산','일반각/호도법'],status='author-proposed',wholeSurfaceNote=d['gate'] or '제시된 기본 도형 성질과 초등/중등 선수 학습만 사용하는 저자 제안이다. 독립 전체 학생면 검수가 필요하다.')
    review['independentReviewStatus']='pending-other-worker'
    review['specificPendingReasons']=({5:['예각에서 같은 함수의 값 크기 비교가2015중3 학생 방법으로 정당하고, 극값제거/두특수값차가 충분한 구조 변경인지 독립 확인 필요.'],9:['제시된E를 사용한 ASA+AA 두 단계의 적정 복잡도/4점 검수 필요.'],13:['공식 no_complex_geometry_measurement 제한에 비추어 두 수선발을 모두 제공한 부분넓이 역산의 전체 복잡도/5점 검수 필요.'],23:['작은호 바깥영역의 두 직각삼각형 합−부채꼴을 역산하는 전체 복잡도/10점 서술 배점 검수 필요.']}.get(n,[]))
    surfaces={
      'stem':dict(status='author-proposed',evidence='모든 조건/점 순서/단위는 새 본문에 명시했다.'),
      'choices':dict(status='author-proposed',evidence='5개 선택지는 exact-checks.py의 서로 다른 값/기록과 1개 정답 확인 대상이다.' if n<20 else '서술형이므로 choices=[]이다.'),
      'figuresAndTables':dict(status='author-proposed',evidence=f'새 FigureSpec {len(artifacts)}개. 도형은 로컬 strict 렌더/70mm이하 실검수를 별도 기록한다. 표는 본문에서 새로 작성했다.'),
      'notation':dict(status='author-proposed',evidence='선분/직선/반직선,도단위 예각 삼각비,근호/π의 중등 표기. q22의 원벡터 변환 표기는 사용하지 않는다.'),
      'answer':dict(status='author-proposed',evidence='정확한 수학/단위, 객관식은 동그라미 번호, 서술형은 소문항별 값이다.'),
      'studentSolution':dict(status='author-proposed',evidence=d['sharedProcedure'],risk=d['gate']),
      'prerequisites':dict(status='author-proposed',evidence=[{'code':s['code'],'text':s['verified_text'],'locator':s.get('original_2015_pdf_locator')} for s in standards]),
    }
    candidate=dict(schemaVersion=1,questionNumber=n,twinExternalId=f'exam-twin-gyeonggu-2025-2-mid-author-r1-q{n:02}',authorId=AUTHOR,content=d['content'],choices=d['choices'],answer=d['answer'],solution=d['solution'],score=score,questionType='객관식' if n<20 else '서술형',facts=dict(givens=GIVENS[n],domain='모든 길이는 양수. 내부점/작은호 등은 본문 조건을 따른다.',authorCheckPath=f'../../checks/q{n:02}.json',subpartScores=d['subparts']),figureArtifacts=artifacts,
      variantDelta=dict(modes=modes,before=d['before'],after=d['after'],sharedConcept=d['sharedConcept'],sharedProcedure=d['sharedProcedure']),curriculumReview=review,studentSurfaceReview=surfaces,
      sourceReference=dict(externalId=None,sourceExamExternalId='personal-a8a023ad6060fb2937b8b09781b68857',sourceLogicalExamId=S['examId'],questionNumber=n,sourceContentSha256=sf,sourceDigest=source['sourceDigest'],packetPath='../../evidence/source-provisional/questions.json',packetSha256=sha((ROOT/'evidence/source-provisional/questions.json').read_bytes()),jsonPointer=f'/questions/{n-1}',referenceFigures=[dict(file='../../evidence/source-provisional/images/'+Path(i['file'].replace('\\','/')).name,sha256=i['sha256'],page=i.get('page'),column=i.get('column')) for i in source['images']],referenceOnly=True,schoolInternal='경구중',schoolStudentAlias='온빛누리중학교',sourceYearProposal=2025,sourceIdentityStatus='provisional-2025-header-supported-final-school-year-page-equivalence-pending',directUseAllowed=False),
      metadata=dict(grade='중3',curriculum=dict(sourceExam='2015',target='2015'),sourceExamYear=2025,sourceExamYearStatus='provisional-header-supported',schoolInternal='경구중',schoolStudentAlias='온빛누리중학교',questionType='객관식' if n<20 else '서술형',score=score,difficultyProposal=d['difficulty'],difficultyStatus='author-proposed-independent-review-pending',problemTypeProposal='객관식' if n<20 else '서술형',problemTypeStatus='author-proposed',assignment=dict(status='proposed' if family else 'pending',unitId=unit['id'],unitSection=unit['section'],familyKey=family,evidence=dict(bankCapturedAt=B['capturedAt'],timestampScope='부모 readOnly RepeatableRead 시점의 스냅샷이다. 현재DB 단언이 아니다.',seedOrderIndex=unit['orderIndex'],registryCapturedAt=R['capturedAt'],comparedRegistryEntries=regentries,fullRuleComparison=why[n],reopenCriteria='새 givens/목표/핵심 순서/형식의 전체를 지지하는 기존 실제 규칙과 독립 분류 검토. 가까운 제목/신뢰도 자동배정 금지.')),scoreStatus='author-proposed-source-total-preserved',rightsStatus='pending',similarityStatus='pending',sourceStatus='pending-final-extraction-commit-and-equivalence',nativeProvenanceStatus='pending',independentSolveStatus='pending-other-worker',independentReviewStatus='pending-other-worker',directUseAllowed=False))
    write(folder/f'q{n:02}.json',candidate)
    ledger.append(dict(questionNumber=n,status='authored-proposal',candidatePath=f'candidates/q{n:02}/q{n:02}.json',sourceDigest=source['sourceDigest'],figures=len(artifacts),unitProposal=unit['id'],familyProposal=family,taxonomyStatus='proposed' if family else 'pending',directUseAllowed=False,sourceProvenance='pending'))
write(ROOT/'consideration-ledger.json',dict(schemaVersion=1,authorId=AUTHOR,sourceNumbersConsidered=23,authoredProposals=22,heldBeforeAuthoring=0,excludedBeforeAuthoring=1,independentApprovals=0,finalGradeApprovals=0,ledger=ledger))
write(ROOT/'evidence/author-coordinates.json',COORDS)
write(ROOT/'evidence/taxonomy-comparisons.json',dict(bankCapturedAt=B['capturedAt'],notCurrentDbAssertion=True,comparisons=[dict(questionNumber=n,unit=UNITS[DATA[n]['unitSection']],nearestComparedNotAssigned=near[n],actualFullRuleComparison=why[n],familyProposal='mid:3-2|원과 직선|11' if n==18 else None) for n in DATA]))
print('Built 22 proposals, 20 new specs; q20 excluded before authoring; no approvals.')
