from pathlib import Path
import sys,json
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P/'own-shadow'))
from core import figure_solid as s,figure_svg as f
O=(0,0,0);X=(1,0,0);Y=(0,1,0);Z=(0,0,1);xy=s.Plane.xy();yz=s.Plane(O,X);poly=[O,(2,0,0),(0,2,0)];rows=[]
cases={'feet':([(O,Z,xy)],[(X,Z,xy)]),'angles':([(90,'dihedral',xy,yz)],[(0,'dihedral',xy,yz)]),'areas':([(2,poly,xy)],[(3,poly,xy)]),'lengths':([(1,O,X),(2,O,(2,0,0))],[(1,O,X),(1,O,(2,0,0))]),'equations':([((0,0,1,0),xy)],[((0,0,1,1),xy)]),'perpendicular':([((O,X),(O,Y))],[((O,X),(O,X))]),'on_plane':([(X,xy)],[(Z,xy)])}
def invoke(name,kw):
 try:s.verify_solid(name,**kw);ok=True;error=None
 except Exception as e:ok=False;error=type(e).__name__+': '+str(e)
 return dict(accepted=ok,count=f._VERIFIED.get((__file__,name),0),error=error)
for field,(good,bad) in cases.items():
 for wanted,data in [(True,good),(False,bad)]:
  modes=[]
  for mode in ['list','generator']:
   kw={'on_plane':[(O,xy)],field:list(data) if mode=='list' else (v for v in data)};modes.append(invoke(field+str(wanted)+mode,kw))
  expected_count=len(data)+(field!='on_plane') if wanted else 0
  passed=all(x['accepted']==wanted and x['count']==expected_count for x in modes)
  rows.append(dict(name=field+'-'+('positive' if wanted else 'negative'),passed=passed,expectedCount=expected_count,modes=modes))
def broken(data):
 yield data[0]
 raise RuntimeError('owned materialization fault')
for field,(good,_) in cases.items():
 key='broken-'+field;s.verify_solid(key,on_plane=[(O,xy)]);x=invoke(key,{field:broken(good)})
 rows.append(dict(name=key,passed=not x['accepted'] and x['count']==0,observed=x))
# One-shot area must survive into the view pass, not just geometry calculation.
for mode in ['list','generator']:
 data=[(None,[O,Y,Z],yz)];x=invoke('view-'+mode,dict(areas=data if mode=='list' else (v for v in data),view=s.View(depth_ratio=0)))
 rows.append(dict(name='view-collapse-'+mode,passed=not x['accepted'] and x['count']==0,observed=x))
large=[('reference-norm',dict(feet=[((1e308,1,0),(1e308,0,1),xy)])),('tolerance-product',dict(feet=[((1e100,1,0),(1e100,0,1),xy)],tol=1e308)),('area-label-tolerance-product',dict(areas=[(1e308,poly,xy)],tol=1e308)),('ratio-overflow',dict(lengths=[(1e-308,O,(1e100,0,0)),(1,O,X)])),('view-scale-overflow',dict(areas=[(None,poly,xy)],view=s.View(scale=1e308)))]
for n,kw in large:
 x=invoke(n,kw);rows.append(dict(name='nonfinite-intermediate-'+n,passed=not x['accepted'] and x['count']==0,observed=x))
r={'uniqueScenarioControls':len(rows),'passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows),'controls':rows,'actualCandidate':s.__file__};(P/'own-generator-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:r[k] for k in ['uniqueScenarioControls','passed','failed']}));assert all(x['passed'] for x in rows)
