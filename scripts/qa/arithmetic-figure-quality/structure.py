from asset_store import AssetStore
"""Full byte-level safety, finite-coordinate and renderability census.
These checks cannot establish visual acceptability; findings retain exact IDs.
"""
import gzip,json,re,math,xml.etree.ElementTree as ET,collections,hashlib
from pathlib import Path
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
m=json.loads(gzip.decompress((out/'manifest.json.gz').read_bytes()));assets=AssetStore(out);checks={};bad=[]
for h,svg in assets.items():
 e=[]
 try:
  root=ET.fromstring(svg);v=[float(x) for x in root.attrib['viewBox'].split()]
  if len(v)!=4 or not all(math.isfinite(x) for x in v) or min(v[2:])<=0:e.append('invalid frame')
  if len(list(root.iter()))<3:e.append('empty figure')
  for el in root.iter():
   tag=el.tag.split('}')[-1]
   if tag in ('script','foreignObject','iframe','image','use'):e.append('active/external element:'+tag)
   for k,val in el.attrib.items():
    if k.lower().startswith('on') or ('href' in k and not val.startswith('#')):e.append('active attribute:'+k)
    if k in ('x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','stroke-width','font-size') and re.match(r'^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$',val,re.I) and not math.isfinite(float(val)):e.append('nonfinite:'+k)
   if tag=='line' and all(k in el.attrib for k in ('x1','x2','y1','y2')):
    if el.attrib['x1']==el.attrib['x2'] and el.attrib['y1']==el.attrib['y2']:e.append('zero-length line')
  if re.search(r'(?<![a-zA-Z])(?:NaN|Infinity)(?![a-zA-Z])',svg):e.append('nonfinite syntax')
 except Exception as exc:e.append('XML:'+str(exc))
 checks[h]={'errors':sorted(set(e)),'customTriangleRenderer':'arithmetic-geometry-drill-v1' in svg,'properDimension':bool(re.search(r'data-dimension|stroke-dasharray="(?:6 4|5 3|1.5 1)',svg))}
for row in m['rows']:
 errors=list({v for h in (row.get('canonical'),row.get('display')) if h for v in checks[h]['errors']})
 if errors:bad.append({'id':row['id'],'family':row['family'],'errors':errors})
custom=[r for r in m['rows'] if r.get('display') and checks[r['display']]['customTriangleRenderer']]
summary={'uniqueByteStringsChecked':len(assets),'candidateRows':len(m['rows']),'allReferencedHashesPresent':all(h in assets for r in m['rows'] for h in [r.get('canonical'),r.get('display')] if h),'structuralFailures':bad,'customTriangleDisplayCandidates':len(custom),'customTriangleDisplayFamilies':dict(collections.Counter(r['family'] for r in custom))}
(out/'structure.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print({k:v if k not in ('structuralFailures','customTriangleDisplayFamilies') else len(v) for k,v in summary.items()})
