"""Bounded QA candidates only; no producer or engine changes, no pixel math."""
from pathlib import Path
import copy,datetime,hashlib,json,math,sys
ROOT=Path.cwd();OUT=Path(__file__).resolve().parent
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'scripts/figure'),str(ROOT/'vendor/figure-engine')]
from core.figure_scene import compile_figure_spec
source=ROOT/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1/actual-current-outputs.json'
data=json.loads(source.read_text(encoding='utf-8'))
tracked=[source,ROOT/'src/lib/middle/m2GeoQuad.ts',ROOT/'vendor/figure-engine/core/figure_scene.py',ROOT/'vendor/figure-engine/core/figure_svg.py']
hashes=lambda:{p.as_posix():hashlib.sha256(p.read_bytes()).hexdigest()for p in tracked}
before=hashes();assert not(OUT/'results-r1.json').exists()
sub=lambda a,b:(a[0]-b[0],a[1]-b[1])
cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
def corners(b):return[(b[0],b[1]),(b[2],b[1]),(b[2],b[3]),(b[0],b[3])]
def grow(b,p):return b[0]-p,b[1]-p,b[2]+p,b[3]+p
def overlap(a,b):return min(a[2],b[2])>max(a[0],b[0])and min(a[3],b[3])>max(a[1],b[1])
def intersects(a,b,box):
 lo,hi=0.,1.
 for p,d,mn,mx in [(a[0],b[0]-a[0],box[0],box[2]),(a[1],b[1]-a[1],box[1],box[3])]:
  if d==0:
   if p<mn or p>mx:return False
  else:
   x,y=(mn-p)/d,(mx-p)/d;lo=max(lo,min(x,y));hi=min(hi,max(x,y))
   if lo>hi:return False
 return True
def assess(original,radius,distance):
 s=copy.deepcopy(original);s['angles']['angA'].update(radius=radius,label_distance=distance)
 try:
  scene=compile_figure_spec(s);z=scene.resolve()
  b=z.label_boxes['angle:angA'];pad=scene.style.halo_width/2+.5;halo=grow(b,pad)
  pts=s['points'];poly=[pts[k]for k in 'ABCD']
  orient=1 if sum(cross(poly[i],poly[(i+1)%4])for i in range(4))>0 else -1
  inside=min(orient*cross(sub(pts[d],pts[a]),sub(q,pts[a]))/math.dist(pts[a],pts[d])for a,d in zip('ABCD','BCDA')for q in corners(halo))
  ownership={k:min(math.dist(q,pts[k])**2-math.dist(q,pts['A'])**2 for q in corners(halo))for k in 'BCD'}
  body=[name for name,seg in scene.segments.items()if intersects((scene.points[seg.p1].x,scene.points[seg.p1].y),(scene.points[seg.p2].x,scene.points[seg.p2].y),halo)]
  marks=[]
  for name,mark in scene.angles.items():
   for line in scene._angle_mark_polylines(mark):
    if any(intersects((a.x,a.y),(b.x,b.y),halo)for a,b in zip(line,line[1:])):marks.append(name)
  others=[name for name,b in z.label_boxes.items()if name!='angle:angA'and overlap(halo,grow(b,pad))]
  tx,ty=z.translation;w,h=z.view_box[2:];clip=halo[0]+tx<0 or halo[1]+ty<0 or halo[2]+tx>w or halo[3]+ty>h
  ok=inside>=0 and min(ownership.values())>=0 and not(body or marks or others or clip or z.angle_leaders)
  return dict(radius=radius,distance=distance,ok=ok,insideMargin=inside,ownership=ownership,body=body,marks=marks,otherLabels=others,clip=clip,leaderCount=len(z.angle_leaders),dimensions=len(scene.dimensions))
 except Exception as e:return dict(radius=radius,distance=distance,ok=False,error=type(e).__name__+': '+str(e)[:180])
rows=[];baseline=[]
for index,row in enumerate(data['rows']):
 original=row['measuredSpec'];base=assess(original,14,30);baseline.append(base)
 candidates=[] if base['ok']else[assess(original,r,d)for r in [8,10,12,14]for d in [12,16,20,24,28,30,34,38]]
 good=[x for x in candidates if x['ok']]
 rows.append(dict(p=row['p'],c=row['c'],baseline=base,chosen=base if base['ok']else good[0]if good else None,candidates=candidates))
 if(index+1)%9==0:print(json.dumps(dict(processed=index+1,remainingHeld=sum(x['chosen']is None for x in rows))),flush=True)
byvertex={k:sum(x.get('ownership',{}).get(k,0)<0 for x in baseline)for k in 'BD'}
assert byvertex=={'B':6,'D':10},byvertex
assert before==hashes()
result=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),status='QA_ONLY_FINITE_RADIUS_DISTANCE_CANDIDATES',sourceSHA256=before,sourcesUnchanged=True,baselineCases=54,baselineOwnershipHeldByVertex=byvertex,baselinePass=sum(x['ok']for x in baseline),candidateEvaluations=sum(len(x['candidates'])for x in rows),chosenPass=sum(x['chosen']is not None for x in rows),remainingHeld=sum(x['chosen']is None for x in rows),rows=rows,producerOrEngineChanges=False,questionApprovalCredits=0,dbWrites=0)
with(OUT/'results-r1.json').open('x',encoding='utf-8')as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({k:result[k]for k in ['baselinePass','candidateEvaluations','chosenPass','remainingHeld']}))
