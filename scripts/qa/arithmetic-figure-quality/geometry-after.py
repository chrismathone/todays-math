from asset_store import AssetStore
"""Independent public-constraint check against actual final SVG point owners.
Intervals enumerate the SVG formatter's ±0.0005 coordinate rounding, not a
loosened geometric tolerance. No answer values are used as the oracle.
"""
import gzip,json,re,math,itertools,collections
from pathlib import Path
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
m=json.loads(gzip.decompress((out/'manifest.json.gz').read_bytes()));assets=AssetStore(out);failed=[];checked=0
for row in m['rows']:
 if not row['id'].startswith('inline:') or not row.get('display'):continue
 svg=assets[row['display']];points={}
 for tag in re.findall(r'<(?:text|g)\b[^>]+>',svg):
  name=re.search(r'data-(?:mj|original-label)="([ABC])"',tag)
  x=re.search(r'data-px="([^"]+)"',tag);y=re.search(r'data-py="([^"]+)"',tag)
  if name and x and y:points[name[1]]=(float(x[1]),float(y[1]))
 if len(points)!=3:failed.append({'id':row['id'],'error':'missing engine point-owner metadata'});continue
 latex=row['prompt']['latex'];lengths={g[1]:int(g[2]) for g in re.finditer(r'\\mathrm\{(AB|BC|AC)\}=(\d+)\\,\\mathrm\{cm\}',latex)}
 ratio=re.search(r'\\(sin|cos|tan) A=(\\frac\{\d+\}\{\d+\}|\d+)',latex);area=re.search(r'S=(\d+)',latex)
 truth={}
 if ratio:
  f=re.match(r'\\frac\{(\d+)\}\{(\d+)\}',ratio[2]);truth[ratio[1]]=int(f[1])/int(f[2]) if f else int(ratio[2])
 if len(lengths)>1:truth['lengthRatio']=lengths['AC']/lengths['AB']
 if area:truth['area']=int(area[1])
 values=collections.defaultdict(list)
 for signs in itertools.product((-.0005,.0005),repeat=6):
  A,B,C=[tuple(points[k][j]+signs[i*2+j] for j in (0,1)) for i,k in enumerate('ABC')]
  AB=math.dist(A,B);AC=math.dist(A,C);u=[B[j]-A[j] for j in (0,1)];v=[C[j]-A[j] for j in (0,1)];dot=sum(u[j]*v[j] for j in (0,1));cross=abs(u[0]*v[1]-u[1]*v[0]);sin=cross/(AB*AC);cos=dot/(AB*AC)
  values['sin'].append(sin);values['cos'].append(cos);values['tan'].append(cross/dot);values['lengthRatio'].append(AC/AB)
  if area:values['area'].append(cross/2*(lengths['AB']/AB)**2)
 errors=[k for k,v in truth.items() if not min(values[k])-1e-10<=v<=max(values[k])+1e-10]
 if errors:failed.append({'id':row['id'],'errors':errors,'expected':truth})
 checked+=1
result={'checked':checked,'failures':failed,'coordinateUncertainty':.0005,'source':'actual final SVG point-owner coordinates; independent public statement constraints'}
(out/'inline-geometry-after.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({'checked':checked,'failed':len(failed)})

raise SystemExit(bool(failed))
