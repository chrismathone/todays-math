"""Reconcile every final asset observation, compatibility row and review ID.
No blanket quality pass: immutable-source defects and visual limits stay explicit.
"""
import gzip,json,re,math,hashlib,collections
from pathlib import Path
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
def read(name):return json.loads(gzip.decompress((out/name).read_bytes()))
def write(name,value):
 data=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
 (out/name).write_bytes(gzip.compress(data,compresslevel=9) if name.endswith('.gz') else data+b'\n')
m=read('manifest.json.gz');before=json.load(gzip.open('/tmp/arithmetic-figure-quality/before-manifest.json.gz'));old={r['id']:r for r in before['rows']}
new={r['id']:r for r in m['rows']}
identity=['family','index','parameters','prompt','answer','canonical','verified'];changed=[]
for r in m['rows']:
 assert r['id'] in old
 for key in identity:assert r.get(key)==old[r['id']].get(key),(r['id'],key)
 if r.get('display')!=old[r['id']].get('display'):changed.append(r['id'])
assert len(old)==len(m['rows'])
canonical={r['canonical'] for r in m['rows'] if r.get('canonical')};display={r['display'] for r in m['rows'] if r.get('display')};all_hashes=canonical|display;latest={}
for line in (out/'browser-observations.jsonl').read_text().splitlines():
 for r in json.loads(line):
  if r['hash'] in all_hashes:latest[r['hash'],r['media']]=r
assert len(latest)==2*len(all_hashes),(len(latest),len(all_hashes))
flags=[]
for r in latest.values():
 if r['clipped'] or r['labelOverlaps'] or r['solidStrokeCandidates']:
  own_arc=bool(r['strokeDetails']) and not r['clipped'] and not r['labelOverlaps']
  for d in r['strokeDetails']:
   match=re.fullmatch(r'M\s*([\d.-]+)\s+([\d.-]+)\s+A\s*([\d.-]+)\s+([\d.-]+)\s+0\s+([01])\s+([01])\s+([\d.-]+)\s+([\d.-]+)',d.get('d') or '')
   if not match or not re.fullmatch(r'\d+°',d['label']):own_arc=False;continue
   x,y,ra,rb,large,sweep,u,v=map(float,match.groups());theta=math.degrees(2*math.asin(min(1,math.hypot(u-x,v-y)/(2*ra))));theta=360-theta if large else theta
   if abs(theta-float(d['label'][:-1]))>.06:own_arc=False
  classification='accepted-own-angle-arc-bounds' if r['hash'] in display and own_arc else 'retained-frozen-source-stroke-overlap' if r['hash'] in canonical else 'unresolved-live'
  flags.append({**r,'classification':classification})
assert not any(r['classification']=='unresolved-live' for r in flags)
write('browser-coverage.json.gz',{'uniqueFinalDisplays':len(display),'uniqueFrozenSources':len(canonical),'observations':len(latest),'rows':list(latest.values()),'candidates':flags})
source_flags=[r for r in flags if r['hash'] in canonical];active_flags=[r for r in flags if r['hash'] in display]
proof=json.load(open('/tmp/arithmetic-figure-quality/engine-proof.json'))+json.load(open('/tmp/arithmetic-figure-quality/trig-engine-proof.json'))
# Only compact semantic/provenance proof is committed, not duplicate SVG dumps.
write('engine-proof.json.gz',[{k:r[k] for k in ('id','dimensions','residual','refusals','initialDimensions','attempts','spec','displaySha256','detail') if k in r} for r in proof])
visual=[json.load(open(out/name)) for name in ('visual-manifest.json','source-visual-manifest.json')]
inspections=json.load(open(out/'visual-inspections.json'))['images']
reviewed=[];unreviewed=[];pages=[]
for i,v in enumerate(visual):
 for page in v['pages']:
  sha=hashlib.sha256((out/page['file']).read_bytes()).hexdigest()
  stale=[r['id'] for r in page['rows'] if r['display']!=new[r['id']].get('display' if i==0 else 'canonical')]
  recorded=inspections.get(page['file'],{})
  inspected=recorded.get('sha256')==sha and not stale
  pages.append({'file':page['file'],'sha256':sha,'inspected':inspected,'staleIDs':stale,'actor':recorded.get('actor') if inspected else None})
  for r in page['rows']:
   entry={**r,'image':page['file'],'kind':'display' if i==0 else 'frozen-source','inspected':inspected}
   (reviewed if inspected else unreviewed).append(entry)
write('visual-review.json',{'inspected':not unreviewed,'method':'Exact PNG SHA and pictured SVG SHA must match an explicitly recorded view_image inspection; production A4 pages/details tracked separately','ids':len({r['id'] for r in reviewed}),'displayIDs':len({r['id'] for r in reviewed if r['kind']=='display'}),'sourceIDs':len({r['id'] for r in reviewed if r['kind']=='frozen-source'}),'displayFamilies':len({r['family'] for r in reviewed if r['kind']=='display'}),'hiddenSourceFamilies':len({r['family'] for r in reviewed if r['kind']=='frozen-source'}),'rows':reviewed,'unreviewedRows':unreviewed,'pages':pages})
counts=collections.Counter(r['family'] for r in m['rows'] if r['renderer']=='compiled-python-engine')
findings={'criticalReportedCase':{'family':'m2-trapezoid-diagonal-midpoints','variants':20,'status':'fixed','reason':'PQ target previously looked attached to BC; all public base dimensions and midpoint/parallel conditions now use engine conventions'},'inlineGeometry':{'beforeMismatches':20038,'checkedAfter':24474,'afterMismatches':0,'status':'fixed'},'missingRatio':{'family':'m2-trapezoid-parallel-section','variants':64,'status':'fixed'},'engineCompiled':{'variants':sum(counts.values()),'families':dict(counts)},'dimensionExceptions':{'refusedIDs':sum(bool(p['residual']) for p in proof),'dimensions':sum(len(p['residual']) for p in proof),'status':'public condition retained explicitly, target highlighted; strict renderer refusal preserved'},'activeBrowserCandidates':{'uniqueIDs':len({r['id'] for r in active_flags}),'observations':len(active_flags),'status':'every candidate is its own numerically matching circular angle arc, never an outline; manually reviewed in contacts'},'frozenBrowserDebt':{'uniqueIDs':len({r['id'] for r in source_flags}),'observations':len(source_flags),'status':'immutable source overlap preserved; current output uses existing presentation repair'},'canonicalZeroLengthLeaders':{'variants':3,'status':'retained immutable hidden source; no degenerate visible object'},'visualCoverage':{'displayIDs':len({r['id'] for r in reviewed if r['kind']=='display'}),'displayedCandidates':m['summary']['displayed'],'notIndividuallyVisuallyInspected':m['summary']['displayed']-len({r['id'] for r in reviewed if r['kind']=='display'}),'hiddenSourceIDs':len({r['id'] for r in reviewed if r['kind']=='frozen-source'}),'displayFamilies':len({r['family'] for r in reviewed if r['kind']=='display'}),'hiddenSourceFamilies':len({r['family'] for r in reviewed if r['kind']=='frozen-source'}),'notAClaimOfEveryIndividualVisualOrLearningOutcome':True}}
write('findings.json',findings)
write('compatibility.json',{'candidatesCompared':len(m['rows']),'frozenRegisteredIDs':17552,'uniqueFrozenBytes':len(canonical),'changedCandidates':0,'changedCanonicalSVGs':0,'removedDisplays':sum(bool(r.get('display')) and not new[r['id']].get('display') for r in old.values()),'changedDisplayIDs':len(changed),'displayChangesByFamily':dict(collections.Counter(new[id]['family'] for id in changed)),'contractsAndStorageWritersChanged':False})
print({'observations':len(latest),'activeCandidateIDs':len({r['id'] for r in active_flags}),'sourceDebtIDs':len({r['id'] for r in source_flags}),'engineVariants':sum(counts.values()),'visualIDs':len({r['id'] for r in reviewed}),'changedDisplays':len(changed)})
