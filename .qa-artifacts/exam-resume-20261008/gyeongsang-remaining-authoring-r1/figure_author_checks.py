"""Author-only FigureSpec relation checks. Pixels are not a math oracle."""
from pathlib import Path
import hashlib,json,math,re
OUT=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def near(a,b):return abs(a-b)<=1e-7*max(1,abs(a),abs(b))
def vec(a,b):return [a[0]-b[0],a[1]-b[1]]
def dot(a,b):return a[0]*b[0]+a[1]*b[1]
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
rows=[]
for p in sorted((OUT/'candidates').glob('q*/stem-*.spec.json')):
    n=int(p.parent.name[1:]);s=json.loads(p.read_text(encoding='utf8'));P=s['points'];checks=[]
    def length(a,b):return math.hypot(*vec(P[a],P[b]))
    def ang(a,v,b):
        x,y=vec(P[a],P[v]),vec(P[b],P[v]);return math.degrees(math.acos(max(-1,min(1,dot(x,y)/math.hypot(*x)/math.hypot(*y)))))
    def ck(condition,a,b):
        assert near(a,b),(n,condition,a,b)
        checks.append({'condition':condition,'computed':a,'required':b,'authorCheckPassed':True})
    def inside(a,v,b):
        u,w=vec(P[v],P[a]),vec(P[b],P[a]);ck(v+' on '+a+b,cross(u,w)/dot(w,w),0)
        t=dot(u,w)/dot(w,w);assert 0<t<1,(n,v,t)
        checks.append({'condition':v+' internal to '+a+b,'fraction':t,'authorCheckPassed':True})
    for name,a in s.get('angles',{}).items():
        x,y=a['points'];v=a['vertex'];actual=ang(x,v,y)
        if a.get('right'):ck(name+' right',actual,90)
        m=re.search(r'(\d+)\^\\circ',a.get('label',''))
        if m:ck(name+' angle label',actual,int(m[1]))
    if n==1:ck('sinP=QR/PQ',length('Q','R')/length('P','Q'),7/25)
    if n==2:
        ck('cosP=PR/PQ',length('P','R')/length('P','Q'),4/5)
        ck('PQ20 at scale10',length('P','Q')/10,20);assert P['R']==[0,0] and P['P'][0]>0 and P['Q'][1]<0
    if n==3:ck('PQ/PR=13/10',length('P','Q')/length('P','R'),1.3)
    if n==4:
        r=s['circles']['c']['radius'];ck('P on radius',length('O','P'),r);inside('O','H','A');inside('O','P','D')
        ck('OA radius',length('O','A'),r);ck('OB radius',length('O','B'),r)
    if n==7:ck('two legs equal',length('P','R'),length('R','Q'));ck('actual hyp12sqrt2 at scale9',length('P','Q')/9,12*math.sqrt(2))
    if n==9:ck('Q twiceP',ang('P','Q','R'),2*ang('Q','P','R'));ck('derivedQ60',ang('P','Q','R'),60)
    if n==16:
        inside('Q','H','R');ck('PQ12 at scale15',length('P','Q')/15,12)
        ck('trianglearea36sqrt3 at scale15',abs(cross(vec(P['P'],P['Q']),vec(P['R'],P['Q'])))/2/225,36*math.sqrt(3))
    if n==17:ck('exact physical slope15, not table-rounded drawing',length('Q','H')/length('P','H'),math.tan(math.radians(15)))
    if n==18:
        inside('B','F','C');inside('F','H','C');inside('A','E','C');inside('F','E','D')
        ck('CD8 at scale15',length('C','D')/15,8)
        poly=[P[k] for k in ['A','B','F','E']];area=abs(sum(cross(a,b) for a,b in zip(poly,poly[1:]+poly[:1])))/2
        ck('ABFE area16+8sqrt3 at scale15',area/225,16+8*math.sqrt(3));ck('BF4 at scale15',length('B','F')/15,4)
    if n==19:ck('givencosQ',length('Q','R')/length('Q','P'),3/5);ck('area24 at scale20',length('P','R')*length('Q','R')/2/400,24)
    if n==20:
        inside('Q','H','R');ck('middleH',length('Q','H'),length('H','R'));ck('equilPQ=PR',length('P','Q'),length('P','R'));ck('equilPQ=QR',length('P','Q'),length('Q','R'))
        ck('side10 at scale16',length('P','Q')/16,10)
        assert not s.get('angles'),'Stem must not supply a right-angle proof mark before q20 part1.'
    if n==21:
        inside('O','H','Q');ck('OP18 at scale10',length('O','P')/10,18);ck('PQ6sqrt13 at scale10',length('P','Q')/10,6*math.sqrt(13));ck('OQ24 at scale10',length('O','Q')/10,24)
    svg=p.with_name(p.name.replace('.spec.json','.svg'));assert svg.is_file()
    rows.append({'questionNumber':n,'spec':{'path':p.as_posix(),'sha256':sha(p)},'svg':{'path':svg.as_posix(),'sha256':sha(svg)},
        'intendedWidthMm':70,'coordinateChecks':checks,'mathematicalPixelMeasurementsUsed':False,
        'independentFigureOrGradeApproval':False,'authorCheckOnly':True})
assert len(rows)==12
(OUT/'figure-author-checks.json').write_text(json.dumps({'code':{'path':Path(__file__).as_posix(),'sha256':sha(__file__)},'rows':rows,
    'role':'author-check','actualDataRelationsOnly':True,'strictRenderReceipt':{'path':(OUT/'strict-render-receipt.json').as_posix(),'sha256':sha(OUT/'strict-render-receipt.json')},
    'supersededPresealFailureRetained':'strict-render-failure.json records the initial duplicate angle/point name error; final angle keys were prefixed and strict rendering succeeded. Its captured spec hash describes the earlier mutable draft.'},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('12 authored raw spec/SVG relation checks passed; no independent approval.')
