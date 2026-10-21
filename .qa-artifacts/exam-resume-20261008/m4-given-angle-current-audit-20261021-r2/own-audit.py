from pathlib import Path
import json,hashlib,copy,sys,math,re,xml.etree.ElementTree as ET,subprocess,difflib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');A=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M4 actual metrics ownership\n',encoding='utf8')
artifact=A/'actual-current-outputs.json';baseline=R/'src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json';j=json.loads(artifact.read_text(encoding='utf8'));old=json.loads(baseline.read_text(encoding='utf8'))
files=[artifact,baseline]+[R/p for p in j['sourceSHA256']]+[A/r['svg']for r in j['rows']];before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
for p,h in j['sourceSHA256'].items():assert sha((R/p).read_bytes())==h
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import render_spec
from core.figure_scene import compile_figure_spec
key=lambda out:json.dumps(out,sort_keys=True,ensure_ascii=False,separators=(',',':'))
prior1={(r['p'],r['c']):r['output']for r in old['mode1']};prior0={key(r['output'])for r in old['mode0']}
def validate(out):
 givens={k:int(v)for k,v in re.findall(r'\\overline\{(AB|AD)\}=(\d+)\\,\\mathrm\{cm\}',out['content'])};assert set(givens)=={'AB','AD'};p,c=givens['AD'],givens['AB'];assert p in range(4,13)and c in range(4,15,2);assert r'\angle A=120^\circ'in out['content'];expected=p+c;assert out['answer']==f'${expected}\\,\\mathrm{{cm}}$'
 fresh=copy.deepcopy(out);s=fresh['figureSpec'];assert s['angles']=={'angA':{'vertex':'A','points':['B','D'],'radius':14,'label_distance':30,'label':'120°'}};assert 'style'not in s
 s['angles']=copy.deepcopy(prior1[(p,c)]['figureSpec']['angles']);assert fresh==prior1[(p,c)]
 assert set(s['dimensions'])=={'d_AD','d_AB'}and 'd_BC'not in s['dimensions']
 return p,c,expected
sub=lambda a,b:(a[0]-b[0],a[1]-b[1])
cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
def corners(box):l,t,r,b=box;return [(l,t),(r,t),(r,b),(l,b)]
def expanded(box,pad):return (box[0]-pad,box[1]-pad,box[2]+pad,box[3]+pad)
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
records=[]
for row in j['rows']:
 out=row['output'];p,c,expected=validate(out);assert (p,c)==(row['p'],row['c']);measured=copy.deepcopy(row['measuredSpec']);measured.pop('label_metrics');assert measured==out['figureSpec']
 scene=compile_figure_spec(row['measuredSpec']);z=scene.resolve();render=render_spec.render_json(json.dumps(row['measuredSpec']));assert 'svg'in render,render
 svg=(A/row['svg']).read_bytes();assert sha(svg)==row['svgSHA256'];root=ET.fromstring(svg);labels=[n.get('data-label')for n in root.iter()if n.get('data-label')is not None]
 assert labels.count('120°')==1 and '60°'not in labels and f'{p} cm'in labels and f'{c} cm'in labels
 pts=out['figureSpec']['points'];poly=[pts[k]for k in 'ABCD'];orient=1 if sum(cross(poly[i],poly[(i+1)%4])for i in range(4))>0 else -1;box=z.label_boxes['angle:angA'];halo=expanded(box,scene.style.halo_width/2+.5)
 def margins(b):return {a+d:min(orient*cross(sub(pts[d],pts[a]),sub(q,pts[a]))/math.dist(pts[a],pts[d])for q in corners(b))for a,d in zip('ABCD','BCDA')}
 def ownership(b):return {k:min(math.dist(q,pts[k])**2-math.dist(q,pts['A'])**2 for q in corners(b))for k in 'BCD'}
 center=((box[0]+box[2])/2,(box[1]+box[3])/2);centerOwner=min(pts,key=lambda k:math.dist(center,pts[k]));reach=min(math.dist(pts['A'],pts[k])for k in 'BCD')/2
 # Full polygon containment implies the corner lies in angleA's two incident halfplanes.
 bodyHits=[name for name,seg in scene.segments.items()if intersects((scene.points[seg.p1].x,scene.points[seg.p1].y),(scene.points[seg.p2].x,scene.points[seg.p2].y),halo)]
 markHits=[]
 for name,mark in scene.angles.items():
  for polyline in scene._angle_mark_polylines(mark):
   for a,b in zip(polyline,polyline[1:]):
    if intersects((a.x,a.y),(b.x,b.y),halo):markHits.append(name);break
 otherHits=[name for name,b in z.label_boxes.items()if name!='angle:angA'and overlap(halo,expanded(b,scene.style.halo_width/2+.5))]
 tx,ty=z.translation;W,H=z.view_box[2:];clip=halo[0]+tx<0 or halo[1]+ty<0 or halo[2]+tx>W or halo[3]+ty>H
 records.append({'p':p,'c':c,'independentBC':expected,'beforeOtherFieldsExact':True,'suppliedMathJaxSVG_SHA':sha(svg),'ownPythonRawSVG_SHA':sha(render['svg'].encode()),'labels':labels,'metricTextBox':box,'haloBox':halo,'textQuadMargins':margins(box),'haloQuadMargins':margins(halo),'textOwnershipSquaredMargins':ownership(box),'haloOwnershipSquaredMargins':ownership(halo),'textCenterNearestVertex':centerOwner,'genericNearestPointReach':reach,'explicitLabelDistance':30,'bodySegmentHaloHits':bodyHits,'ownMarkHaloHits':markHits,'otherLabelHaloHits':otherHits,'haloClip':clip,'angleLeaders':dict(z.angle_leaders)})
api=[]
for row in j['actualAPI']:
 if key(row['output'])in prior0:api.append({'seed':row['seed'],'mode':0,'beforeExact':True})
 else:p,c,expected=validate(row['output']);api.append({'seed':row['seed'],'mode':1,'p':p,'c':c,'expectedBC':expected,'otherFieldsExceptAnglesExact':True})
oldsrc=subprocess.check_output(['git','-C',str(R),'show',old['beforeCommit']+':src/lib/middle/m2GeoQuad.ts']).decode('utf8');newsrc=(R/'src/lib/middle/m2GeoQuad.ts').read_text(encoding='utf8');dump('own-source-delta.json',{'beforeCommit':old['beforeCommit'],'diff':list(difflib.unified_diff(oldsrc.splitlines(),newsrc.splitlines(),lineterm=''))})
after={f:sha(Path(f).read_bytes())for f in before};assert before==after;dump('own-after.json',after)
dump('own-results.json',{'artifact54':records,'APIArtifact100':api,'ownMeasuredPythonRenders':54,'initialFailureEvidenceUnchanged':'No prior prechange/source-port failure evidence overwritten','sourceUnchanged':True,'actualTSorAPI':False})
print(json.dumps({'ownRenders':54,'outsideQuad':sum(min(x['haloQuadMargins'].values())<0 for x in records),'textOwnershipCrossRows':sum(min(x['textOwnershipSquaredMargins'].values())<0 for x in records),'haloOwnershipCrossRows':sum(min(x['haloOwnershipSquaredMargins'].values())<0 for x in records),'bodyHitsRows':sum(bool(x['bodySegmentHaloHits'])for x in records),'markHitsRows':sum(bool(x['ownMarkHaloHits'])for x in records),'otherLabelHitsRows':sum(bool(x['otherLabelHaloHits'])for x in records),'clips':sum(x['haloClip']for x in records)}))
