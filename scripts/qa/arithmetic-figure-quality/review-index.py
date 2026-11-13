"""Compact gallery annotations and all-definition census (no duplicated SVGs)."""
import json,gzip,collections,csv
from pathlib import Path
p=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
def read(n):return json.load(gzip.open(p/n))
m=read('manifest.json.gz');b=read('browser-coverage.json.gz');e=read('engine-proof.json.gz');v=json.load(open(p/'visual-review.json'))
flags=collections.defaultdict(list);review={r['id']:r for r in v['rows']}
for r in e:
 if r['residual']:flags[r['id']].append({'severity':'exception','reason':'All shared engine settings exhausted; public named given/target retained in condition line','conditions':r['residual'],'refusals':r['refusals']})
byhash=collections.defaultdict(list)
for r in m['rows']:
 for key in ['canonical','display']:
  if r.get(key):byhash[r[key]].append(r['id'])
for r in b['candidates']:
 for id in set(byhash[r['hash']]):
  f={'severity':'accepted-candidate' if r['classification'].startswith('accepted') else 'frozen-debt','reason':r['classification']}
  if f not in flags[id]:flags[id].append(f)
for id in ['gt1-m2-same-height-area-ratio-2-3-2','gt1-m2-same-height-area-ratio-4-3-2','gt1-m2-same-height-area-ratio-5-3-2']:flags[id].append({'severity':'frozen-debt','reason':'Zero-length BD leader in hidden frozen source; preserved immutable bytes'})
(p/'review-index.json.gz').write_bytes(gzip.compress(json.dumps({'flags':flags,'visuallyReviewed':review},ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9))
byfamily=collections.defaultdict(list)
for r in m['rows']:byfamily[r['family']].append(r)
with (p/'families.tsv').open('w') as f:
 w=csv.writer(f,delimiter='\t',lineterminator='\n');w.writerow(['id','grade','strand','title','domainSize','enumerated','registeredIDs','inlineFigures','displayed','hiddenOrNoFigure','renderers','flaggedIDs','individuallyVisuallyReviewed'])
 for d in m['families']:
  rows=byfamily[d['id']];w.writerow([d['id'],d['grade'],d['strand'],d['title'],d['domainSize'],d['enumerated'],sum(bool(r.get('canonical')) for r in rows),sum(r['id'].startswith('inline:') and bool(r.get('display')) for r in rows),sum(bool(r.get('display')) for r in rows),sum(not r.get('display') for r in rows),json.dumps(dict(collections.Counter(r['renderer'] for r in rows))),sum(r['id'] in flags for r in rows),sum(r['id'] in review for r in rows)])
print({'flaggedIDs':len(flags),'visualIDs':len(review),'definitionRows':len(m['families'])})
