"""QA-only inset of the same unrounded rays, shared by rendering and sampling.

No production edits or claim of a general stroke-envelope/grade proof.
"""
from pathlib import Path
import ast,hashlib,json,math,sys,xml.etree.ElementTree as ET
OUT=Path(__file__).resolve().parent;ROOT=Path.cwd()
prior=ROOT/'.qa-artifacts/exam-resume-20261008/m28-strict-precision-audit-20261021-r1/own-audit.py'
tree=ast.parse(prior.read_text(encoding='utf-8-sig'))
ns={'math':math,'re':__import__('re'),'ET':ET,'sha':lambda b:hashlib.sha256(b).hexdigest()}
equations=ROOT/'.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1/own-check-v2.py'
defs=ast.parse(equations.read_text(encoding='utf-8-sig'))
exec(compile(ast.Module(body=[n for n in defs.body if isinstance(n,ast.FunctionDef) and n.name in {'sub','cross','numeric_arc','arc_margin'}],type_ignores=[]),'prior-independent-analytic-equations','exec'),ns)
ns['ns']=ns
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='analyze'],type_ignores=[]),'prior-independent-analyzer','exec'),ns)
sys.path.insert(0,str(ROOT/'vendor/figure-engine'))
from core import figure_scene as scene
from core.figure_quality import sanitize_svg

def candidate(vx,vy,p1,p2,r=26):
    # Do not quantize or move the scene's rays. Only shorten the angle mark.
    a0=math.atan2(p1[1]-vy,p1[0]-vx)
    da=(math.atan2(p2[1]-vy,p2[0]-vx)-a0+math.pi)%(2*math.pi)-math.pi
    gap=1e-3
    assert r>0 and abs(da)>2*gap
    sign=1 if da>0 else -1
    a0+=sign*gap;da-=2*sign*gap
    x0,y0=vx+r*math.cos(a0),vy+r*math.sin(a0)
    x1,y1=vx+r*math.cos(a0+da),vy+r*math.sin(a0+da)
    return f'M {x0:.6f} {y0:.6f} A {r} {r} 0 0 {1 if da>0 else 0} {x1:.6f} {y1:.6f}'

rows=json.loads((equations.parent/'own-actual-outputs.json').read_text(encoding='utf-8-sig'))['rows']
specs={hashlib.sha256(json.dumps(r['figureSpec'],sort_keys=True,separators=(',',':')).encode()).hexdigest():r['figureSpec'] for r in rows}
files=list((ROOT/'vendor/figure-engine/core').glob('*.py'))+[ROOT/'src/lib/middle/m2Quad.ts']
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
old=scene.angle_arc;results=[]
try:
    scene.angle_arc=candidate
    for key,spec in specs.items():
        svg=sanitize_svg(scene.compile_figure_spec(spec).render_svg())
        folder=OUT/'native';folder.mkdir(exist_ok=True);(folder/(key+'.svg')).write_bytes(svg.encode('utf-8'))
        result=ns['analyze'](svg);results.append(dict(specSHA256=key,**result))
finally:scene.angle_arc=old
assert before=={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
report=dict(uniqueSpecs=len(results),strictZeroTolerancePassed=sum(r['strict'] for r in results),
    minimumSignedMargin=min(m for r in results for a in r['arcs'] for m in a['margins'].values()),
    sourceSHA256=before,results=results,unroundedRaysPreserved=True,insetRadians=1e-3,endpointDecimalPlaces=6,
    productionApplied=False,newQuestionsOrDBWrites=0,notIndependentNewRun=True)
(OUT/'experiment-results.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps({k:report[k] for k in ['uniqueSpecs','strictZeroTolerancePassed','minimumSignedMargin','productionApplied']}))
