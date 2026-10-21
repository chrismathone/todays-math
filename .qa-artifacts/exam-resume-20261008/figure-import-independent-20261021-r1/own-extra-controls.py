from pathlib import Path
import sys,json,hashlib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');sys.path.insert(0,str(R/'vendor/figure-engine'))
from core import figure_svg as fs,figure_spec_repair as fr
r=[]
for name,kw in [('angle_nan',dict(angles=[(float('nan'),(0,0),(1,0),(0,1))])),('on_circle_nan',dict(on_circle=[((1,0),0,0,float('nan'))])),('negative_length_mixed',dict(lengths=[(-1,(0,0),(1,0)),(1,(0,0),(1,0))]))]:
 try:fs.verify_figure(name,**kw);accepted=True;error=None
 except Exception as e:accepted=False;error=str(e)
 r.append(dict(name=name,expected='reject malformed geometric evidence',accepted=accepted,contractSatisfied=not accepted,error=error))
s=dict(version=2,points=dict(A=[0,0],B=[160,0],C=[80,120]),segments=dict(AB=['A','B'],BC=['B','C'],CA=['C','A']),angles=dict(a=dict(vertex='A',points=['B','C'],ticks=2,arcs=3)))
sc,svg,notes=fr.compile_with_repair(s)
out={'malformedVerificationControls':r,'conflictingAngleMarks':{'input':s['angles'],'outputArcs':sc.angles['a'].arcs,'notes':notes},'sourceSHA256':{str(R/'vendor/figure-engine/core'/n):hashlib.sha256((R/'vendor/figure-engine/core'/n).read_bytes()).hexdigest() for n in ['figure_svg.py','figure_spec_repair.py']}}
(P/'own-extra-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(out,ensure_ascii=True))
