"""Exact author computations against actual new candidate choices/assets.
This is never an independent/blind review. No old keys/answers/source scans.
"""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,re,math,hashlib,itertools
import sympy as S
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,rationalize
ROOT=Path(__file__).resolve().parent;Q=S.Rational;rt=S.sqrt
def hash(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,d):
    b=(json.dumps(d,ensure_ascii=False,indent=2,default=str)+'\n').encode('utf-8')
    if (ROOT/'author-freeze.json').exists():assert p.read_bytes()==b,'Frozen check drift'
    else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
def val(text):
    text=text.split('=')[-1]
    text=re.sub(r'\\mathrm\{(?:cm|mm)\}(?:\^[23]|\^\{[23]\})?','',text)
    text=text.replace(r'\,','').replace(r'\ ','').replace(r'^\circ','').replace(' ','')
    def atom(t,i):
        if t[i]!='{':return t[i],i+1
        depth=1;j=i+1
        while depth:
            if t[j]=='{':depth+=1
            if t[j]=='}':depth-=1
            j+=1
        return t[i+1:j-1],j
    while '\\frac' in text:
        i=text.rindex('\\frac');a,j=atom(text,i+5);b,k=atom(text,j);text=text[:i]+f'(({a})/({b}))'+text[k:]
    while '\\sqrt' in text:
        i=text.rindex('\\sqrt');a,j=atom(text,i+5);text=text[:i]+f'sqrt({a})'+text[j:]
    return parse_expr(text.replace('{','(').replace('}',')'),local_dict={'sqrt':rt},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def values(text):return tuple(val(x) for x in re.findall(r'\$([^$]+)\$',text))
def eq(a,b):return S.simplify(a-b)==0
def median(v):
    v=sorted(v);k=len(v)//2
    return S.sympify(v[k]) if len(v)%2 else (S.sympify(v[k-1])+v[k])/2
def mean(v):return sum(map(S.sympify,v))/len(v)
def variance(v):m=mean(v);return S.simplify(sum((S.sympify(x)-m)**2 for x in v)/len(v))
targets={};ev={}
def rec(n,target,**e):targets[n]=tuple(target);ev[n]=e
data=json.loads((ROOT/'evidence/source-final/questions.json').read_text(encoding='utf-8'))
observed=json.loads((ROOT/'evidence/source-observations.json').read_text(encoding='utf-8'))['observations']
assert len(observed)==19
for q,o in zip(data['questions'],observed):assert o['rawStructuredGivenData']==q['structuredGivenData']
assert observed[8]['rawStructuredGivenData']['count']==15 and len(observed[8]['rawStructuredGivenData']['points'])==15
rec(1,[],missingFrequency=30-(8+5+4+3),newCompleteFrequency=[8,5,4,10,3],mode='만화',witnessCount=30)
a=S.Symbol('a');solution=S.solve((a+20)/2-19,a);assert solution==[18]
assert [n for n in range(1,101) if median([6,12,18,n,30])==18 and median([10,18,n,20,30,40])==19]==[18]
rec(2,[mean([6,12,18,18,30,10,18,18,20,30,40])],a=18,naturalDomainProof='First median forces a>=18; second forces a<20; (a+20)/2=19 uniquely yields18. Not finite search alone.',A=[6,12,18,18,30],B=[10,18,18,20,30,40],combinedCount=11,sum=220)
valid=[(a,b) for a in range(1,40) for b in range(a+1,41) if median([2,3,a,b,8])==6 and median([10,a,b,18])==9]
assert valid==[(6,8)]
rec(3,[6,8],domainProof='Odd median6 must be a or b. b6 impossible because3 values below6; a6. Second median9 forces6<b<10,then b8.',finiteCaseCrossCheck=valid)
rec(4,[10*7-7*6-8-9],beforeSum=42,afterSum=70,addedSum=28,witness=[6]*7+[8,9,11])
raw=[2,2,8,8];shifted=[x+4 for x in raw];assert mean(shifted)==9 and variance(shifted)==9
rec(5,[mean(raw),rt(variance(raw))],witnessRaw=raw,witnessShifted=shifted,proof='(x+4)-(mean+4)=x-mean; exactly same four deviations',varianceRaw=variance(raw))
k=S.Symbol('k',positive=True);ks=S.solve(4*k*k-36,k);assert ks==[3]
raw=[5-rt(6),5,5+rt(6)];assert mean(raw)==5 and variance(raw)==4 and all(x>0 for x in raw)
new=[3*x-4 for x in raw];assert variance(new)==36
rec(6,[ks[0],mean(new)],positiveMultiplier=ks[0],witnessRaw=raw,witnessNew=new,proof='New deviation=k*(old deviation),variance=4k^2,positive root only',newStandardDeviation=rt(variance(new)))
fixed=[2,5,5,8,13]
assert all(median(fixed+[m]*4)==m for m in range(2,14))
rec(7,[2,13],boundsProof='Nine values:median is5th. Five fixed values>=2 and<=13 prevent outside values; four repeated m realize every integer inside.',witnessPerInteger={m:fixed+[m]*4 for m in range(2,14)},notUpperGradeOptimization=True)
xs=[4]*4+[8]*4;assert mean(xs)==6 and sum(x*x for x in xs)==320
sqdev=S.Integer(320)-12*48+8*36
rec(8,[sqdev/8,rt(sqdev/8)],sum=48,squaredDeviationSum=sqdev,witness=xs,proof='Expand each (xi-6)^2,add polynomial terms; no expectation/moment formula.')
newpts=[[10,30],[20,40],[30,20],[30,60],[40,40],[40,70],[50,30],[50,50],[50,70],[60,40],[60,60],[70,50]]
assert len(newpts)==len(set(tuple(p) for p in newpts))==12
excluded=[p for p in newpts if p[0]>=50 and p[1]>=50]
rec(9,[12-len(excluded)],newConstructedPoints=newpts,excludedPoints=excluded,boundaryIncluded=True,originalSourcePointsUnchanged=observed[8]['rawStructuredGivenData']['points'],sourceCount=15,newCount=12,notSameObservationClaim=True)
fp={r'\sin':Q(16,20),r'\cos':Q(12,20),r'\tan':Q(16,12)};fq={r'\sin':Q(12,20),r'\cos':Q(16,20),r'\tan':Q(12,16)}
rec(10,[Q(3,5),Q(3,4)],PFunctions=fp,QFunctions=fq,ratioNames=['cos','tan'],method='actual finite side-role ratios, no arbitrary identity')
bd=rt(4**2+4**2);fd=rt(4**2+bd**2)
rec(11,[bd,S.simplify(4/fd)],BF=4,BD=bd,FD=fd,cosTheta=S.simplify(4/fd),method='given actual BFD right triangle; two Pythagoras computations; no spatial vector/projection method')
t=S.Symbol('t',positive=True);ts=S.solve(5*t*t-405,t);assert ts==[9]
rec(12,[2*ts[0],ts[0]],positiveLeg=ts[0],hypotenuse=9*rt(5),ratio=Q(1,2),proof='legs t and2t;5t^2=405;positive root only')
rec(13,[],physicalChange=['증가','감소','증가'],proof='acute quarter-circle higher point/lower horizontal foot; fixed horizontal OA=1 higher steeper-ray intercept; no cross-function identity')
k=S.Symbol('k');ks=S.solve(k*Q(1,2)*rt(2)/2+rt(2)/2-5*rt(2)/4,k);assert ks==[3]
rec(14,[ks[0]],specialAngles=[60,45],knownProducts=[rt(2)/4,rt(2)/2],nonzeroDivisor=rt(2),positiveK=ks[0])
known=[4,5,5,6,6,7,7,7,8];missing=13*10-sum(known);alltimes=known+[missing]
assert missing==75 and median(alltimes)==Q(13,2) and mean(alltimes)==13
rec(16,[missing,median(alltimes)],allConstructedTimes=alltimes,unit='분',representative='중앙값',reason='9 values in4..8;75 raises mean13 beyond that majority interval',rubricTotal=8)
diff=[-3,-1,0,3,6];h=9-mean(diff);actual=[h+x for x in diff]
assert h==8 and all(x>=0 and x.is_integer for x in actual)
rec(17,[h,rt(variance(actual))],relativeValues=diff,relativeMean=mean(diff),absoluteValues=actual,actualMean=9,deviations=[x-mean(diff) for x in diff],variance=variance(diff),translationDeviationProof='(h+d)-(h+mean(d))=d-mean(d)',subpartScores=[5,5],parentTotal=10,parentCountedOnce=True)
t=S.Symbol('t',positive=True);ts=S.solve(t*(1+rt(2))-5*(1+rt(2)),t);assert ts==[5]
angleA=(S.Integer(180)-(180-45))/2
rec(18,[ts[0],angleA,S.simplify(1/(1+rt(2)))],BD=ts[0],CD=ts[0]*rt(2),AD=ts[0]*rt(2),AB=5*(1+rt(2)),angleADC=135,angleCAB=angleA,method='45-degree equal legs/Pythagoras;given AD=CD;straight angle+isosceles base angles;finite tan;no half-angle formula',rubricTotal=12)
r=S.Symbol('r',positive=True);area=(r*rt(3)/2+r*rt(3))*(r/2)/2;rr=S.solve(area-6*rt(3),r);assert rr==[4]
rec(19,[rr[0]],areaExpression=S.simplify(area),radiusPositive=rr[0],AC=rr[0]*rt(3)/2,CB=rr[0]/2,BD=rr[0]*rt(3),quadArea=6*rt(3),proof='Only actual60-degree right triangles and trapezoid base-distance area;no sector/circumcircle/power/upper-grade law',rubricTotal=10)

def geometry(c):
    n=c['questionNumber'];folder=ROOT/'candidates'/f'q{n:02}';md=json.loads((folder/'math-data.json').read_text(encoding='utf-8'))
    assert hash(folder/'math-data.json')==c['facts']['mathDataSha256'];assert md['givens']==c['facts']['givens'];notes=[]
    for j,art in enumerate(c['figureArtifacts']):
        spec=json.loads((folder/art['specPath']).read_text(encoding='utf-8'));assert art['mathDataSha256']==hash(folder/'math-data.json')
        if spec['version']=='elem-1':
            if n==1:assert spec['values']==[dict(label=a,value=b) for a,b in c['facts']['givens']['knownRows']];assert all(v['label']!='만화' for v in spec['values'])
            if n==9:assert spec['points']==newpts;assert len(spec['points'])==12 and '가로축은 읽기 점수(점), 세로축은 쓰기 점수(점)' in c['content'];assert all(0<=x<=80 and 0<=y<=80 for x,y in newpts)
            notes.append(dict(kind=spec['kind'],dataBindingsMatch=True,specSha256=hash(folder/art['specPath'])));continue
        p=spec['points'];scale=md['newFigureConstructionModel'][j]['scale']
        def length(a,b):return math.dist(p[a],p[b])/scale
        def close(a,b):assert abs(a-float(b))<1e-8,(n,a,b)
        def angle(v,a,b):
            u=[p[a][i]-p[v][i] for i in [0,1]];w=[p[b][i]-p[v][i] for i in [0,1]]
            return math.degrees(math.acos(max(-1,min(1,sum(u[i]*w[i] for i in [0,1])/math.hypot(*u)/math.hypot(*w)))))
        def inside(x,a,b):close(length(a,x)+length(x,b),length(a,b));assert length(a,x)>0 and length(x,b)>0
        for a in spec.get('angles',{}).values():
            if a.get('right'):close(angle(a['vertex'],*a['points']),90)
            m=re.match(r'\$(\d+)\^\\circ\$',a.get('label',''))
            if m:close(angle(a['vertex'],*a['points']),int(m[1]))
        if n==10:close(length('P','R'),12);close(length('Q','R'),16);close(length('P','Q'),20)
        if n==11:
            if j==0:
                assert not spec.get('angles');assert md['newFigureConstructionModel'][j]['coordinateUse'].startswith('nonmetric')
                expectedEdges={'FG','GH','HD','DC','CB','BA','AD','BF','CG','FE','EH','AE','BD','FD'};assert set(spec['segments'])==expectedEdges
            else:close(length('B','F'),4);close(length('B','D'),4*rt(2));close(length('F','D'),4*rt(3))
        if n==12:close(length('P','Q'),9*rt(5));close(length('Q','R')/length('P','R'),Q(1,2))
        if n==13:
            for pt in ['P','Q','A','B']:close(length('O',pt),1)
            assert angle('O','A','P')<angle('O','A','Q')<90
            assert length('Q','K')>length('P','H') and length('O','K')<length('O','H') and length('A','U')>length('A','T')
        if n==18:inside('D','A','B');close(length('A','D'),length('C','D'));close(length('A','B'),5+5*rt(2));close(angle('A','B','C'),22.5)
        if n==19:
            close(length('O','A'),length('O','B'));inside('A','O','D');inside('C','O','B')
            for pt in ['A','B','_V']:close(length('O',pt),4)
            ar=spec['arcs']['quarter'];assert ar['dir']=='ccw'
            pts=[p[x] for x in ['A','C','B','D']];shoelace=abs(sum(pts[i][0]*pts[(i+1)%4][1]-pts[(i+1)%4][0]*pts[i][1] for i in range(4)))/(2*scale**2);close(shoelace,6*rt(3))
        notes.append(dict(specSha256=hash(folder/art['specPath']),geometryMatchesNewGivens=True,coordinateTolerance='1e-8',pictorialProjectionOnly=n==11 and j==0))
    return notes

rows=[]
for n,targetsHere in targets.items():
    file=ROOT/'candidates'/f'q{n:02}'/f'q{n:02}.json';c=json.loads(file.read_text(encoding='utf-8'))
    if n<=15:
        if n==1:opts=[(x,) for x in c['choices']];target=('만화',);matches=[i for i,v in enumerate(opts) if v==target]
        elif n==10:
            names=[tuple(re.findall(r'\$([^$]+)\$',x)) for x in c['choices']];opts=[(fp[a],fq[b]) for a,b in names];matches=[i for i,v in enumerate(opts) if all(eq(a,b) for a,b in zip(v,targetsHere))]
        elif n==13:opts=[tuple(x.split(', ')) for x in c['choices']];target=('증가','감소','증가');matches=[i for i,v in enumerate(opts) if v==target]
        else:
            opts=[values(x) for x in c['choices']];assert all(len(x)==len(targetsHere) for x in opts),(n,opts,targetsHere)
            matches=[i for i,v in enumerate(opts) if all(eq(a,b) for a,b in zip(v,targetsHere))]
        assert len(opts)==5 and len(matches)==1,(n,opts,matches)
        for a,b in itertools.combinations(opts,2):assert any(x!=y if isinstance(x,str) else not eq(x,y) for x,y in zip(a,b)),(n,a,b)
        assert c['answer']=='①②③④⑤'[matches[0]],(n,c['answer'],matches)
        choiceCheck=dict(count=5,distinctDisplayedValuesOrRecords=True,oneCorrect=True,correctChoiceIndex=matches[0]+1)
    else:
        assert c['choices']==[];ans=values(c['answer']);assert len(ans)==len(targetsHere) and all(eq(a,b) for a,b in zip(ans,targetsHere)),(n,ans,targetsHere)
        if n==16:assert '중앙값' in c['answer']
        assert sum(x['score'] for x in c['facts']['authorRubric'])==c['score']
        if n==17:assert [x['number'] for x in c['facts']['subQuestions']]==[1,2] and [x['score'] for x in c['facts']['subQuestions']]==[5,5]
        choiceCheck=dict(count=0,exactWrittenTargets=True,rubricTotal=c['score'])
    record=dict(questionNumber=n,authorId=c['authorId'],method='exact-author-recomputation-and-actual-displayed-option-check',status='author-check-passed',independentVerification=False,candidateFileSha256=hash(file),mathDataSha256=hash(file.parent/'math-data.json'),targets=[str(t) for t in targetsHere],evidence=ev[n],choices=choiceCheck,assets=geometry(c),leafKeys=[f'{n}.1',f'{n}.2'] if n==17 else [str(n)],limits='No source answers/keys used. This is an author check, not a blind solve or curriculum/rights/family approval.')
    put(ROOT/'checks'/f'q{n:02}.json',record);rows.append(dict(questionNumber=n,checkSha256=hash(ROOT/'checks'/f'q{n:02}.json'),leafCount=len(record['leafKeys'])))
assert set(targets)==set(range(1,20))-{15}
put(ROOT/'checks/exact-summary.json',dict(candidateCount=18,mcCount=14,writtenCount=4,authoredLeafCount=sum(r['leafCount'] for r in rows),sourceParentCount=19,sourceLeafCount=20,heldBeforeAuthoring=[15],excludedBeforeAuthoring=[],independentVerification=False,method='SymPy1.14 exact calculations; numeric checks only for actual construction coordinates; definition-based statistics;parent scores counted once',results=rows))
print('18 author checks passed:14 MC actual five options unique/one answer;4 written/19 leaves/95 points; q15 held;source observation data unchanged.')
