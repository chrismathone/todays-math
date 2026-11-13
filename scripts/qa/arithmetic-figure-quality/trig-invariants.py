"""Compare every actual inline display against public trigonometric constraints.
Coordinates are recovered from final SVG data-segment edges, not solver answers.
"""
from pathlib import Path
import gzip,json,re,math,collections
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
baseline=Path('/tmp/arithmetic-figure-quality')
m=json.loads(gzip.decompress((baseline/'before-manifest.json.gz').read_bytes()));assets=json.loads(gzip.decompress((baseline/'before-assets.json.gz').read_bytes()));issues=[]
def fraction(s):
 f=re.match(r'\\frac\{(\d+)\}\{(\d+)\}',s);return int(f[1])/int(f[2]) if f else int(s)
for row in m['rows']:
 if not row['id'].startswith('inline:') or not row.get('display'):continue
 svg=assets[row['display']];points={}
 for line in re.findall(r'<line[^>]+data-segment="[A-Z]{2}"[^>]+>',svg):
  k=re.search(r'data-segment="([A-Z]{2})"',line)[1];coords=[float(re.search(fr'{a}="([^"]+)"',line)[1]) for a in ('x1','y1','x2','y2')];points[k[0]]=coords[:2];points[k[1]]=coords[2:]
 if not all(k in points for k in 'ABC'):raise ValueError(row['id'])
 d={k:math.dist(points[k[0]],points[k[1]]) for k in ('AB','BC','AC')};latex=row['prompt']['latex'];err=[]
 lengths={g[1]:int(g[2]) for g in re.finditer(r'\\mathrm\{(AB|BC|AC)\}=(\d+)\\,\\mathrm\{cm\}',latex)}
 if len(lengths)>1:
  scales=[v/d[k] for k,v in lengths.items()]
  if max(scales)/min(scales)-1>1e-5:err.append('drawn side ratio disagrees with givens')
 ratio=re.search(r'\\(sin|cos|tan) A=(\\frac\{\d+\}\{\d+\}|\d+)',latex)
 A,B,C=[points[k] for k in 'ABC'];cosA=sum((B[i]-A[i])*(C[i]-A[i]) for i in (0,1))/(d['AB']*d['AC']);sinA=math.sqrt(max(0,1-cosA*cosA));actual={'sin':sinA,'cos':cosA,'tan':sinA/cosA}
 if ratio and abs(actual[ratio[1]]-fraction(ratio[2]))>1e-5:err.append('drawn angle disagrees with given trig ratio')
 area=re.search(r'S=(\d+)',latex)
 if area:
  k=lengths['AB']/d['AB'];drawnArea=abs((B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]))*k*k/2
  if abs(drawnArea-int(area[1]))>1e-5*int(area[1]):err.append('drawn area disagrees with public area')
 if err:issues.append({'id':row['id'],'family':row['family'],'errors':err})
(out/'trig-geometry-before.json.gz').write_bytes(gzip.compress(json.dumps(issues,ensure_ascii=False).encode(),compresslevel=9))
print({'checked':sum(r['id'].startswith('inline:') and bool(r.get('display')) for r in m['rows']),'mismatched':len(issues),'families':dict(collections.Counter(r['family'] for r in issues))})
