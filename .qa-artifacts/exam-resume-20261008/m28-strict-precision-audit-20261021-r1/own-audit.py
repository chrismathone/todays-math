from pathlib import Path
import ast, json, hashlib, math, sys, inspect, xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent
R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
B=R/'.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(name,obj): (P/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 probe: 각호·경계 보존\n',encoding='utf8')
assert '각호' in (P/'own-probe.txt').read_text(encoding='utf8')
# Reuse only our previously sealed independent analytic circle/half-plane equations,
# not its production imports, expected decisions, or output counts.
tree=ast.parse((B/'own-check-v2.py').read_text(encoding='utf8'))
names={'sub','cross','numeric_arc','arc_margin'}
ns={'math':math,'re':__import__('re')}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'own-prior-analytic-equations','exec'),ns)
files=[R/'src/lib/middle/m2Quad.ts',R/'src/lib/examStudy/adapters.ts',R/'docs/planning/tracks/reports/exam-engine-m28-20261021.md',Path('D:/todays-math/AGENTS.md'),B/'own-actual-outputs.json',B/'own-check-v2.py']
files+=list((R/'vendor/figure-engine/core').glob('*.py'))
files+=list((B/'own-native-svg').glob('*.svg'))
before={str(f):sha(f.read_bytes()) for f in files}
dump('own-before.json',before)
sys.dont_write_bytecode=True
sys.path.insert(0,str(R/'vendor/figure-engine'))
from core import figure_scene as scene, figure_svg as svgmod
from core.figure_quality import sanitize_svg
original=scene.angle_arc
src=inspect.getsource(svgmod.arc)
assert ':.1f' in src
env=dict(svgmod.__dict__)
exec(src.replace(':.1f',':.6f'),env)
arc6=env['arc']
def precision(vx,vy,p1,p2,r=26):
    a0=svgmod.ray_angle(vx,vy,*p1);a1=svgmod.ray_angle(vx,vy,*p2)
    da=(a1-a0+180)%360-180
    return arc6(vx,vy,r,a0,a0+da)
def inset(vx,vy,p1,p2,r=26):
    # QA-only opt-in: use the serialized line vertices, then trim BOTH arc ends
    # by a fixed positive angular gap. This changes the mark, not the angle given.
    vx,vy=round(vx,3),round(vy,3)
    p1=tuple(round(x,3) for x in p1);p2=tuple(round(x,3) for x in p2)
    a0=svgmod.ray_angle(vx,vy,*p1);a1=svgmod.ray_angle(vx,vy,*p2)
    da=(a1-a0+180)%360-180;gap=math.degrees(1e-5)
    assert abs(da)>2*gap
    sign=1 if da>0 else -1
    return arc6(vx,vy,r,a0+sign*gap,a0+da-sign*gap)
(P/'own-opt-in-candidate.py.txt').write_text(inspect.getsource(precision)+'\n'+inspect.getsource(inset),encoding='utf8')
def analyze(svg):
    root=ET.fromstring(svg);lines=[e for e in root.iter() if e.tag.split('}')[-1]=='line']
    # Current segment output order AB, DC, AD, BC; assert endpoints incidence.
    pair=lambda e:((float(e.get('x1')),float(e.get('y1'))),(float(e.get('x2')),float(e.get('y2'))))
    ab,dc,ad,bc=map(pair,lines);a,b=ab;d,c=dc
    assert ad==(a,d) and bc==(b,c)
    vertices=dict(zip('ABCD',[a,b,c,d]));out=[]
    for e in root.iter():
        path=e.get('d','')
        if ' A ' not in path: continue
        arc=ns['numeric_arc'](path)
        k=min('AC',key=lambda k:math.dist(arc[:2],vertices[k]))
        margins={i+j:ns['arc_margin'](arc,vertices,vertices[i],vertices[j]) for i,j in zip('ABCD','BCDA')}
        out.append({'vertex':k,'path':path,'circle':arc,'centerError':math.dist(arc[:2],vertices[k]),'margins':margins,'strict':min(margins.values())>=0})
    assert len(out)==2
    return {'sha256':sha(svg.encode()),'arcs':out,'strict':all(x['strict'] for x in out)}
rows=json.loads((B/'own-actual-outputs.json').read_text(encoding='utf-8-sig'))['rows']
specs={sha(json.dumps(r['figureSpec'],sort_keys=True,separators=(',',':')).encode()):r['figureSpec'] for r in rows}
results={}
try:
 for mode,fn in [('current',original),('precision6Only',precision),('serializedRaysInset6',inset)]:
    scene.angle_arc=fn;checks={}
    for key,spec in specs.items():
        text=sanitize_svg(scene.compile_figure_spec(spec).render_svg())
        checks[key]=analyze(text)
        if mode=='current':checks[key]['sameAsHistoricalSVG']=text.encode()==(B/'own-native-svg'/f'{key}.svg').read_bytes()
    results[mode]={'count':len(checks),'strictCountZeroTolerance':sum(c['strict'] for c in checks.values()),'minimumSignedDistance':min(v for c in checks.values() for a in c['arcs'] for v in a['margins'].values()),'checks':checks}
finally:scene.angle_arc=original
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__).read_bytes()) for n,m in sys.modules.copy().items() if n.startswith('core.') and getattr(m,'__file__',None)}
after={f:sha(Path(f).read_bytes()) for f in before}
assert before==after
dump('own-after.json',after);dump('own-first-import-closure.json',closure);dump('own-results.json',results)
print(json.dumps({k:{f:v[f] for f in ['count','strictCountZeroTolerance','minimumSignedDistance']} for k,v in results.items()}))

