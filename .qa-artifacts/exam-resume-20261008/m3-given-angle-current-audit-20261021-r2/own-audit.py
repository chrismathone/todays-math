from pathlib import Path
import json,hashlib,copy,re,sys,math,xml.etree.ElementTree as ET,subprocess,difflib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');A=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m3-given-angle-20261021-r1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M3 measured current independent\n',encoding='utf8');assert 'M3'in(P/'own-probe.txt').read_text(encoding='utf8')
raw=A/'actual-current-outputs.json';baseline=R/'src/__tests__/fixtures/m2Bisector-before-given-angle-20261021.json';j=json.loads(raw.read_text(encoding='utf8'));old=json.loads(baseline.read_text(encoding='utf8'))
files=[raw,baseline]+[R/p for p in j['sourceSHA256']]+[A/r['svg']for r in j['rows']]
before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
for p,h in j['sourceSHA256'].items():assert sha((R/p).read_bytes())==h
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import render_spec
from core.figure_scene import compile_figure_spec
key=lambda out:json.dumps(out,sort_keys=True,ensure_ascii=False,separators=(',',':'))
mode0={key(r['output'])for r in old['mode0']};mode1={r['w']:r['output']for r in old['mode1']}
def whole(out):
 m=re.search(r'\\angle AOB=(\d+)\^\\circ',out['content']);assert m;return int(m[1])
def validate(out):
 w=whole(out);assert w in range(40,81,2)
 expected=360-90-90-w;assert out['answer']==f'${expected}^\\circ$'
 current=copy.deepcopy(out);s=current['figureSpec'];assert s['angles']['a1']=={'vertex':'O','points':['A','P'],'radius':14,'arcs':1};assert s['angles']['a2']=={'vertex':'O','points':['P','B'],'radius':14,'arcs':1};assert s['angles']['givenAOB']=={'vertex':'O','points':['A','B'],'radius':38,'label':f'{w}°'};assert s['angles']['ax']==mode1[w]['figureSpec']['angles']['ax'];assert s['style']=={'clear_angle_labels':True}
 # Recover only declared angles/style, then deep compare every other output field.
 s['angles']=copy.deepcopy(mode1[w]['figureSpec']['angles']);s.pop('style');assert current==mode1[w]
 return w,expected
def overlap(a,b):return min(a[2],b[2])>max(a[0],b[0])and min(a[3],b[3])>max(a[1],b[1])
def segmentRect(a,b,box):
 low,high=0.,1.
 for p,d,lo,hi in [(a[0],b[0]-a[0],box[0],box[2]),(a[1],b[1]-a[1],box[1],box[3])]:
  if d==0:
   if p<lo or p>hi:return False
  else:
   t,u=(lo-p)/d,(hi-p)/d;low=max(low,min(t,u));high=min(high,max(t,u))
   if low>high:return False
 return True
records=[]
for row in j['rows']:
 out=row['output'];w,expected=validate(out);assert row['w']==w
 measured=row['measuredSpec'];without=copy.deepcopy(measured);without.pop('label_metrics');assert without==out['figureSpec']
 scene=compile_figure_spec(measured);resolved=scene.resolve();py=render_spec.render_json(json.dumps(measured));assert 'svg'in py,py
 actual=(A/row['svg']).read_bytes();assert sha(actual)==row['svgSHA256'];root=ET.fromstring(actual)
 labels=[n.get('data-label')for n in root.iter()if n.get('data-label')is not None];assert labels.count(f'{w}°')==1 and labels.count('x')==1 and f'{w//2}°'not in labels and f'{expected}°'not in labels
 ownroot=ET.fromstring(py['svg']);ownMJ=[n.get('data-mj')for n in ownroot.iter()if n.get('data-mj')is not None]
 # These are actual label metric rectangles in source coords; transform to canvas before clip checks.
 tx,ty=resolved.translation;vbox=resolved.view_box;boxes=dict(resolved.label_boxes);pad=scene.style.halo_width/2+.5
 clips=[];haloClips=[]
 for n,(l,t,r,b)in boxes.items():
  if l+tx<vbox[0]or t+ty<vbox[1]or r+tx>vbox[0]+vbox[2]or b+ty>vbox[1]+vbox[3]:clips.append(n)
  if l-pad+tx<vbox[0]or t-pad+ty<vbox[1]or r+pad+tx>vbox[0]+vbox[2]or b+pad+ty>vbox[1]+vbox[3]:haloClips.append(n)
 overlaps=[(a,b)for i,a in enumerate(boxes)for b in list(boxes)[i+1:]if overlap(boxes[a],boxes[b])]
 angleLineHits=[]
 for label in ['angle:givenAOB','angle:ax']:
  box=boxes[label]
  for seg in scene.segments.values():
   aa,bb=scene.points[seg.p1],scene.points[seg.p2]
   if segmentRect((aa.x,aa.y),(bb.x,bb.y),box):angleLineHits.append([label,seg.name])
 leader=[]
 for name,(anchor,pos)in resolved.angle_leaders.items():
  a=scene.angles[name];v,p,q=(scene.points[k]for k in [a.vertex,a.p1,a.p2]);u=complex(p.x-v.x,p.y-v.y);z=complex(q.x-v.x,q.y-v.y);delta=math.atan2((u.conjugate()*z).imag,(u.conjugate()*z).real);mid=math.atan2(u.imag,u.real)+delta/2;radius=scene.style.angle_radius if a.radius is None else a.radius;want=(v.x+radius*math.cos(mid),v.y+radius*math.sin(mid));err=math.dist(anchor,want);assert err<1e-10;assert pos==resolved.label_positions['angle:'+name]
  leader.append({'name':name,'sourceRays':[a.vertex,a.p1,a.p2],'anchorOnMarkedArcMidpointError':err,'radius':radius,'label':a.label})
 records.append({'w':w,'independentExpectedCPD':expected,'allOtherOutputFieldsEqualBefore':True,'actualParentMathJaxSVG_SHA':sha(actual),'ownPythonMeasuredRawSVG_SHA':sha(py['svg'].encode()),'renderedLabelMetadata':labels,'ownIntermediateDataMJ':ownMJ,'metricLabelBoxes':boxes,'viewBox':vbox,'translation':[tx,ty],'labelClip':clips,'haloClip':haloClips,'labelPairOverlap':overlaps,'angleLabelHitsBodySegment':angleLineHits,'leaders':leader})
api=[]
for row in j['actualAPI']:
 out=row['output']
 if key(out)in mode0:api.append({'seed':row['seed'],'mode':0,'exactBaselineMatch':True})
 else:w,expected=validate(out);api.append({'seed':row['seed'],'mode':1,'w':w,'independentExpected':expected,'onlyAnglesStyleChanged':True})
oldsource=subprocess.check_output(['git','-C',str(R),'show',old['beforeCommit']+':src/lib/middle/m2GeoTri.ts']).decode('utf8');newsource=(R/'src/lib/middle/m2GeoTri.ts').read_text(encoding='utf8')
dump('own-source-delta.json',{'beforeCommit':old['beforeCommit'],'diff':list(difflib.unified_diff(oldsource.splitlines(),newsource.splitlines(),lineterm=''))})
after={f:sha(Path(f).read_bytes())for f in before};assert before==after;dump('own-after.json',after)
dump('own-results.json',{'supplied21HandlersAndMathJaxSVGs':records,'ownMeasuredPythonRerenders':21,'supplied100API':api,'sourceHashesBoundAndUnchanged':True,'newOwnTSOrAPIExecution':False})
print(json.dumps({'handlers':21,'ownMeasuredRenders':21,'APIArtifacts':100,'clips':sum(bool(r['labelClip'])for r in records),'haloClips':sum(bool(r['haloClip'])for r in records),'overlapRows':sum(bool(r['labelPairOverlap'])for r in records),'angleBodyHitsRows':sum(bool(r['angleLabelHitsBodySegment'])for r in records)}))
