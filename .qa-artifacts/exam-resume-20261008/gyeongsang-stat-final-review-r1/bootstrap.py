"""Versioned final review inputs. Copies safe packet and matching original package only."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,subprocess,datetime
R=Path(__file__).resolve().parent;REPO=R.parents[2]
P=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');QA=P/'.qa-artifacts/exam-resume-20261008'
assert not (R/'evidence').exists(),'Do not overwrite review evidence.'
def sha(b):return hashlib.sha256(b).hexdigest()
def put(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
def copy(src,rel):
 b=src.read_bytes();p=R/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);assert p.read_bytes()==src.read_bytes()==b
 return dict(sourcePath=str(src),copyPath=rel,sha256=sha(b),bytes=len(b))
receipt=[]
for f in ['VERIFY-BRIEF.md','verification-inputs.json','verification-manifest.json']:
 receipt.append(copy(QA/'gyeongsang-stat-final-review-r1'/f,'evidence/verification/'+f))
receipt.append(copy(QA/'bank-read-fresh-r3-20261008.json','evidence/bank-read-fresh-r3-20261008.json'))
source=QA/'next-five-extraction-r1/gyeongsang/packet';receipt.append(copy(source/'questions.json','evidence/source/questions.json'))
s=json.loads((source/'questions.json').read_text(encoding='utf-8'));assert s['sourceOnly'] and s['originalCorrectChoiceAndSolutionWithheld']
for q in s['questions']:
 if q['number'] not in [10,11,12,13,14,15,22]:continue
 for a in q['images']:receipt.append(copy(source/a['file'],'evidence/source/'+a['file']))
for n in [10,11,12,13,14,15,22]:
 receipt.append(copy(QA/f'gyeongsang-stat-review-r1/package/private/q{n:02}/candidate.json',f'evidence/package/private/q{n:02}/candidate.json'))
for f in ['src/lib/middle/m3Stat2.ts','src/lib/middle/m3Top.ts','src/lib/middle/generate.ts','src/lib/middle/types.ts','prisma/seed-data/units.ts','scripts/import/exam-twin/candidatePack.mjs','.agents/skills/typesafe-ai/SKILL.md','scripts/import/exam-paper/solver_rules.json']:
 receipt.append(copy(P/f,'evidence/repository/'+(f+'.txt' if f.endswith('.ts') else f)))
old=json.loads((REPO/'.qa-artifacts/exam-resume-20261008/gyeongsan-independent-r1/blind/preservation.json').read_text(encoding='utf-8'))['files']
gs='.qa-artifacts/exam-resume-20261008/gyeongsan-independent-r1'
for p in (REPO/gs).rglob('*'):
 if p.is_file():old.append(dict(path=p.relative_to(REPO).as_posix(),sha256=sha(p.read_bytes())))
assert len(old)==680
for p in old:assert sha((REPO/p['path']).read_bytes())==p['sha256'],p['path']
put(R/'evidence/preservation-before-main.json',dict(previousFiles=680,allBytesUnchanged=True,files=old))
put(R/'evidence/input-receipt.json',dict(recordedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),parentRepositoryCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=P,text=True).strip(),reviewMethod='independent-solve-then-review',rawSolveCommits=['cd14f37024e3eb872ddfe9a685db7b4da78f98a0','c8f8aeadfb28becb1d7447240fd4e28b6702fc4c'],readsOnlyMatchingStatR4AndSafeSource=True,rootQ22RepairRead=False,entries=receipt))
print('Copied matching stat-r4 candidates7, verification templates, safe source PNGs7 and bank-r3;old680bytes unchanged.')
