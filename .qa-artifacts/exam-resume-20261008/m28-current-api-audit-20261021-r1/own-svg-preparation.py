from pathlib import Path
import math,sys,json,hashlib,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');sys.path.insert(0,str(R/'vendor/figure-engine'))
from core.figure_scene import compile_figure_spec
from core.figure_quality import sanitize_svg

def synthetic(beta):
 L=math.hypot(92,40);h=L*math.sin(math.radians(beta));t=L*math.cos(math.radians(beta));scale=184/(150+t);rnd=lambda n:math.floor(n*100+.5)/100;p={k:[rnd(18+x*scale),rnd(172-y*scale)] for k,(x,y) in {'A':(t,h),'B':(0,0),'C':(150,0),'D':(150+t,h)}.items()};A,B,C,D=(p[k] for k in 'ABCD');ab=(A[0]-B[0],A[1]-B[1]);bc=(C[0]-B[0],C[1]-B[1]);twice=abs(ab[0]*bc[1]-ab[1]*bc[0]);radius=min(18,.65*min(twice/math.hypot(*ab),twice/math.hypot(*bc)))
 return dict(version=2,points=p,segments={'AB':['A','B'],'DC':['D','C'],'AD':['A','D'],'BC':['B','C']},angles={k:{'vertex':v,'points':['B','D'],'arcs':1,'radius':radius} for k,v in [('angA','A'),('angC','C')]},labels={k:k for k in 'ABCD'})
if __name__=='__main__':
 rows=[]
 for b in [9,72]:
  spec=synthetic(b);scene=compile_figure_spec(spec);svg=sanitize_svg(scene.render_svg());(P/f'own-synthetic-beta{b}.svg').write_text(svg,encoding='utf-8');root=ET.fromstring(svg);paths=[e.attrib['d'] for e in root.iter() if e.tag.split('}')[-1]=='path' and ' A ' in e.attrib.get('d','')];rows.append({'ownSyntheticBeta':b,'actualAPI':False,'translation':scene.resolve().translation,'arcPaths':paths,'spec':spec,'svgSHA256':hashlib.sha256(svg.encode()).hexdigest()})
 (P/'own-synthetic-render-preparation.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');print(json.dumps([{'beta':r['ownSyntheticBeta'],'arcPaths':r['arcPaths'],'translation':r['translation']} for r in rows]))
