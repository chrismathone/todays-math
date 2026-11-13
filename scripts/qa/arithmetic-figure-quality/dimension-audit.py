"""Reconcile final omissions separately from rejected attempts and retries.
Input is the complete engine proof, not a green renderer exit status.
"""
import json,gzip,collections,re
from pathlib import Path
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
proof=json.load(open('/tmp/arithmetic-figure-quality/engine-proof.json'))+json.load(open('/tmp/arithmetic-figure-quality/trig-engine-proof.json'))
models=json.load(open('/tmp/arithmetic-figure-quality/models.json'))+json.load(open('/tmp/arithmetic-figure-quality/trig-models.json'))
models={r['id']:r for r in models if r.get('plan')}
counts=collections.defaultdict(collections.Counter);exceptions=[];errors=[];total=collections.Counter()
for r in proof:
 row=models[r['id']];initial=r['initialDimensions'];rendered=r['dimensions'];residual=r['residual'];attempts=r['attempts'];detail=r.get('detail');family=row['family']
 expected={''.join(v['points'])+'='+v['label'] for v in initial.values()}
 fitted={''.join(v['points'])+'='+v['label'] for v in rendered.values()}
 if expected!=fitted|set(residual) or fitted&set(residual) or len(set(residual))!=len(residual):errors.append({'id':r['id'],'error':'condition loss/duplicate'})
 successes=[a for a in attempts if a.get('success')]
 if not successes or min(len(a['residual']) for a in successes)+(len(detail['residual']) if detail else 0)!=len(residual):errors.append({'id':r['id'],'error':'did not select least omission candidate'})
 total.update(variants=1,requested=len(initial),fitted=len(rendered),actualOmissions=len(residual),rejectedAttempts=sum('failure' in a for a in attempts+(detail['attempts'] if detail else [])))
 counts[family].update(variants=1,requested=len(initial),fitted=len(rendered),actualOmissions=len(residual),exceptionIDs=bool(residual),fullyRecoveredByRetry=bool(not residual and 'failure' in attempts[0]))
 if residual:
  if min(len(a['residual']) for a in successes)>0 and len(successes)!=7:errors.append({'id':r['id'],'error':'not every overview setting tried before retaining condition'})
  if detail and detail['residual'] and sum(bool(a.get('success')) for a in detail['attempts'])!=7:errors.append({'id':r['id'],'error':'not every detail setting tried before retaining condition'})
  reasons=collections.Counter()
  for failure in r['refusals']:
   values=[int(v) for v in re.search(r'dimension=\(([^)]+)',failure)[1].split(',')]
   for k,v in zip(['clip','text','point','geometry','circle','earlierDimension'],values):
    if v:reasons[k]+=1
  exceptions.append({'id':r['id'],'family':family,'severity':'explicit-dimension-exception','conditions':residual,'reasonComponents':dict(reasons),'target':row['plan'].get('target'),'allSharedOptionsTried':True})
result={'totals':dict(total),'families':{k:dict(v) for k,v in counts.items()},'exceptions':exceptions,'errors':errors,'meaning':'actualOmissions counts final absent dimensions once; rejectedAttempts includes solved retries and must not be presented as omitted dimensions'}
(out/'dimension-audit.json.gz').write_bytes(gzip.compress(json.dumps(result,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9))
print({**dict(total),'exceptionIDs':len(exceptions),'errors':len(errors)})
raise SystemExit(bool(errors))
