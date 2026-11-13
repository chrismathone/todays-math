"""Run the actual strict angle-label phase before expensive finite SVG compilation.
This is a failure preflight, not an independent visual quality acceptance test.
"""
import json,sys,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import engine
from core.figure_scene import _quadratic_samples,_angle_leader_points
rows=json.load(open('/tmp/arithmetic-figure-quality/models.json'))+json.load(open('/tmp/arithmetic-figure-quality/trig-models.json'))
fail=[];checked=0
for row in rows:
 if not row.get('plan'):continue
 spec=engine.scene_spec(row)
 if not any(a.get('label') for a in spec['angles'].values()):continue
 try:
  scene=engine.compile_figure_spec(copy.deepcopy(spec));occupied=[];leaders=[]
  for name in sorted(scene.angles):
   angle=scene.angles[name];laid=scene._angle_label_layout(angle,occupied,leaders)
   if laid:
    pos,box,leader=laid;occupied.append(box)
    if leader:leaders.append(_quadratic_samples('',*_angle_leader_points(leader,pos,angle.label,scene.style.angle_font_size,scene.style.halo_width,scene.label_metrics)))
  checked+=1
 except Exception as exc:fail.append({'id':row['id'],'error':str(exc)})
result={'labelledAngleScenesChecked':checked,'failures':fail,'compilerFingerprint':engine.COMPILER_FINGERPRINT}
Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112/angle-preflight.json').write_text(json.dumps(result,indent=2))
print({'checked':checked,'failed':len(fail)});print(fail[:20]);raise SystemExit(bool(fail))
