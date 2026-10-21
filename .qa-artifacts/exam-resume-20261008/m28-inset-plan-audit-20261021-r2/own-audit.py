from pathlib import Path
import sys,json,math,hashlib,xml.etree.ElementTree as ET,re
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');GAP=.001
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M28 shared unrounded interval/독립 QA\n',encoding='utf8');assert '독립' in (P/'own-probe.txt').read_text(encoding='utf8')
B=R/'.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1';parent=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-inset-geometry-20261021-r3'
files=list((R/'vendor/figure-engine/core').glob('*.py'))+[R/'src/lib/middle/m2Quad.ts',R/'src/lib/examStudy/adapters.ts',B/'own-actual-outputs.json',parent/'experiment.py',parent/'experiment-results.json']
before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
sys.dont_write_bytecode=True;sys.path.insert(0,str(R/'vendor/figure-engine'))
from core import figure_scene as sc
from core.figure_quality import sanitize_svg
def interval(v,p,q):
 u=complex(p[0]-v[0],p[1]-v[1]);w=complex(q[0]-v[0],q[1]-v[1]);assert abs(u)>1e-12 and abs(w)>1e-12
 dot=(u.conjugate()*w);delta=math.atan2(dot.imag,dot.real);start=math.atan2(u.imag,u.real);assert abs(delta)>2*GAP
 sign=1 if delta>0 else -1
 return start+sign*GAP,delta-2*sign*GAP
def candidate(vx,vy,p,q,r=26):
 assert math.isfinite(r) and r>0
 a,d=interval((vx,vy),p,q);ends=[(vx+r*math.cos(t),vy+r*math.sin(t))for t in [a,a+d]]
 assert all(math.isfinite(v)for xy in ends for v in xy)
 return f'M {ends[0][0]:.6f} {ends[0][1]:.6f} A {r} {r} 0 0 {int(d>0)} {ends[1][0]:.6f} {ends[1][1]:.6f}'
originalEmit=sc.angle_arc;originalSample=sc.FigureScene._angle_mark_polylines
def sample(self,angle):
 if angle.right:return originalSample(self,angle)
 v,p,q=(self.points[n]for n in [angle.vertex,angle.p1,angle.p2]);a,d=interval((v.x,v.y),(p.x,p.y),(q.x,q.y));radius=self.style.angle_radius if angle.radius is None else angle.radius
 return [tuple(sc.Point(f'{angle.name}@{k}:{i}',v.x+(radius-k*sc._MARK_GAP)*math.cos(a+d*i/16),v.y+(radius-k*sc._MARK_GAP)*math.sin(a+d*i/16))for i in range(17))for k in range(angle.arcs)if radius-k*sc._MARK_GAP>0]
def circle(d):
 vals=list(map(float,re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',d)));x,y,r,ry,phi,large,sweep,X,Y=vals;assert r==ry and phi==large==0
 dx,dy=(x-X)/2,(y-Y)/2;L2=dx*dx+dy*dy;assert L2>0
 coef=math.sqrt(max(0,r*r/L2-1))*(1 if sweep else -1);c=((x+X)/2+coef*dy,(y+Y)/2-coef*dx)
 a=math.atan2(y-c[1],x-c[0]);b=math.atan2(Y-c[1],X-c[0]);delta=(b-a)%(2*math.pi)if sweep else -((a-b)%(2*math.pi))
 return c,r,a,delta
def analyze(svg):
 root=ET.fromstring(svg);lines=[n for n in root.iter()if n.tag.endswith('line')];assert len(lines)==4
 pair=lambda e:((float(e.get('x1')),float(e.get('y1'))),(float(e.get('x2')),float(e.get('y2'))))
 ab,dc,ad,bc=map(pair,lines);a,b=ab;d,c=dc;assert ad==(a,d)and bc==(b,c);poly=[a,b,c,d]
 cross=lambda u,v:u[0]*v[1]-u[1]*v[0]
 orient=1 if sum(cross(poly[i],poly[(i+1)%4])for i in range(4))>0 else -1
 out=[]
 for n in root.iter():
  path=n.get('d','')
  if ' A 'not in path:continue
  center,r,t,delta=circle(path);margins=[]
  for v,w in zip(poly,poly[1:]+poly[:1]):
   dx,dy=w[0]-v[0],w[1]-v[1];L=math.hypot(dx,dy);normal=(-orient*dy/L,orient*dx/L)
   k=normal[0]*(center[0]-v[0])+normal[1]*(center[1]-v[1]);theta=math.atan2(normal[1],normal[0])+math.pi
   travel=(theta-t)%(2*math.pi)if delta>0 else(t-theta)%(2*math.pi)
   values=[k+r*(normal[0]*math.cos(z)+normal[1]*math.sin(z))for z in [t,t+delta]]
   if travel<=abs(delta):values.append(k-r)
   margins.append(min(values))
  out.append({'path':path,'circleCenter':center,'radius':r,'delta':delta,'margins':margins,'strict':min(margins)>=0})
 return {'sha256':sha(svg.encode()),'arcs':out,'strict':all(x['strict']for x in out),'nonArcMarkup':[(n.tag,sorted(n.attrib.items()),n.text)for n in root.iter()if not(n.tag.endswith('path')and ' A 'in n.get('d',''))]}
rows=json.loads((B/'own-actual-outputs.json').read_text(encoding='utf-8-sig'))['rows'];specs={sha(json.dumps(r['figureSpec'],sort_keys=True,separators=(',',':')).encode()):r['figureSpec']for r in rows};assert len(specs)==64
baseline={key:analyze(sanitize_svg(sc.compile_figure_spec(spec).render_svg()))for key,spec in specs.items()}
results={};sampleChecks=[]
try:
 sc.angle_arc=candidate;sc.FigureScene._angle_mark_polylines=sample
 for key,spec in specs.items():
  scene=sc.compile_figure_spec(spec);svg=sanitize_svg(scene.render_svg());info=analyze(svg);info['nonArcEqualsDefault']=info['nonArcMarkup']==baseline[key]['nonArcMarkup'];del info['nonArcMarkup'];results[key]=info
  tr=scene.resolve().translation
  for angle in scene.angles.values():
   v,p,q=(scene.points[n]for n in [angle.vertex,angle.p1,angle.p2]);sweep=interval((v.x,v.y),(p.x,p.y),(q.x,q.y));transweep=interval((v.x+tr[0],v.y+tr[1]),(p.x+tr[0],p.y+tr[1]),(q.x+tr[0],q.y+tr[1]));points=sample(scene,angle)[0];path=candidate(v.x+tr[0],v.y+tr[1],(p.x+tr[0],p.y+tr[1]),(q.x+tr[0],q.y+tr[1]),angle.radius);cc,rr,tt,dd=circle(path)
   radial=max(abs(math.dist((p.x+tr[0],p.y+tr[1]),cc)-rr)for p in points)
   sampleChecks.append({'spec':key,'angle':angle.name,'translationIntervalError':max(abs(x-y)for x,y in zip(sweep,transweep)),'maximumRadialDeviationFromSerializedCircle':radial,'centerErrorFromTranslatedVertex':math.dist(cc,(v.x+tr[0],v.y+tr[1])),'polylineSagittaBound':angle.radius*(1-math.cos(abs(sweep[1])/32))})
finally:sc.angle_arc=originalEmit;sc.FigureScene._angle_mark_polylines=originalSample
small=[]
for name,theta,r in [('equal-gap',.002,10),('below-gap',.001,10),('tiny-radius',.1,1e-8),('ordinary',.1,10),('near-straight',math.pi-.00001,10)]:
 try:
  path=candidate(0,0,(1,0),(math.cos(theta),math.sin(theta)),r);cc,rr,a,dd=circle(path);small.append({'id':name,'acceptedByQAFormula':True,'path':path,'circleCenter':cc})
 except Exception as e:small.append({'id':name,'acceptedByQAFormula':False,'error':str(e)})
after={p:sha(Path(p).read_bytes())for p in before};assert before==after
dump('own-after.json',after);dump('own-results.json',{'actualCurrentBaseline64':64,'QAOnlySharedIntervalNativeRenders':64,'strictZeroTolerance':sum(x['strict']for x in results.values()),'minimumSignedMargin':min(m for x in results.values()for a in x['arcs']for m in a['margins']),'nonArcUnchanged':sum(x['nonArcEqualsDefault']for x in results.values()),'results':results,'sampleComparisons':sampleChecks,'smallCases':small,'sourceUnchanged':True,'productionApplied':False})
print(json.dumps({'strict':sum(x['strict']for x in results.values()),'minMargin':min(m for x in results.values()for a in x['arcs']for m in a['margins']),'nonArcUnchanged':sum(x['nonArcEqualsDefault']for x in results.values()),'samples':len(sampleChecks)}))
