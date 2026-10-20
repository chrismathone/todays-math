from pathlib import Path
import json,re,hashlib
P=Path('.qa-artifacts/exam-resume-20261008/catalog-profile-20261020-r1');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');queue=[R/'src/lib/examStudy/registry.ts'];seen=set();rows=[];external=set();blocked=[]
while queue:
 p=queue.pop()
 if p in seen:continue
 seen.add(p);assert len(seen)<1800
 rel=p.relative_to(R).as_posix()
 if not (rel.startswith('src/lib/')or rel.startswith('src/contracts/')or rel=='prisma/seed-data/units.ts'):blocked.append(rel);continue
 if re.search(r'/(?:db|prisma|auth|ai|server|student)[^/]*/',rel):blocked.append(rel);continue
 raw=p.read_bytes();rows.append({'path':rel,'sha256':hashlib.sha256(raw).hexdigest()})
 if p.suffix not in ['.ts','.tsx','.js','.mjs']:continue
 text=raw.decode('utf-8-sig')
 for m in re.finditer(r'''(?:from\s*|import\s*\(|require\s*\(|import\s*)["']([^"']+)["']''',text):
  name=m[1]
  if name.startswith('@/'):target=R/'src'/name[2:]
  elif name.startswith('.'):target=p.parent/name
  else:external.add(name);continue
  choices=[target,*[Path(str(target)+ext)for ext in ['.ts','.tsx','.js','.mjs','.json']],target/'index.ts',target/'index.tsx']
  found=next((q.resolve()for q in choices if q.is_file()),None)
  if found:queue.append(found)
for rel in ['package.json','tsconfig.json','src/__tests__/unit/examStudyCore.test.ts','src/__tests__/unit/examStudyCoreLegacy.test.ts','src/__tests__/unit/examStudyInverseCoefficient.test.ts']:
 p=R/rel;rows.append({'path':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
probe='공개 catalog 독립 성능 측정 UTF8 √\n';(P/'own-utf8-probe.txt').write_text(probe,encoding='utf-8');assert(P/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe
(P/'own-source-before.json').write_text(json.dumps({'root':str(R),'files':rows,'externalImports':sorted(external),'blocked':blocked,'method':'Static literal import/reexport closure including type-only edges; npm library internals not traversed. No QA/private/source folder enumerated.'},indent=2)+'\n',encoding='utf-8');print(json.dumps({'sourceFiles':len(rows),'blocked':blocked,'external':sorted(external)}))
