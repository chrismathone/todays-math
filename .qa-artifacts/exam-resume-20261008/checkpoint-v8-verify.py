import pathlib,json,subprocess,hashlib,datetime
base=pathlib.Path('.qa-artifacts/exam-resume-20261008')
hash_bytes=lambda x:hashlib.sha256(x).hexdigest()
checked=[];hashes={}
def file_hash(path):
 key=str(path.resolve())
 if key not in hashes:hashes[key]=hash_bytes(path.read_bytes())
 return hashes[key]
def walk(value,context=pathlib.Path('.')):
 if isinstance(value,list):
  for item in value:walk(item,context)
 elif isinstance(value,dict):
  if isinstance(value.get('candidate'),dict) and 'path' in value['candidate']:
   context=pathlib.Path(value['candidate']['path']).parent
  if isinstance(value.get('path'),str) and isinstance(value.get('sha256'),str):
   p=pathlib.Path(value['path'])
   if not p.exists():p=context/p
   assert p.exists(),str(p)
   assert file_hash(p)==value['sha256'],str(p)
   checked.append(str(p))
  for item in value.values():walk(item,context)
for name in ['continuation-index-v8.json','status-ledger-v8.json','current-authored-batches-v8.json','engine-upgrades-progress-r2.json']:
 d=json.loads((base/name).read_text('utf-8-sig'));walk(d)
 for key,field in [('progressReportSha256','progressReport'),('latestDirectiveSha256','latestDirective')]:
  if key in d:assert file_hash(pathlib.Path(d[field]))==d[key]
rootfiles=[pathlib.Path('docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-5.md')]+[base/'continuation-watch'/n for n in ['automation-config.json','controller-r2-preserved.ps1','verification-r2-20261008.json']]
records=[]
for p in rootfiles:
 staged=subprocess.check_output(['git','show',':'+p.as_posix()]);assert staged==p.read_bytes()
 records.append({'path':p.as_posix(),'sha256':hash_bytes(staged),'stagedBytesEqual':True})
report=pathlib.Path('docs/planning/tracks/reports/gyeongam-authoring-r1-20261008.md')
assert subprocess.check_output(['git','show',':'+report.as_posix()])==report.read_bytes()
whitespace=[]
for scope,name,source in [
 ('gyeongam','q11-1','gyeongam-authoring-r1/candidates/q11/stem-1.svg'),
 ('gyeongsan','q25-1','gyeongsan-authoring-r1/candidates/q25/before.svg'),
]:
 original=(base/source).read_bytes()
 for relative in [f'{scope}-independent-r1/blind/figures/{name}.svg',f'{scope}-independent-r1/package/private/q{name[1:3]}/figure-1.svg']:
  p=base/relative;assert p.read_bytes()==original
  whitespace.append({'path':p.as_posix(),'sha256':hash_bytes(original),'reason':'Exact strict-engine SVG whitespace-only line retained, not authored text.'})
external=pathlib.Path('C:/Users/user/orca/artifacts/outputs/exam-continuation-watch-20261008/controller.ps1')
result={'kind':'checkpoint-v8-bindings-verification/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'referencedFilesChecked':len(checked),'uniqueReferencedFiles':len(set(checked)),'rootOwnedFiles':records,'externalControllerEqualsRootPreservedCopy':external.read_bytes()==(base/'continuation-watch/controller-r2-preserved.ps1').read_bytes(),'externalControllerWritten':False,'coreTestsObservedPassed':30,'strictEngineBytePreservationExceptions':whitespace,'independentReviewCount':20,'fullVerified':0,'dbWrites':0}
with (base/'checkpoint-v8-verification.json').open('x',encoding='utf-8') as file:file.write(json.dumps(result,indent=2)+'\n')
print(json.dumps({'referencedFilesChecked':len(checked),'rootOwnedExactBytes':len(records),'engineWhitespaceExceptions':len(whitespace),'coreTestsObservedPassed':30,'fullVerified':0}))
