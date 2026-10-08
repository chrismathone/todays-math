"""Deterministic AUTHOR checks. Does not claim a blind/independent solve.
Recomputes all targets from new givens; parses actual five displayed options.
"""
from pathlib import Path
import re,json,hashlib,itertools,math,os
import sympy as s
ROOT=Path(__file__).resolve().parent
Q=s.Rational; sqrt=s.sqrt; T=s.Symbol('T',positive=True)
def put(p,d):
    text=json.dumps(d,ensure_ascii=False,indent=2)+'\n'
    if (ROOT/'author-freeze.json').exists():
        # Match Path.write_text's native newline translation used at author build.
        if p.read_bytes()!=text.replace('\n',os.linesep).encode('utf-8'):
            old=json.loads(p.read_text(encoding='utf-8'))
            print('Frozen record difference',p.name,{k:dict(old=old.get(k),recomputed=d.get(k)) for k in set(old)|set(d) if old.get(k)!=d.get(k)})
            raise AssertionError('Frozen check bytes differ; create new revision.')
    else:p.write_text(text,encoding='utf-8')
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def equal(x,y):return s.simplify(x-y)==0
def mathvalue(x):
    x=re.sub(r'\\mathrm\{cm\}(?:\^[23]|\^\{[23]\})?', '',x)
    x=x.replace(r'\,','').replace(r'\ ','').replace(r'^\circ','').replace(' ','')
    x=x.replace(r'\tan35', 'T')
    def atom(text,idx):
        if text[idx]!='{':return text[idx],idx+1
        dep=1;j=idx+1
        while dep:
            if text[j]=='{':dep+=1
            if text[j]=='}':dep-=1
            j+=1
        return text[idx+1:j-1],j
    while '\\frac' in x:
        i=x.rindex('\\frac');n,j=atom(x,i+5);d,k=atom(x,j)
        x=x[:i]+f'(({n})/({d}))'+x[k:]
    while '\\sqrt' in x:
        i=x.rindex('\\sqrt');v,j=atom(x,i+5);x=x[:i]+f'sqrt({v})'+x[j:]
    x=x.replace('{','(').replace('}',')')
    # Exact decimal rationalization and implicit multiplication (only authored math).
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations,implicit_multiplication_application,rationalize
    return parse_expr(x,local_dict={'sqrt':sqrt,'T':T},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def tup(txt):return tuple(mathvalue(x) for x in re.findall(r'\$([^$]+)\$',txt))
def all_distinct(options):
    for x,y in itertools.combinations(options,2):
        if T not in set().union(*(v.free_symbols for v in x+y)):
            assert any(not equal(a,b) for a,b in zip(x,y)),(x,y)
        else:
            # The finite angle35 is acute and below45, hence 0<T<1.
            dif=[s.expand(a-b) for a,b in zip(x,y)]
            possible=s.solve([z for z in dif if z!=0],[T])
            assert not any(0<sol[T]<1 for sol in possible if isinstance(sol,dict)),possible
    return True

targets={};evidence={}
def rec(n,target,**ev):targets[n]=tuple(map(s.sympify,target));evidence[n]=ev
rec(1,[Q(5,13),Q(5,12)],PR=sqrt(13**2-5**2),positiveLengths=[5,12,13])
bc=10*sqrt(2)*Q(3,5);ca=sqrt((10*sqrt(2))**2-bc**2)
rec(2,[bc,ca],BC=bc,CA=ca)
product=Q(3,4)*Q(4,5);rec(3,[product],PQ=sqrt(4**2+3**2),finiteRatioProduct=product)
alt=2*(Q(1,2)*5*12)/13
rec(4,[alt/5-alt/12],QR=13,PM=alt,cosTheta=alt/5,cosPhi=alt/12)
assert 0<s.cos(75*s.pi/180)<Q(1,2)<sqrt(3)/2<1<s.tan(55*s.pi/180)
rec(5,[(sqrt(3)-1)/2],order=['다','가','나','라'],removed=['다','라'],remaining=['가','나'],minimum='다',maximum='라',method='기준30/45/60도와 같은 함수의 예각값 비교, 양 끝 제거 후 남은 정확한 특수값 차; 관계식 없음')
table=[(36,'0.5878','0.8090','0.7265'),(40,'0.6428','0.7660','0.8391'),(50,'0.7660','0.6428','1.1918'),(54,'0.8090','0.5878','1.3764')]
for deg,si,co,ta in table:
    for fn,val in zip([s.sin,s.cos,s.tan],[si,co,ta]):assert abs(float(fn(deg*s.pi/180))-float(val))<0.00005
found=[r for r in table if r[3]=='0.8391'];assert len(found)==1
rec(6,[Q(found[0][1]),Q(found[0][2])],rowAngle=found[0][0],AD=Q(found[0][3]),roundingTolerance='0.00005',notExactLengthAssertion=True)
rec(7,[sqrt(3)/2*sqrt(3)/2,1*Q(1,2),sqrt(2)/2/Q(1,2)-sqrt(3)/3],specialAnglesOnly=[30,45,60],divisor=Q(1,2))
rec(8,[9*(1+T)],AH=9,BH=9,HC=9*T,domain='0<tan35<1; all choices distinct throughout this interval')
t=s.Symbol('t',positive=True);sol=s.solve((20-t)*15-25*t,t);assert sol==[Q(15,2)]
rec(9,[sol[0],15/sol[0]],BC=sqrt(25**2-15**2),DC=sol[0],BD=20-sol[0],DE=sol[0],domain='0<DC<BC,E interior AB',proof='RHA/ASA congruence ADE=ADC, AA BDE~BAC, not memorized angle-bisector ratio')
h=2*sqrt(3);ae=sqrt(2)*h;ef=ae*sqrt(3)/3;af=ae/(sqrt(3)/2);ec=ef/sqrt(2)
rec(10,[15,s.simplify((h+ec)/af)],AB=h,BE=h,AE=ae,EF=ef,AF=af,EC=ec,CF=ec,AD=h+ec,method='Actual three right triangles; no angle addition/subtraction identity')
half=sqrt(6**2+6**2)/2;height=s.simplify(half*sqrt(3)/3)
rec(11,[height,36*height/3],AH=half,OH=height,baseArea=36,unit='cm,cm^3',method='two given planar views, square half-diagonal, tan30, pyramid volume')
rec(12,[6+6/sqrt(3)],BH=6/sqrt(3),CH=6,AH=6,HInterior=True)
t=s.Symbol('t',positive=True);side=t*(1+sqrt(3))/2;ad=side-t;cf=side*sqrt(3)/2;area=s.simplify(ad*cf/2)
assert equal(area,t**2*sqrt(3)/8)
res=s.solve(area-18*sqrt(3),t);assert res==[12]
rec(13,[res[0]],BD=res[0],areaPolynomial=area,positiveRootOnly=True,DInsideAB=bool(side.subs(t,12)>12),FOnLineAB=True,method='60/45 right triangles, perpendicular CF height to line AD; no sin105/laws')
rec(14,[sqrt(10**2-6**2)],radius=10,chord=12,halfChord=6)
x=s.Symbol('x');xx=s.solve(x+28-(2*x-2),x);assert xx==[30]
rec(15,[xx[0],180-2*(xx[0]+28)],baseAngle=xx[0]+28,angleSum=180,sameDistanceImpliesSameChord=True)
ap=2*Q(24)/8;op=sqrt(8**2+ap**2)
rec(16,[op-8],AP=ap,OP=op,radius=8,area=24,domain='O-B-P ordered,BP>0')
rec(17,[2*sqrt(49)],halfChord=sqrt(49),radiiNotUnique=True,chordUnique=True,identity='pi(R^2-r^2)=49pi and AH^2=R^2-r^2')
ad=3+12;df=12-3;base=sqrt(ad**2-df**2)
rec(18,[3+base+12+ad],AB=3,CD=12,AD=ad,DF=df,BC=base,tangentSum=True,EInterior=True,domain='all lengths positive')
x=s.Symbol('x');xx=s.solve((5+x)**2-(25+(5-x)**2),x);assert xx==[Q(5,4)]
rec(19,[5-xx[0]],CE=xx[0],DE=5-xx[0],AE=5+xx[0],AF=5,EF=xx[0],domain=bool(0<xx[0]<5))
ph=s.simplify(6/(sqrt(3)+1))
rec(21,[75,6/sqrt(3),12/sqrt(3),3*ph],AB=6,BC=6,PH=ph,BH=ph*sqrt(3),CH=ph,partScores=[2,2,2,4],subpartTotal=10,HInterior=bool(0<ph*sqrt(3)<6))
ap=6*sqrt(3)/2;r=s.simplify(ap*sqrt(3)/3);ao=s.simplify(ap/(sqrt(3)/2))
rec(22,[ap,r,ao],perimeter=6*sqrt(3),perimeterIdentity='AC+AB+BC=AP+AQ=2AP',radius=r,AO=ao,partScores=[4,2,2],subpartTotal=8,method='point order, same-point tangent lengths, right triangle congruence, tan/cos30; no vector operations')
r=s.Symbol('r',positive=True);factor=sqrt(3)-s.pi/3
assert sqrt(3)>Q(5,3) and Q(5,3)-Q(22,7)/3>0
rr=s.solve(r*r*factor-(12*sqrt(3)-4*s.pi),r);assert rr==[2*sqrt(3)]
rec(23,[120,rr[0],2*rr[0]],centralAngle=120,externalAngle=60,positiveRadius=rr[0],areaFactor=factor,area=12*sqrt(3)-4*s.pi,partScores=[3,4,3],subpartTotal=10,uniqueness='factor>0 using sqrt3>5/3,pi<22/7; only positive radius',method='congruence,30-degree right triangle areas minus120/360 sector; no sin120/radians')

rows=[]
coords=json.loads((ROOT/'evidence/author-coordinates.json').read_text(encoding='utf-8'))
def numeric_geo(c):
    gs=[]
    for art in c['figureArtifacts']:
        sp=json.loads((ROOT/'candidates'/f'q{c["questionNumber"]:02}'/art['specPath']).read_text(encoding='utf-8'))
        p=sp['points'];circles=sp.get('circles',{})
        for name,an in sp.get('angles',{}).items():
            if not an.get('right'):continue
            v=p[an['vertex']];u=p[an['points'][0]];w=p[an['points'][1]]
            dot=sum((u[i]-v[i])*(w[i]-v[i]) for i in [0,1])
            den=math.dist(u,v)*math.dist(w,v)
            assert abs(dot/den)<1e-10,(c['questionNumber'],name,dot/den)
            gs.append(dict(check='right-angle',name=name,normalizedDot=dot/den))
        for name,rgn in sp.get('regions',{}).items():
            for link in rgn['boundary']:
                if 'arc' not in link:continue
                ar=link['arc'];circ=circles[ar['circle']];center=p[circ['center']]
                for endpoint in [ar['from'],ar['to']]:assert abs(math.dist(p[endpoint],center)-circ['radius'])<1e-8
        n=c['questionNumber']; scale=coords[str(n)][art['specPath'].split('-')[-1].split('.')[0]]['scale']
        def length(u,v):return math.dist(p[u],p[v])/scale
        def angle(v,u,w):
            x=[p[u][i]-p[v][i] for i in [0,1]];y=[p[w][i]-p[v][i] for i in [0,1]]
            return math.degrees(math.acos(max(-1,min(1,sum(x[i]*y[i] for i in [0,1])/(math.hypot(*x)*math.hypot(*y))))))
        def close(got,wanted):assert abs(got-float(wanted))<1e-8,(n,got,wanted)
        def triangle_area(u,v,w):return abs((p[v][0]-p[u][0])*(p[w][1]-p[u][1])-(p[v][1]-p[u][1])*(p[w][0]-p[u][0]))/(2*scale**2)
        def inside(x,u,v):close(length(u,x)+length(x,v),length(u,v));assert length(u,x)>0 and length(x,v)>0
        oncircle={6:{'c':['A','B','P']},14:{'c':['A','B']},15:{'c':['A','B','C']},16:{'c':['A','B']},17:{'outer':['A','B'],'inner':['H']},18:{'c':['B','C','E']},19:{'c':['B','C','F']},22:{'c':['P','Q','D']},23:{'c':['A','B']}}
        for circ,names in oncircle.get(n,{}).items():
            for name in names:close(math.dist(p[name],p[circles[circ]['center']])/scale,circles[circ]['radius']/scale)
        for name,an in sp.get('angles',{}).items():
            match=re.match(r'\$(\d+)\^\\circ\$',an.get('label',''))
            if match:close(angle(an['vertex'],*an['points']),int(match[1]))
        if n==1:close(length('P','Q'),13);close(length('Q','R'),5)
        if n==3:close(length('P','R'),4);close(length('Q','R'),3)
        if n==4:close(length('P','Q'),5);close(length('P','R'),12);close(angle('P','Q','R'),90);inside('M','Q','R')
        if n==6:close(circles['c']['radius']/scale,1);assert abs(length('A','D')-0.8391)<0.00005
        if n==8:close(length('A','H'),9);inside('H','B','C')
        if n==9:close(length('A','B'),25);close(length('A','C'),15);close(angle('A','B','D'),angle('A','D','C'));inside('D','B','C');inside('E','A','B')
        if n==10:
            close(length('A','B'),2*sqrt(3));inside('E','B','C');inside('F','C','D')
            for vertex,u,w in [('A','B','D'),('B','A','C'),('C','B','D'),('D','A','C')]:close(angle(vertex,u,w),90)
        if n==11:
            if 'B' in p:
                for u,v in [('A','B'),('B','C'),('C','D'),('D','A')]:close(length(u,v),6)
                close(length('A','H'),3*sqrt(2));inside('H','A','C');inside('H','B','D')
            else:close(length('A','H'),3*sqrt(2))
        if n==12:close(length('A','H'),6);inside('H','B','C')
        if n==13:
            close(length('A','B'),length('B','C'));close(length('B','C'),length('C','A'));inside('D','A','B');inside('F','A','B');close(triangle_area('A','D','C'),18*sqrt(3));assert length('A','F')>length('A','D')
        if n==14:close(circles['c']['radius']/scale,10);close(length('A','B'),12)
        if n==15:close(length('O','M'),length('O','N'));close(angle('B','A','C'),58);close(angle('C','A','B'),58)
        if n==16:close(circles['c']['radius']/scale,8);close(triangle_area('O','A','P'),24);inside('B','O','P')
        if n==17:
            assert circles['outer']['radius']>circles['inner']['radius']>0
            close((circles['outer']['radius']**2-circles['inner']['radius']**2)/scale**2,49)
            inside('H','A','B')
        if n==18:close(length('A','B'),3);close(length('C','D'),12);inside('E','A','D');close(angle('E','O','A'),90)
        if n==19:
            close(sum(length(u,v) for u,v in [('A','B'),('B','C'),('C','D'),('D','A')]),20)
            for u,v in [('A','B'),('B','C'),('C','D'),('D','A')]:close(length(u,v),5)
            inside('E','C','D');inside('F','A','E')
        if n==21:close(length('A','C'),6*sqrt(2));inside('P','A','C');inside('P','B','D');inside('H','B','C')
        if n==22:
            close(length('A','B')+length('B','C')+length('C','A'),6*sqrt(3));inside('C','A','P');inside('B','A','Q');inside('D','B','C');close(angle('D','O','B'),90)
        if n==23:
            close(angle('O','A','B')/angle('P','A','B'),2)
            arc=sp['regions']['outside']['boundary'][1]['arc'];assert arc['dir']=='ccw' and arc['from']=='A' and arc['to']=='B'
            area_quad=triangle_area('P','A','O')+triangle_area('P','B','O')
            sector=float(s.pi)*length('O','A')**2*angle('O','A','B')/360
            close(area_quad-sector,12*sqrt(3)-4*s.pi)
        gs.append(dict(specSha256=sh(ROOT/'candidates'/f'q{c["questionNumber"]:02}'/art['specPath']),figureGeometry='actual new givens, angle labels, circle points, side conditions and applicable area/perimeter agree',floatingGeometryTolerance='1e-8; q06 given rounding tolerance0.00005'))
    return gs
for n in targets:
    file=ROOT/'candidates'/f'q{n:02}'/f'q{n:02}.json';c=json.loads(file.read_text(encoding='utf-8'))
    if n<20:
        if n==3:
            opts=[re.findall(r'\$([^$]+)\$',v)[0].split('<') for v in c['choices']]
            assert len({tuple(v) for v in opts})==5
            matches=[i for i,expr in enumerate(opts) if mathvalue(expr[0])<targets[n][0]<mathvalue(expr[2])]
        else:
            opts=[tup(v) for v in c['choices']];assert all(len(o)==len(targets[n]) for o in opts),(n,opts)
            all_distinct(opts)
            matches=[i for i,o in enumerate(opts) if all(equal(u,v) for u,v in zip(o,targets[n]))]
        assert len(matches)==1,(n,matches,opts,targets[n])
        assert c['answer']=='①②③④⑤'[matches[0]],(n,c['answer'],matches)
        option_check=dict(choiceCount=5,distinctValuesOrRecords=True,exactlyOneCorrect=True,correctIndex=matches[0]+1,actualDisplayedChoicesSha256=hashlib.sha256(json.dumps(c['choices'],ensure_ascii=False).encode()).hexdigest())
    else:
        assert c['choices']==[]
        # Answer q22 includes perimeter identity as well as values; ensure each target is present.
        expressions=re.findall(r'\$([^$]+)\$',c['answer'])
        if n==22:
            assert expressions[0]==r'=2\overline{\mathrm{AP}}'
            expressions=[x.split('=')[-1] for x in expressions[1:]]
        displayed=tuple(mathvalue(x) for x in expressions)
        for target in targets[n]:assert any(equal(target,v) for v in displayed),(n,target,displayed)
        option_check=dict(choiceCount=0,writtenAnswerMatchesExactTargets=True)
    record=dict(questionNumber=n,authorId=c['authorId'],method='deterministic-author-recomputation',independentVerification=False,status='author-check-passed',candidateFileSha256=sh(file),targets=[str(v) for v in targets[n]],evidence=evidence[n],choices=option_check,assetGeometry=numeric_geo(c),limitations='저자 검사이다. 원문 정답/해설을 읽지 않았고 독립 풀이/교육과정/분류/권리 승인으로 사용할 수 없다.')
    # SymPy objects remain human-reviewable exact strings, not float hashes.
    record=json.loads(json.dumps(record,ensure_ascii=False,default=str))
    put(ROOT/'checks'/f'q{n:02}.json',record);rows.append(dict(questionNumber=n,status=record['status'],checkSha256=sh(ROOT/'checks'/f'q{n:02}.json')))
assert set(targets)==set(range(1,24))-{20}
put(ROOT/'checks/exact-summary.json',dict(method='author checks, exact SymPy 1.14.0 arithmetic plus actual-option parsing',candidateCount=22,mcCount=19,writtenCount=3,independentVerification=False,results=rows))
print('22 author recomputations passed; 19 actual MC option sets distinct with one answer; 3 written answer sets checked.')
