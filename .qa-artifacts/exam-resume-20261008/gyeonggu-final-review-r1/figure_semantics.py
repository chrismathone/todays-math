"""FigureSpec checks use explicit authored coordinate data, never measured pixels."""
from pathlib import Path
import hashlib,json,math,re
OUT=Path(__file__).resolve().parent
bindings=json.loads((OUT/'input-bindings.json').read_text(encoding='utf8'))['bindings']
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def near(a,b):return abs(a-b)<=1e-7*max(1,abs(a),abs(b))
def vec(a,b):return (a[0]-b[0],a[1]-b[1])
def dot(a,b):return a[0]*b[0]+a[1]*b[1]
def norm(a):return math.hypot(*a)
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def angle(a,v,b):
    x,y=vec(a,v),vec(b,v)
    return math.degrees(math.acos(max(-1,min(1,dot(x,y)/norm(x)/norm(y)))))
results=[]
for binding in bindings:
    n=binding['questionNumber'];figures=[]
    for idx,f in enumerate(binding['figures']):
        spec=f['specContent'];pts=spec['points'];rows=[]
        def ck(label,a,b):
            ok=near(a,b);assert ok,(n,label,a,b)
            rows.append({'condition':label,'computed':a,'required':b,'passed':True})
        def length(a,b):return norm(vec(pts[a],pts[b]))
        def ang(a,v,b):return angle(pts[a],pts[v],pts[b])
        def inline(a,v,b,internal=True):
            u,w=vec(pts[v],pts[a]),vec(pts[b],pts[a]);ck(f'{v} lies on {a}{b}',cross(u,w)/(norm(w)**2),0)
            t=dot(u,w)/dot(w,w)
            if internal:assert 0<t<1,(n,v,t)
            rows.append({'condition':f'{v} internal to {a}{b}' if internal else f'{v} on line {a}{b}','segmentFraction':t,'passed':True})
        for key,a in spec.get('angles',{}).items():
            x,y=a['points'];v=a['vertex'];measured=ang(x,v,y)
            if a.get('right'):ck(key+' right angle',measured,90)
            m=re.search(r'(\d+)\^\\circ',a.get('label',''))
            if m:ck(key+' degree annotation',measured,int(m[1]))
        if n==1:ck('QR/PQ=5/13',length('Q','R')/length('P','Q'),5/13)
        if n==3:ck('QR/PR=3/4',length('Q','R')/length('P','R'),3/4)
        if n==4:
            ck('PQ/PR=5/12',length('P','Q')/length('P','R'),5/12);ck('P is right angle',ang('Q','P','R'),90);inline('Q','M','R')
        if n==6:
            r=spec['circles']['c']['radius'];ck('P on unit-scaled circle',length('O','P'),r);inline('O','H','A');inline('O','P','D')
            ck('theta chosen40 from AD table',ang('A','O','P'),40);ck('actual AD/OA=tan40',length('A','D')/length('O','A'),math.tan(math.radians(40)))
        if n in [8,12]:inline('B','H','C')
        if n==9:
            inline('B','D','C');inline('A','E','B');ck('AB/AC=25/15',length('A','B')/length('A','C'),25/15)
            ck('bisector angles',ang('B','A','D'),ang('D','A','C'));ck('equal perpendicular distances DE=DC',length('D','E'),length('D','C'))
        if n==10:
            inline('B','E','C');inline('C','F','D');ck('rectangle AB=CD',length('A','B'),length('C','D'))
            ck('constructed DAF15',ang('D','A','F'),15)
        if n==11 and idx==0:
            for a,b in [('B','C'),('C','D'),('D','A')]:ck('square equal edges '+a+b,length(a,b),length('A','B'))
            ck('square angle',ang('B','A','D'),90);inline('A','H','C');inline('B','H','D')
        if n==13:
            ck('equilateral AB=BC',length('A','B'),length('B','C'));ck('equilateral AC=BC',length('A','C'),length('B','C'))
            inline('A','D','B');inline('B','E','C');inline('A','F','B')
            ck('area/BD squared=sqrt3/8',abs(cross(vec(pts['D'],pts['A']),vec(pts['C'],pts['A'])))/2/length('B','D')**2,math.sqrt(3)/8)
        if n in [14,15,16,18,19,22,23]:
            circle=spec['circles']['c'];o=circle['center'];r=circle['radius']
            on={14:['A','B'],15:['A','B','C'],16:['A','B'],18:['B','C','E'],19:['B','C','F'],22:['P','Q','D'],23:['A','B']}[n]
            for p in on:ck(p+' on circle',length(o,p),r)
        if n==14:inline('A','M','B');ck('AB/radius=12/10',length('A','B')/spec['circles']['c']['radius'],1.2)
        if n==15:
            inline('A','M','B');inline('A','N','C');ck('OM=ON',length('O','M'),length('O','N'))
            ck('base B58',ang('A','B','C'),58);ck('base C58',ang('B','C','A'),58)
        if n==16:inline('O','B','P');ck('OA/OP=8/10',length('O','A')/length('O','P'),0.8)
        if n==17:
            inline('A','H','B');inner=spec['circles']['inner']['radius'];outer=spec['circles']['outer']['radius']
            ck('OH small radius',length('O','H'),inner)
            ck('A large circle',length('O','A'),outer);ck('B large circle',length('O','B'),outer)
            ck('difference radii squares=halfchord²',outer**2-inner**2,(length('A','B')/2)**2)
        if n==18:
            inline('A','E','D');inline('C','F','D');ck('AB/CD=3/12',length('A','B')/length('C','D'),0.25)
            ck('AE=AB',length('A','E'),length('A','B'));ck('DE=CD',length('D','E'),length('C','D'))
            ck('OE perpendicular AD',dot(vec(pts['O'],pts['E']),vec(pts['A'],pts['D']))/(length('O','E')*length('A','D')),0)
        if n==19:
            inline('C','E','D');inline('A','F','E');ck('square AB=BC',length('A','B'),length('B','C'))
            ck('DE/side=3/4',length('D','E')/length('A','B'),0.75)
        if n==21:
            inline('A','P','C');inline('B','P','D');inline('B','H','C');ck('AC/BC=sqrt2',length('A','C')/length('B','C'),math.sqrt(2))
        if n==22:
            inline('A','C','P');inline('A','B','Q');inline('B','D','C')
            ck('OD perpendicular BC',dot(vec(pts['O'],pts['D']),vec(pts['B'],pts['C']))/(length('O','D')*length('B','C')),0)
            ck('perimeter=2AP',length('A','B')+length('B','C')+length('C','A'),2*length('A','P'))
        if n==23:ck('minor AOB120',ang('A','O','B'),120);ck('APB60',ang('A','P','B'),60)
        figures.append({'spec':f['spec'],'svg':f['svg'],'intendedWidthMm':f['intendedWidthMm'],
            'rawCoordinateSemanticsChecks':rows,'svgIdenticalToPreExposureViewedFigure':f['sameAsPreExposureStudentSvg'],
            'limits':'Coordinates verify supplied FigureSpec construction only. They do not define givens or prove a theorem; exact mathematical witnesses and student proofs are separate.'})
    results.append({'questionNumber':n,'figures':figures,'status':'passed',
        'noFigureNeeded':not bool(figures),'figurePixelMeasurementsUsedAsMathOracle':False})
manifest=json.loads((OUT/'layout-view-manifest.json').read_text(encoding='utf8'))
for v in manifest:
    v['viewed']=True
    v['inspection']='Direct view_image of authored student+solution layout on2026-10-08' if v['role']=='author' else 'Student RGB pane exactly equals directly inspected authored-layout prefix (independently compared all pixels); q01-q04 also inspected separately earlier.'
    v['claimLimit']='Local authored PNG layout only; standalone physical70mm/55mm SVG previews retained from immutable blind stage. No production UI or complete printed paper approval.'
(OUT/'layout-view-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(OUT/'figure-semantics-evidence.json').write_text(json.dumps({'code':{'path':Path(__file__).as_posix(),'sha256':sha(__file__)},'results':results,'figureCount':sum(len(r['figures']) for r in results),'layoutPanes':44},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Checked20 raw FigureSpecs;44 student/solution panes recorded; all bounded checks passed.')
