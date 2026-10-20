from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent; read=lambda p:json.loads(p.read_text(encoding='utf-8-sig')); S=read(P/'provided-scope.json');R=Path(S['root']);index=read(Path(S['currentIndexFor170HashChecks']));before=read(P/'own-before.json');rows=[]
# Hash only all six standard file-reference fields directly listed in each current review object.
# This covers any five-of-six interpretation of parent275 without pretending the exact subset was supplied.
for group in index['groups']:
 for c in group['candidates']:
  review=c.get('review')
  if not isinstance(review,dict):continue
  for key in ['summary','report','solve','seal','verificationManifest','blindManifest']:
   ref=review[key]; rel=ref['path'].replace(chr(92),'/'); rel='.qa-artifacts/'+rel.split('.qa-artifacts/',1)[1];p=R/rel
   h=hashlib.sha256(p.read_bytes()).hexdigest();before[str(p)]=h;rows.append({'candidateId':c['twinExternalId'],'field':key,'path':rel,'expectedSHA256':ref['sha256'],'actualSHA256':h,'match':h==ref['sha256']})
assert len(rows)==330
result={'readMode':'SHA256 streaming bytes only; none of candidate/review files parsed or printed','currentReviewObjects':55,'standardFields':['summary','report','solve','seal','verificationManifest','blindManifest'],'referenceOccurrencesHashed':len(rows),'uniqueFilesHashed':len(set(r['path'] for r in rows)),'matching':sum(r['match'] for r in rows),'mismatches':[r for r in rows if not r['match']],'parentCount':275,'parentCountInterpretation':'275=55*5 but six standard references are present. All330 were hashed rather than arbitrarily choosing a five-field subset. Exact parent five-field convention requested; R1 did not perform this. No new math/grade review of referenced files.','rows':rows}
(P/'own-reference-hashes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k not in ['rows']}))
