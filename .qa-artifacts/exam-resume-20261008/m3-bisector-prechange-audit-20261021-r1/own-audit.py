from pathlib import Path
import math,json,hashlib,sys,copy,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M3 각 이등분 노출 검산\n',encoding='utf8');assert '검산'in(P/'own-probe.txt').read_text(encoding='utf8')
source=R/'src/lib/middle/m2GeoTri.ts';handoff=R/'docs/planning/tracks/brief-engine-handoff-display-20261021.md';text=source.read_text(encoding='utf8');card=next(s for s in handoff.read_text(encoding='utf8').splitlines()if s.startswith('| M3 |'))
files=[source,handoff,R/'src/lib/middle/figureDims.ts']+list((R/'scripts/figure').glob('*.py'))+list((R/'vendor/figure-engine/core').glob('*.py'))
before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
assert 'const w = 2 * intBetween(rng, 20, 40);'in text
assert 'a1: { vertex: "O", points: ["A", "P"], label: `${w / 2}°` }'in text
assert 'a2: { vertex: "O", points: ["P", "B"], label: `${w / 2}°` }'in text
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import render_spec
from core.figure_scene import compile_figure_spec
def sub(a,b):return(a[0]-b[0],a[1]-b[1])
def dot(a,b):return a[0]*b[0]+a[1]*b[1]
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def angle(a,v,b):
 u,w=sub(a,v),sub(b,v);return math.degrees(math.atan2(abs(cross(u,w)),dot(u,w)))
def fit(pts):
 xs=[v[0]for v in pts.values()];ys=[v[1]for v in pts.values()];s=min(184/(max(xs)-min(xs)),154/(max(ys)-min(ys)));rnd=lambda n:math.floor(n*100+.5)/100
 return {k:[rnd(18+(x-min(xs))*s),rnd(172-(y-min(ys))*s)]for k,(x,y)in pts.items()}
def overlap(a,b):return min(a[2],b[2])>max(a[0],b[0])and min(a[3],b[3])>max(a[1],b[1])
records=[]
for w in range(40,81,2):
 a=math.radians(w);h=a/2;proj=95*math.cos(h)
 pts={'O':[0,0],'B':[150,0],'A':[150*math.cos(a),150*math.sin(a)],'P':[95*math.cos(h),95*math.sin(h)],'C':[proj*math.cos(a),proj*math.sin(a)],'D':[proj,0]}
 expected=360-90-90-w
 angles={'AOB':angle(pts['A'],pts['O'],pts['B']),'AOP':angle(pts['A'],pts['O'],pts['P']),'POB':angle(pts['P'],pts['O'],pts['B']),'OCP':angle(pts['O'],pts['C'],pts['P']),'ODP':angle(pts['O'],pts['D'],pts['P']),'CPD':angle(pts['C'],pts['P'],pts['D'])}
 assert max(abs(angles[k]-v)for k,v in [('AOB',w),('AOP',w/2),('POB',w/2),('OCP',90),('ODP',90),('CPD',expected)])<1e-10
 poly=[pts[k]for k in ['O','C','P','D']];turns=[cross(sub(poly[(i+1)%4],poly[i]),sub(poly[(i+2)%4],poly[(i+1)%4]))for i in range(4)];assert all(x<0 for x in turns)or all(x>0 for x in turns)
 spec={'version':2,'points':fit(pts),'segments':{'OA':['O','A'],'OB':['O','B'],'OP':['O','P'],'PC':['P','C'],'PD':['P','D']},'angles':{'a1':{'vertex':'O','points':['A','P'],'label':f'{w//2}°'},'a2':{'vertex':'O','points':['P','B'],'label':f'{w//2}°'},'ax':{'vertex':'P','points':['C','D'],'label':'x'}},'labels':{k:k for k in ['O','A','B','P','C','D']}}
 # QA-only literal source port and mark-only proposal. Never TS/API execution.
 proposal=copy.deepcopy(spec);proposal['angles']['a1']={'vertex':'O','points':['A','P'],'arcs':1,'radius':16};proposal['angles']['a2']={'vertex':'O','points':['P','B'],'arcs':1,'radius':16};proposal['angles']['whole']={'vertex':'O','points':['A','B'],'label':f'{w}°','radius':32}
 current=render_spec.render_json(json.dumps(spec));candidate=render_spec.render_json(json.dumps(proposal));assert 'svg'in current,current
 def texts(svg):return [''.join(n.itertext()).strip()for n in ET.fromstring(svg).iter()if n.tag.endswith('text')]
 beforelabels=texts(current['svg']);assert beforelabels.count(f'{w//2}°')==2
 check={'sourcePortRendered':True,'originalSVG_SHA':sha(current['svg'].encode()),'numericHalfLabels':2,'proposalStrictRendered':'svg'in candidate,'proposalError':candidate.get('error')}
 if 'svg'in candidate:
  afterlabels=texts(candidate['svg']);assert afterlabels.count(f'{w}°')==1 and f'{w//2}°'not in afterlabels and f'{expected}°'not in afterlabels
  scene=compile_figure_spec(proposal);resolved=scene.resolve();boxes=dict(resolved.label_boxes);pairs=[(a,b)for i,a in enumerate(boxes)for b in list(boxes)[i+1:]if overlap(boxes[a],boxes[b])]
  check.update(proposalSVG_SHA=sha(candidate['svg'].encode()),proposalLabels=afterlabels,labelBoxOverlaps=pairs,angleLeaders=list(resolved.angle_leaders),allOriginalPointsSegmentsPointLabelsUnchanged=all(spec[k]==proposal[k]for k in ['points','segments','labels']))
 for which,obj in [('current',current),('candidate',candidate)]:
  if w==42 and 'svg'in obj:(P/f'own-w42-{which}.svg').write_text(obj['svg'],encoding='utf8')
 if w==42:dump('own-w42-specimens.json',{'sourceDerived':spec,'QAOnlyProposed':proposal,'newQuestion':False})
 fitted=spec['points'];fittedError=abs(angle(fitted['C'],fitted['P'],fitted['D'])-expected)
 records.append({'w':w,'domainSource':'2*integer20..40','independentExpectedCPD':expected,'rawCoordinateAngles':angles,'quadrilateralConvex':True,'positiveRayAndFeetDistances':min(math.dist(pts[a],pts[b])for a,b in [('O','C'),('C','P'),('P','D'),('D','O')]),'fittedCPDAngleErrorDegrees':fittedError,**check})
after={f:sha(Path(f).read_bytes())for f in before};assert before==after;dump('own-after.json',after)
dump('own-results.json',{'originalCard':card,'domainCount':21,'rawSourceGeometryAndExpectedAnglesPass':21,'literalSourcePortNativeRenders':21,'QAOnlyCandidateNativeSuccess':sum(r['proposalStrictRendered']for r in records),'candidateLabelOverlapRows':sum(bool(r.get('labelBoxOverlaps'))for r in records),'records':records,'actualTSOrAPI':False,'productionApplied':False,'sourceUnchanged':True})
print(json.dumps({'domain':21,'halfLabelExposed':21,'QAProposalRenders':sum(r['proposalStrictRendered']for r in records),'overlapRows':sum(bool(r.get('labelBoxOverlaps'))for r in records)}))
