from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');s=json.loads((P/'provided-scope.json').read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();rows=[]
for kind in ['code','readOnlyDependencies','data','metadata']:
 for x in s[kind]:
  p=R/x['path'];h=sha(p);assert h==x['sha256'],x['path'];rows.append({'kind':kind,'path':str(p),'sha256':h})
index=json.loads((R/s['metadata'][2]['path']).read_text(encoding='utf-8-sig'));entries=[x for g in index['groups']for x in g['candidates']];assert len(entries)==166
for x in entries:
 p=R/x['candidate']['path'];h=sha(p);assert h==x['candidate']['sha256'];rows.append({'kind':'current166-candidate-metadata-and-hash-only','id':x['twinExternalId'],'path':str(p),'sha256':h})
# Exact explicitly authorized original/current Gachang source files and packages, no unrelated roots.
for version in ['r1','r2']:
 for n in [1,2]:
  p=R/f'.qa-artifacts/exam-resume-20261008/gachang-first2-authoring-20261020-{version}/gachang/q{n:02}.json';rows.append({'kind':'authorized-Gachang-author','path':str(p),'sha256':sha(p)})
for version in ['r1','r2']:
 review=P.parent/f'gachang-first2-review-20261020-{version}'
 for d in ['package','blind','verification']:
  for p in sorted((review/d).rglob('*')):
   if p.is_file():rows.append({'kind':'owned-Gachang-binding-input','path':str(p),'sha256':sha(p)})
# Prior authorized official metadata is reused, no new primary source read.
for p in [R/'.qa-artifacts/exam-resume-20261008/curriculum-evidence.json',R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/live-family-snapshot-r2.json']:
 rows.append({'kind':'prior-official-captured-evidence','path':str(p),'sha256':sha(p)})
(P/'own-before.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8');p=P/'own-utf8-probe.txt';v='교육과정 명시 목록 비교 UTF8 검사';p.write_text(v,encoding='utf-8');assert p.read_text(encoding='utf-8')==v;print({'hashBindings':len(rows),'selectedCandidateMetadataFiles':len(entries)})
