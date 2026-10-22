"""Offline full-denominator audit of frozen requests, every raw, and original candidate bindings."""
import argparse,collections,json,subprocess
from pathlib import Path
import review

def sealed(root,commit,path):return subprocess.check_output(['git','-C',str(root),'show',commit+':'+path])
def violations(obj):
 out=[]
 if not isinstance(obj,dict):return ['review_not_object']
 if obj.get('sourceStatus') not in ('sufficient','insufficient','ambiguous','inconsistent'):out.append('source_status_enum')
 if not isinstance(obj.get('sourceEvidence'),str) or not obj['sourceEvidence'].strip():out.append('source_evidence_empty_or_type')
 cs=obj.get('candidates')
 if not isinstance(cs,list):return out+['candidates_not_array']
 if len(cs)!=2:out.append('candidate_count_'+str(len(cs)))
 if any(not isinstance(c,dict) for c in cs):return out+['candidate_not_object']
 if {c.get('label') for c in cs}!={'A','B'}:out.append('candidate_labels_not_distinct_A_B')
 for c in cs:
  if not isinstance(c.get('checkingEvidence'),str) or not c['checkingEvidence'].strip():out.append('candidate_evidence_empty_or_type')
  if c.get('answerCorrectness') not in ('correct','incorrect','incomplete','undetermined'):out.append('correctness_enum')
  if c.get('answerExplanationConsistency') not in ('consistent','contradictory','undetermined'):out.append('consistency_enum')
 return sorted(set(out))

def audit(root,complete=False):
 errors=[];expected={};diagnostics=[];pending=[];freeze_commits={}
 superseded=review.decode_json((root/'superseded-series.json').read_bytes()) if (root/'superseded-series.json').exists() else {}
 superseded_count=0
 for receipt_path in sorted(root.glob('*-freeze.json')):
  receipt=review.decode_json(receipt_path.read_bytes());commit=receipt['commit'];name=receipt['manifest'];freeze_commits[name]=commit
  review.git(root,'merge-base','--is-ancestor',commit,'HEAD')
  manifest=review.decode_json((root/name).read_bytes())
  if sealed(root,commit,name)!=(root/name).read_bytes():errors.append(name+':manifest seal')
  skip=receipt_path.name.removesuffix('-freeze.json') in superseded
  if skip:superseded_count+=len(manifest['calls'])
  for c in manifest['calls']:
   if skip and (root/'attempts'/c['id']).exists():errors.append(c['id']+':superseded series has attempt')
   if c['id'] in expected:errors.append(c['id']+':duplicate manifest id')
   if not skip:expected[c['id']]=(c,commit)
   body=(root/c['requestPath']).read_bytes()
   if review.digest(body)!=c['requestSha256'] or sealed(root,commit,c['requestPath'])!=body:errors.append(c['id']+':request seal')
   review.check_request(review.decode_json(body))
 starts={p.parent.name:p for p in (root/'attempts').glob('*/start.json')}
 if set(starts)-set(expected):errors.append('attempt outside frozen expected set')
 for ident,(c,freeze) in expected.items():
  folder=root/'attempts'/ident
  if ident not in starts:pending.append(ident);continue
  start=review.decode_json(starts[ident].read_bytes())
  if start['requestSha256']!=c['requestSha256'] or start['freezeCommit']!=freeze or start['requestPath']!=c['requestPath']:errors.append(ident+':start binding')
  if not (folder/'result.json').exists():errors.append(ident+':unfinished');continue
  result=review.decode_json((folder/'result.json').read_bytes());req=review.decode_json((root/c['requestPath']).read_bytes())
  if not (folder/'response.json').exists():
   if result['status']!='network_unknown':errors.append(ident+':missing raw')
   diagnostics.append({'id':ident,'status':result['status'],'validationError':result.get('validationError')});continue
  raw=(folder/'response.json').read_bytes();obj=review.decode_json(raw)
  if review.digest(raw)!=result['responseSha256']:errors.append(ident+':raw sha')
  if result.get('transmittedBodySha256')!=c['requestSha256'] or int(result.get('transmittedBodyBytes',0))!=len((root/c['requestPath']).read_bytes()):errors.append(ident+':transmitted bytes')
  for a,b in [('actualModel','model'),('messageId','id'),('stopReason','stop_reason'),('usage','usage')]:
   if result.get(a)!=obj.get(b):errors.append(ident+':envelope '+a)
  if result.get('toolBlocks')!=sum(b.get('type')=='tool_use' for b in obj.get('content',[])):errors.append(ident+':tool count')
  rejection=None;parsed=None
  if result['httpStatus']==200:
   try:parsed=review.parse_response(raw,req,result.get('requestId'),c['kind'])
   except review.EvidenceError as e:rejection=str(e)
   if result['status']=='accepted':
    if rejection or parsed!=review.decode_json((folder/'parsed.json').read_bytes()):errors.append(ident+':accepted reparse')
   elif result['status']=='rejected':
    if rejection!=result.get('validationError'):errors.append(ident+':rejected reason reparse')
    if (folder/'parsed.json').exists():errors.append(ident+':rejected has accepted parsed')
   else:errors.append(ident+':unexpected 200 disposition')
  detail=[]
  if c['kind'] in ('text-review','text-review-format') and rejection and obj.get('stop_reason')=='end_turn':
   txt=''.join(b.get('text','') for b in obj.get('content',[]) if b.get('type')=='text')
   try:
    diagnostic=review.decode_json(txt)
    if c['kind']=='text-review-format' and isinstance(diagnostic,dict):diagnostic={'sourceStatus':diagnostic.get('sourceStatus'),'sourceEvidence':diagnostic.get('sourceEvidence'),'candidates':[diagnostic.get('candidateA'),diagnostic.get('candidateB')]}
    detail=violations(diagnostic)
   except review.EvidenceError:detail=['invalid_json_no_extraction']
  diagnostics.append({'id':ident,'status':result['status'],'stopReason':obj.get('stop_reason'),'validationError':rejection,'preciseSchemaViolations':detail})
 # Corrections are fresh format-only judgments; original failed raw remains sealed.
 for ident,(c,freeze) in expected.items():
  if 'replacesSchemaFailure' not in c:continue
  original,original_freeze=expected[c['replacesSchemaFailure']]
  a=review.decode_json((root/original['requestPath']).read_bytes());b=review.decode_json((root/c['requestPath']).read_bytes())
  original_result=review.decode_json((root/'attempts'/original['id']/'result.json').read_bytes())
  if original_result['status']!='rejected' or original_result['stopReason']!='end_turn':errors.append(ident+':ineligible correction')
  if not b['messages'][0]['content'].startswith(a['messages'][0]['content']+'\n\nFORMAT REQUIREMENTS:'):errors.append(ident+':correction prompt prefix')
  b['messages']=a['messages'];b['output_config']['format']=a['output_config']['format']
  if a!=b:errors.append(ident+':non-format correction change')
  raw_seal=review.decode_json((root/'format-manifest.json').read_bytes())['originalRawSeal']
  for p in (root/'attempts'/original['id']).iterdir():
   if p.is_file() and sealed(root,raw_seal,str(p.relative_to(root)))!=p.read_bytes():errors.append(ident+':original failure seal')
 # Independently rebind each displayed candidate to old raw, never to old judge verdicts.
 bindings_path=root/'candidate-bindings.json'
 if bindings_path.exists():
  freeze=freeze_commits['text-manifest.json']
  if sealed(root,freeze,'candidate-bindings.json')!=bindings_path.read_bytes():errors.append('candidate binding seal')
  src=review.OLD/'private/cohort';bindings=review.decode_json(bindings_path.read_bytes());oldmanifest=review.decode_json((src/'manifest.json').read_bytes());correction=review.decode_json((src/'format-manifest.json').read_bytes())
  allcalls={c['id']:c for c in oldmanifest['calls']+correction['calls']}
  expectedgroups={g['studentSha256']:g for g in oldmanifest['groups']}
  main=review.decode_json((root/'text-manifest.json').read_bytes())
  if len(main['calls'])!=202 or {c['id'] for c in main['calls']}!={b['id']+'-review-'+suffix for b in bindings for suffix in ('opus','sonnet')}:errors.append('expected202 main reviewer set')
  if len(bindings)!=101 or {b['studentSha256'] for b in bindings}!=set(expectedgroups):errors.append('expected101 projection set')
  for b in bindings:
   student=(root/f"inputs/{b['studentSha256']}.json").read_bytes()
   if review.digest(student)!=b['studentSha256'] or sealed(root,freeze,f"inputs/{b['studentSha256']}.json")!=student:errors.append(b['id']+':student binding')
   if b['packets']!=expectedgroups[b['studentSha256']]['packets']:errors.append(b['id']+':packet aliases')
   for c in b['candidates']:
    orig=allcalls[c['selectedCallId']];folder=src/'attempts'/orig['id']/'attempt-01';r=review.decode_json((folder/'result.json').read_bytes());raw=(folder/'response.json').read_bytes();req=review.decode_json((src/orig['requestPath']).read_bytes())
    parsed=review.original_audit_response(raw,req,r['requestId'],True)
    if review.digest(raw)!=c['responseSha256'] or parsed['parsed']!=c['candidate'] or parsed['actualModel']!=c['authorModel']:errors.append(b['id']+':original raw candidate')
   for suffix in ('opus','sonnet'):
    req=review.decode_json((root/f"requests/{b['id']}-review-{suffix}.json").read_bytes());prompt=req['messages'][0]['content']
    displayed=[{'label':c['label'],**c['candidate']} for c in b['candidates']]
    if not prompt.endswith(json.dumps(displayed,ensure_ascii=False)) or student.decode() not in prompt:errors.append(b['id']+':displayed candidate input')
 pairpath=root/'final-pair-bindings.json'
 if pairpath.exists():
  pairs=review.decode_json(pairpath.read_bytes())['pairs']
  if len(pairs)!=30:errors.append('final paired denominator')
  for pair in pairs:
   current=expected[pair['currentCallId']][0];shadow=expected[pair['shadowCallId']][0]
   a=review.decode_json((root/current['requestPath']).read_bytes());b=review.decode_json((root/shadow['requestPath']).read_bytes())
   a['model']='claude-opus-5-5';a['max_tokens']=8192;a['output_config']['effort']='high'
   if a!=b:errors.append(pair['sourceRequestId']+':paired prompt/image difference')
 holdout_path=root/'final-heldout-pair-bindings.json'
 if holdout_path.exists():
  holdout=review.decode_json(holdout_path.read_bytes());source=(root/'packages/authoritative-final-heldouts.json').read_bytes()
  if review.digest(source)!=holdout['authoritativeManifestSha256']:errors.append('heldout source manifest hash')
  ids={spec['id']+'.1' for spec in review.decode_json(source)['specs']}
  if len(holdout['pairs'])!=4 or {p['sourceRequestId'] for p in holdout['pairs']}!=ids:errors.append('authoritative heldout4 set')
  for pair in holdout['pairs']:
   current=expected[pair['currentCallId']][0];shadow=expected[pair['shadowCallId']][0]
   a=review.decode_json((root/current['requestPath']).read_bytes());b=review.decode_json((root/shadow['requestPath']).read_bytes());a['model']='claude-opus-5-5';a['max_tokens']=8192;a['output_config']['effort']='high'
   if a!=b:errors.append(pair['sourceRequestId']+':heldout paired difference')
 if complete and pending:errors.append('pending expected calls')
 result={'at':review.now(),'expectedCalls':len(expected),'supersededUnexecutedCalls':superseded_count,'started':len(starts),'pending':pending,'errors':errors,'diagnostics':diagnostics,'preciseFailureCounts':dict(collections.Counter(v for d in diagnostics for v in d.get('preciseSchemaViolations',[]))),'completeRequired':complete}
 tmp=root/'full-audit.json.tmp';tmp.write_bytes(review.encoded(result));tmp.chmod(0o600);tmp.replace(root/'full-audit.json')
 print(json.dumps({k:v for k,v in result.items() if k not in ('diagnostics','pending')}));return result

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=review.DEFAULT);p.add_argument('--complete',action='store_true');a=p.parse_args();r=audit(a.root,a.complete);raise SystemExit(bool(r['errors']))
