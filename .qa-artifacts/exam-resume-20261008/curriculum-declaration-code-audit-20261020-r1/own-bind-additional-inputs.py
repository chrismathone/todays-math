from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');p=P/'own-before.json';rows=json.loads(p.read_text(encoding='utf-8'));seen={x['path']for x in rows};extra=[]
for version in ['r1','r2']:
 for n in [1,2]:
  author=R/f'.qa-artifacts/exam-resume-20261008/gachang-first2-authoring-20261020-{version}/gachang/q{n:02}.json';c=json.loads(author.read_text(encoding='utf-8-sig'))
  for a in c['figureArtifacts']:
   for k in ['specPath','svgPath']:
    v=a[k];q=(R/v if v.startswith('.qa-artifacts/')else author.parent/v).resolve();assert f'gachang-first2-authoring-20261020-{version}'in str(q);extra.append(q)
  extra.append(R/f'.qa-artifacts/exam-resume-20261008/gachang-first2-review-20261020-{version}/blind/solve/q{n:02}.json')
  if version=='r1':extra.append(R/f'.qa-artifacts/exam-resume-20261008/gachang-first2-review-20261020-{version}/verification/reports/q{n:02}.json')
for q in extra:
 if str(q)not in seen:rows.append({'kind':'authorized-CLI-assets-and-collector-raw','path':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest()});seen.add(str(q))
(P/'own-before-complete.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8');print({'totalBefore':len(rows),'addedBindings':len(rows)-len(json.loads(p.read_text()))})
