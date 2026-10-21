from pathlib import Path
import sys,json
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P.parent/'solid-verification-candidate-20261021-r1/own-shadow'))
from core import figure_solid as s,figure_svg as f
rows=[]
for mode in ['list','generator']:
 v=[(1,(0,0,0),(1,0,0)),(1,(0,0,0),(2,0,0))];name='r1-'+mode
 try:s.verify_solid(name,lengths=v if mode=='list' else (x for x in v),on_plane=[((0,0,0),s.Plane.xy())]);accepted=True
 except Exception:accepted=False
 rows.append(dict(mode=mode,accepted=accepted,checks=f._VERIFIED.get((__file__,name),0)))
assert rows[0]['accepted'] is False and rows[1]['accepted'] is True and rows[1]['checks']==1
(P/'own-r1-reproduction.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');print('R1 independently reproduced: list rejected, generator accepted count1')
